import { describe, it, expect } from "vitest";
import { CHAINS, getChainConfig, getConfiguredChains } from "../src/chains";
import { ChainId } from "../src/types";

describe("Chains Configuration", () => {
  it("should have all 7 chains configured", () => {
    expect(Object.keys(CHAINS).length).toBe(7);
    expect(CHAINS.ethereum).toBeDefined();
    expect(CHAINS.arbitrum).toBeDefined();
    expect(CHAINS.optimism).toBeDefined();
    expect(CHAINS.base).toBeDefined();
    expect(CHAINS.polygon).toBeDefined();
    expect(CHAINS.bsc).toBeDefined();
    expect(CHAINS.avalanche).toBeDefined();
  });

  it("should have required properties for each chain", () => {
    const chains: ChainId[] = ["ethereum", "arbitrum", "optimism", "base", "polygon", "bsc", "avalanche"];
    for (const chain of chains) {
      const config = CHAINS[chain];
      expect(config.name).toBe(chain);
      expect(config.blockTimeMs).toBeGreaterThan(0);
      expect(config.nativeToken).toBeDefined();
      expect(config.nativeTokenPriceUsd).toBeGreaterThan(0);
    }
  });

  it("should have gas oracle URL for Ethereum", () => {
    const eth = CHAINS.ethereum;
    expect(eth.gasOracleUrl).toBeDefined();
    expect(eth.gasOracleUrl).toContain("etherscan");
  });
});

describe("Chain Helpers", () => {
  it("getChainConfig should return correct config", () => {
    const eth = getChainConfig("ethereum");
    expect(eth.name).toBe("ethereum");
    expect(eth.blockTimeMs).toBe(12000);
    expect(eth.nativeToken).toBe("ETH");
  });

  it("getChainConfig should throw for unknown chain", () => {
    expect(() => getChainConfig("unknown" as ChainId)).toThrow();
  });

  it("getConfiguredChains should filter by env vars", () => {
    const env = {
      ETHEREUM_RPC_URL: "https://eth.example.com",
      ARBITRUM_RPC_URL: "https://arb.example.com",
    };
    const configured = getConfiguredChains(env);
    expect(configured).toContain("ethereum");
    expect(configured).toContain("arbitrum");
    expect(configured).not.toContain("optimism");
  });

  it("getConfiguredChains should return empty for no config", () => {
    const configured = getConfiguredChains({});
    expect(configured.length).toBe(0);
  });
});