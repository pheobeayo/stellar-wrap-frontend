import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import { WalletConnectModule } from "@creit-tech/stellar-wallets-kit/modules/wallet-connect";
import { Network } from "../../src/config";
import { getContractAddressForNetwork } from "./contractBridge";
import {
  ContractConfigurationError,
  InvalidContractAddressError,
  ContractNotFoundError,
  ContractValidationError,
} from "./contractErrors";

if (
  typeof process !== "undefined" &&
  !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET &&
  !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET &&
  !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
) {
  console.warn(
    "⚠️ No contract address env set (NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET, NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET, or NEXT_PUBLIC_CONTRACT_ADDRESS). Using placeholder per network.",
  );
}

// Initialize StellarWalletsKit for testnet
let isInitialized = false;

export function initWalletKit(): void {
  if (!isInitialized && typeof window !== "undefined") {
    StellarWalletsKit.init({
      modules: [
        ...defaultModules(),
        new WalletConnectModule({
          projectId:
            process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
            "stellar-wrapped-2026",
          metadata: {
            name: "Stellar Wrapped",
            description: "Your blockchain story told like never before",
            icons: ["https://stellar.org/favicon.ico"],
            url: window.location.origin,
          },
        }),
      ],
    });
    isInitialized = true;
  }
}

/**
 * Mint the user's Stellar Wrapped as a Soulbound Token NFT
 * Uses the contract address for the given network (mainnet vs testnet).
 *
 * @param userAddress - The connected Stellar wallet address
 * @param network - 'mainnet' | 'testnet' (determines which contract is used)
 * @returns Transaction hash on success
 * @throws Error if minting fails, user rejects transaction, or contract is invalid for the network
 */
export async function mintWrap(
  userAddress: string,
  network: Network
): Promise<string> {
  try {
    initWalletKit();

    const txHash = await invokeMintWrapContract(userAddress, network);
    return txHash;
  } catch (error) {
    if (
      error instanceof ContractConfigurationError ||
      error instanceof InvalidContractAddressError ||
      error instanceof ContractNotFoundError ||
      error instanceof ContractValidationError
    ) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Minting failed: ${error.message}`);
    }
    throw new Error("Minting failed: Unknown error occurred");
  }
}

/**
 * Internal function to invoke the mint_wrap contract function.
 * Validates contract exists on network, then loads instance (cached when available).
 */
async function invokeMintWrapContract(
  userAddress: string,
  network: Network
): Promise<string> {
  const { getContractInstanceValidated } = await import("./contractBridge");
  await getContractInstanceValidated(network);
  const contractAddress = getContractAddressForNetwork(network);

  // TODO: Replace with actual Soroban invocation, e.g. contract.call('mint_wrap', ...)
  // when the contract engineer provides the contract details.
  // Example:
  // const operation = contract.call('mint_wrap', userAddress);
  // const transaction = new TransactionBuilder(...)
  //   .addOperation(operation)
  //   .build();
  // const { signedTxXdr } = await kit.signTransaction(transaction.toXDR());
  // const result = await submitTransaction(signedTxXdr);
  // return result.hash;

  throw new Error(
    "Contract integration pending. The mint_wrap function will be implemented by the contract engineer. " +
      `Contract address (${network}): ${contractAddress}, User: ${userAddress}`,
  );
}
