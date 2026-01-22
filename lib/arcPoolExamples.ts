/**
 * Example Arc Pool Integration Guide
 * 
 * This file demonstrates how to integrate Arc pool contracts with your application.
 */
"use client";

import {
  getSwapQuote,
  getPoolBalances,
  prepareSwapTransaction,
  listAvailablePools,
  getPoolInfo,
  ARC_POOLS,
} from "@/lib/arcNetwork";
import { useArcPools } from "@/lib/useArcPools";

// ============================================================================
// EXAMPLE 1: Basic Pool Query
// ============================================================================

export async function example_getPoolBalances() {
  // Get balances for USDC/EURC pool
  const poolAddress = ARC_POOLS.pools["USDC/EURC"];

  const [balance0, balance1] = await getPoolBalances(poolAddress);

  console.log("USDC Balance:", balance0);
  console.log("EURC Balance:", balance1);
}

// ============================================================================
// EXAMPLE 2: Get a Swap Quote
// ============================================================================

export async function example_getSwapQuote() {
  const poolAddress = ARC_POOLS.pools["USDC/EURC"];

  // Swap 1000 USDC (with 18 decimals) to EURC
  const amountIn = (BigInt(1000) * BigInt(10) ** BigInt(18)).toString();

  const amountOut = await getSwapQuote(
    poolAddress,
    0, // USDC is token 0
    1, // EURC is token 1
    amountIn
  );

  console.log("Input: 1000 USDC");
  console.log("Output: " + (BigInt(amountOut) / (BigInt(10) ** BigInt(18))).toString() + " EURC");
}

// ============================================================================
// EXAMPLE 3: Prepare a Swap Transaction (for signing with Privy)
// ============================================================================

export function example_prepareSwap() {
  const poolAddress = ARC_POOLS.pools["USDC/EURC"];
  const amountIn = (BigInt(1000) * BigInt(10) ** BigInt(18)).toString();
  const expectedAmountOut = (BigInt(950) * BigInt(10) ** BigInt(18)).toString(); // 95 EURC (5% slippage)
  const minAmountOut = (BigInt(expectedAmountOut) * BigInt(95)) / BigInt(100); // 5% slippage protection

  const txData = prepareSwapTransaction(
    poolAddress,
    0, // USDC
    1, // EURC
    amountIn,
    minAmountOut.toString()
  );

  console.log("Transaction ready to sign:");
  console.log({
    to: txData.to,
    data: txData.data,
    value: txData.value,
  });

  // This txData can be passed to Privy's sendTransaction()
  return txData;
}

// ============================================================================
// EXAMPLE 4: React Hook Usage in a Component
// ============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */

export function ExampleSwapComponent() {
  const {
    poolState,
    swapQuote,
    fetchPoolBalances,
    getQuote,
    prepareSwap,
    listPools,
    routerAddress,
  } = useArcPools();

  // On component mount, fetch available pools
  const pools = listPools();
  console.log("Available pools:", pools);

  // Fetch balances for USDC/EURC
  const handleFetchBalances = async () => {
    const poolAddress = ARC_POOLS.pools["USDC/EURC"];
    await fetchPoolBalances(poolAddress);
  };

  // Get a quote
  const handleGetQuote = async () => {
    const poolAddress = ARC_POOLS.pools["USDC/EURC"];
    const amountIn = (BigInt(1000) * BigInt(10) ** BigInt(18)).toString();

    await getQuote(poolAddress, 0, 1, amountIn);
  };

  // Get balances
  console.log("Pool balances:", poolState);

  // Get quote info including price impact
  console.log("Swap quote:", swapQuote);

  return null;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// ============================================================================
// EXAMPLE 5: Integration with Privy for Signing and Broadcasting
// ============================================================================

export async function example_executeSwapWithPrivy(
  sendTransaction: (tx: { to: string; data: string; value: string }) => Promise<string> // Privy's sendTransaction function
) {
  try {
    const poolAddress = ARC_POOLS.pools["USDC/EURC"];
    const amountIn = (BigInt(1000) * BigInt(10) ** BigInt(18)).toString();
    const minAmountOut = (BigInt(950) * BigInt(10) ** BigInt(18)).toString();

    // 1. Prepare transaction
    const txData = prepareSwapTransaction(
      poolAddress,
      0,
      1,
      amountIn,
      minAmountOut
    );

    // 2. Send with Privy
    const txResponse = await sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value,
    });

    console.log("Transaction sent:", txResponse);

    // 3. Wait for confirmation (optional, depending on Privy API)
    // const receipt = await txResponse.wait();
    // console.log("Transaction confirmed:", receipt);

    return txResponse;
  } catch (error) {
    console.error("Swap failed:", error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: Helper Function - Convert Between Token Amounts
// ============================================================================

export function convertTokenAmount(
  amount: number,
  decimals: number = 18
): string {
  return (BigInt(Math.floor(amount * 10 ** decimals)) * BigInt(1)).toString();
}

export function convertFromWei(amount: string, decimals: number = 18): number {
  return Number(BigInt(amount)) / 10 ** decimals;
}

// ============================================================================
// EXAMPLE 7: Pool Information Lookup
// ============================================================================

export function example_poolInfo() {
  const poolInfo = getPoolInfo("USDC/EURC");
  if (poolInfo) {
    console.log(`Pool: ${poolInfo.pair}`);
    console.log(`Address: ${poolInfo.address}`);
  }

  // List all pools
  const allPools = listAvailablePools();
  console.log("All available pools:", allPools);
}
