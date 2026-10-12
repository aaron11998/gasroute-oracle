/**
 * GasRoute Oracle - Shared Types
 * Bounty #4: GasRoute Oracle
 */

// Supported chains
export type ChainId = "ethereum" | "arbitrum" | "optimism" | "base" | "polygon" | "bsc" | "avalanche";

// Chain configuration
export interface ChainConfig {
  name: ChainId;
  rpcUrl: string;
  blockTimeMs: number;
  nativeToken: string;
  nativeTokenPriceUsd: number; // Fallback price
  gasOracleUrl?: string; // For chains with gas oracle APIs
}

// Gas request
export interface GasRequest {
  chainSet?: ChainId[]; // Chains to consider (default: all configured)
  calldataSizeBytes: number; // Size of calldata in bytes
  gasUnitsEst: number; // Estimated gas units needed
  priority?: "low" | "medium" | "high"; // Priority level for gas estimation
}

// Gas estimate for a single chain
export interface ChainGasEstimate {
  chain: ChainId;
  feeNative: string; // Fee in native token (wei as string)
  feeUsd: number; // Fee in USD
  feeGwei: number; // Gas price in gwei
  baseFeeGwei?: number; // Current base fee (EIP-1559)
  priorityFeeGwei?: number; // Suggested priority fee
  busyLevel: "low" | "medium" | "high" | "critical"; // Network congestion level
  tipHint: string; // Suggested priority fee (e.g., "2 gwei")
  estimatedConfirmTimeSec: number; // Estimated confirmation time
  blockTimeMs: number;
  nativeToken: string;
  nativeTokenPriceUsd: number;
}

// Gas response
export interface GasResponse {
  recommendedChain: ChainId;
  estimates: ChainGasEstimate[];
  cheapestChain: ChainId;
  fastestChain: ChainId;
  warnings: string[];
  timestamp: number;
}

// Health endpoint response
export interface HealthResponse {
  status: "ok" | "degraded";
  chains: Record<ChainId, { configured: boolean; lastBlock?: number; gasPriceGwei?: number }>;
  timestamp: number;
}

// x402 manifest
export interface X402Manifest {
  x402Version: number;
  resource: string;
  description: string;
  accepts: Array<{
    scheme: "exact";
    network: string;
    asset: string;
    payTo: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
  }>;
  free: string[];
}