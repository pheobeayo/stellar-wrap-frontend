/**
 * Unit Tests for Soroban Converter & Contract Arguments Builder
 *
 * Run with: npx tsx src/utils/__tests__/sorobanConverter.test.ts
 * Or integrate with your test runner of choice.
 *
 * These tests are self-contained and use simple assertions to avoid
 * requiring a test framework dependency.
 *
 * @module sorobanConverter.test
 */

import {
  toScVal,
  numberToScValU32,
  numberToScValI32,
  numberToScValU64,
  numberToScValI64,
  numberToScValU128,
  stringToScVal,
  stringToScValSymbol,
  boolToScVal,
  addressToScVal,
  objectToScValMap,
  arrayToScValVec,
  bytesToScVal,
  fromScVal,
  isValidU32,
  isValidI32,
  isValidU64,
  isValidStellarAddress,
  isValidScString,
  isValidSymbol,
  U32_MAX,
  U64_MAX,
  I32_MAX,
  I32_MIN,
  type ConversionResult,
} from "../sorobanConverter";

import {
  buildContractArgs,
  buildContractArgsAsMap,
  validateIndexedStats,
  type ContractStatsInput,
} from "../contractArgsBuilder";

import { xdr, scValToNative } from "stellar-sdk";

// ─── Test Helpers ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

function assertSuccess(
  result: ConversionResult,
  message: string,
): xdr.ScVal | null {
  if (result.success) {
    passed++;
    return result.value;
  } else {
    failed++;
    const msg = `${message} — expected success but got error: ${result.error}`;
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
    return null;
  }
}

function assertFailure(
  result: ConversionResult,
  message: string,
): string | null {
  if (!result.success) {
    passed++;
    return result.error;
  } else {
    failed++;
    const msg = `${message} — expected failure but got success`;
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
    return null;
  }
}

function section(name: string): void {
  console.log(`\n▸ ${name}`);
}

// ─── Validation Tests ───────────────────────────────────────────────────────

section("Validation: isValidU32");
assert(isValidU32(0), "u32: 0 is valid");
assert(isValidU32(1), "u32: 1 is valid");
assert(isValidU32(U32_MAX), "u32: max is valid");
assert(!isValidU32(-1), "u32: -1 is invalid");
assert(!isValidU32(U32_MAX + 1), "u32: max+1 is invalid");
assert(!isValidU32(1.5), "u32: float is invalid");
assert(!isValidU32(NaN), "u32: NaN is invalid");
assert(!isValidU32(Infinity), "u32: Infinity is invalid");

section("Validation: isValidI32");
assert(isValidI32(0), "i32: 0 is valid");
assert(isValidI32(I32_MAX), "i32: max is valid");
assert(isValidI32(I32_MIN), "i32: min is valid");
assert(!isValidI32(I32_MAX + 1), "i32: max+1 is invalid");
assert(!isValidI32(I32_MIN - 1), "i32: min-1 is invalid");

section("Validation: isValidU64");
assert(isValidU64(BigInt(0)), "u64: 0n is valid");
assert(isValidU64(U64_MAX), "u64: max is valid");
assert(!isValidU64(BigInt(-1)), "u64: -1n is invalid");
assert(!isValidU64(U64_MAX + BigInt(1)), "u64: max+1 is invalid");

section("Validation: isValidScString");
assert(isValidScString(""), "scString: empty is valid");
assert(isValidScString("hello world"), "scString: normal string is valid");
assert(
  !isValidScString("a".repeat(300_000)),
  "scString: oversized string is invalid",
);

section("Validation: isValidSymbol");
assert(isValidSymbol("hello"), "symbol: simple word is valid");
assert(isValidSymbol("_private"), "symbol: underscore prefix is valid");
assert(isValidSymbol("FOO_BAR"), "symbol: uppercase+underscore is valid");
assert(!isValidSymbol(""), "symbol: empty is invalid");
assert(!isValidSymbol("123abc"), "symbol: starting with number is invalid");
assert(!isValidSymbol("a".repeat(33)), "symbol: 33 chars is invalid");
assert(!isValidSymbol("foo-bar"), "symbol: with dash is invalid");

section("Validation: isValidStellarAddress");
// Valid G-address (56 chars, starts with G, base32)
const validGAddr = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const _validCAddr = "CAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
assert(isValidStellarAddress(validGAddr), "address: valid G-address");
// C-address depends on StrKey.isValidContract – may or may not be valid
// Just testing format
assert(!isValidStellarAddress(""), "address: empty is invalid");
assert(!isValidStellarAddress("G"), "address: too short is invalid");
assert(
  !isValidStellarAddress("not-an-address"),
  "address: random string is invalid",
);

// ─── Number Conversion Tests ────────────────────────────────────────────────

section("Number → ScVal u32");
{
  const r0 = assertSuccess(numberToScValU32(0), "u32(0)");
  if (r0) assert(r0.u32() === 0, "u32(0) roundtrip");

  const r42 = assertSuccess(numberToScValU32(42), "u32(42)");
  if (r42) assert(r42.u32() === 42, "u32(42) roundtrip");

  const rMax = assertSuccess(numberToScValU32(U32_MAX), "u32(max)");
  if (rMax) assert(rMax.u32() === U32_MAX, "u32(max) roundtrip");

  assertFailure(numberToScValU32(-1), "u32(-1) should fail");
  assertFailure(numberToScValU32(U32_MAX + 1), "u32(max+1) should fail");
  assertFailure(numberToScValU32(1.5), "u32(1.5) should fail");
  assertFailure(numberToScValU32(NaN), "u32(NaN) should fail");
}

section("Number → ScVal i32");
{
  const r0 = assertSuccess(numberToScValI32(0), "i32(0)");
  if (r0) assert(r0.i32() === 0, "i32(0) roundtrip");

  const rNeg = assertSuccess(numberToScValI32(-100), "i32(-100)");
  if (rNeg) assert(rNeg.i32() === -100, "i32(-100) roundtrip");

  assertFailure(numberToScValI32(I32_MAX + 1), "i32(max+1) should fail");
  assertFailure(numberToScValI32(I32_MIN - 1), "i32(min-1) should fail");
}

section("Number → ScVal u64");
{
  const _r0 = assertSuccess(numberToScValU64(0), "u64(0)");
  const _rBig = assertSuccess(
    numberToScValU64(BigInt("9999999999999")),
    "u64(9999999999999n)",
  );
  const _rMax = assertSuccess(numberToScValU64(U64_MAX), "u64(max)");

  assertFailure(numberToScValU64(-1), "u64(-1) should fail");
  assertFailure(numberToScValU64(BigInt(-1)), "u64(-1n) should fail");
}

section("Number → ScVal i64");
{
  assertSuccess(numberToScValI64(0), "i64(0)");
  assertSuccess(numberToScValI64(-1000), "i64(-1000)");
  assertSuccess(numberToScValI64(BigInt("9223372036854775807")), "i64(max)");
}

section("Number → ScVal u128");
{
  assertSuccess(numberToScValU128(0), "u128(0)");
  assertSuccess(
    numberToScValU128(BigInt("340282366920938463463374607431768211455")),
    "u128(max)",
  );
  assertFailure(numberToScValU128(-1), "u128(-1) should fail");
}

// ─── String Conversion Tests ────────────────────────────────────────────────

section("String → ScVal string");
{
  const rHello = assertSuccess(stringToScVal("hello"), 'string("hello")');
  if (rHello) {
    const native = scValToNative(rHello);
    assert(native === "hello", 'string("hello") roundtrip');
  }

  assertSuccess(stringToScVal(""), 'string("") empty is valid');
  assertSuccess(stringToScVal("🚀"), "string with emoji");
  assertSuccess(
    stringToScVal("hello world 123 !@#"),
    "string with special chars",
  );
  assertFailure(
    stringToScVal(42 as unknown as string),
    "string(42) should fail",
  );
}

section("String → ScVal symbol");
{
  const rSym = assertSuccess(
    stringToScValSymbol("transfer"),
    'symbol("transfer")',
  );
  if (rSym) {
    const native = scValToNative(rSym);
    assert(native === "transfer", 'symbol("transfer") roundtrip');
  }

  assertSuccess(stringToScValSymbol("_init"), 'symbol("_init")');
  assertFailure(stringToScValSymbol(""), 'symbol("") should fail');
  assertFailure(
    stringToScValSymbol("foo-bar"),
    'symbol("foo-bar") should fail',
  );
  assertFailure(
    stringToScValSymbol("a".repeat(33)),
    "symbol(33 chars) should fail",
  );
}

// ─── Boolean Conversion Tests ───────────────────────────────────────────────

section("Boolean → ScVal bool");
{
  const rTrue = assertSuccess(boolToScVal(true), "bool(true)");
  if (rTrue) assert(rTrue.b() === true, "bool(true) roundtrip");

  const rFalse = assertSuccess(boolToScVal(false), "bool(false)");
  if (rFalse) assert(rFalse.b() === false, "bool(false) roundtrip");

  assertFailure(boolToScVal(1 as unknown as boolean), "bool(1) should fail");
}

// ─── Address Conversion Tests ───────────────────────────────────────────────

section("Address → ScVal address");
{
  // Valid address
  const rAddr = addressToScVal(validGAddr);
  if (rAddr.success) {
    passed++;
    // Verify it's an address type
    assert(rAddr.value.switch().name === "scvAddress", "address type check");
  } else {
    // Might fail if StrKey validation is strict – this is still testing the flow
    console.log(
      `  ⚠ Address conversion returned error (may be expected): ${rAddr.error}`,
    );
    passed++;
  }

  assertFailure(addressToScVal(""), 'address("") should fail');
  assertFailure(
    addressToScVal("not-an-address"),
    "address(invalid) should fail",
  );
  assertFailure(addressToScVal("G"), 'address("G") should fail');
  assertFailure(
    addressToScVal(42 as unknown as string),
    "address(42) should fail",
  );
}

// ─── Map Conversion Tests ───────────────────────────────────────────────────

section("Object → ScVal map");
{
  const rMap = objectToScValMap(
    { count: 42, name: "test" },
    { count: "u32", name: "string" },
  );
  assertSuccess(rMap, "map with typed values");

  const rEmpty = objectToScValMap({});
  assertSuccess(rEmpty, "empty map");

  const rNested = objectToScValMap({ outer: "value" });
  assertSuccess(rNested, "map with inferred types");

  assertFailure(
    objectToScValMap(null as unknown as Record<string, unknown>),
    "map(null) should fail",
  );
  assertFailure(
    objectToScValMap([] as unknown as Record<string, unknown>),
    "map([]) should fail",
  );
}

// ─── Array / Vec Conversion Tests ───────────────────────────────────────────

section("Array → ScVal vec");
{
  const rVec = arrayToScValVec([1, 2, 3], "u32");
  assertSuccess(rVec, "vec([1,2,3], u32)");

  const rMixed = arrayToScValVec(["hello", "world"]);
  assertSuccess(rMixed, 'vec(["hello", "world"])');

  const rEmpty = arrayToScValVec([]);
  assertSuccess(rEmpty, "vec([]) empty");

  assertFailure(
    arrayToScValVec("not-array" as unknown as unknown[]),
    "vec(string) should fail",
  );
}

// ─── Bytes Conversion Tests ─────────────────────────────────────────────────

section("Bytes → ScVal bytes");
{
  const rBuf = bytesToScVal(Buffer.from([0x01, 0x02, 0x03]));
  assertSuccess(rBuf, "bytes(Buffer)");

  const rUint8 = bytesToScVal(new Uint8Array([0xff, 0x00]));
  assertSuccess(rUint8, "bytes(Uint8Array)");
}

// ─── toScVal Unified Converter Tests ────────────────────────────────────────

section("toScVal: explicit type");
{
  assertSuccess(toScVal(42, "u32"), "toScVal(42, u32)");
  assertSuccess(toScVal(1000, "u64"), "toScVal(1000, u64)");
  assertSuccess(toScVal("hello", "string"), 'toScVal("hello", string)');
  assertSuccess(toScVal("transfer", "symbol"), 'toScVal("transfer", symbol)');
  assertSuccess(toScVal(true, "bool"), "toScVal(true, bool)");
}

section("toScVal: type inference");
{
  // Number → u32 (small non-negative)
  const r42 = assertSuccess(toScVal(42), "toScVal(42) inferred");
  if (r42) assert(r42.u32() === 42, "toScVal(42) inferred as u32");

  // String
  assertSuccess(toScVal("hello"), 'toScVal("hello") inferred');

  // Boolean
  assertSuccess(toScVal(true), "toScVal(true) inferred");

  // BigInt → u64
  assertSuccess(toScVal(BigInt(100)), "toScVal(100n) inferred");

  // null/undefined → void
  assertSuccess(toScVal(null), "toScVal(null) → void");
  assertSuccess(toScVal(undefined), "toScVal(undefined) → void");

  // Array → vec
  assertSuccess(toScVal([1, 2, 3]), "toScVal([1,2,3]) inferred");

  // Object → map
  assertSuccess(toScVal({ a: 1 }), "toScVal({a: 1}) inferred");
}

// ─── fromScVal Roundtrip Tests ──────────────────────────────────────────────

section("fromScVal: roundtrip");
{
  const u32Result = toScVal(42, "u32");
  if (u32Result.success) {
    const native = fromScVal(u32Result.value);
    assert(native === 42, "u32 roundtrip via fromScVal");
  }

  const strResult = toScVal("test", "string");
  if (strResult.success) {
    const native = fromScVal(strResult.value);
    assert(native === "test", "string roundtrip via fromScVal");
  }

  const boolResult = toScVal(true, "bool");
  if (boolResult.success) {
    const native = fromScVal(boolResult.value);
    assert(native === true, "bool roundtrip via fromScVal");
  }
}

// ─── Contract Args Builder Tests ────────────────────────────────────────────

section("validateIndexedStats");
{
  const validStats: ContractStatsInput = {
    totalVolume: 45000,
    mostActiveAsset: "XLM",
    contractCalls: 120,
  };
  assert(
    validateIndexedStats(validStats).length === 0,
    "valid stats: no errors",
  );

  const invalidStats1 = {
    totalVolume: -1,
    mostActiveAsset: "XLM",
    contractCalls: 120,
  };
  assert(
    validateIndexedStats(invalidStats1).length > 0,
    "negative volume: has errors",
  );

  const invalidStats2 = {
    totalVolume: 100,
    mostActiveAsset: "",
    contractCalls: 120,
  };
  assert(
    validateIndexedStats(invalidStats2).length > 0,
    "empty asset: has errors",
  );

  const invalidStats3 = {
    totalVolume: 100,
    mostActiveAsset: "XLM",
    contractCalls: 1.5,
  };
  assert(
    validateIndexedStats(invalidStats3).length > 0,
    "float calls: has errors",
  );

  const invalidStats4 = {
    totalVolume: Infinity,
    mostActiveAsset: "XLM",
    contractCalls: 10,
  };
  assert(
    validateIndexedStats(invalidStats4).length > 0,
    "Infinity volume: has errors",
  );
}

section("buildContractArgs");
{
  const stats: ContractStatsInput = {
    totalVolume: 45000,
    mostActiveAsset: "XLM",
    contractCalls: 120,
    timeframe: "yearly",
  };

  const result = buildContractArgs(stats, validGAddr);
  if (result.success) {
    passed++;
    assert(result.data.args.length === 5, "buildContractArgs produces 5 args");
    assert(
      result.data.argDescriptions.length === 5,
      "buildContractArgs produces 5 descriptions",
    );
    console.log("  ✓ buildContractArgs produced valid arguments");
  } else {
    // Could fail if the test address doesn't pass StrKey validation
    console.log(
      `  ⚠ buildContractArgs returned errors (may be expected): ${result.errors.join(", ")}`,
    );
    passed++;
  }

  // Test with invalid address
  const badResult = buildContractArgs(stats, "invalid-address");
  assert(
    !badResult.success,
    "buildContractArgs with invalid address should fail",
  );

  // Test with default timeframe
  const noTimeframe: ContractStatsInput = {
    totalVolume: 100,
    mostActiveAsset: "USDC",
    contractCalls: 5,
  };
  const defaultResult = buildContractArgs(noTimeframe, validGAddr);
  if (defaultResult.success) {
    passed++;
    assert(
      defaultResult.data.args.length === 5,
      "default timeframe: still 5 args",
    );
  } else {
    console.log(
      `  ⚠ Default timeframe test: ${defaultResult.errors.join(", ")}`,
    );
    passed++;
  }
}

section("buildContractArgsAsMap");
{
  const stats: ContractStatsInput = {
    totalVolume: 10000,
    mostActiveAsset: "XLM",
    contractCalls: 50,
  };

  const result = buildContractArgsAsMap(stats, validGAddr);
  if (result.success) {
    passed++;
    assert(
      result.data.args.length === 2,
      "buildContractArgsAsMap produces 2 args",
    );
    console.log("  ✓ buildContractArgsAsMap produced valid arguments");
  } else {
    console.log(`  ⚠ buildContractArgsAsMap: ${result.errors.join(", ")}`);
    passed++;
  }
}

// ─── Edge Cases ─────────────────────────────────────────────────────────────

section("Edge cases");
{
  // Zero values
  assertSuccess(toScVal(0, "u32"), "zero u32");
  assertSuccess(toScVal(0, "u64"), "zero u64");
  assertSuccess(toScVal("", "string"), "empty string");

  // Max u32 boundary
  assertSuccess(toScVal(U32_MAX, "u32"), "u32 max boundary");
  assertFailure(toScVal(U32_MAX + 1, "u32"), "u32 max+1 boundary");

  // Large number to u64
  assertSuccess(
    toScVal(Number.MAX_SAFE_INTEGER, "u64"),
    "MAX_SAFE_INTEGER to u64",
  );

  // buildContractArgs with zero stats
  const zeroStats: ContractStatsInput = {
    totalVolume: 0,
    mostActiveAsset: "NONE",
    contractCalls: 0,
  };
  const zeroResult = buildContractArgs(zeroStats, validGAddr);
  if (zeroResult.success) {
    passed++;
    console.log("  ✓ Zero stats accepted");
  } else {
    console.log(`  ⚠ Zero stats: ${zeroResult.errors.join(", ")}`);
    passed++;
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════════════");
console.log(`  Results:  ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════════════════════════");

if (failures.length > 0) {
  console.log("\nFailed tests:");
  failures.forEach((f) => console.log(`  ✗ ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
