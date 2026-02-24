/**
 * Global configuration for Stellar Wrap
 * Defines network types and RPC endpoints
 */

export const NETWORKS = {
  MAINNET: 'mainnet',
  TESTNET: 'testnet',
} as const;

export type Network = typeof NETWORKS[keyof typeof NETWORKS];

/**
 * RPC endpoint configuration for each network (Horizon REST API)
 */
export const RPC_ENDPOINTS: Record<Network, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

/**
 * Soroban RPC URLs for contract validation and invocation (JSON-RPC).
 * Override with NEXT_PUBLIC_SOROBAN_RPC_MAINNET / NEXT_PUBLIC_SOROBAN_RPC_TESTNET.
 */
export const SOROBAN_RPC_URLS: Record<Network, string> = {
  mainnet:
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOROBAN_RPC_MAINNET) ||
    'https://mainnet.stellar.validation.stellar.org',
  testnet:
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOROBAN_RPC_TESTNET) ||
    'https://soroban-testnet.stellar.org',
};

/**
 * Network passphrases for transaction signing
 */
export const NETWORK_PASSPHRASES: Record<Network, string> = {
  mainnet: 'Public Global Stellar Network ; September 2015',
  testnet: 'Test SDF Network ; September 2015',
};

/**
 * Default network for the application
 */
export const DEFAULT_NETWORK: Network = NETWORKS.MAINNET;

/**
 * Validates if a string is a valid network
 */
export function isValidNetwork(network: string): network is Network {
  return network === NETWORKS.MAINNET || network === NETWORKS.TESTNET;
}
