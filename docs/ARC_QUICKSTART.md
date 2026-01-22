# Arc Pool Integration - Quick Start

## Installation & Setup

No additional dependencies needed! The integration uses only standard EVM JSON-RPC calls.

## 5-Minute Setup

### 1. Import the hook in your component

```typescript
import { useArcPools } from "@/lib/useArcPools";
```

### 2. Use the hook

```typescript
export function MySwapComponent() {
  const { getQuote, prepareSwap, listPools } = useArcPools();
  
  // Ready to use!
}
```

### 3. Get a quote

```typescript
const poolAddress = "0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B"; // USDC/EURC
const amountIn = "1000000000000000000"; // 1 USDC (18 decimals)

await getQuote(poolAddress, 0, 1, amountIn);
```

### 4. Execute a swap

```typescript
import { usePrivy } from "@privy-io/react-auth";
import { prepareSwapTransaction } from "@/lib/arcNetwork";

const { sendTransaction } = usePrivy();

const txData = prepareSwapTransaction(
  poolAddress,
  0, 1,
  "1000000000000000000", // amountIn
  "950000000000000000"   // minAmountOut (5% slippage)
);

await sendTransaction(txData);
```

## Common Tasks

### Get all available pools
```typescript
const { listPools } = useArcPools();
const pools = listPools(); // ["USDC/EURC", "USDC/SWPRC", "EURC/SWPRC"]
```

### Get pool balances
```typescript
const { fetchPoolBalances, poolState } = useArcPools();

await fetchPoolBalances("0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B");

console.log(poolState.balance0); // Balance of token 0
console.log(poolState.balance1); // Balance of token 1
```

### Convert token amounts
```typescript
// Convert 1.5 tokens to wei (18 decimals)
const amountInWei = (1.5 * 10 ** 18).toString();

// Convert wei back to tokens
const amountInTokens = Number(amountInWei) / 10 ** 18;
```

### Handle errors
```typescript
const { swapQuote } = useArcPools();

if (swapQuote.error) {
  console.error("Quote failed:", swapQuote.error);
}
```

## Pool Addresses Reference

| Pool | Address |
|------|---------|
| USDC/EURC | 0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B |
| USDC/SWPRC | 0x613bc8A188a571e7Ffe3F884FabAB0F43ABB8282 |
| EURC/SWPRC | 0x9463DE67E73B42B2cE5e45cab7e32184B9c24939 |

## Direct Function Usage (Without Hook)

```typescript
import {
  getSwapQuote,
  getPoolBalances,
  prepareSwapTransaction,
} from "@/lib/arcNetwork";

// Get quote directly
const quote = await getSwapQuote(poolAddress, 0, 1, "1000000000000000000");

// Get balances directly
const [balance0, balance1] = await getPoolBalances(poolAddress);

// Prepare swap directly
const txData = prepareSwapTransaction(
  poolAddress, 0, 1, 
  "1000000000000000000", 
  "950000000000000000"
);
```

## Complete Example Component

```typescript
"use client";
import { usePrivy } from "@privy-io/react-auth";
import { useArcPools } from "@/lib/useArcPools";
import { ARC_POOLS } from "@/lib/arcNetwork";
import { useState } from "react";

export default function SwapPanel() {
  const { sendTransaction } = usePrivy();
  const { swapQuote, getQuote, prepareSwap } = useArcPools();
  const [inputAmount, setInputAmount] = useState("1");

  const handleQuote = async () => {
    const amountInWei = (parseFloat(inputAmount) * 10 ** 18).toString();
    await getQuote(
      ARC_POOLS.pools["USDC/EURC"],
      0, 1,
      amountInWei
    );
  };

  const handleSwap = async () => {
    if (!swapQuote.amountOut) {
      alert("Get a quote first!");
      return;
    }

    const amountInWei = (parseFloat(inputAmount) * 10 ** 18).toString();
    const minOut = (BigInt(swapQuote.amountOut) * 95n) / 100n; // 5% slippage

    const txData = prepareSwap(
      ARC_POOLS.pools["USDC/EURC"],
      0, 1,
      amountInWei,
      minOut.toString()
    );

    try {
      const hash = await sendTransaction(txData);
      console.log("Swap submitted:", hash);
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return (
    <div className="p-4">
      <input
        type="number"
        value={inputAmount}
        onChange={(e) => setInputAmount(e.target.value)}
        placeholder="Amount"
        className="w-full p-2 border rounded"
      />

      <button onClick={handleQuote} className="mt-2 p-2 bg-blue-500 text-white rounded">
        Get Quote
      </button>

      {swapQuote.amountOut && (
        <>
          <p className="mt-2">
            Output: {(BigInt(swapQuote.amountOut) / 10n ** 18n).toString()} EURC
          </p>
          <p>Price Impact: {swapQuote.priceImpact.toFixed(2)}%</p>
        </>
      )}

      <button onClick={handleSwap} className="mt-2 p-2 bg-green-500 text-white rounded">
        Swap
      </button>
    </div>
  );
}
```

## Files Created

- `lib/arcNetwork.ts` - Core pool integration functions
- `lib/useArcPools.ts` - React hook for state management
- `lib/arcPoolExamples.ts` - Example implementations
- `docs/ARC_POOL_INTEGRATION.md` - Full documentation

## Testing

Visit [testnet.arcscan.app](https://testnet.arcscan.app) to verify your transactions.

## Support

For issues or questions about the Arc Network, visit the [Arc Network Documentation](https://docs.arc.network).
