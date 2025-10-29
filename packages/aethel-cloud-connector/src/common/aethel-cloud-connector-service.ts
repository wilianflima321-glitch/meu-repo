export const AethelCloudConnectorService = Symbol('AethelCloudConnectorService');
export const AethelCloudConnectorServicePath = '/services/aethel-cloud-connector';

export interface CloudProvider {
    name: string;
    type: 'aws' | 'azure' | 'gcp';
    config: any;
}

export interface AethelCloudConnectorService {
    connectProvider(provider: CloudProvider): Promise<string>;
    offloadTask(task: any, provider: string): Promise<any>;
    getProviders(): Promise<CloudProvider[]>;
}