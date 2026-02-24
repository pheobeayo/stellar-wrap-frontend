/**
 * Verify contract config without Jest. Run: npx tsx scripts/verify-contracts.mts
 */
import {
  isValidContractAddress,
  getContractAddress,
  getContractConfigForAllNetworks,
} from "../config/contracts";
import type { Network } from "../src/config";

const VALID_CONTRACT_ID =
  "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

function throws(name: string, fn: () => void) {
  try {
    fn();
    failed++;
    console.log(`  ✗ ${name} (expected throw)`);
  } catch {
    passed++;
    console.log(`  ✓ ${name}`);
  }
}

console.log("Contract config verification\n");

console.log("isValidContractAddress:");
ok("accepts valid 56-char C-prefix", isValidContractAddress(VALID_CONTRACT_ID));
ok(
  "accepts placeholder",
  isValidContractAddress("C".padEnd(56, "A"))
);
ok("rejects non-C prefix", !isValidContractAddress("G" + "A".repeat(55)));
ok("rejects wrong length", !isValidContractAddress("C" + "A".repeat(54)));
ok("rejects invalid base32", !isValidContractAddress("C" + "1".repeat(55)));

console.log("\ngetContractConfigForAllNetworks:");
const config = getContractConfigForAllNetworks();
ok("has mainnet", "mainnet" in config && !!config.mainnet?.contractAddress);
ok("has testnet", "testnet" in config && !!config.testnet?.contractAddress);
ok(
  "mainnet valid format",
  isValidContractAddress(config.mainnet!.contractAddress)
);
ok(
  "testnet valid format",
  isValidContractAddress(config.testnet!.contractAddress)
);

console.log("\ngetContractAddress:");
const mainnetAddr = getContractAddress("mainnet");
const testnetAddr = getContractAddress("testnet");
ok("mainnet address loaded", !!mainnetAddr && isValidContractAddress(mainnetAddr));
ok("testnet address loaded", !!testnetAddr && isValidContractAddress(testnetAddr));
throws("invalid network throws", () => getContractAddress("invalid" as Network));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
