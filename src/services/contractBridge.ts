/**
 * Soroban Contract Bridge Service
 * 
 * Handles complete transaction lifecycle for Soroban contract invocations:
 * - Building XDR transactions with contract calls
 * - Simulating transactions before signing
 * - Signing with Freighter wallet
 * - Submitting to network
 * - Polling for confirmation
 * 
 * @module contractBridge
 */

import {
  Contract,
  TransactionBuilder,
  xdr,
  BASE_FEE,
} from 'stellar-sdk';
import { Server } from 'stellar-sdk/rpc';
import { signTransaction } from '@stellar/freighter-api';
import { Network, NETWORK_PASSPHRASES, SOROBAN_RPC_URLS } from '../config';
import { getContractAddress } from '../../config/contracts';
import { buildContractArgs, type ContractStatsInput } from '../utils/contractArgsBuilder';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Transaction state during the mint lifecycle
 */
export type TransactionState =
  | 'pending'
  | 'simulating'
  | 'signed'
  | 'submitted'
  | 'confirmed'
  | 'failed';

/**
 * Transaction observer callback
 */
export type TransactionObserver = (state: TransactionState, data?: unknown) => void;

/**
 * Options for minting a wrap NFT
 */
export interface MintWrapOptions {
  /** User's Stellar account address */
  accountAddress: string;
  /** Indexed stats to pass as contract arguments */
  stats: ContractStatsInput;
  /** Network to use (mainnet/testnet) */
  network: Network;
  /** Optional observer callback for state updates */
  observer?: TransactionObserver;
}

/**
 * Result of a successful mint operation
 */
export interface MintResult {
  /** Transaction hash */
  transactionHash: string;
  /** Ledger number where transaction was confirmed */
  ledger: number;
  /** Final transaction state */
  state: TransactionState;
}

/**
 * Error details for failed transactions
 */
export interface TransactionError {
  message: string;
  code?: string;
  state: TransactionState;
  originalError?: unknown;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum number of confirmation polling attempts */
const MAX_CONFIRMATION_ATTEMPTS = 60;

/** Delay between confirmation polling attempts (ms) */
const CONFIRMATION_POLL_INTERVAL = 2000; // 2 seconds

/** Transaction timeout (ms) */
const TRANSACTION_TIMEOUT = 120000; // 2 minutes

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Creates a Soroban RPC server instance for the given network
 */
function createSorobanServer(network: Network): Server {
  const rpcUrl = SOROBAN_RPC_URLS[network];
  return new Server(rpcUrl, { allowHttp: rpcUrl.startsWith('http://') });
}


/**
 * Gets the network passphrase for transaction building
 */
function getNetworkPassphrase(network: Network): string {
  return NETWORK_PASSPHRASES[network];
}

/**
 * Emits observer callback if provided
 */
function emitState(
  observer: TransactionObserver | undefined,
  state: TransactionState,
  data?: unknown,
): void {
  if (observer) {
    try {
      observer(state, data);
    } catch (error) {
      console.error('Transaction observer error:', error);
    }
  }
}

/**
 * Polls for transaction confirmation
 */
async function waitForConfirmation(
  server: Server,
  transactionHash: string,
  observer: TransactionObserver | undefined,
  startTime: number,
): Promise<{ ledger: number }> {
  let attempts = 0;

  while (attempts < MAX_CONFIRMATION_ATTEMPTS) {
    // Check timeout
    if (Date.now() - startTime > TRANSACTION_TIMEOUT) {
      throw new Error('Transaction confirmation timeout');
    }

    try {
      const response = await server.getTransaction(transactionHash);

      if (response.status === 'SUCCESS') {
        const ledger = response.ledger || 0;
        emitState(observer, 'confirmed', { ledger, transactionHash });
        return { ledger };
      }

      if (response.status === 'FAILED') {
        const errorMessage = 'Transaction failed on network';
        emitState(observer, 'failed', { error: errorMessage });
        throw new Error(errorMessage);
      }

      // Status is NOT_FOUND or PENDING - continue polling
    } catch (error) {
      // If it's our own error (from failed status), rethrow
      if (error instanceof Error && error.message.includes('Transaction failed')) {
        throw error;
      }

      // Otherwise, log and continue polling (network errors are transient)
      console.warn(`Polling attempt ${attempts + 1} failed:`, error);
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL));
  }

  throw new Error(
    `Transaction not confirmed after ${MAX_CONFIRMATION_ATTEMPTS} attempts`,
  );
}

/**
 * Parses Soroban contract errors from simulation or execution results
 */
function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    // Check for common Soroban error patterns
    const message = error.message;

    // Insufficient fees
    if (message.includes('insufficient_fee') || message.includes('fee')) {
      return 'Insufficient transaction fee. Please try again.';
    }

    // Contract revert
    if (message.includes('HostError') || message.includes('ContractError')) {
      return `Contract error: ${message}`;
    }

    // User rejection
    if (message.includes('User declined') || message.includes('rejected')) {
      return 'Transaction was rejected by user';
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }

    return message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error occurred during transaction';
}

// ─── Main Service Functions ─────────────────────────────────────────────────

/**
 * Builds a Soroban contract invocation transaction
 */
async function buildMintTransaction(
  accountAddress: string,
  stats: ContractStatsInput,
  network: Network,
): Promise<{ transaction: any; contract: Contract }> {
  // 1. Get contract address
  const contractAddress = getContractAddress(network);
  if (!contractAddress || contractAddress.startsWith('CAAAAAAAA')) {
    throw new Error(
      `Invalid contract address for ${network}. Please configure NEXT_PUBLIC_CONTRACT_ADDRESS_${network.toUpperCase()} environment variable.`,
    );
  }

  // 2. Create Soroban server
  const sorobanServer = createSorobanServer(network);

  // 3. Load account to get sequence number (use Soroban RPC for account info)
  let account;
  try {
    account = await sorobanServer.getAccount(accountAddress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
      throw new Error(
        `Account ${accountAddress} not found on ${network}. ` +
        `Please ensure the account exists and is funded on the ${network} network.`
      );
    }
    throw new Error(
      `Failed to load account: ${errorMessage}. ` +
      `Please check that the account address is correct and exists on ${network}.`
    );
  }

  // 4. Build contract arguments
  const argsResult = buildContractArgs(stats, accountAddress);
  if (!argsResult.success) {
    throw new Error(
      `Failed to build contract arguments: ${argsResult.errors.join(', ')}`,
    );
  }

  // 5. Create contract instance
  const contract = new Contract(contractAddress);

  // 6. Build contract invocation operation
  const operation = contract.call('mint_wrap', ...argsResult.data.args);

  // 7. Build transaction
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(operation)
    .setTimeout(300) // 5 minutes (300 seconds)
    .build();

  return { transaction, contract };
}

/**
 * Simulates a transaction before signing
 */
async function simulateTransaction(
  server: Server,
  transaction: any,
  observer: TransactionObserver | undefined,
): Promise<void> {
  emitState(observer, 'simulating');

  try {
    const simulation = await server.simulateTransaction(transaction);

    // Check if simulation failed (response has error property or is a failure response)
    if ('error' in simulation || (simulation as any).errorResult) {
      const errorResult = (simulation as any).errorResult || (simulation as any).error;
      const errorMessage = parseContractError(errorResult || simulation);
      emitState(observer, 'failed', { error: errorMessage });
      throw new Error(`Transaction simulation failed: ${errorMessage}`);
    }

    // Check for warnings
    if ((simulation as any).restorePreamble) {
      console.warn('Transaction requires restore preamble:', (simulation as any).restorePreamble);
    }

    // Simulation successful - transaction is valid
  } catch (error) {
    const errorMessage = parseContractError(error);
    emitState(observer, 'failed', { error: errorMessage });
    throw new Error(`Transaction simulation error: ${errorMessage}`);
  }
}

/**
 * Signs a transaction using Freighter wallet
 */
async function signTransactionWithFreighter(
  transactionXdr: string,
  network: Network,
  observer: TransactionObserver | undefined,
): Promise<string> {
  emitState(observer, 'signed');

  try {
    const result = await signTransaction(transactionXdr, {
      networkPassphrase: getNetworkPassphrase(network),
    });

    if (result.error) {
      const errorMessage = parseContractError(result.error);
      emitState(observer, 'failed', { error: errorMessage });
      throw new Error(`Signing failed: ${errorMessage}`);
    }

    if (!result.signedTxXdr) {
      throw new Error('Freighter returned empty signed transaction');
    }

    return result.signedTxXdr;
  } catch (error) {
    const errorMessage = parseContractError(error);
    emitState(observer, 'failed', { error: errorMessage });
    throw error;
  }
}

/**
 * Submits a signed transaction to the network
 */
async function submitTransaction(
  server: Server,
  signedXdr: string,
  observer: TransactionObserver | undefined,
): Promise<string> {
  emitState(observer, 'submitted');

  try {
    // Parse the signed XDR back to transaction for submission
    const signedTransaction = xdr.TransactionEnvelope.fromXDR(signedXdr, 'base64');
    const response = await server.sendTransaction(signedTransaction as any);

    if (response.errorResult) {
      const errorMessage = parseContractError(response.errorResult);
      emitState(observer, 'failed', { error: errorMessage });
      throw new Error(`Transaction submission failed: ${errorMessage}`);
    }

    if (!response.hash) {
      throw new Error('Transaction submitted but no hash returned');
    }

    return response.hash;
  } catch (error) {
    const errorMessage = parseContractError(error);
    emitState(observer, 'failed', { error: errorMessage });
    throw error;
  }
}

/**
 * Mints a wrap NFT by invoking the Soroban contract
 * 
 * This function handles the complete transaction lifecycle:
 * 1. Builds the contract invocation transaction
 * 2. Simulates the transaction
 * 3. Signs with Freighter
 * 4. Submits to network
 * 5. Polls for confirmation
 * 
 * @param options - Minting options including account, stats, and network
 * @returns Promise resolving to mint result with transaction hash
 * @throws Error if any step fails
 * 
 * @example
 * ```ts
 * const result = await mintWrap({
 *   accountAddress: 'GABC...XYZ',
 *   stats: {
 *     totalVolume: 45000,
 *     mostActiveAsset: 'XLM',
 *     contractCalls: 120,
 *     timeframe: '1y'
 *   },
 *   network: 'testnet',
 *   observer: (state, data) => console.log(state, data)
 * });
 * 
 * console.log('Minted!', result.transactionHash);
 * ```
 */
export async function mintWrap(options: MintWrapOptions): Promise<MintResult> {
  const { accountAddress, stats, network, observer } = options;

  emitState(observer, 'pending');

  const startTime = Date.now();
  let transactionHash: string;
  let server: Server;

  try {
    // 1. Build transaction
    const { transaction } = await buildMintTransaction(
      accountAddress,
      stats,
      network,
    );

    // 2. Create Soroban server for simulation and submission
    server = createSorobanServer(network);

    // 3. Simulate transaction
    await simulateTransaction(server, transaction, observer);

    // 4. Convert transaction to XDR for signing
    const transactionXdr = transaction.toXDR('base64');

    // 5. Sign with Freighter
    const signedXdr = await signTransactionWithFreighter(
      transactionXdr,
      network,
      observer,
    );

    // 6. Submit transaction
    transactionHash = await submitTransaction(server, signedXdr, observer);

    // 7. Wait for confirmation
    const { ledger } = await waitForConfirmation(
      server,
      transactionHash,
      observer,
      startTime,
    );

    return {
      transactionHash,
      ledger,
      state: 'confirmed',
    };
  } catch (error) {
    const errorMessage = parseContractError(error);
    emitState(observer, 'failed', { error: errorMessage });

    // Re-throw with more context
    throw new Error(`Minting failed: ${errorMessage}`);
  }
}
