export const AethelBackendService = Symbol('AethelBackendService');
export const AethelBackendServicePath = '/services/aethel-backend';

export interface AethelBackendService {
    exampleMethod(): Promise<string>;
}