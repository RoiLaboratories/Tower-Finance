/**
 * Synthra V3 Pool Registry for Arc Testnet
 * Maps token pairs to their specific V3 pool addresses
 * All swaps route through UniversalRouter: 0xbf4479c07dc6fdc6daa764a0cca06969e894275f
 */
export interface SynthraPoolInfo {
    poolAddress: string;
    token0: string;
    token1: string;
    symbol: string;
    fee?: number;
}
export declare const SYNTHRA_UNIVERSAL_ROUTER = "0xbf4479c07dc6fdc6daa764a0cca06969e894275f";
export declare const synthraV3Pools: Record<string, SynthraPoolInfo>;
/**
 * Get pool address for a token pair
 * Automatically determines correct order and returns pool address
 * Supports token substitution (e.g., USDC -> WUSDC) when direct pool not available
 */
export declare function getSynthraPoolForPair(token0: string, token1: string): SynthraPoolInfo | null;
/**
 * Get all pool addresses for Synthra
 */
export declare function getAllSynthraPoolAddresses(): string[];
/**
 * Check if Synthra has a pool for the token pair
 */
export declare function hasSynthraPool(token0: string, token1: string): boolean;
/**
 * Get supported token address
 */
export declare function getTokenAddress(symbol: string): string | undefined;
/**
 * Get all supported Synthra tokens
 */
export declare function getSynthraTokens(): string[];
//# sourceMappingURL=SynthraPoolRegistry.d.ts.map