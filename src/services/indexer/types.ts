/**
 * Type definitions for the Stellar Horizon API Indexer Service
 * 
 * These types define the structure of transaction data from the Stellar Horizon API
 * and the interfaces that the indexer service will implement.
 */

import { Network } from '../../config';

/**
 * Timeframe options for filtering transactions
 */
export type Timeframe = '1w' | '2w' | '1m' | '3m' | '6m' | '1y';

/**
 * Stellar Horizon API transaction record
 */
export interface HorizonTransaction {
  id: string;
  paging_token: string;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  source_account_sequence: string;
  fee_account: string;
  fee_charged: string;
  operation_count: number;
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr: string;
  fee_meta_xdr: string;
  memo_type: string;
  memo?: string;
  signatures: string[];
  valid_after?: string;
  valid_before?: string;
  successful: boolean;
}

/**
 * Stellar Horizon API operation record
 */
export interface HorizonOperation {
  id: string;
  paging_token: string;
  transaction_successful: boolean;
  source_account: string;
  type: string;
  type_i: number;
  created_at: string;
  transaction_hash: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  from?: string;
  to?: string;
  amount?: string;
  function?: string;
  contract?: string;
  contract_id?: string;
}

/**
 * Stellar Horizon API pagination response
 */
export interface HorizonPageResponse<T> {
  _links: {
    self: { href: string };
    next?: { href: string };
    prev?: { href: string };
  };
  _embedded: {
    records: T[];
  };
}

/**
 * Indexed transaction with operations
 */
export interface IndexedTransaction {
  transaction: HorizonTransaction;
  operations: HorizonOperation[];
}

/**
 * Options for fetching account transactions
 */
export interface FetchAccountTransactionsOptions {
  accountId: string;
  network: Network;
  timeframe?: Timeframe;
  limit?: number;
  cursor?: string;
  order?: 'asc' | 'desc';
}

/**
 * Result of fetching account transactions
 */
export interface FetchAccountTransactionsResult {
  transactions: IndexedTransaction[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Indexer Service Interface
 * 
 * This interface defines the contract that the indexer service must implement.
 * The actual implementation will be created in issue #34.
 */
export interface IndexerService {
  /**
   * Fetches all transactions for an account within a specified timeframe
   * 
   * @param options - Configuration for fetching transactions
   * @returns Promise resolving to indexed transactions with pagination info
   */
  fetchAccountTransactions(
    options: FetchAccountTransactionsOptions
  ): Promise<FetchAccountTransactionsResult>;

  /**
   * Filters transactions by timeframe
   * 
   * @param transactions - Array of indexed transactions
   * @param timeframe - Timeframe to filter by
   * @returns Filtered array of transactions
   */
  filterByTimeframe(
    transactions: IndexedTransaction[],
    timeframe: Timeframe
  ): IndexedTransaction[];

  /**
   * Validates transaction data structure
   * 
   * @param transaction - Transaction to validate
   * @returns True if transaction is valid
   */
  validateTransaction(transaction: HorizonTransaction): boolean;
}
