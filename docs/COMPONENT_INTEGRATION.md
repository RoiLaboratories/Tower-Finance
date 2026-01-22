/**
 * Example: Integrating Arc Pools with Existing SwapCard Component
 * 
 * This file shows how to update your SwapCard component to use Arc pool contracts.
 * Copy the pattern shown here into your actual SwapCard.tsx
 */

"use client";
import { usePrivy } from "@privy-io/react-auth";
import { useArcPools } from "@/lib/useArcPools";
import { ARC_POOLS, getPoolInfo } from "@/lib/arcNetwork";
import { useState } from "react";

// Example integration into SwapCard
export function SwapCardWithArcPools() {
  const { sendTransaction } = usePrivy();
  const { swapQuote, getQuote, listPools, poolState, fetchPoolBalances } =
    useArcPools();

  // State for swap inputs
  const [selectedPool, setSelectedPool] = useState<string>("USDC/EURC");
  const [inputAmount, setInputAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(5); // 5% default
  const [isLoading, setIsLoading] = useState(false);

  // Get pool info
  const poolInfo = getPoolInfo(selectedPool);

  // Handle getting a quote
  const handleGetQuote = async () => {
    if (!inputAmount || !poolInfo) return;

    setIsLoading(true);
    try {
      const amountInWei = (parseFloat(inputAmount) * 10 ** 18).toString();

      // Determine token indices based on pool
      // Assuming token 0 is always the first in the pair
      const [tokenIn, tokenOut] = selectedPool.split("/");

      await getQuote(poolInfo.address, 0, 1, amountInWei);
    } catch (error) {
      console.error("Failed to get quote:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!swapQuote.amountOut || !poolInfo) {
      alert("Please get a quote first!");
      return;
    }

    setIsLoading(true);
    try {
      const amountInWei = (parseFloat(inputAmount) * 10 ** 18).toString();

      // Calculate minimum output with slippage protection
      const expectedOutput = BigInt(swapQuote.amountOut);
      const slippageAmount = (expectedOutput * BigInt(slippage)) / 100n;
      const minAmountOut = (expectedOutput - slippageAmount).toString();

      // Prepare transaction
      const txData = {
        to: poolInfo.address,
        // This would normally come from prepareSwapTransaction
        // Simplified for example
        data: "0x", // Would be populated by prepareSwapTransaction
        value: "0x0",
      };

      // Send transaction via Privy
      const txHash = await sendTransaction(txData);

      console.log("Swap executed:", txHash);
      alert(`Swap submitted! Hash: ${txHash}`);

      // Reset form
      setInputAmount("");
    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch pool balances on pool selection change
  const handlePoolChange = async (newPool: string) => {
    setSelectedPool(newPool);
    const poolInfo = getPoolInfo(newPool);
    if (poolInfo) {
      try {
        await fetchPoolBalances(poolInfo.address);
      } catch (error) {
        console.error("Failed to fetch pool balances:", error);
      }
    }
  };

  const outputAmount = swapQuote.amountOut
    ? (BigInt(swapQuote.amountOut) / 10n ** 18n).toString()
    : "0";

  return (
    <div className="swap-card p-6 rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">Arc Pool Swap</h2>

      {/* Pool Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Pool</label>
        <select
          value={selectedPool}
          onChange={(e) => handlePoolChange(e.target.value)}
          className="w-full p-2 border rounded"
          disabled={isLoading}
        >
          {listPools().map((pool) => (
            <option key={pool} value={pool}>
              {pool} - {ARC_POOLS.pools[pool as keyof typeof ARC_POOLS.pools]}
            </option>
          ))}
        </select>
      </div>

      {/* Pool Info */}
      {poolInfo && (
        <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
          <p>Pool: {poolInfo.address}</p>
          {poolState.balance0 && (
            <>
              <p>
                Token 0: {(BigInt(poolState.balance0) / 10n ** 18n).toString()}
              </p>
              <p>
                Token 1: {(BigInt(poolState.balance1) / 10n ** 18n).toString()}
              </p>
            </>
          )}
        </div>
      )}

      {/* Input Amount */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Amount In</label>
        <input
          type="number"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          placeholder="0.0"
          className="w-full p-2 border rounded"
          disabled={isLoading}
          step="0.01"
        />
      </div>

      {/* Quote Button */}
      <button
        onClick={handleGetQuote}
        disabled={isLoading || !inputAmount}
        className="w-full p-2 bg-blue-500 text-white rounded mb-4 disabled:opacity-50"
      >
        {isLoading ? "Getting Quote..." : "Get Quote"}
      </button>

      {/* Quote Results */}
      {swapQuote.amountOut && (
        <div className="mb-4 p-3 bg-green-50 rounded">
          <p className="font-semibold">
            Output: {outputAmount}{" "}
            {selectedPool.split("/")[1]}
          </p>
          <p className="text-sm text-gray-600">
            Price Impact: {swapQuote.priceImpact.toFixed(2)}%
          </p>
        </div>
      )}

      {/* Slippage Settings */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Slippage: {slippage}%</label>
        <input
          type="range"
          min="0"
          max="50"
          value={slippage}
          onChange={(e) => setSlippage(parseFloat(e.target.value))}
          className="w-full"
          disabled={isLoading}
        />
      </div>

      {/* Error Messages */}
      {swapQuote.error && (
        <div className="mb-4 p-3 bg-red-50 rounded text-red-700 text-sm">
          {swapQuote.error}
        </div>
      )}

      {poolState.error && (
        <div className="mb-4 p-3 bg-red-50 rounded text-red-700 text-sm">
          Pool Error: {poolState.error}
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={isLoading || !swapQuote.amountOut}
        className="w-full p-2 bg-green-500 text-white rounded disabled:opacity-50"
      >
        {isLoading ? "Processing..." : "Swap"}
      </button>

      {/* Min Output Display */}
      {swapQuote.amountOut && (
        <div className="mt-4 text-xs text-gray-600">
          <p>
            Min Output (with {slippage}% slippage):{" "}
            {(
              (BigInt(swapQuote.amountOut) * BigInt(100 - slippage)) /
              100n /
              10n ** 18n
            ).toString()}{" "}
            {selectedPool.split("/")[1]}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Alternative: Minimal Swap Component
 * 
 * For a simpler implementation with less UI
 */
export function MinimalSwapComponent() {
  const { sendTransaction } = usePrivy();
  const { getQuote, swapQuote, prepareSwap } = useArcPools();
  const [amount, setAmount] = useState("");

  const onSwap = async () => {
    try {
      // 1. Get quote
      const amountWei = (parseFloat(amount) * 10 ** 18).toString();
      await getQuote(ARC_POOLS.pools["USDC/EURC"], 0, 1, amountWei);

      // 2. Prepare transaction
      const minOut = (BigInt(swapQuote.amountOut || 0) * 95n) / 100n;
      const txData = prepareSwap(
        ARC_POOLS.pools["USDC/EURC"],
        0,
        1,
        amountWei,
        minOut.toString()
      );

      // 3. Execute
      const hash = await sendTransaction(txData);
      console.log("Done:", hash);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={onSwap}>Swap</button>
    </div>
  );
}
