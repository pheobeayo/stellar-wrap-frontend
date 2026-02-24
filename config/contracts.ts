/**
 * Network-aware Soroban contract configuration
 * Supports per-network addresses with environment variable overrides.
 */

import { Network, isValidNetwork } from "../src/config";

/** Contract config for a single network */
export interface ContractNetworkConfig {
  contractAddress: string;
}

/** Full contract configuration per network */
export type ContractConfig = Record<Network, ContractNetworkConfig>;

/** Placeholder when no contract is configured (56-char Soroban format: C + 55 base32 chars) */
const PLACEHOLDER_ADDRESS = "C" + "A".repeat(55);

/** Default contract addresses (fallback when env vars are not set) */
const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  mainnet: { contractAddress: PLACEHOLDER_ADDRESS },
  testnet: { contractAddress: PLACEHOLDER_ADDRESS },
};

/** Build config with env overrides (env takes precedence). Legacy NEXT_PUBLIC_CONTRACT_ADDRESS used for both if set. */
function getContractConfig(): ContractConfig {
  const legacy = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  return {
    mainnet: {
      contractAddress:
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET ||
        legacy ||
        DEFAULT_CONTRACT_CONFIG.mainnet.contractAddress,
    },
    testnet: {
      contractAddress:
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET ||
        legacy ||
        DEFAULT_CONTRACT_CONFIG.testnet.contractAddress,
    },
  };
}

/** Soroban contract address format: C + 55 base32 chars = 56 total */
const CONTRACT_ADDRESS_REGEX = /^C[A-Z2-7]{55}$/;

/**
 * Validates Soroban contract address format (C-prefix, 56 chars, base32).
 */
export function isValidContractAddress(address: string): boolean {
  if (typeof address !== "string" || address.length !== 56) return false;
  return CONTRACT_ADDRESS_REGEX.test(address);
}

/**
 * Get the contract address for the given network.
 * Loads from environment (NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET / _TESTNET) then config.
 *
 * @param network - 'mainnet' | 'testnet'
 * @returns Contract address for the network
 * @throws Error if network is invalid or contract address format is invalid
 */
export function getContractAddress(network: Network): string {
  if (!isValidNetwork(network)) {
    throw new Error(`Invalid network: ${network}`);
  }
  const config = getContractConfig();
  const address = config[network].contractAddress;
  if (!isValidContractAddress(address)) {
    throw new Error(
      `Invalid contract address for ${network}: address must be 56 characters, C-prefix, base32. Got: ${address?.slice(0, 20)}...`
    );
  }
  return address;
}

/**
 * Get full contract config (for debugging or tooling).
 */
export function getContractConfigForAllNetworks(): ContractConfig {
  return getContractConfig();
}
