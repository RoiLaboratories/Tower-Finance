# Integration Example: Using DEX Aggregator with SwapCard

This guide shows how to integrate the Tower Finance DEX Aggregator with the existing SwapCard component.

## Quick Integration (5 minutes)

### Step 1: Add SDK Initialization

In your app layout or context provider:

```typescript
// app/providers.tsx
'use client';

import { useEffect, useState } from 'react';
import { DexAggregatorSDK, DexAggregatorConfig } from '@/lib/dexAggregatorSDK';

export function DexAggregatorProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<DexAggregatorSDK | null>(null);

  useEffect(() => {
    const initSDK = async () => {
      const config: DexAggregatorConfig = {
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
        chainId: 5042002,
        timeout: 30000,
        retryAttempts: 3,
      };

      const sdkInstance = new DexAggregatorSDK(config);
      
      // Verify connection
      const isHealthy = await sdkInstance.healthCheck();
      if (isHealthy) {
        setSdk(sdkInstance);
      } else {
        console.warn('DEX Aggregator backend not available');
      }
    };

    initSDK();
  }, []);

  // Provide SDK through context if needed
  return <>{children}</>;
}
```

### Step 2: Update SwapCard Component

Replace the mock quote function with real API calls:

```typescript
// components/SwapCard.tsx
'use client';

import { useSwapQuote, useSwapExecution } from '@/lib/useSwapSDK';
import { DexAggregatorSDK } from '@/lib/dexAggregatorSDK';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const SwapCard = () => {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { quote, isLoading: quoteLoading, getQuote } = useSwapQuote();
  const { buildSwapTx, buildApprovalTx, isExecuting } = useSwapExecution();

  const [inputAmount, setInputAmount] = useState('');
  const [selectedInputToken, setSelectedInputToken] = useState(tokens[0]);
  const [selectedOutputToken, setSelectedOutputToken] = useState(tokens[1]);

  // Debounced quote fetching
  useEffect(() => {
    if (!inputAmount || !authenticated) return;

    const timer = setTimeout(() => {
      getQuote(
        selectedInputToken.address,
        selectedOutputToken.address,
        parseUnits(inputAmount, selectedInputToken.decimals).toString()
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [inputAmount, selectedInputToken, selectedOutputToken, authenticated, getQuote]);

  const handleSwap = async () => {
    if (!quote || !user?.wallet?.address) return;

    try {
      const signer = await wallets[0]?.getEthersProvider()?.getSigner();
      if (!signer) throw new Error('No signer available');

      // Check and request approval if needed
      const allowance = await checkAllowance(
        selectedInputToken.address,
        TOWER_ROUTER_ADDRESS,
        user.wallet.address
      );

      if (allowance.lt(inputAmount)) {
        const approveTx = await buildApprovalTx(
          selectedInputToken.address,
          TOWER_ROUTER_ADDRESS,
          ethers.constants.MaxUint256.toString(),
          user.wallet.address
        );

        const approveTxResponse = await signer.sendTransaction(approveTx);
        await approveTxResponse.wait();
      }

      // Build and send swap transaction
      const swapTx = await buildSwapTx(
        quote,
        user.wallet.address,
        referrerAddress // Optional
      );

      const txResponse = await signer.sendTransaction(swapTx);
      
      setNotification({
        type: 'success',
        message: `Swap initiated: ${txResponse.hash}`,
        txHash: txResponse.hash,
      });

      await txResponse.wait();
      
      setNotification({
        type: 'success',
        message: 'Swap completed!',
      });

      // Reset form
      setInputAmount('');
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Swap failed',
      });
    }
  };

  return (
    <div className="swap-card">
      <TokenInput
        token={selectedInputToken}
        amount={inputAmount}
        onChange={setInputAmount}
        onTokenSelect={setSelectedInputToken}
      />

      {quoteLoading && <div>Getting best price...</div>}

      {quote && (
        <div className="quote-details">
          <div>Output: {formatUnits(quote.outputAmount, selectedOutputToken.decimals)}</div>
          <div>Price Impact: {(quote.priceImpact / 100).toFixed(2)}%</div>
          <div>Gas: {quote.gasEstimate}</div>
        </div>
      )}

      <TokenInput
        token={selectedOutputToken}
        amount={quote ? formatUnits(quote.outputAmount, selectedOutputToken.decimals) : '0'}
        readOnly
        onTokenSelect={setSelectedOutputToken}
      />

      <button
        onClick={handleSwap}
        disabled={!quote || isExecuting}
      >
        {isExecuting ? 'Swapping...' : 'Swap'}
      </button>
    </div>
  );
};
```

### Step 3: Environment Setup

Create `[.env.local](vscode-file://vscode-app/c:/Users/Chidozie%20Collins/Documents/GitHub/Tower-Finance/.env.local)`:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Smart Contract Addresses
NEXT_PUBLIC_TOWER_ROUTER=0x...
NEXT_PUBLIC_FEE_CONTROLLER=0x...

# Arc Testnet
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
```

## Complete Example with Error Handling

```typescript
// hooks/useSwapIntegration.ts
'use client';

import { useState, useCallback } from 'react';
import { useSwapQuote, useSwapExecution } from '@/lib/useSwapSDK';
import { Quote, SwapTransaction, ApprovalTransaction } from '@/lib/dexAggregatorTypes';
import { ethers } from 'ethers';

interface SwapConfig {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  userAddress: string;
  signer: ethers.Signer;
  referrer?: string;
  towerRouterAddress: string;
}

export function useSwapIntegration() {
  const { quote, isLoading, error, getQuote } = useSwapQuote();
  const { buildSwapTx, buildApprovalTx } = useSwapExecution();
  
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const executeSwap = useCallback(
    async (config: SwapConfig) => {
      setIsSwapping(true);
      setSwapError(null);

      try {
        // Step 1: Get quote
        console.log('Fetching quote...');
        const q = await getQuote(
          config.inputToken,
          config.outputToken,
          config.inputAmount
        );

        if (!q) {
          throw new Error('No swap route available');
        }

        // Step 2: Check allowance
        console.log('Checking allowance...');
        const erc20 = new ethers.Contract(
          config.inputToken,
          ['function allowance(address,address) view returns (uint256)'],
          config.signer
        );

        const allowance = await erc20.allowance(
          config.userAddress,
          config.towerRouterAddress
        );

        // Step 3: Request approval if needed
        if (ethers.BigNumber.from(allowance).lt(ethers.BigNumber.from(config.inputAmount))) {
          console.log('Requesting approval...');
          
          const approveTx = await buildApprovalTx(
            config.inputToken,
            config.towerRouterAddress,
            ethers.constants.MaxUint256.toString(),
            config.userAddress
          );

          const approveTxResponse = await config.signer.sendTransaction(approveTx);
          const approvalReceipt = await approveTxResponse.wait();

          if (!approvalReceipt) {
            throw new Error('Approval transaction failed');
          }

          console.log('Approved:', approvalReceipt.transactionHash);
        }

        // Step 4: Build swap transaction
        console.log('Building swap transaction...');
        const swapTx = await buildSwapTx(q, config.userAddress, config.referrer);

        // Step 5: Execute swap
        console.log('Executing swap...');
        const swapTxResponse = await config.signer.sendTransaction(swapTx);
        
        setTxHash(swapTxResponse.hash);

        // Wait for confirmation
        const receipt = await swapTxResponse.wait();

        if (!receipt || receipt.status === 0) {
          throw new Error('Swap transaction failed');
        }

        console.log('Swap successful:', receipt.transactionHash);

        return {
          success: true,
          txHash: receipt.transactionHash,
          outputAmount: q.outputAmount,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Swap failed';
        setSwapError(message);
        console.error('Swap error:', error);

        return {
          success: false,
          error: message,
        };
      } finally {
        setIsSwapping(false);
      }
    },
    [getQuote, buildSwapTx, buildApprovalTx]
  );

  return {
    quote,
    quotLoading: isLoading,
    quoteError: error,
    executeSwap,
    isSwapping,
    swapError,
    txHash,
  };
}
```

## Usage in Component

```typescript
import { useSwapIntegration } from '@/hooks/useSwapIntegration';

function MySwapForm() {
  const {
    quote,
    quoteLoading,
    quoteError,
    executeSwap,
    isSwapping,
    swapError,
    txHash,
  } = useSwapIntegration();

  const { user } = usePrivy();
  const { wallets } = useWallets();

  const handlePerformSwap = async () => {
    if (!user?.wallet?.address || !wallets[0]) return;

    const signer = await wallets[0].getEthersProvider()?.getSigner();
    if (!signer) return;

    const result = await executeSwap({
      inputToken: '0x...',
      outputToken: '0x...',
      inputAmount: '1000000000000000000',
      userAddress: user.wallet.address,
      signer,
      towerRouterAddress: process.env.NEXT_PUBLIC_TOWER_ROUTER!,
    });

    if (result.success) {
      console.log('Swap completed:', result.txHash);
    } else {
      console.error('Swap failed:', result.error);
    }
  };

  return (
    <div>
      {quoteLoading && <p>Loading price...</p>}
      {quoteError && <p className="error">{quoteError}</p>}
      
      {quote && (
        <div>
          <p>Output: {quote.outputAmount}</p>
          <p>Price Impact: {quote.priceImpact / 100}%</p>
        </div>
      )}

      <button
        onClick={handlePerformSwap}
        disabled={isSwapping || !quote}
      >
        {isSwapping ? 'Swapping...' : 'Execute Swap'}
      </button>

      {swapError && <p className="error">{swapError}</p>}
      {txHash && <p className="success">Swap: {txHash}</p>}
    </div>
  );
}
```

## Testing the Integration

```bash
# Start backend
cd backend
npm run dev

# In another terminal, start frontend
npm run dev

# Visit http://localhost:3000 and test swaps
```

## Debugging Tips

1. **Enable console logs** in the SDK
2. **Check network tab** in browser DevTools
3. **Verify API responses** with correct format
4. **Check allowances** before swap
5. **Use latest gas prices** from `/gas-price` endpoint

## Common Issues & Solutions

### "No route found"
- Token pair not available on any DEX
- Try alternative tokens

### "Insufficient liquidity"
- Requested amount too large
- Reduce amount or split into smaller swaps

### "Approval failed"
- Token doesn't support ERC20 standard
- Check token contract ABI

### "Swap timeout"
- Backend API slow or unavailable
- Check `/health` endpoint
- Increase timeout in SDK config

---

For more details, see [DEX_AGGREGATOR_GUIDE.md](./DEX_AGGREGATOR_GUIDE.md)
