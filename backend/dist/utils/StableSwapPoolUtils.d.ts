import { ethers } from 'ethers';
/**
 * Utility class for interacting with Swaparc StableSwapPool
 */
export declare class StableSwapPoolUtils {
    private tokenIndexCache;
    /**
     * Get token indices for a swap in the StableSwapPool
     * @param poolAddress The StableSwapPool contract address
     * @param provider The ethers provider
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @returns Object with tokenInIndex and tokenOutIndex
     */
    getTokenIndices(poolAddress: string, provider: ethers.providers.Provider, tokenIn: string, tokenOut: string): Promise<{
        tokenInIndex: number;
        tokenOutIndex: number;
    }>;
    /**
     * Calculate expected output for a swap
     */
    getSwapOutput(poolAddress: string, provider: ethers.providers.Provider, tokenInIndex: number, tokenOutIndex: number, amountIn: string): Promise<string>;
    /**
     * Clear cache (useful for resets)
     */
    clearCache(): void;
}
//# sourceMappingURL=StableSwapPoolUtils.d.ts.map