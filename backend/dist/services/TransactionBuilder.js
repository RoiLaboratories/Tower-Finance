"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBuilder = void 0;
const ethers_1 = require("ethers");
const helpers_1 = require("../utils/helpers");
// Swaparc StableSwapPool address
const SWAPARC_ADDRESS = '0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC';
// ERC20 ABI for allowance and approval
const ERC20_ABI = [
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
];
/**
 * TransactionBuilder
 * Builds executable transactions for swaps on Arc testnet
 */
class TransactionBuilder {
    constructor(config, provider) {
        this.config = config;
        this.provider = provider;
    }
    /**
     * Check if a router is Synthra UniversalRouter
     */
    isSynthraRouter(routerAddress) {
        try {
            return (helpers_1.AddressUtils.toChecksum(routerAddress) ===
                helpers_1.AddressUtils.toChecksum('0xbf4479c07dc6fdc6daa764a0cca06969e894275f'));
        }
        catch {
            return false;
        }
    }
    /**
     * Check if a router is Swaparc StableSwapPool
     */
    isSwaparcRouter(routerAddress) {
        try {
            return (helpers_1.AddressUtils.toChecksum(routerAddress) ===
                helpers_1.AddressUtils.toChecksum(SWAPARC_ADDRESS));
        }
        catch {
            return false;
        }
    }
    /**
     * Build swap transaction from a quote
     */
    async buildSwapTransaction(quote, userAddress, referrer) {
        try {
            helpers_1.AddressUtils.toChecksum(userAddress);
            const normalizedReferrer = referrer ? helpers_1.AddressUtils.toChecksum(referrer) : ethers_1.ethers.constants.AddressZero;
            const deadline = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes
            // Encode the swap call based on route type
            let data;
            if (quote.route.type === 'single' || quote.route.type === 'multi') {
                const hopData = quote.route.hops[0];
                if (!hopData) {
                    throw new Error('No hops found in route');
                }
                console.log('[TransactionBuilder] Building swap transaction:', {
                    dexName: hopData.dexName,
                    dexRouter: hopData.dexRouter,
                    inputToken: quote.inputToken,
                    outputToken: quote.outputToken,
                    route_type: quote.route.type,
                });
                // Check if using Synthra UniversalRouter
                if (this.isSynthraRouter(hopData.dexRouter)) {
                    console.log('[TransactionBuilder] Using Synthra UniversalRouter (direct route)');
                    // For Synthra, we encode a direct call to the UniversalRouter
                    // For now, return the minimal data to allow the frontend to handle it
                    data = this._encodeSynthraSwap(quote, userAddress);
                }
                else if (this.isSwaparcRouter(hopData.dexRouter)) {
                    console.log('[TransactionBuilder] Using Swaparc encoding');
                    data = await this._encodeSwaparcSwap(quote, hopData.dexRouter, userAddress, normalizedReferrer);
                }
                else {
                    // Standard DEX router encoding
                    console.log('[TransactionBuilder] Using standard router encoding');
                    data = helpers_1.EncodingUtils.encodeTowerRouterSwap(quote.inputAmount, quote.minOut, quote.route.hops.map(h => h.path).flat(), // Flattened path
                    userAddress, deadline, hopData.dexRouter, normalizedReferrer);
                }
            }
            else {
                // Split route handling
                console.log('[TransactionBuilder] Using split route encoding');
                data = this._encodeSplitSwap(quote, userAddress, deadline, normalizedReferrer);
            }
            // Determine target address based on router type (BEFORE gas estimation)
            let targetAddress = this.config.towerRouterAddress; // Default to Tower Router
            // For Synthra, use the UniversalRouter as the target
            if (quote.route.type === 'single' || quote.route.type === 'multi') {
                const hopData = quote.route.hops[0];
                if (hopData && this.isSynthraRouter(hopData.dexRouter)) {
                    targetAddress = hopData.dexRouter;
                }
            }
            // Estimate gas based on CORRECT target router
            const gasEstimate = await this._estimateGas(targetAddress, data);
            const tx = {
                to: targetAddress,
                data,
                value: '0',
                from: userAddress,
                gasLimit: gasEstimate.toString(),
                chainId: this.config.chainId,
            };
            console.log('[TransactionBuilder] Built swap transaction:', {
                to: tx.to,
                from: tx.from,
                dataLength: tx.data?.length || 0,
                value: tx.value,
                gasLimit: tx.gasLimit,
            });
            return tx;
        }
        catch (error) {
            console.error('Error building swap transaction:', error);
            throw error;
        }
    }
    /**
     * Build approval transaction for a token
     */
    buildApprovalTransaction(tokenAddress, spenderAddress, amount, userAddress) {
        try {
            const data = helpers_1.EncodingUtils.encodeApprove(spenderAddress, amount);
            return {
                to: tokenAddress,
                data,
                from: userAddress,
                gasLimit: '100000',
            };
        }
        catch (error) {
            console.error('Error building approval transaction:', error);
            throw error;
        }
    }
    /**
     * Build approval transaction with unlimited allowance
     */
    buildUnlimitedApprovalTransaction(tokenAddress, spenderAddress, userAddress) {
        const maxUint256 = ethers_1.ethers.constants.MaxUint256.toString();
        return this.buildApprovalTransaction(tokenAddress, spenderAddress, maxUint256, userAddress);
    }
    /**
     * Build approval transactions for all tokens in path
     */
    buildPathApprovals(path, spenderAddress, _amount, userAddress) {
        const approvals = [];
        // Only approve the first token (input token)
        if (path.length > 0) {
            approvals.push(this.buildUnlimitedApprovalTransaction(path[0], spenderAddress, userAddress));
        }
        return approvals;
    }
    /**
     * Check if approval is needed
     */
    async needsApproval(tokenAddress, spenderAddress, userAddress, requiredAmount) {
        try {
            const erc20 = new ethers_1.ethers.Contract(tokenAddress, ['function allowance(address owner, address spender) view returns (uint256)'], this.provider);
            const allowance = await erc20.allowance(userAddress, spenderAddress);
            return ethers_1.ethers.BigNumber.from(allowance).lt(ethers_1.ethers.BigNumber.from(requiredAmount));
        }
        catch (error) {
            console.error('Error checking approval:', error);
            return true; // Default to true if we can't check
        }
    }
    /**
     * Encode split swap transaction
     */
    _encodeSplitSwap(quote, userAddress, deadline, referrer) {
        // For split swaps, we encode a special call to TowerRouter.swapWithSplit
        const iface = new ethers_1.ethers.utils.Interface([
            `function swapWithSplit(
        tuple(address[] path, uint256 amountIn, uint256 minAmountOut, address router)[] splits,
        address tokenOut,
        uint256 minAmountOut,
        address to,
        uint256 deadline,
        address referrer
      ) returns (uint256)`,
        ]);
        const splits = quote.route.hops.map((hop) => ({
            path: hop.path,
            amountIn: hop.amountIn,
            minAmountOut: ethers_1.ethers.BigNumber.from(hop.amountOut)
                .mul(9750) // 2.5% slippage
                .div(10000)
                .toString(),
            router: hop.dexRouter,
        }));
        return iface.encodeFunctionData('swapWithSplit', [
            splits,
            quote.outputToken,
            quote.minOut,
            userAddress,
            deadline,
            referrer,
        ]);
    }
    /**
     * Encode Swaparc StableSwapPool swap
     */
    /**
     * Encode Synthra UniversalRouter swap call
     * For Synthra, we return minimal encoded data since the frontend will handle the actual swap
     * For now, we create a simple placeholder that encodes input/output for validation
     */
    _encodeSynthraSwap(quote, userAddress) {
        // Synthra swaps use the UniversalRouter directly
        // ABI: function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
        const deadlineTimestamp = Math.floor(Date.now() / 1000) + 30 * 60;
        // Build the path, checking if USDC needs to be wrapped to WUSDC
        const USDC = '0x3600000000000000000000000000000000000000'.toLowerCase();
        const WUSDC = '0x911b4000D3422F482F4062a913885f7b035382Df'.toLowerCase();
        const SYN = '0xC5124C846c6e6307986988dFb7e743327aA05F19'.toLowerCase();
        let path;
        const inputLower = quote.inputToken.toLowerCase();
        const outputLower = quote.outputToken.toLowerCase();
        console.log(`[TransactionBuilder] Encoding Synthra swap: ${inputLower} → ${outputLower}`);
        // If input is USDC and output is SYN, use multi-hop: USDC → WUSDC → SYN
        if (inputLower === USDC && outputLower === SYN) {
            console.log(`[TransactionBuilder] USDC → SYN detected, using multi-hop path: USDC → WUSDC → SYN`);
            path = [quote.inputToken, WUSDC, quote.outputToken];
        }
        else {
            // Direct swap
            path = [quote.inputToken, quote.outputToken];
        }
        const iface = new ethers_1.ethers.utils.Interface([
            'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)',
        ]);
        console.log(`[TransactionBuilder] Synthra swap path: ${path.join(' → ')}`);
        return iface.encodeFunctionData('swapExactTokensForTokens', [
            quote.inputAmount,
            quote.minOut,
            path,
            userAddress,
            deadlineTimestamp,
        ]);
    }
    async _encodeSwaparcSwap(quote, poolAddress, userAddress, referrer) {
        const inputToken = quote.inputToken;
        const outputToken = quote.outputToken;
        // For Swaparc, we still call TowerRouter, but the router is the StableSwapPool
        // The path becomes [inputToken, outputToken] or similar based on the pool structure
        // We encode using the standard TowerRouter interface, passing the pool as the router
        const path = [inputToken, outputToken];
        return helpers_1.EncodingUtils.encodeTowerRouterSwap(quote.inputAmount, quote.minOut, path, userAddress, Math.floor(Date.now() / 1000) + 30 * 60, poolAddress, referrer);
    }
    /**
     * Estimate gas for a transaction
     */
    async _estimateGas(to, data) {
        try {
            const gasEstimate = await this.provider.estimateGas({
                to,
                data,
                value: '0',
            });
            // Add 20% buffer for safety
            return gasEstimate.mul(120).div(100).toString();
        }
        catch (error) {
            console.warn('Gas estimation failed, using default:', error);
            // Return sensible default based on transaction complexity
            return '500000';
        }
    }
    /**
     * Decode revert reason from failed transaction
     */
    async decodeRevertReason(txHash) {
        try {
            const response = await this.provider.call({
                to: txHash,
                data: '',
            });
            // Parse error message from response
            const errorSig = response.slice(0, 10);
            if (errorSig === '0x08c379a0') {
                // Standard 'Error(string)' encoding
                const decodedParams = ethers_1.ethers.utils.defaultAbiCoder.decode(['string'], '0x' + response.slice(10));
                return decodedParams[0];
            }
            return null;
        }
        catch (error) {
            console.error('Error decoding revert reason:', error);
            return null;
        }
    }
    /**
     * Validate transaction before submission
     */
    validateTransaction(tx) {
        const errors = [];
        if (!ethers_1.ethers.utils.isAddress(tx.to)) {
            errors.push('Invalid recipient address');
        }
        if (!ethers_1.ethers.utils.isAddress(tx.from)) {
            errors.push('Invalid sender address');
        }
        if (!tx.data.startsWith('0x')) {
            errors.push('Invalid transaction data (must start with 0x)');
        }
        if (tx.chainId !== this.config.chainId) {
            errors.push(`Invalid chain ID. Expected ${this.config.chainId}, got ${tx.chainId}`);
        }
        try {
            ethers_1.ethers.BigNumber.from(tx.gasLimit);
        }
        catch {
            errors.push('Invalid gas limit');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Get current gas price
     */
    async getGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            return {
                standard: feeData.gasPrice?.mul(100).div(100).toString() || '0',
                fast: feeData.gasPrice?.mul(120).div(100).toString() || '0',
                instant: feeData.gasPrice?.mul(150).div(100).toString() || '0',
            };
        }
        catch (error) {
            console.warn('Error getting gas price:', error);
            return {
                standard: '0',
                fast: '0',
                instant: '0',
            };
        }
    }
    /**
     * Check current allowance for a token
     */
    async _checkAllowance(tokenAddress, ownerAddress, spenderAddress) {
        try {
            const token = new ethers_1.ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            const allowance = await token.allowance(ownerAddress, spenderAddress);
            return allowance.toString();
        }
        catch (error) {
            console.error(`Error checking allowance for ${tokenAddress}:`, error);
            return '0';
        }
    }
    /**
     * Build an approval transaction
     */
    _buildApprovalTransaction(tokenAddress, spenderAddress, userAddress, amount = ethers_1.ethers.constants.MaxUint256.toString()) {
        const iface = new ethers_1.ethers.utils.Interface(ERC20_ABI);
        const data = iface.encodeFunctionData('approve', [spenderAddress, amount]);
        return {
            to: tokenAddress,
            data,
            from: userAddress,
            gasLimit: '100000', // Standard approval gas limit
        };
    }
    /**
     * Build swap transaction with automatic approval if needed
     */
    async buildSwapTransactionWithApproval(quote, userAddress, referrer) {
        // Determine the spender address (router that will spend the tokens)
        let spenderAddress;
        if (quote.route.type === 'single' || quote.route.type === 'multi') {
            const hopData = quote.route.hops[0];
            if (hopData && this.isSynthraRouter(hopData.dexRouter)) {
                spenderAddress = hopData.dexRouter; // Synthra UniversalRouter
            }
            else {
                spenderAddress = this.config.towerRouterAddress; // Default Tower Router
            }
        }
        else {
            spenderAddress = this.config.towerRouterAddress;
        }
        // Check current allowance FIRST, before attempting gas estimation
        const currentAllowance = await this._checkAllowance(quote.inputToken, userAddress, spenderAddress);
        const needsApproval = ethers_1.ethers.BigNumber.from(currentAllowance).lt(quote.inputAmount);
        console.log(`[TransactionBuilder] Checking allowance for ${quote.inputToken}:`, {
            owner: userAddress,
            spender: spenderAddress,
            currentAllowance,
            requiredAmount: quote.inputAmount,
            needsApproval,
        });
        // Build the swap transaction - skip gas estimation if approval is needed
        // (Gas estimation will fail without approval, so we use a default)
        let swapTx;
        if (needsApproval) {
            console.log(`[TransactionBuilder] Approval needed - skipping gas estimation, using default`);
            swapTx = await this._buildSwapTransactionWithoutGasEstimation(quote, userAddress, referrer);
        }
        else {
            console.log(`[TransactionBuilder] Approval exists - performing gas estimation`);
            swapTx = await this.buildSwapTransaction(quote, userAddress, referrer);
        }
        // If allowance is insufficient, build approval transaction
        if (needsApproval) {
            console.log(`[TransactionBuilder] Building approval transaction for ${quote.inputToken}`);
            const approvalTx = this._buildApprovalTransaction(quote.inputToken, spenderAddress, userAddress, ethers_1.ethers.constants.MaxUint256.toString() // Approve unlimited for convenience
            );
            return {
                approval: approvalTx,
                swap: swapTx,
            };
        }
        // No approval needed
        console.log(`[TransactionBuilder] No approval needed, sufficient allowance exists`);
        return {
            swap: swapTx,
        };
    }
    /**
     * Build swap transaction without gas estimation (used when approval is needed)
     */
    async _buildSwapTransactionWithoutGasEstimation(quote, userAddress, referrer) {
        try {
            helpers_1.AddressUtils.toChecksum(userAddress);
            const normalizedReferrer = referrer ? helpers_1.AddressUtils.toChecksum(referrer) : ethers_1.ethers.constants.AddressZero;
            const deadline = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes
            // Encode the swap call based on route type
            let data;
            if (quote.route.type === 'single' || quote.route.type === 'multi') {
                const hopData = quote.route.hops[0];
                if (!hopData) {
                    throw new Error('No hops found in route');
                }
                // Check if using Synthra UniversalRouter
                if (this.isSynthraRouter(hopData.dexRouter)) {
                    data = this._encodeSynthraSwap(quote, userAddress);
                }
                else if (this.isSwaparcRouter(hopData.dexRouter)) {
                    data = await this._encodeSwaparcSwap(quote, hopData.dexRouter, userAddress, normalizedReferrer);
                }
                else {
                    data = helpers_1.EncodingUtils.encodeTowerRouterSwap(quote.inputAmount, quote.minOut, quote.route.hops.map(h => h.path).flat(), userAddress, deadline, hopData.dexRouter, normalizedReferrer);
                }
            }
            else {
                data = this._encodeSplitSwap(quote, userAddress, deadline, normalizedReferrer);
            }
            // Determine target address based on router type
            let targetAddress = this.config.towerRouterAddress;
            if (quote.route.type === 'single' || quote.route.type === 'multi') {
                const hopData = quote.route.hops[0];
                if (hopData && this.isSynthraRouter(hopData.dexRouter)) {
                    targetAddress = hopData.dexRouter;
                }
            }
            // Use default gas limit without estimation (approval will be pending)
            const DEFAULT_SWAP_GAS = '500000';
            const tx = {
                to: targetAddress,
                data,
                value: '0',
                from: userAddress,
                gasLimit: DEFAULT_SWAP_GAS,
                chainId: this.config.chainId,
            };
            console.log('[TransactionBuilder] Built swap transaction (no gas estimate):', {
                to: tx.to,
                from: tx.from,
                dataLength: tx.data?.length || 0,
                value: tx.value,
                gasLimit: tx.gasLimit,
                reason: 'approval pending',
            });
            return tx;
        }
        catch (error) {
            console.error('Error building swap transaction:', error);
            throw error;
        }
    }
}
exports.TransactionBuilder = TransactionBuilder;
//# sourceMappingURL=TransactionBuilder.js.map