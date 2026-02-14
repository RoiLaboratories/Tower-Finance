"use strict";
/**
 * Synthra V3 Pool Service
 * Fetches pool state and calculates swap outputs using QuoterV2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynthraV3PoolService = void 0;
const ethers_1 = require("ethers");
// Synthra Addresses
const ADDR = {
    factory: '0x0fB6EEDA6e90E90797083861A75D15752a27f59c',
    quoterV2: '0x3Ce954107b1A675826B33bF23060Dd655e3758fE',
};
// Known good pools on Synthra
const KNOWN_POOLS = {
    'wusdc-syn': {
        address: '0xE753901d8bbD6162011b473deAf7361efc44BDb4',
        fee: 3000, // 0.3%
    },
};
// QuoterV2 ABI - note: must use staticCall, not regular call
const QUOTER_V2_ABI = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];
// Uniswap V3 Pool ABI (minimal for our use)
const POOL_ABI = [
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function fee() external view returns (uint24)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
];
class SynthraV3PoolService {
    constructor(rpcUrl, tokenOut) {
        this.stateCache = new Map();
        this.cacheExpiry = 10000; // 10 seconds
        this.tokenOut = '';
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        if (tokenOut)
            this.tokenOut = tokenOut;
    }
    /**
     * Set the output token for this service instance
     */
    setTokenOut(tokenOut) {
        this.tokenOut = tokenOut;
    }
    /**
     * Fetch pool state (liquidity, price, tick)
     */
    async getPoolState(poolAddress) {
        try {
            // Check cache
            const cached = this.stateCache.get(poolAddress.toLowerCase());
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log(`[Cache Hit] Pool state for ${poolAddress}`);
                return cached.state;
            }
            const pool = new ethers_1.ethers.Contract(poolAddress, POOL_ABI, this.provider);
            // Fetch pool data in parallel
            const [liquidity, slot0, fee, token0, token1] = await Promise.all([
                pool.liquidity(),
                pool.slot0(),
                pool.fee(),
                pool.token0(),
                pool.token1(),
            ]);
            const state = {
                liquidity: liquidity.toString(),
                sqrtPriceX96: slot0[0].toString(),
                tick: slot0[1],
                fee: fee,
                token0: token0.toLowerCase(),
                token1: token1.toLowerCase(),
            };
            // Cache the state
            this.stateCache.set(poolAddress.toLowerCase(), {
                state,
                timestamp: Date.now(),
            });
            console.log(`[Pool State] ${poolAddress}:`, {
                liquidity: state.liquidity,
                sqrtPriceX96: state.sqrtPriceX96,
                tick: state.tick,
                fee: state.fee,
                token0: state.token0,
                token1: state.token1,
            });
            return state;
        }
        catch (error) {
            console.error(`Error fetching pool state for ${poolAddress}:`, error);
            return null;
        }
    }
    /**
     * Simulate a swap by:
     * 1. Using known pool for WUSDC-SYN
     * 2. Using QuoterV2.quoteExactInputSingle to get the output amount
     */
    async simulateSwap(inputToken, inputAmount, decimalsIn, decimalsOut) {
        try {
            if (!this.provider)
                throw new Error('Provider not initialized');
            if (!this.tokenOut)
                throw new Error('Output token not set');
            const quoter = new ethers_1.ethers.Contract(ADDR.quoterV2, QUOTER_V2_ABI, this.provider);
            let actualInputToken = inputToken;
            console.log(`[Synthra] Starting quote discovery for ${inputToken} → ${this.tokenOut}`);
            // Check if input is USDC and needs to be wrapped to WUSDC
            const USDC = '0x3600000000000000000000000000000000000000'.toLowerCase();
            const WUSDC = '0x911b4000D3422F482F4062a913885f7b035382Df'.toLowerCase();
            const SYN = '0xC5124C846c6e6307986988dFb7e743327aA05F19'.toLowerCase();
            const inputLower = inputToken.toLowerCase();
            const tokenOutLower = this.tokenOut.toLowerCase();
            console.log(`[Synthra Debug] Input: ${inputLower}, Output: ${tokenOutLower}`);
            console.log(`[Synthra Debug] USDC: ${USDC}, WUSDC: ${WUSDC}, SYN: ${SYN}`);
            if (inputLower === USDC) {
                console.log(`[Synthra] Detected USDC input, converting to WUSDC`);
                actualInputToken = WUSDC;
            }
            const actualInputLower = actualInputToken.toLowerCase();
            console.log(`[Synthra Debug] After conversion - Input: ${actualInputLower}, Output: ${tokenOutLower}`);
            console.log(`[Synthra Debug] Is WUSDC-SYN pair? ${actualInputLower === WUSDC && tokenOutLower === SYN}`);
            // Check if this is a known pool pair (WUSDC-SYN)
            if (actualInputLower === WUSDC && tokenOutLower === SYN) {
                console.log(`[Synthra] Using known WUSDC-SYN pool at ${KNOWN_POOLS['wusdc-syn'].address}`);
                const knownPool = KNOWN_POOLS['wusdc-syn'];
                try {
                    const [amountOut] = await quoter.callStatic.quoteExactInputSingle({
                        tokenIn: actualInputToken,
                        tokenOut: this.tokenOut,
                        amountIn: inputAmount,
                        fee: knownPool.fee,
                        sqrtPriceLimitX96: 0,
                    });
                    const amountOutBigInt = BigInt(amountOut.toString());
                    const amountOutDecimal = Number(amountOutBigInt) / Math.pow(10, decimalsOut);
                    const amountInDecimal = Number(inputAmount) / Math.pow(10, decimalsIn);
                    const executionPrice = amountOutDecimal / amountInDecimal;
                    console.log(`[Synthra Quote] WUSDC-SYN pool, fee: ${knownPool.fee}, amountOut: ${amountOutDecimal.toFixed(6)} tokens`);
                    return {
                        amountIn: inputAmount,
                        amountOut: amountOutBigInt.toString(),
                        priceImpact: knownPool.fee / 100,
                        executionPrice,
                    };
                }
                catch (err) {
                    console.log(`[Synthra] Known pool quote failed: ${err.message}`);
                    throw err;
                }
            }
            console.error(`[Synthra Error] Unsupported pair: ${actualInputLower} → ${tokenOutLower}`);
            return null;
        }
        catch (error) {
            console.error('[Synthra Error] simulateSwap failed:', error);
            return null;
        }
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.stateCache.clear();
    }
}
exports.SynthraV3PoolService = SynthraV3PoolService;
//# sourceMappingURL=SynthraV3PoolService.js.map