# Arc Swap Quote Fix

## Problem
When trying to get a swap quote for USDC → SWPRC, the RPC call was reverting with "execution reverted". The error logs showed:
- Calling `get_dy` on the router contract: `0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC`
- Using global token indices: tokenInIndex=0 (USDC), tokenOutIndex=2 (SWPRC)
- Amount: 1000000 wei (1 USDC with 6 decimals)

## Root Cause
The swap router contract (`0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC`) does **not** have a publicly exposed `get_dy` function. Instead:
- **Individual pool contracts** have the `get_dy` function
- Each pool uses **local indices** (0, 1) for its two tokens
- The three available pools are:
  - USDC/EURC: `0xd22e4fB80E21e8d2C91131eC2D6b0C000491934B`
  - USDC/SWPRC: `0x613bc8A188a571e7Ffe3F884FabAB0F43ABB8282`
  - EURC/SWPRC: `0x9463DE67E73B42B2cE5e45cab7e32184B9c24939`

## Solution
1. **Added `getPoolForTokenPair()` function** in `arcNetwork.ts`:
   - Maps token symbol pairs to their pool contract address
   - Returns local token indices (0 or 1) for use within that pool
   - Handles bidirectional lookups (USDC/EURC or EURC/USDC)

2. **Updated `getSwapQuote()` signature**:
   - Changed from: `getSwapQuote(tokenInIndex, tokenOutIndex, amountIn)`
   - Changed to: `getSwapQuote(poolAddress, tokenInIndex, tokenOutIndex, amountIn)`
   - Now calls the **pool contract** instead of the router

3. **Updated pool configuration** in `ARC_POOLS`:
   - Changed pool objects to include tokens array
   - Added helper function to find pools by token pair

4. **Updated all calling code**:
   - SwapCard.tsx: Uses `getPoolForTokenPair()` to find pool and indices before calling `getSwapQuote()`
   - arcPoolExamples.ts: Updated examples to use `getPoolForTokenPair()`
   - useArcPools.ts: Updated hook to pass poolAddress to `getSwapQuote()`

## How It Works Now

When user swaps USDC → SWPRC:
1. Call `getPoolForTokenPair("USDC", "SWPRC")`
2. Returns: `{ address: "0x613bc...", tokenAIndex: 0, tokenBIndex: 1 }`
3. Call `getSwapQuote(poolAddress, 0, 1, amountInWei)`
4. RPC calls `get_dy(0, 1, amountIn)` on the pool contract
5. Pool returns expected output amount

## Future Work
- The swap execution via router may still need adjustments based on router implementation
- Consider adding slippage protection UI
- Add transaction confirmation waiting after actual swap execution

## Token Decimals Reference
- USDC: 6 decimals
- EURC: 6 decimals  
- SWPRC: 6 decimals
- USDT: 6 decimals
- UNI: 18 decimals
- HYPE: 18 decimals
- ETH: 18 decimals
