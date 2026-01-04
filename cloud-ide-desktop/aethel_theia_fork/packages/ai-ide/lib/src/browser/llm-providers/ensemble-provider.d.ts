import type { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';
export type EnsembleCfg = {
    providerIds: string[];
    mode: 'fast' | 'blend' | 'best';
    timeoutMs?: number;
};
export declare class EnsembleProvider implements ILlmProvider {
    id: string;
    name: string;
    type: any;
    protected cfg: EnsembleCfg;
    protected factory: (id: string) => ILlmProvider | undefined;
    constructor(cfg: EnsembleCfg, factory: (id: string) => ILlmProvider | undefined);
    protected callWithTimeout(p: Promise<LlmProviderResponse>, timeoutMs?: number): Promise<LlmProviderResponse | null>;
    sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse>;
}
