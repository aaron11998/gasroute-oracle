/**
 * GasRoute Oracle - Main Entry Point
 * Bounty #4: GasRoute Oracle
 * Cloudflare Worker with x402 payment gating
 */

import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";
import { handleHealth } from "./health";
import { handleGas, handleX402Manifest } from "./gas_endpoint";

type Bindings = {
  ORG_EVM_PAYTO: string;
  ETHEREUM_RPC_URL: string;
  ARBITRUM_RPC_URL: string;
  OPTIMISM_RPC_URL: string;
  BASE_RPC_URL: string;
  POLYGON_RPC_URL: string;
  BSC_RPC_URL: string;
  AVALANCHE_RPC_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Free endpoints
app.get("/health", async (c) => {
  const health = await handleHealth(c.env);
  return c.json(health);
});

app.get("/.well-known/x402.json", async (c) => {
  return handleX402Manifest();
});

// Paid endpoint with x402
app.use("/gas", async (c, next) => {
  const mw = paymentMiddleware(c.env.ORG_EVM_PAYTO as `0x${string}`, {
    "/gas": {
      price: "$0.01",
      network: "base",
      config: {
        description: "GasRoute Oracle: Cheapest chain and timing for transactions",
      },
    },
  });
  return mw(c, next);
});

app.post("/gas", async (c) => {
  return handleGas(c.req.raw, c.env);
});

export default app;