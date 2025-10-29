import { injectable, inject } from 'inversify';
import { RpcProxy, RpcProxyFactory } from '@theia/core/lib/common';
import { AethelAiRuntimeService, AethelAiRuntimeServicePath } from '../common/aethel-ai-runtime-service';

@injectable()
export class AethelAiRuntimeClient implements AethelAiRuntimeService {

    @inject(RpcProxyFactory)
    protected readonly rpcProxyFactory: RpcProxyFactory<AethelAiRuntimeService>;

    protected readonly proxy: RpcProxy<AethelAiRuntimeService>;

    constructor() {
        this.proxy = this.rpcProxyFactory.createProxy();
    }

    loadModel(modelName: string, type: string): Promise<string> {
        return this.proxy.loadModel(modelName, type);
    }

    runInference(model: string, prompt: string): Promise<string> {
        return this.proxy.runInference(model, prompt);
    }
}