import { ethers } from 'ethers';
import { DexInfo, PoolData, ArcTestnetConfig } from '../types';
/**
 * DexDiscoveryService
 * Manages known DEXs and their pool configurations on Arc testnet
 */
export declare class DexDiscoveryService {
    private dexes;
    private poolCache;
    private arcTestnetDexes;
    constructor(_provider: ethers.providers.Provider, _config: ArcTestnetConfig);
    /**
     * Initialize known DEXes
     */
    private initializeDexes;
    /**
     * Register a custom DEX
     */
    registerDex(dex: DexInfo): void;
    /**
     * Get all available DEXes
     */
    getAllDexes(): DexInfo[];
    /**
     * Get DEX by ID
     */
    getDexById(dexId: string): DexInfo | undefined;
    /**
     * Get DEXes that support specific token pair
     */
    getDexesSupportingPair(token0: string, token1: string): DexInfo[];
    /**
     * Get token symbol by address (for logging/debugging)
     */
    getTokenSymbol(tokenAddress: string): string;
    /**
     * Get Synthra pool address for a token pair
     */
    getSynthraPoolAddress(token0: string, token1: string): string | null;
    /**
     * Get Synthra UniversalRouter address
     */
    getSynthraUniversalRouter(): string;
    /**
     * Fetch live pool reserves for a token pair from a DEX
     * Returns formatted pool data with reserves
     */
    getPoolReserves(dexId: string, token0: string, token1: string): Promise<PoolData | null>;
    /**
     * Fetch price from a specific DEX pool
     */
    getPrice(dexId: string, token0: string, token1: string): Promise<number | null>;
    /**
     * Get best price across all DEXes for a token pair
     */
    getBestPrice(token0: string, token1: string): Promise<{
        dexId: string;
        price: number;
    } | null>;
    /**
     * Get all pools for a specific token
     */
    getPoolsForToken(token: string): Promise<PoolData[]>;
    /**
     * Verify token pair exists on a DEX
     */
    pairExists(dexId: string, token0: string, token1: string): Promise<boolean>;
    /**
     * Get liquidity depth for a token pair
     */
    getLiquidityDepth(dexId: string, token0: string, token1: string, amountIn: string): Promise<{
        available: boolean;
        depth: number;
    } | null>;
    /**
     * Clear pool cache (useful for forced refresh)
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        pools: number;
        cacheSize: number;
    };
}
//# sourceMappingURL=DexDiscoveryService.d.ts.map