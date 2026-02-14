/**
 * Synthra V3 Pool Service
 * Fetches pool state and calculates swap outputs using QuoterV2
 */
export interface PoolState {
    liquidity: string;
    sqrtPriceX96: string;
    tick: number;
    fee: number;
    token0?: string;
    token1?: string;
}
export interface SwapSimulation {
    amountIn: string;
    amountOut: string;
    priceImpact: number;
    executionPrice: number;
}
export declare class SynthraV3PoolService {
    private provider;
    private stateCache;
    private cacheExpiry;
    private tokenOut;
    constructor(rpcUrl: string, tokenOut?: string);
    /**
     * Set the output token for this service instance
     */
    setTokenOut(tokenOut: string): void;
    /**
     * Fetch pool state (liquidity, price, tick)
     */
    getPoolState(poolAddress: string): Promise<PoolState | null>;
    /**
     * Simulate a swap by:
     * 1. Using known pool for WUSDC-SYN
     * 2. Using QuoterV2.quoteExactInputSingle to get the output amount
     */
    simulateSwap(inputToken: string, inputAmount: string, decimalsIn: number, decimalsOut: number): Promise<SwapSimulation | null>;
    /**
     * Clear cache
     */
    clearCache(): void;
}
//# sourceMappingURL=SynthraV3PoolService.d.ts.map