"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StableSwapPoolUtils = void 0;
const ethers_1 = require("ethers");
const StableSwapPoolABI_1 = require("./StableSwapPoolABI");
/**
 * Utility class for interacting with Swaparc StableSwapPool
 */
class StableSwapPoolUtils {
    constructor() {
        this.tokenIndexCache = new Map();
    }
    /**
     * Get token indices for a swap in the StableSwapPool
     * @param poolAddress The StableSwapPool contract address
     * @param provider The ethers provider
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @returns Object with tokenInIndex and tokenOutIndex
     */
    async getTokenIndices(poolAddress, provider, tokenIn, tokenOut) {
        // Check cache first
        if (this.tokenIndexCache.has(poolAddress)) {
            const poolCache = this.tokenIndexCache.get(poolAddress);
            if (poolCache.has(tokenIn) && poolCache.has(tokenOut)) {
                return {
                    tokenInIndex: poolCache.get(tokenIn),
                    tokenOutIndex: poolCache.get(tokenOut),
                };
            }
        }
        // Create StableSwapPool contract instance
        const pool = new ethers_1.ethers.Contract(poolAddress, StableSwapPoolABI_1.STABLE_SWAP_POOL_ABI, provider);
        // Get token count
        const tokenCount = await pool.getTokenCount();
        // Find token indices
        let tokenInIndex = -1;
        let tokenOutIndex = -1;
        for (let i = 0; i < tokenCount; i++) {
            const token = await pool.tokens(i);
            const normalizedToken = ethers_1.ethers.utils.getAddress(token);
            const normalizedTokenIn = ethers_1.ethers.utils.getAddress(tokenIn);
            const normalizedTokenOut = ethers_1.ethers.utils.getAddress(tokenOut);
            if (normalizedToken === normalizedTokenIn) {
                tokenInIndex = i;
            }
            if (normalizedToken === normalizedTokenOut) {
                tokenOutIndex = i;
            }
            // Cache for future lookups
            if (!this.tokenIndexCache.has(poolAddress)) {
                this.tokenIndexCache.set(poolAddress, new Map());
            }
            this.tokenIndexCache.get(poolAddress).set(normalizedToken, i);
        }
        if (tokenInIndex === -1 || tokenOutIndex === -1) {
            throw new Error(`Token not found in StableSwapPool. TokenIn index: ${tokenInIndex}, TokenOut index: ${tokenOutIndex}`);
        }
        return { tokenInIndex, tokenOutIndex };
    }
    /**
     * Calculate expected output for a swap
     */
    async getSwapOutput(poolAddress, provider, tokenInIndex, tokenOutIndex, amountIn) {
        const pool = new ethers_1.ethers.Contract(poolAddress, StableSwapPoolABI_1.STABLE_SWAP_POOL_ABI, provider);
        const output = await pool.get_dy(tokenInIndex, tokenOutIndex, amountIn);
        return output.toString();
    }
    /**
     * Clear cache (useful for resets)
     */
    clearCache() {
        this.tokenIndexCache.clear();
    }
}
exports.StableSwapPoolUtils = StableSwapPoolUtils;
//# sourceMappingURL=StableSwapPoolUtils.js.map