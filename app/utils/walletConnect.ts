import { isConnected, getAddress, requestAccess } from '@stellar/freighter-api';

/**
 * Checks if Freighter wallet extension is installed
 */
export const isFreighterInstalled = async (): Promise<boolean> => {
  try {
    const result = await isConnected();
    return !result.error && result.isConnected;
  } catch {
    return false;
  }
};

/**
 * Connects to Freighter wallet and returns the user's public key
 * @throws {Error} If wallet is not installed, user rejects connection, or any other error occurs
 */
export const connectFreighter = async (): Promise<string> => {
  // Check if Freighter is installed
  const installed = await isFreighterInstalled();
  
  if (!installed) {
    throw new Error(
      'Freighter wallet not found. Please install the Freighter browser extension.'
    );
  }

  try {
    // Request access to the wallet
    const accessResult = await requestAccess();
    
    if (accessResult.error || !accessResult.address) {
      throw new Error('Connection rejected. Please approve the connection in Freighter.');
    }

    // Return the address from requestAccess (it already provides the address)
    return accessResult.address;
  } catch (error: unknown) {
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message?.includes('User declined')) {
        throw new Error('Connection rejected by user.');
      }
      throw error;
    }

    throw new Error('Failed to connect to Freighter wallet. Please try again.');
  }
};

/**
 * Gets the currently connected public key without requesting access
 * Returns null if not connected or if Freighter is not installed
 */
export const getCurrentPublicKey = async (): Promise<string | null> => {
  try {
    const installed = await isFreighterInstalled();
    if (!installed) {
      return null;
    }
    
    const addressResult = await getAddress();
    return addressResult.error ? null : addressResult.address;
  } catch {
    return null;
  }
};
