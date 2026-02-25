/**
 * Contract Arguments Builder
 *
 * Converts indexed stats and account addresses into properly typed
 * ScVal arguments ready for Soroban contract invocation.
 *
 * This module bridges the gap between JavaScript data (from API responses
 * and frontend state) and the ScVal types required by Soroban contracts.
 *
 * @module contractArgsBuilder
 */

import { xdr } from "stellar-sdk";
import {
  toScVal,
  addressToScVal,
  objectToScValMap,
  isConversionError,
  type ConversionResult,
  type ScValTargetType,
} from "./sorobanConverter";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Validated contract arguments ready for invocation.
 */
export interface ContractArgs {
  args: xdr.ScVal[];
  /** Human-readable description of each argument for debugging */
  argDescriptions: string[];
}

/**
 * Result of building contract arguments.
 */
export type BuildArgsResult =
  | { success: true; data: ContractArgs }
  | { success: false; errors: string[] };

/**
 * Extended stats with optional timeframe for contract submission.
 */
export interface ContractStatsInput {
  totalVolume: number;
  mostActiveAsset: string;
  contractCalls: number;
  timeframe?: string;
  /** Additional key-value pairs to include */
  [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Unwrap a ConversionResult, pushing any error into the errors array
 * and returning the ScVal on success (or null on failure).
 */
function unwrap(
  result: ConversionResult,
  label: string,
  errors: string[],
): xdr.ScVal | null {
  if (isConversionError(result)) {
    errors.push(`${label}: ${result.error}`);
    return null;
  }
  return result.value;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validates the indexed stats before attempting conversion.
 * Returns an array of error messages (empty if valid).
 */
export function validateIndexedStats(stats: ContractStatsInput): string[] {
  const errors: string[] = [];

  if (stats === null || stats === undefined || typeof stats !== "object") {
    return ["Stats must be a non-null object"];
  }

  // totalVolume validation
  if (typeof stats.totalVolume !== "number") {
    errors.push(
      `totalVolume must be a number, got ${typeof stats.totalVolume}`,
    );
  } else if (stats.totalVolume < 0) {
    errors.push(`totalVolume must be non-negative, got ${stats.totalVolume}`);
  } else if (!Number.isFinite(stats.totalVolume)) {
    errors.push("totalVolume must be a finite number");
  }

  // mostActiveAsset validation
  if (typeof stats.mostActiveAsset !== "string") {
    errors.push(
      `mostActiveAsset must be a string, got ${typeof stats.mostActiveAsset}`,
    );
  } else if (stats.mostActiveAsset.trim().length === 0) {
    errors.push("mostActiveAsset must not be empty");
  }

  // contractCalls validation
  if (typeof stats.contractCalls !== "number") {
    errors.push(
      `contractCalls must be a number, got ${typeof stats.contractCalls}`,
    );
  } else if (!Number.isInteger(stats.contractCalls)) {
    errors.push(`contractCalls must be an integer, got ${stats.contractCalls}`);
  } else if (stats.contractCalls < 0) {
    errors.push(
      `contractCalls must be non-negative, got ${stats.contractCalls}`,
    );
  }

  // timeframe validation (optional)
  if (stats.timeframe !== undefined && typeof stats.timeframe !== "string") {
    errors.push(
      `timeframe must be a string if provided, got ${typeof stats.timeframe}`,
    );
  }

  return errors;
}

// ─── Argument Builders ──────────────────────────────────────────────────────

/**
 * Builds an ordered array of ScVal contract arguments from indexed stats
 * and an account address.
 *
 * Argument order (matching contract function signature):
 *   0: accountAddress → ScVal.scvAddress
 *   1: totalVolume    → ScVal.scvU64  (BigInt)
 *   2: mostActiveAsset→ ScVal.scvString
 *   3: contractCalls  → ScVal.scvU32
 *   4: timeframe      → ScVal.scvString (optional, defaults to "all")
 *
 * @param stats - The indexed stats to convert
 * @param accountAddress - The Stellar account address (G... or C...)
 * @returns BuildArgsResult with the arguments or validation errors
 *
 * @example
 * ```ts
 * const result = buildContractArgs(
 *   { totalVolume: 45000, mostActiveAsset: 'XLM', contractCalls: 120 },
 *   'GABC...XYZ'
 * );
 *
 * if (result.success) {
 *   // Use result.data.args in contract invocation
 *   contract.call('submit_stats', ...result.data.args);
 * } else {
 *   console.error('Build failed:', result.errors);
 * }
 * ```
 */
export function buildContractArgs(
  stats: ContractStatsInput,
  accountAddress: string,
): BuildArgsResult {
  // 1. Validate input
  const validationErrors = validateIndexedStats(stats);
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  const errors: string[] = [];
  const args: xdr.ScVal[] = [];
  const argDescriptions: string[] = [];

  // 2. Convert account address → ScVal.scvAddress
  const addrVal = unwrap(
    addressToScVal(accountAddress),
    "accountAddress",
    errors,
  );
  if (addrVal) {
    args.push(addrVal);
    argDescriptions.push(`accountAddress: ${accountAddress}`);
  }

  // 3. Convert totalVolume → ScVal.scvU64
  const volumeVal = unwrap(
    toScVal(stats.totalVolume, "u64"),
    "totalVolume",
    errors,
  );
  if (volumeVal) {
    args.push(volumeVal);
    argDescriptions.push(`totalVolume: ${stats.totalVolume} (u64)`);
  }

  // 4. Convert mostActiveAsset → ScVal.scvString
  const assetVal = unwrap(
    toScVal(stats.mostActiveAsset, "string"),
    "mostActiveAsset",
    errors,
  );
  if (assetVal) {
    args.push(assetVal);
    argDescriptions.push(
      `mostActiveAsset: "${stats.mostActiveAsset}" (string)`,
    );
  }

  // 5. Convert contractCalls → ScVal.scvU32
  const callsVal = unwrap(
    toScVal(stats.contractCalls, "u32"),
    "contractCalls",
    errors,
  );
  if (callsVal) {
    args.push(callsVal);
    argDescriptions.push(`contractCalls: ${stats.contractCalls} (u32)`);
  }

  // 6. Convert timeframe → ScVal.scvString  (optional, default "all")
  const timeframe = stats.timeframe ?? "all";
  const timeframeVal = unwrap(
    toScVal(timeframe, "string"),
    "timeframe",
    errors,
  );
  if (timeframeVal) {
    args.push(timeframeVal);
    argDescriptions.push(`timeframe: "${timeframe}" (string)`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { args, argDescriptions },
  };
}

/**
 * Builds contract arguments where the stats are passed as a single
 * ScVal map instead of individual arguments.
 *
 * This is useful for contracts that accept a single map parameter
 * containing all statistics.
 *
 * Argument order:
 *   0: accountAddress → ScVal.scvAddress
 *   1: statsMap       → ScVal.scvMap({...})
 *
 * @param stats - The indexed stats to convert
 * @param accountAddress - The Stellar account address
 * @returns BuildArgsResult with the arguments or errors
 */
export function buildContractArgsAsMap(
  stats: ContractStatsInput,
  accountAddress: string,
): BuildArgsResult {
  // Validate
  const validationErrors = validateIndexedStats(stats);
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  const errors: string[] = [];
  const args: xdr.ScVal[] = [];
  const argDescriptions: string[] = [];

  // 1. Account address
  const addrVal = unwrap(
    addressToScVal(accountAddress),
    "accountAddress",
    errors,
  );
  if (addrVal) {
    args.push(addrVal);
    argDescriptions.push(`accountAddress: ${accountAddress}`);
  }

  // 2. Stats as a map
  const statsForMap: Record<string, unknown> = {
    total_volume: stats.totalVolume,
    most_active_asset: stats.mostActiveAsset,
    contract_calls: stats.contractCalls,
  };
  if (stats.timeframe) {
    statsForMap.timeframe = stats.timeframe;
  }

  const typeHints: Record<string, ScValTargetType> = {
    total_volume: "u64",
    most_active_asset: "string",
    contract_calls: "u32",
    timeframe: "string",
  };

  const mapVal = unwrap(
    objectToScValMap(statsForMap, typeHints),
    "statsMap",
    errors,
  );
  if (mapVal) {
    args.push(mapVal);
    argDescriptions.push(
      "statsMap: { total_volume, most_active_asset, contract_calls }",
    );
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { args, argDescriptions },
  };
}

/**
 * Logs contract arguments in a human-readable format for debugging.
 *
 * @param result - The build result to log
 * @param label  - Optional label for the log group
 */
export function logContractArgs(
  result: BuildArgsResult,
  label = "Contract Arguments",
): void {
  if (result.success === true) {
    console.group(`✅ ${label}`);
    result.data.argDescriptions.forEach((desc, i) => {
      console.log(`  [${i}] ${desc}`);
    });
    console.log(`  Total arguments: ${result.data.args.length}`);
    console.groupEnd();
  }
  if (result.success === false) {
    console.group(`❌ ${label} - Build Failed`);
    result.errors.forEach((err) => {
      console.error(`  • ${err}`);
    });
    console.groupEnd();
  }
}
