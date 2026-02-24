/**
 * Unit tests for network-aware contract configuration.
 * Run with: npm test
 */

import {
  isValidContractAddress,
  getContractAddress,
  getContractConfigForAllNetworks,
} from "../config/contracts";
import { NETWORKS, type Network } from "../src/config";

const VALID_CONTRACT_ID =
  "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

describe("isValidContractAddress", () => {
  it("accepts valid 56-char C-prefix base32 address", () => {
    expect(isValidContractAddress(VALID_CONTRACT_ID)).toBe(true);
  });

  it("accepts placeholder address", () => {
    expect(isValidContractAddress("C" + "A".repeat(55))).toBe(true);
  });

  it("rejects non-C prefix", () => {
    expect(
      isValidContractAddress(
        "G" + "A".repeat(55)
      )
    ).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidContractAddress("C" + "A".repeat(54))).toBe(false);
    expect(isValidContractAddress("C" + "A".repeat(56))).toBe(false);
  });

  it("rejects invalid base32 characters", () => {
    expect(
      isValidContractAddress("C" + "1".repeat(55))
    ).toBe(false);
  });
});

describe("getContractConfigForAllNetworks", () => {
  it("returns config for mainnet and testnet", () => {
    const config = getContractConfigForAllNetworks();
    expect(config).toHaveProperty("mainnet");
    expect(config).toHaveProperty("testnet");
    expect(config.mainnet).toHaveProperty("contractAddress");
    expect(config.testnet).toHaveProperty("contractAddress");
  });

  it("returns valid contract address format for both networks", () => {
    const config = getContractConfigForAllNetworks();
    expect(isValidContractAddress(config.mainnet.contractAddress)).toBe(true);
    expect(isValidContractAddress(config.testnet.contractAddress)).toBe(true);
  });
});

describe("getContractAddress", () => {
  it("loads address for mainnet and testnet", () => {
    const mainnetAddr = getContractAddress(NETWORKS.MAINNET);
    const testnetAddr = getContractAddress(NETWORKS.TESTNET);
    expect(mainnetAddr).toBeTruthy();
    expect(testnetAddr).toBeTruthy();
    expect(isValidContractAddress(mainnetAddr)).toBe(true);
    expect(isValidContractAddress(testnetAddr)).toBe(true);
  });

  it("throws on invalid network", () => {
    expect(() => getContractAddress("invalid" as Network)).toThrow();
  });
});
