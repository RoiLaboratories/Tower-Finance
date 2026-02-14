# Tower Finance DEX Aggregator System

A complete DEX aggregation platform for Tower Exchange, enabling optimized token swaps across multiple DEXes on Arc testnet.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Hardhat (for contracts)
- Arc testnet RPC URL

### 1. Deploy Smart Contracts

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run deploy.ts --network arc_testnet
```

Save the deployment output addresses.

### 2. Start Backend Service

```bash
cd backend
npm install
npm run build
npm start
```

The API will be available at `http://localhost:3001`

### 3. Integrate Frontend

Add the SDK to your Next.js app:

```typescript
import { useSwapQuote, useSwapExecution } from '@/lib/useSwapSDK';

function SwapComponent() {
  const { quote, getQuote } = useSwapQuote();
  const { buildSwapTx } = useSwapExecution();

  const handleSwap = async () => {
    const q = await getQuote(inputToken, outputToken, amount);
    const tx = await buildSwapTx(q, userAddress);
    // Send transaction...
  };

  return (/* Your UI */);
}
```

## 📁 Project Structure

```
tower-finance/
├── contracts/                          # Smart Contracts
│   ├── TowerRouter.sol                # Main router contract
│   ├── FeeController.sol              # Fee management
│   ├── interfaces/
│   │   ├── IDexRouter.sol            # DEX interface
│   │   └── IFeeController.sol        # Fee interface
│   ├── libraries/
│   │   └── SwapMath.sol              # Math utilities
│   ├── hardhat.config.ts             # Hardhat config
│   └── deploy.ts                     # Deployment script
│
├── backend/                            # Backend Service
│   ├── src/
│   │   ├── index.ts                  # Main server
│   │   ├── services/
│   │   │   ├── DexDiscoveryService.ts    # DEX registry
│   │   │   ├── RouteOptimizer.ts        # Route optimization
│   │   │   └── TransactionBuilder.ts    # TX building
│   │   ├── routes/
│   │   │   └── swapRoutes.ts         # API routes
│   │   ├── utils/
│   │   │   └── helpers.ts            # Utilities
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript types
│   │   └── __tests__/
│   │       └── swap.test.ts          # Unit tests
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── lib/                                # Frontend SDK
│   ├── dexAggregatorSDK.ts          # Main SDK class
│   ├── dexAggregatorTypes.ts        # SDK types
│   └── useSwapSDK.ts                # React hooks
│
└── docs/                               # Documentation
    ├── DEX_AGGREGATOR_GUIDE.md       # Full guide
    └── DEX_AGGREGATOR_INTEGRATION_EXAMPLE.md
```

## 🎯 Features

### ✅ Route Optimization
- Single-hop swaps (direct DEX)
- Multi-hop swaps (through intermediaries)
- Split routes (distribute across multiple DEXes)
- Price impact calculation
- Liquidity depth analysis

### ✅ Smart Contracts
- Reentrancy protection
- Slippage/deadline validation
- Platform fees (0-0.3%)
- Referral rewards system
- Emergency token recovery

### ✅ Backend Service
- Real-time pool data fetching
- Route caching and optimization
- Gas estimation
- Transaction encoding
- Error handling and logging

### ✅ Frontend Integration
- React hooks for easy integration
- TypeScript types included
- Privy wallet support
- WalletConnect compatible
- Error boundaries and retries

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/swap/quote` | POST | Get best swap quote |
| `/api/swap/build-tx` | POST | Build swap transaction |
| `/api/swap/approval` | POST | Build approval transaction |
| `/api/swap/dexes` | GET | List available DEXes |
| `/api/swap/price` | GET | Get token price |
| `/api/swap/gas-price` | GET | Get gas prices |
| `/api/swap/metrics` | GET | Optimizer metrics |
| `/health` | GET | Health check |

## 🔐 Security

- **Reentrancy Guards**: Protected against reentrancy attacks
- **Slippage Protection**: Enforced minimum output amounts
- **Deadline Validation**: 30-minute default deadline
- **Fee Limits**: Maximum 0.3% platform fee
- **Address Checksumming**: All addresses validated

## 📈 Performance

- **Quote caching**: 30-second TTL for pool data
- **Rate limiting**: 100 requests/minute per IP
- **Batch processing**: Groups multiple swaps
- **Gas optimization**: Efficient encoding and estimation
- **Error retry**: Automatic retry with exponential backoff

## 🧪 Testing

```bash
# Unit tests
cd backend && npm test

# Integration tests
npm test -- --testPathPattern=integration

# Contract tests
cd contracts && npx hardhat test

# Test coverage
npm run test:coverage
```

## 📖 Documentation

- **[DEX Aggregator Guide](./docs/DEX_AGGREGATOR_GUIDE.md)** - Complete architecture and usage guide
- **[Integration Example](./docs/DEX_AGGREGATOR_INTEGRATION_EXAMPLE.md)** - Step-by-step integration instructions
- **Smart Contract docs** - See contract comments for inline documentation

## 🔧 Configuration

### Backend Environment Variables

```env
# Network
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
CHAIN_ID=5042002

# Smart Contracts
TOWER_ROUTER_ADDRESS=0x...
FEE_CONTROLLER_ADDRESS=0x...
WETH_ADDRESS=0x...

# Server
PORT=3001
NODE_ENV=development

# Limits
MAX_REQUESTS_PER_MINUTE=100
CACHE_TTL=60
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TOWER_ROUTER=0x...
NEXT_PUBLIC_FEE_CONTROLLER=0x...
NEXT_PUBLIC_CHAIN_ID=5042002
```

## 🛠️ Development

### Local Development Stack

```bash
# Terminal 1: Smart contracts (optional)
cd contracts
npx hardhat node

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
npm run dev
```

### Adding a New DEX

1. Create DEX info in `DexDiscoveryService.ts`:
```typescript
{
  id: 'my-dex',
  name: 'My DEX',
  routerAddress: '0x...',
  factoryAddress: '0x...',
  type: 'v2',
  supported: true,
}
```

2. Implement pool fetching logic:
```typescript
async getPoolReserves(dexId, token0, token1) {
  // Fetch from your DEX
}
```

## 🚨 Error Handling

All errors include helpful messages:

```typescript
{
  success: false,
  error: "No route found for this token pair",
  timestamp: "2026-02-09T15:30:45.123Z"
}
```

Common errors are handled gracefully with automatic retries.

## 📊 Monitoring

Get router metrics:
```bash
curl http://localhost:3001/api/swap/metrics
```

Returns:
- Routes calculated
- Average calculation time
- Cache statistics

## 🔄 Upgrades & Maintenance

### Updating Smart Contracts

1. Modify contract files
2. Recompile: `npx hardhat compile`
3. Deploy: `npx hardhat run deploy.ts --network arc_testnet`
4. Update addresses in `.env`

### Updating Backend

1. Pull latest changes
2. Run: `npm install && npm run build`
3. Restart service: `npm start`

### Updating Frontend

1. Pull latest changes
2. Update `.env` variables if needed
3. Restart: `npm run dev`

## 📞 Support

For issues:
1. Check [documentation](./docs/DEX_AGGREGATOR_GUIDE.md)
2. Review [integration examples](./docs/DEX_AGGREGATOR_INTEGRATION_EXAMPLE.md)
3. Check backend logs
4. Verify network connectivity

## 🎓 Architecture Overview

```
User → Privy Wallet → SwapCard UI
                        ↓
                    React Hooks
                        ↓
              Frontend SDK (useSwapQuote)
                        ↓
            Backend API (POST /quote)
                        ↓
         ┌─────────────────────────────┐
         │  Route Optimizer            │
         │  • Single-hop               │
         │  • Multi-hop                │
         │  • Split routes             │
         └─────────────────────────────┘
                        ↓
         ┌─────────────────────────────┐
         │  DEX Discovery Service      │
         │  • Pool data                │
         │  • Reserves                 │
         │  • Liquidity                │
         └─────────────────────────────┘
                        ↓
            Backend API (POST /build-tx)
                        ↓
         ┌─────────────────────────────┐
         │  Transaction Builder        │
         │  • Encode calls             │
         │  • Gas estimation           │
         │  • Approval building        │
         └─────────────────────────────┘
                        ↓
              Smart Contract (TowerRouter)
                        ↓
         ┌─────────────────────────────┐
         │  Arc Testnet DEXes          │
         │  • Uniswap V2               │
         │  • Swaparc                  │
         │  • Quantum Exchange         │
         └─────────────────────────────┘
```

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Get started with the [Quick Start Guide](./docs/DEX_AGGREGATOR_GUIDE.md#setup)**
