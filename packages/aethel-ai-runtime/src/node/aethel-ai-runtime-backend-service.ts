import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { RpcConnectionHandler } from '@theia/core/lib/common';
import { AethelAiRuntimeService } from '../common/aethel-ai-runtime-service';
import fetch from 'node-fetch';

@injectable()
export class AethelAiRuntimeBackendService implements AethelAiRuntimeService, BackendApplicationContribution {

    private loadedModels: Set<string> = new Set();

    onStart(): void {
        console.log('Aethel AI Runtime Backend started');
    }

    async loadModel(modelName: string, type: string): Promise<string> {
        const base = process.env.AI_RUNTIME_URL || 'http://localhost:8000/ai-runtime';
        const adminToken = process.env.AI_RUNTIME_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
        try {
            const resp = await fetch(`${base}/load_model`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
                },
                body: JSON.stringify({ model_name: modelName, model_type: type })
            });
            if (!resp.ok) {
                const text = await resp.text();
                return `Failed to load model: ${resp.status} ${text}`;
            }
            const data = await resp.json().catch(() => ({}));
            this.loadedModels.add(modelName);
            return data.status ? JSON.stringify(data) : `Model ${modelName} loaded successfully`;
        } catch (error) {
            return `Failed to load model: ${String(error)}`;
        }
    }

    async runInference(model: string, prompt: string): Promise<string> {
        const base = process.env.AI_RUNTIME_URL || 'http://localhost:8000/ai-runtime';
        const adminToken = process.env.AI_RUNTIME_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
        try {
            const resp = await fetch(`${base}/run_inference`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
                },
                body: JSON.stringify({ model: model, prompt: prompt, max_tokens: 512 })
            });
            if (!resp.ok) {
                const text = await resp.text();
                return `Inference failed: ${resp.status} ${text}`;
            }
            const data = await resp.json().catch(() => ({}));
            if (data && data.response) {
                return data.response;
            }
            return JSON.stringify(data);
        } catch (error) {
            return `Inference failed: ${String(error)}`;
        }
    }
}

export const AethelAiRuntimeServiceHandler: RpcConnectionHandler<AethelAiRuntimeService> = {
    path: '/services/aethel-ai-runtime',
    handler: AethelAiRuntimeBackendService
};
