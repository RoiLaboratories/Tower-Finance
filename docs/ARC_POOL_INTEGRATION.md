# Arc Testnet Pool Integration Guide

## Overview

This guide explains how to integrate Arc Testnet pool contracts into your Tower Finance application. The integration provides functions for querying pool data and executing swaps using standard EVM calls.

## Network Configuration

**Chain ID:** 5042002  
**RPC URL:** https://rpc.testnet.arc.network  
**Router Contract:** 0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC

### Available Pools

| Pair | Pool Address | Token 0 | Token 1 |
|------|------|---------|---------|
| USDC / EURC | 0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B | USDC (0) | EURC (1) |
| USDC / SWPRC | 0x613bc8A188a571e7Ffe3F884FabAB0F43ABB8282 | USDC (0) | SWPRC (1) |
| EURC / SWPRC | 0x9463DE67E73B42B2cE5e45cab7e32184B9c24939 | EURC (0) | SWPRC (1) |

## Core Functions

### `getSwapQuote(poolAddress, tokenInIndex, tokenOutIndex, amountIn)`

Get a quote for swapping between two tokens without executing the swap.

**Parameters:**
- `poolAddress` (string): Address of the pool contract
- `tokenInIndex` (number): Index of input token (0 or 1)
- `tokenOutIndex` (number): Index of output token (0 or 1)
- `amountIn` (string): Amount to swap in wei (e.g., "1000000000000000000" for 1 token with 18 decimals)

**Returns:** Amount out in wei as string

**Example:**
```typescript
const poolAddress = "0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B";
const amountIn = "1000000000000000000"; // 1 USDC

const amountOut = await getSwapQuote(
  poolAddress,
  0, // USDC
  1, // EURC
  amountIn
);

console.log("Amount out:", BigInt(amountOut) / 10n ** 18n, "EURC");
```

### `getPoolBalances(poolAddress)`

Get the current reserves for both tokens in a pool.

**Parameters:**
- `poolAddress` (string): Address of the pool contract

**Returns:** Tuple [balance0, balance1] as strings in wei

**Example:**
```typescript
const [balance0, balance1] = await getPoolBalances(poolAddress);

console.log("USDC:", BigInt(balance0) / 10n ** 18n);
console.log("EURC:", BigInt(balance1) / 10n ** 18n);
```

### `prepareSwapTransaction(poolAddress, tokenInIndex, tokenOutIndex, amountIn, minAmountOut)`

Prepare a transaction object for a swap. This transaction can be signed and broadcasted via Privy.

**Parameters:**
- `poolAddress` (string): Address of the pool contract
- `tokenInIndex` (number): Index of input token (0 or 1)
- `tokenOutIndex` (number): Index of output token (0 or 1)
- `amountIn` (string): Amount to swap in wei
- `minAmountOut` (string): Minimum amount to receive (slippage protection) in wei

**Returns:** Transaction object with `to`, `data`, and `value` fields

**Example:**
```typescript
const amountIn = "1000000000000000000"; // 1 USDC
const minAmountOut = "950000000000000000"; // 0.95 EURC (5% slippage)

const txData = prepareSwapTransaction(
  poolAddress,
  0,
  1,
  amountIn,
  minAmountOut
);

// Sign and broadcast with Privy
const txResponse = await sendTransaction(txData);
```

### `getPoolBalances(poolAddress)`

Get information about a specific pool by pair name.

**Parameters:**
- `pairName` (string): Pool pair name (e.g., "USDC/EURC")

**Returns:** Object with pool address and pair info, or null if not found

**Example:**
```typescript
const poolInfo = getPoolInfo("USDC/EURC");
if (poolInfo) {
  console.log(`Pool address: ${poolInfo.address}`);
}
```

### `listAvailablePools()`

Get a list of all available pool pairs.

**Returns:** Array of pool pair names

**Example:**
```typescript
const pools = listAvailablePools();
console.log(pools); // ["USDC/EURC", "USDC/SWPRC", "EURC/SWPRC"]
```

## React Hook: `useArcPools()`

A custom React hook for managing pool interactions with state management.

**Returns:**
```typescript
{
  // Pool state and methods
  poolState: { balance0, balance1, loading, error },
  fetchPoolBalances: (poolAddress) => Promise<void>,
  
  // Swap quote state and methods
  swapQuote: { amountOut, priceImpact, loading, error },
  getQuote: (poolAddress, tokenInIndex, tokenOutIndex, amountIn) => Promise<void>,
  
  // Utilities
  prepareSwap: (poolAddress, tokenInIndex, tokenOutIndex, amountIn, minAmountOut) => txData,
  listPools: () => string[],
  routerAddress: string
}
```

**Example:**
```typescript
import { useArcPools } from "@/lib/useArcPools";

export function SwapWidget() {
  const { poolState, swapQuote, fetchPoolBalances, getQuote } = useArcPools();

  const handleSwap = async () => {
    const poolAddress = "0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B";
    
    // Fetch pool balances
    await fetchPoolBalances(poolAddress);
    
    // Get quote for 1 USDC
    await getQuote(poolAddress, 0, 1, "1000000000000000000");
  };

  return (
    <div>
      <button onClick={handleSwap}>Get Quote</button>
      {swapQuote.amountOut && (
        <p>Output: {BigInt(swapQuote.amountOut) / 10n ** 18n}</p>
      )}
    </div>
  );
}
```

## Integration with Privy

To execute actual swaps, use the Privy `sendTransaction` function:

```typescript
import { usePrivy } from "@privy-io/react-auth";
import { prepareSwapTransaction } from "@/lib/arcNetwork";

export function SwapComponent() {
  const { sendTransaction } = usePrivy();

  const executeSwap = async () => {
    const txData = prepareSwapTransaction(
      "0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B",
      0, // USDC
      1, // EURC
      "1000000000000000000", // 1 USDC
      "950000000000000000" // Min 0.95 EURC
    );

    try {
      const txResponse = await sendTransaction(txData);
      console.log("Transaction hash:", txResponse);
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return <button onClick={executeSwap}>Swap</button>;
}
```

## Token Indices

For each pool, tokens are referenced by their index:
- **Index 0:** First token in the pair
- **Index 1:** Second token in the pair

For example, in USDC/EURC pool:
- Token 0 = USDC
- Token 1 = EURC

When swapping USDC for EURC: `getSwapQuote(poolAddress, 0, 1, amountIn)`

## Slippage Protection

Always set a `minAmountOut` to protect against slippage:

```typescript
const expectedOutput = BigInt(amountOut);
const slippagePercent = 5n; // 5%
const minAmountOut = (expectedOutput * (100n - slippagePercent)) / 100n;

const txData = prepareSwapTransaction(
  poolAddress,
  tokenInIndex,
  tokenOutIndex,
  amountIn,
  minAmountOut.toString()
);
```

## Error Handling

All functions include error handling. Check for errors in the state objects when using the hook:

```typescript
const { poolState, swapQuote } = useArcPools();

if (poolState.error) {
  console.error("Pool error:", poolState.error);
}

if (swapQuote.error) {
  console.error("Quote error:", swapQuote.error);
}
```

## File Locations

- **Core integration:** [lib/arcNetwork.ts](lib/arcNetwork.ts)
- **React hook:** [lib/useArcPools.ts](lib/useArcPools.ts)
- **Examples:** [lib/arcPoolExamples.ts](lib/arcPoolExamples.ts)

## Testing

Test the integration using the example functions in `arcPoolExamples.ts`:

```typescript
import { example_getPoolBalances, example_getSwapQuote } from "@/lib/arcPoolExamples";

// Test get balances
await example_getPoolBalances();

// Test get quote
await example_getSwapQuote();
```

## Troubleshooting

### RPC Errors
If you get RPC errors, ensure the RPC URL is correct and the network is reachable:
```typescript
import { ARC_TESTNET_CONFIG } from "@/lib/arcNetwork";
console.log(ARC_TESTNET_CONFIG.rpcUrl);
```

### Invalid Pool Address
Verify the pool address is correct by checking it exists in `ARC_POOLS`:
```typescript
import { getPoolInfo } from "@/lib/arcNetwork";
const info = getPoolInfo("USDC/EURC");
console.log(info); // Should not be null
```

### Wrong Token Index
Ensure you're using the correct token indices for your swap direction. Token 0 is always the first in the pair name.

## Advanced: Custom Token Support

To add new pools, update `ARC_POOLS` in [lib/arcNetwork.ts](lib/arcNetwork.ts):

```typescript
export const ARC_POOLS = {
  router: "0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC",
  pools: {
    "USDC/EURC": "0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B",
    // ... existing pools ...
    "TOKEN1/TOKEN2": "0xNewPoolAddress",
  },
};
```

Then use the new pool:
```typescript
const poolInfo = getPoolInfo("TOKEN1/TOKEN2");
```
