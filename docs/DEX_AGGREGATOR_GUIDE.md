# DEX Aggregator Integration Guide

## Overview

The Tower Finance DEX Aggregator is a complete system for executing optimized token swaps across multiple DEXes on Arc testnet. It consists of:

1. **Smart Contracts** - TowerRouter for on-chain execution
2. **Backend Service** - Route optimization and transaction building
3. **Frontend SDK** - React hooks and utilities for UI integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SwapCard UI                             │
│         (Existing Next.js/React Component)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Frontend SDK (dexAggregatorSDK.ts)                │
│  • useSwapQuote hook                                         │
│  • useSwapExecution hook                                     │
│  • DexAggregatorSDK class                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Backend Service (http://localhost:3001)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DexDiscoveryService                                  │   │
│  │  • Manages DEX registry                              │   │
│  │  • Fetches pool data                                 │   │
│  │  • Caches reserves                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  RouteOptimizer                                       │   │
│  │  • Single-hop routes                                 │   │
│  │  • Multi-hop routes                                  │   │
│  │  • Split routes                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TransactionBuilder                                   │   │
│  │  • Encodes swap calls                                │   │
│  │  • Builds approvals                                  │   │
│  │  • Estimates gas                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Arc Testnet Smart Contracts                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TowerRouter                                          │   │
│  │  • Single/multi-hop swaps                            │   │
│  │  • Split route execution                             │   │
│  │  • Fee management                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FeeController                                        │   │
│  │  • Treasury management                               │   │
│  │  • Referral rewards                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Smart Contracts

```bash
cd contracts
npm install
npx hardhat run deploy.ts --network arc_testnet
```

Save the deployed addresses in `.env`:
```env
TOWER_ROUTER_ADDRESS=0x...
FEE_CONTROLLER_ADDRESS=0x...
WETH_ADDRESS=0x...
```

### 2. Backend Service

```bash
cd backend
npm install
npm run build
npm start
```

Environment variables (`.env`):
```env
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
TOWER_ROUTER_ADDRESS=0x...
FEE_CONTROLLER_ADDRESS=0x...
PORT=3001
```

### 3. Frontend Integration

Update `lib/dexAggregatorSDK.ts` with your backend URL:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

## Usage

### Basic Swap Flow

```typescript
import { useSwapQuote, useSwapExecution } from '@/lib/useSwapSDK';
import { DexAggregatorSDK } from '@/lib/dexAggregatorSDK';

function SwapCard() {
  const { quote, isLoading, getQuote } = useSwapQuote();
  const { buildSwapTx, setTxHash } = useSwapExecution();
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const handleSwap = async () => {
    // 1. Get quote
    const q = await getQuote(inputToken, outputToken, inputAmount);
    
    // 2. Build transaction
    const swapTx = await buildSwapTx(q, user.wallet.address);
    
    // 3. Send transaction
    const signer = await wallets[0].getEthersProvider().getSigner();
    const tx = await signer.sendTransaction(swapTx);
    
    // 4. Track transaction
    setTxHash(tx.hash);
  };

  return (
    <button onClick={handleSwap} disabled={isLoading}>
      {isLoading ? 'Getting best price...' : 'Swap'}
    </button>
  );
}
```

### Full Integration Example

See [INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md) for a complete example.

## API Endpoints

### POST /api/swap/quote

Get best swap quote.

**Request:**
```json
{
  "inputToken": "0x...",
  "outputToken": "0x...",
  "inputAmount": "1000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inputToken": "0x...",
    "outputToken": "0x...",
    "inputAmount": "1000000000000000000",
    "outputAmount": "995000000000000000",
    "minOut": "989502487562189054",
    "route": {
      "type": "single",
      "hops": [...],
      "totalFee": 25,
      "estimatedOutput": "995000000000000000"
    },
    "priceImpact": 50,
    "gasEstimate": "200000",
    "slippage": 50,
    "exec_price": 0.995
  }
}
```

### POST /api/swap/build-tx

Build executable transaction.

**Request:**
```json
{
  "quote": { /* ... */ },
  "userAddress": "0x...",
  "referrer": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "to": "0x...",
    "data": "0x...",
    "value": "0",
    "from": "0x...",
    "gasLimit": "500000",
    "chainId": 5042002
  }
}
```

### POST /api/swap/approval

Build token approval transaction.

**Request:**
```json
{
  "tokenAddress": "0x...",
  "spenderAddress": "0x...",
  "amount": "1000000000000000000",
  "userAddress": "0x..."
}
```

### GET /api/swap/dexes

Get available DEXes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uniswap-v2-arc",
      "name": "Uniswap V2 (Arc)",
      "routerAddress": "0x...",
      "type": "v2",
      "enabled": true
    }
  ]
}
```

### GET /api/swap/price?token0=0x...&token1=0x...

Get current price for token pair.

### GET /api/swap/gas-price

Get current Arc testnet gas prices.

## Smart Contract ABI

### TowerRouter

```solidity
interface ITowerRouter {
  function swapExactTokensForTokens(
    uint256 amountIn,
    uint256 minAmountOut,
    address[] memory path,
    address to,
    uint256 deadline,
    address router,
    address referrer
  ) external returns (uint256);

  function swapWithSplit(
    SplitSwapParams[] memory splits,
    address tokenOut,
    uint256 minAmountOut,
    address to,
    uint256 deadline,
    address referrer
  ) external returns (uint256);
}

struct SplitSwapParams {
  address[] path;
  uint256 amountIn;
  uint256 minAmountOut;
  address router;
}
```

## Fee Structure

- **Platform Fee**: 0.25% (configurable up to 0.3%)
- **Referral Reward**: 20% of platform fees go to referrer
- **Treasury**: Remaining fees go to treasury wallet

## Testing

### Unit Tests

```bash
cd backend
npm test
```

### Integration Tests

```bash
npm test -- --testPathPattern=integration
```

### Local Testnet Simulation

```bash
npm run test:fork -- --network arc_testnet
```

## Performance Optimization

### Caching Strategy

- **Pool data**: Cached for 30 seconds
- **Prices**: Cached for 1 minute
- **Routes**: Not cached (always fetch fresh)

### Gas Estimation

- Automatically adds 20% buffer for safety
- Handles failed gas estimation gracefully
- Returns reasonable defaults if estimation fails

### Rate Limiting

- 100 requests per minute per IP
- Returns 429 status if exceeded

## Error Handling

All errors include descriptive messages:

```typescript
{
  "success": false,
  "error": "Insufficient liquidity for this swap",
  "timestamp": "2026-02-09T15:30:45.123Z"
}
```

Common errors:
- **No route found**: Token pair not supported
- **Insufficient liquidity**: Amount too large for available pools
- **Invalid address**: Token or user address format error
- **Slippage exceeded**: Output below minimum threshold

## Security Considerations

1. **Reentrancy Protection**: TowerRouter uses ReentrancyGuard
2. **Deadline Validation**: All swaps include 30-minute deadline
3. **Slippage Protection**: Enforced on all routes
4. **Fee Limits**: Maximum 0.3% platform fee
5. **Address Validation**: All addresses checksummed

## Monitoring

### Metrics Endpoint

```bash
GET /api/swap/metrics
```

Returns:
- Routes calculated
- Average calculation time
- Cache statistics

## Future Enhancements

- [ ] Support for more DEX types (Balancer, Curve, etc.)
- [ ] MEV protection (batch swaps, intent relayers)
- [ ] Permit2 signature integration
- [ ] Advanced routing (cross-chain swaps)
- [ ] Historical price data and analytics
- [ ] Webhook notifications for swaps

## Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Open an issue on GitHub
3. Contact development team

## License

MIT
