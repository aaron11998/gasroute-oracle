/**
 * GasRoute Oracle - x402 Gas Endpoint
 * Bounty #4: GasRoute Oracle
 */

import { GasRequest, GasResponse, X402Manifest } from "./types";
import { findBestGasRoute } from "./chains";

const X402_NETWORK = "eip155:8453";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ORG_EVM_PAYTO = "0x76EfB727cd3271C7DE22f92437Be212766C9631f";

export async function handleGas(request: Request, env: { [key: string]: string }): Promise<Response> {
  try {
    const body: GasRequest = await request.json();
    
    // Validate required fields
    if (!body.calldataSizeBytes || !body.gasUnitsEst) {
      return new Response(JSON.stringify({ error: "Missing required fields: calldataSizeBytes, gasUnitsEst" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Find best gas route
    const result = await findBestGasRoute(body, env);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleX402Manifest(): Promise<Response> {
  const manifest: X402Manifest = {
    x402Version: 2,
    resource: "/gas",
    description: "GasRoute Oracle: Cheapest chain and timing for transactions with live gas estimates",
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        asset: USDC_BASE,
        payTo: ORG_EVM_PAYTO,
        maxAmountRequired: "10000", // $0.01 in USDC base units
        resource: "/gas",
        description: "One /gas API call",
      },
    ],
    free: ["/health", "/.well-known/x402.json"],
  };
  
  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}