/**
 * GasRoute Oracle - Chain Configurations & Gas Estimation
 * Bounty #4: GasRoute Oracle
 */

import { ChainConfig, ChainId, GasRequest, ChainGasEstimate, GasResponse } from "./types";

export const CHAINS: Record<ChainId, ChainConfig> = {
  ethereum: {
    name: "ethereum",
    rpcUrl: "",
    blockTimeMs: 12000,
    nativeToken: "ETH",
    nativeTokenPriceUsd: 2600,
    gasOracleUrl: "https://api.etherscan.io/api?module=gastracker&action=gasoracle",
  },
  arbitrum: {
    name: "arbitrum",
    rpcUrl: "",
    blockTimeMs: 250,
    nativeToken: "ETH",
    nativeTokenPriceUsd: 2600,
  },
  optimism: {
    name: "optimism",
    rpcUrl: "",
    blockTimeMs: 2000,
    nativeToken: "ETH",
    nativeTokenPriceUsd: 2600,
  },
  base: {
    name: "base",
    rpcUrl: "",
    blockTimeMs: 2000,
    nativeToken: "ETH",
    nativeTokenPriceUsd: 2600,
  },
  polygon: {
    name: "polygon",
    rpcUrl: "",
    blockTimeMs: 2000,
    nativeToken: "MATIC",
    nativeTokenPriceUsd: 0.8,
    gasOracleUrl: "https://gasstation-mainnet.matic.network/v2",
  },
  bsc: {
    name: "bsc",
    rpcUrl: "",
    blockTimeMs: 3000,
    nativeToken: "BNB",
    nativeTokenPriceUsd: 300,
  },
  avalanche: {
    name: "avalanche",
    rpcUrl: "",
    blockTimeMs: 2000,
    nativeToken: "AVAX",
    nativeTokenPriceUsd: 25,
  },
};

export function getChainConfig(chain: ChainId): ChainConfig {
  const config = CHAINS[chain];
  if (!config) throw new Error(`Unknown chain: ${chain}`);
  return config;
}

export function getConfiguredChains(env: { [key: string]: string }): ChainId[] {
  const chains: ChainId[] = [];
  for (const chain of Object.keys(CHAINS) as ChainId[]) {
    const envKey = `${chain.toUpperCase()}_RPC_URL`;
    if (env[envKey]) {
      chains.push(chain);
    }
  }
  return chains;
}

async function fetchGasPriceEthereum(provider: any): Promise<{ baseFeeGwei: number; priorityFeeGwei: number }> {
  try {
    // Use eth_feeHistory for EIP-1559 fees
    const feeHistory = await provider.send("eth_feeHistory", ["0x4", "latest", [25, 50, 75]]);
    const baseFeeGwei = Number(feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1]) / 1e9;
    const priorityFees = feeHistory.reward.map((r: any[]) => Number(r[1]) / 1e9); // median
    const priorityFeeGwei = priorityFees.reduce((a: number, b: number) => a + b, 0) / priorityFees.length;
    return { baseFeeGwei, priorityFeeGwei };
  } catch {
    // Fallback to eth_gasPrice
    const gasPrice = await provider.getFeeData();
    const gasPriceGwei = Number(gasPrice.gasPrice || 0) / 1e9;
    return { baseFeeGwei: gasPriceGwei * 0.8, priorityFeeGwei: gasPriceGwei * 0.2 };
  }
}

async function fetchGasPriceGeneric(provider: any): Promise<{ gasPriceGwei: number }> {
  try {
    const feeData = await provider.getFeeData();
    const gasPriceGwei = Number(feeData.gasPrice || 0) / 1e9;
    return { gasPriceGwei };
  } catch {
    return { gasPriceGwei: 0 };
  }
}

function calculateBusyLevel(baseFeeGwei: number, chain: ChainId): "low" | "medium" | "high" | "critical" {
  const thresholds: Record<ChainId, { low: number; medium: number; high: number }> = {
    ethereum: { low: 15, medium: 30, high: 60 },
    arbitrum: { low: 0.1, medium: 0.5, high: 1 },
    optimism: { low: 0.1, medium: 0.5, high: 1 },
    base: { low: 0.1, medium: 0.5, high: 1 },
    polygon: { low: 10, medium: 50, high: 200 },
    bsc: { low: 3, medium: 5, high: 10 },
    avalanche: { low: 20, medium: 50, high: 100 },
  };
  
  const t = thresholds[chain] || thresholds.ethereum;
  if (baseFeeGwei >= t.high) return "critical";
  if (baseFeeGwei >= t.medium) return "high";
  if (baseFeeGwei >= t.low) return "medium";
  return "low";
}

function estimateConfirmTime(busyLevel: string, blockTimeMs: number): number {
  const multipliers = { low: 1, medium: 2, high: 5, critical: 10 };
  return (multipliers[busyLevel as keyof typeof multipliers] || 2) * (blockTimeMs / 1000);
}

export async function estimateGasForChain(
  provider: any,
  chain: ChainId,
  request: GasRequest
): Promise<ChainGasEstimate | null> {
  try {
    const chainConfig = CHAINS[chain];
    if (!chainConfig.rpcUrl) return null;
    
    let baseFeeGwei: number;
    let priorityFeeGwei: number;
    let gasPriceGwei: number;
    
    if (chain === "ethereum") {
      const fees = await fetchGasPriceEthereum(provider);
      baseFeeGwei = fees.baseFeeGwei;
      priorityFeeGwei = fees.priorityFeeGwei;
      gasPriceGwei = baseFeeGwei + priorityFeeGwei;
    } else {
      const fees = await fetchGasPriceGeneric(provider);
      gasPriceGwei = fees.gasPriceGwei;
      baseFeeGwei = gasPriceGwei * 0.8;
      priorityFeeGwei = gasPriceGwei * 0.2;
    }
    
    // Adjust for priority
    const priorityMultipliers = { low: 0.8, medium: 1.0, high: 1.5 };
    const mult = priorityMultipliers[request.priority || "medium"];
    const effectivePriorityFee = priorityFeeGwei * mult;
    const effectiveGasPriceGwei = baseFeeGwei + effectivePriorityFee;
    
    // Calculate fee
    const gasUnits = BigInt(request.gasUnitsEst);
    const calldataGas = BigInt(request.calldataSizeBytes * 16); // ~16 gas per byte
    const totalGas = gasUnits + calldataGas;
    
    const feeWei = totalGas * BigInt(Math.round(effectiveGasPriceGwei * 1e9));
    const feeNative = feeWei.toString();
    const feeEth = Number(feeWei) / 1e18;
    const feeUsd = feeEth * chainConfig.nativeTokenPriceUsd;
    
    const busyLevel = calculateBusyLevel(baseFeeGwei, chain);
    const estimatedConfirmTimeSec = estimateConfirmTime(busyLevel, chainConfig.blockTimeMs);
    
    return {
      chain,
      feeNative,
      feeUsd,
      feeGwei: effectiveGasPriceGwei,
      baseFeeGwei,
      priorityFeeGwei: effectivePriorityFee,
      busyLevel,
      tipHint: `${Math.round(effectivePriorityFee)} gwei`,
      estimatedConfirmTimeSec,
      blockTimeMs: chainConfig.blockTimeMs,
      nativeToken: chainConfig.nativeToken,
      nativeTokenPriceUsd: chainConfig.nativeTokenPriceUsd,
    };
  } catch (e) {
    return null;
  }
}

export async function findBestGasRoute(request: GasRequest, env: { [key: string]: string }): Promise<GasResponse> {
  const chains = request.chainSet || getConfiguredChains(env);
  const warnings: string[] = [];
  
  if (chains.length === 0) {
    warnings.push("No chains configured with RPC URLs");
    return {
      recommendedChain: "ethereum",
      estimates: [],
      cheapestChain: "ethereum",
      fastestChain: "ethereum",
      warnings,
      timestamp: Date.now(),
    };
  }
  
  const estimates: ChainGasEstimate[] = [];
  
  for (const chain of chains) {
    const chainConfig = getChainConfig(chain);
    if (!chainConfig.rpcUrl) {
      warnings.push(`${chain}: RPC URL not configured`);
      continue;
    }
    
    // Import ethers dynamically to avoid issues
    const { ethers } = await import("ethers");
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    
    const estimate = await estimateGasForChain(provider, chain, request);
    if (estimate) {
      estimates.push(estimate);
    } else {
      warnings.push(`${chain}: Failed to estimate gas`);
    }
  }
  
  if (estimates.length === 0) {
    warnings.push("No valid gas estimates obtained");
    return {
      recommendedChain: chains[0],
      estimates: [],
      cheapestChain: chains[0],
      fastestChain: chains[0],
      warnings,
      timestamp: Date.now(),
    };
  }
  
  // Find cheapest (by USD)
  const cheapest = estimates.reduce((a, b) => a.feeUsd < b.feeUsd ? a : b);
  
  // Find fastest (by confirm time)
  const fastest = estimates.reduce((a, b) => a.estimatedConfirmTimeSec < b.estimatedConfirmTimeSec ? a : b);
  
  // Recommended: best balance of cost and speed (weighted score)
  const scored = estimates.map(e => ({
    ...e,
    score: (1 / e.feeUsd) * 0.7 + (1 / e.estimatedConfirmTimeSec) * 0.3,
  }));
  const recommended = scored.reduce((a, b) => a.score > b.score ? a : b);
  
  return {
    recommendedChain: recommended.chain,
    estimates,
    cheapestChain: cheapest.chain,
    fastestChain: fastest.chain,
    warnings,
    timestamp: Date.now(),
  };
}

export type { ChainConfig, ChainGasEstimate, GasResponse } from "./types";