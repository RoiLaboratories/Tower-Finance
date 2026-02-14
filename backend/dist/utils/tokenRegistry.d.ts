/**
 * Token Registry for Arc Testnet
 * Maps token addresses to symbols and metadata
 */
export interface TokenInfo {
    symbol: string;
    address: string;
    decimals: number;
    name: string;
}
export declare const arcTestnetTokens: Record<string, TokenInfo>;
/**
 * Get token info by address
 */
export declare function getTokenByAddress(address: string): TokenInfo | undefined;
/**
 * Get token symbol by address
 */
export declare function getTokenSymbol(address: string): string | undefined;
/**
 * Check if token is supported
 */
export declare function isTokenSupported(address: string): boolean;
/**
 * Get all supported token addresses
 */
export declare function getSupportedTokenAddresses(): string[];
/**
 * Get all supported token symbols
 */
export declare function getSupportedTokenSymbols(): string[];
//# sourceMappingURL=tokenRegistry.d.ts.map