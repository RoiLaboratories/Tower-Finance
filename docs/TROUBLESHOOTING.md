# Tower Finance DEX Aggregator - Troubleshooting Guide

## Common Issues & Solutions

### Backend Service Issues

#### Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3002 npm start
```

#### Cannot Connect to Arc Testnet RPC
**Error**: `Failed to connect to RPC endpoint`

**Solution**:
```bash
# Check RPC URL in .env
cat .env | grep ARC_TESTNET_RPC_URL

# Verify connectivity
curl https://rpc.testnet.arc.network

# Try alternative RPC endpoints if primary is down
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network npm start
```

#### Services Not Initializing
**Error**: `Error initializing services...`

**Solution**:
```bash
# Check environment variables
env | grep ARC_
env | grep TOWER_
env | grep FEE_

# Verify contract addresses are valid Ethereum addresses
# They should start with 0x and be 42 characters long

# Increase log verbosity
DEBUG=* npm start
```

#### Out of Memory
**Error**: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed`

**Solution**:
```bash
# Increase Node.js memory limit
NODE_OPTIONS=--max-old-space-size=4096 npm start

# Or set in .env
export NODE_OPTIONS=--max-old-space-size=4096
npm start
```

---

### Frontend Integration Issues

#### SDK Returns 404 for All Requests
**Error**: `POST /api/swap/quote 404 Not Found`

**Solution**:
```bash
# Verify backend is running
curl http://localhost:3001/health

# Check API URL in SDK
echo $NEXT_PUBLIC_API_URL

# If using Docker/networking, use correct hostname
# localhost → 127.0.0.1 or container name
NEXT_PUBLIC_API_URL=http://backend:3001
```

#### Quote Returns "No Route Found"
**Error**: `"error": "No route found for this token pair"`

**Solution**:
```bash
# 1. Verify both tokens are supported
curl "http://localhost:3001/api/swap/dexes"

# 2. Check if tokens are on different DEXes
# May need to add intermediary token routes

# 3. Verify DEX pool exists
curl "http://localhost:3001/api/swap/price?token0=0x...&token1=0x..."

# 4. Increase maxHops in RouteOptimizer config
// In backend/src/index.ts
const optimizerConfig: RouteOptimizerConfig = {
  maxHops: 7,  // Increase from 5
  // ...
};
```

#### Transaction Fails with "Insufficient Allowance"
**Error**: `Insufficient token allowance for swap`

**Solution**:
```typescript
// Ensure approval is requested before swap
const approveTx = await sdk.buildApprovalTransaction(
  tokenAddress,
  TOWER_ROUTER_ADDRESS,
  ethers.constants.MaxUint256,  // Use unlimited
  userAddress
);

// Sign and send approval first
const approveTxResponse = await signer.sendTransaction(approveTx);
await approveTxResponse.wait();

// THEN perform swap
```

#### React Hook State Not Updating
**Error**: `quote` is always null despite successful API call

**Solution**:
```typescript
// Ensure SDK is not null before using hooks
function MyComponent() {
  const [sdk, setSdk] = useState<DexAggregatorSDK | null>(null);
  const { quote, getQuote } = useSwapQuote(sdk);

  useEffect(() => {
    // Initialize SDK
    const instance = new DexAggregatorSDK({
      apiUrl: process.env.NEXT_PUBLIC_API_URL!,
    });
    setSdk(instance);
  }, []);

  // Only call getQuote when SDK is ready
  useEffect(() => {
    if (sdk && inputAmount) {
      getQuote(inputToken, outputToken, inputAmount);
    }
  }, [sdk, inputAmount, inputToken, outputToken, getQuote]);
}
```

---

### Smart Contract Issues

#### Contract Fails to Deploy
**Error**: `Error: insufficient funds for gas`

**Solution**:
```bash
# Ensure account has enough testnet ARC tokens
# Request from Arc faucet

# Check actual balance
npx hardhat accounts --network arc_testnet

# If problem persists, verify private key in .env
echo $PRIVATE_KEY | head -c 10  # Should start with 0x
```

#### Transaction Reverts During Swap
**Error**: `Transaction reverted`

**Solutions**:
```bash
# 1. Check if slippage is too high
# minOut should be at least 99% of expectedOutput (0.5% slippage)

# 2. Verify token addresses are correct on Arc
# USDC on Arc = 0x...

# 3. Check if pool has sufficient liquidity
# Use GET /api/swap/price to verify

# 4. Check deadline hasn't passed
# Current block time + 30 minutes minimum

# 5. Decode revert reason
curl -X POST http://localhost:3001/api/swap/decode-error \
  -H "Content-Type: application/json" \
  -d '{"txHash": "0x..."}'
```

#### Gas Estimation Fails
**Error**: `eth_estimateGas returned error`

**Solution**:
```typescript
// Use manual gas limit as fallback
const gasLimit = ethers.BigNumber.from(500000); // Safe default
const tx = {
  ...swapTx,
  gasLimit: gasLimit.toString(),
};
```

---

### Performance Issues

#### Slow Quote Generation
**Issue**: Quotes take longer than 200ms

**Solutions**:
```bash
# 1. Check network latency
ping rpc.testnet.arc.network

# 2. Monitor cache hit ratio
curl http://localhost:3001/api/swap/metrics

# 3. Clear cache if needed
# (Requires endpoint implementation)

# 4. Increase cache TTL
CACHE_TTL=300 npm start  # 5 minutes

# 5. Use Redis for distributed cache
REDIS_URL=redis://localhost:6379 npm start
```

#### API Timeout
**Error**: `Request timeout after 30000ms`

**Solution**:
```typescript
const sdk = new DexAggregatorSDK({
  apiUrl: 'http://localhost:3001',
  timeout: 60000,  // Increase to 60 seconds
  retryAttempts: 5,  // Enable retries
});
```

#### High Memory Usage
**Issue**: Backend memory usage >1GB

**Solutions**:
```bash
# 1. Check cache size
curl http://localhost:3001/api/swap/metrics

# 2. Clear expired cache entries
# (Automatic with TTL)

# 3. Restart service
npm restart

# 4. Monitor with process monitoring
npm install -g pm2
pm2 start src/index.ts
pm2 monit
```

---

### Network & Connectivity

#### CORS Errors in Browser
**Error**: `Cross-Origin Request Blocked`

**Solution**:
```bash
# Update CORS origin in backend
# In src/index.ts:
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
};
app.use(cors(corsOptions));

# Set proper origin during development
CORS_ORIGIN=http://localhost:3000 npm start
```

#### API Unreachable from Frontend
**Error**: `Failed to fetch from http://localhost:3001`

**Solution**:
```bash
# Check if backend is running
curl http://localhost:3001/health

# If running in Docker:
# Use container name instead of localhost
NEXT_PUBLIC_API_URL=http://aggregator-backend:3001

# Check firewall rules
sudo ufw allow 3001
```

---

### Database & Caching

#### Redis Connection Failed
**Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Start Redis locally
redis-server

# Or use in-memory cache (default)
# Remove REDIS_URL from .env

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

#### Cache Not Clearing
**Issue**: Old pool data still being returned

**Solution**:
```bash
# Clear all caches (requires endpoint)
DELETE /api/swap/cache

# Or restart service
npm start

# Or manually clear (in code):
// In RouteOptimizer or DexDiscoveryService
dexService.clearCache();
```

---

### Testing Issues

#### Tests Failing with "Cannot find module"
**Error**: `Cannot find module '@/lib/dexAggregatorSDK'`

**Solution**:
```bash
# Compile TypeScript first
npm run build

# Or use ts-jest
npm test

# Check jest.config.js moduleNameMapper
npm test -- --showConfig
```

#### Tests Timeout
**Error**: `Jest did not exit one second after the test run has completed`

**Solution**:
```bash
# Increase test timeout
npm test -- --testTimeout=60000

# Or in jest.config.js
testTimeout: 60000,

# Close connections properly in tests
afterAll(async () => {
  await provider.destroy();
});
```

---

### Debugging Tips

### Enable Debug Logging
```bash
# All debug messages
DEBUG=* npm start

# Specific module
DEBUG=tower:* npm start
DEBUG=ethers:* npm start
```

### Inspect Network Requests
```bash
# Log curl commands
npm install -g curlify

# Monitor network with Fiddler or Charles
# Or use browser DevTools Network tab
```

### Check Contract State
```bash
# Query contract directly
npx hardhat console --network arc_testnet

const router = await ethers.getContractAt(
  'TowerRouter',
  '0x...address...'
);

const platformFee = await router.platformFee();
console.log(platformFee);
```

### Verify ARC Network Connection
```bash
curl -X POST https://rpc.testnet.arc.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Getting More Help

### Check Logs
```bash
# Backend logs
tail -f backend/logs/error.log
tail -f backend/logs/combined.log

# Frontend console
# Open browser DevTools → Console tab
```

### Enable Verbose Mode
```bash
# Backend with debug info
LOG_LEVEL=debug npm start

# Frontend with verbose logging
NODE_OPTIONS=--verbose npm run dev
```

### Collect Diagnostic Info
```bash
# Create diagnostic bundle
npm run diagnostics

# Outputs:
# - Environment variables (sensitive data redacted)
# - Current versions
# - Network status
# - Cache statistics
# - Error log tail
```

### Developer Resources
- [API Documentation](./DEX_AGGREGATOR_GUIDE.md)
- [Integration Examples](./DEX_AGGREGATOR_INTEGRATION_EXAMPLE.md)
-  [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md)

---

## Report an Issue

If issue persists after trying these solutions:

1. Collect diagnostic info: `npm run diagnostics`
2. Note exact error message and steps to reproduce
3. Include environment details:
   - Node version: `node --version`
   - OS: `uname -a`
   - Backend version: Check `package.json`
4. Provide relevant logs
5. Open an issue on GitHub or contact support

---

**Last Updated**: February 9, 2026  
**Maintained By**: Tower Finance Team
