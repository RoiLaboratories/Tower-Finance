import { ethers } from 'ethers';
import { Quote, SwapTransaction, ApprovalTransaction, ArcTestnetConfig } from '../types';
/**
 * TransactionBuilder
 * Builds executable transactions for swaps on Arc testnet
 */
export declare class TransactionBuilder {
    private config;
    private provider;
    constructor(config: ArcTestnetConfig, provider: ethers.providers.Provider);
    /**
     * Check if a router is Synthra UniversalRouter
     */
    private isSynthraRouter;
    /**
     * Check if a router is Swaparc StableSwapPool
     */
    private isSwaparcRouter;
    /**
     * Build swap transaction from a quote
     */
    buildSwapTransaction(quote: Quote, userAddress: string, referrer?: string): Promise<SwapTransaction>;
    /**
     * Build approval transaction for a token
     */
    buildApprovalTransaction(tokenAddress: string, spenderAddress: string, amount: string, userAddress: string): ApprovalTransaction;
    /**
     * Build approval transaction with unlimited allowance
     */
    buildUnlimitedApprovalTransaction(tokenAddress: string, spenderAddress: string, userAddress: string): ApprovalTransaction;
    /**
     * Build approval transactions for all tokens in path
     */
    buildPathApprovals(path: string[], spenderAddress: string, _amount: string, userAddress: string): ApprovalTransaction[];
    /**
     * Check if approval is needed
     */
    needsApproval(tokenAddress: string, spenderAddress: string, userAddress: string, requiredAmount: string): Promise<boolean>;
    /**
     * Encode split swap transaction
     */
    private _encodeSplitSwap;
    /**
     * Encode Swaparc StableSwapPool swap
     */
    /**
     * Encode Synthra UniversalRouter swap call
     * For Synthra, we return minimal encoded data since the frontend will handle the actual swap
     * For now, we create a simple placeholder that encodes input/output for validation
     */
    private _encodeSynthraSwap;
    private _encodeSwaparcSwap;
    /**
     * Estimate gas for a transaction
     */
    private _estimateGas;
    /**
     * Decode revert reason from failed transaction
     */
    decodeRevertReason(txHash: string): Promise<string | null>;
    /**
     * Validate transaction before submission
     */
    validateTransaction(tx: SwapTransaction): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get current gas price
     */
    getGasPrice(): Promise<{
        standard: string;
        fast: string;
        instant: string;
    }>;
    /**
     * Check current allowance for a token
     */
    private _checkAllowance;
    /**
     * Build an approval transaction
     */
    private _buildApprovalTransaction;
    /**
     * Build swap transaction with automatic approval if needed
     */
    buildSwapTransactionWithApproval(quote: Quote, userAddress: string, referrer?: string): Promise<{
        approval?: ApprovalTransaction;
        swap: SwapTransaction;
    }>;
    /**
     * Build swap transaction without gas estimation (used when approval is needed)
     */
    private _buildSwapTransactionWithoutGasEstimation;
}
//# sourceMappingURL=TransactionBuilder.d.ts.map