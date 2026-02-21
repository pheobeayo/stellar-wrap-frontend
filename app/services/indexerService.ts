/**
 * Stellar Horizon Indexing Service
 * Fetches and processes transaction data from Stellar Horizon API
 */

import { getHorizonServer } from "@/app/utils/stellarClient";
import { IndexerResult, PERIODS, WrapPeriod } from "@/app/utils/indexer";
import { calculateAchievements } from "./achievementCalculator";

const MAX_CONCURRENT_REQUESTS = 5;

interface QueueItem {
  cursor?: string;
  resolve: () => void;
  reject: () => void;
}

class ConcurrencyManager {
  private active = 0;
  private queue: QueueItem[] = [];

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.active >= MAX_CONCURRENT_REQUESTS) {
      await new Promise<void>((resolve) => {
        this.queue.push({
          resolve: () => resolve(),
          reject: () => {},
        });
      });
    }

    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }
}

const concurrencyManager = new ConcurrencyManager();

export async function indexAccount(
  accountId: string,
  network: "mainnet" | "testnet" = "mainnet",
  period: WrapPeriod = "monthly",
): Promise<IndexerResult> {
  const server = getHorizonServer(network);
  const days = PERIODS[period];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const allTransactions: unknown[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  try {
    // Fetch paginated transactions with controlled concurrency
    while (hasMore) {
      const response = await concurrencyManager.run(async () => {
        const builder = server.transactions().forAccount(accountId).limit(200);
        if (cursor) {
          builder.cursor(cursor);
        }
        return builder.call();
      });

      if (!response.records || response.records.length === 0) {
        hasMore = false;
        break;
      }

      // Filter transactions by date and check for early termination
      const recordsInRange = response.records.filter((tx) => {
        const txData = tx as unknown as Record<string, unknown>;
        const txDate = new Date(txData.created_at as string);
        return txDate >= cutoffDate;
      });

      allTransactions.push(...recordsInRange);

      // If we've started finding transactions outside our range, we can stop
      if (
        response.records.some((tx) => {
          const txData = tx as unknown as Record<string, unknown>;
          return new Date(txData.created_at as string) < cutoffDate;
        })
      ) {
        hasMore = false;
        break;
      }

      // Get next page cursor
      const pageResponse = response as unknown as Record<string, unknown>;
      if (pageResponse.paging_token && response.records.length === 200) {
        cursor = String(pageResponse.paging_token);
      } else {
        hasMore = false;
      }
    }

    // Calculate achievements from transactions
    const typedTransactions = allTransactions.map((tx) => {
      const txData = tx as Record<string, unknown>;
      return {
        created_at: String(txData.created_at || new Date().toISOString()),
        memo: txData.memo ? String(txData.memo) : undefined,
        operations: Array.isArray(txData.operations) ? txData.operations : [],
      };
    });
    const result = calculateAchievements(typedTransactions);
    result.accountId = accountId;

    return result;
  } catch (error) {
    console.error(`Error indexing account ${accountId}:`, error);
    throw error;
  }
}
