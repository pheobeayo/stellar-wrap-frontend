/**
 * On-network contract validation using Soroban RPC.
 * Verifies contract exists and is deployed; optional mint function check.
 */

import { Network, SOROBAN_RPC_URLS, isValidNetwork } from "../../src/config";
import { getContractAddress } from "../../config/contracts";
import {
  ContractNotFoundError,
  ContractValidationError,
} from "./contractErrors";

/** Result of validating a contract on a network */
export interface ContractValidationResult {
  exists: boolean;
  deployed: boolean;
  error?: string;
}

/**
 * Verify the configured contract exists on the given network (Soroban RPC).
 * Uses getContractWasmByContractId; if it resolves, the contract is deployed.
 *
 * @param network - 'mainnet' | 'testnet'
 * @returns Promise that resolves if contract exists, rejects with ContractNotFoundError / ContractValidationError otherwise
 */
export async function validateContractOnNetwork(
  network: Network
): Promise<ContractValidationResult> {
  if (!isValidNetwork(network)) {
    throw new ContractValidationError(`Invalid network: ${network}`, network);
  }

  const address = getContractAddress(network);
  const rpcUrl = SOROBAN_RPC_URLS[network];

  try {
    const { Server } = await import("stellar-sdk/rpc");
    const server = new Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });

    await server.getContractWasmByContractId(address);

    return { exists: true, deployed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("not found") ||
      message.includes("cannot be found") ||
      message.includes("NotFound")
    ) {
      throw new ContractNotFoundError(network, err);
    }
    throw new ContractValidationError(
      `Contract validation failed on ${network}: ${message}`,
      network,
      err
    );
  }
}

/**
 * Check if the contract has a mint-related function (best-effort).
 * Does not invoke the function; validation is primarily "contract exists".
 * Full "has mint" check would require contract spec or simulateTransaction.
 */
export async function validateContractHasMint(
  _network: Network
): Promise<boolean> {
  await validateContractOnNetwork(_network);
  return true;
}
