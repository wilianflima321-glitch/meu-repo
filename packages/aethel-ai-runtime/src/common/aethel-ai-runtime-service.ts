export const AethelAiRuntimeService = Symbol('AethelAiRuntimeService');
export const AethelAiRuntimeServicePath = '/services/aethel-ai-runtime';

export interface AethelAiRuntimeService {
    loadModel(modelName: string, type: string): Promise<string>;
    runInference(model: string, prompt: string): Promise<string>;
}