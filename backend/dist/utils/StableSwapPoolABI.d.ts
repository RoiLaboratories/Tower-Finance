export declare const STABLE_SWAP_POOL_ABI: ({
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    name?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
})[];
/**
 * Interface for StableSwapPool contract functions
 */
export interface IStableSwapPool {
    swap(i: number, j: number, dx: string): Promise<string>;
    get_dy(i: number, j: number, dx: string): Promise<string>;
    getTokenCount(): Promise<number>;
    tokens(index: number): Promise<string>;
    getBalances(): Promise<string[]>;
}
//# sourceMappingURL=StableSwapPoolABI.d.ts.map