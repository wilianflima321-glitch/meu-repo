export const AethelPluginMarketplaceService = Symbol('AethelPluginMarketplaceService');
export const AethelPluginMarketplaceServicePath = '/services/aethel-plugin-marketplace';

export interface Plugin {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    file: Buffer;
}

export interface AethelPluginMarketplaceService {
    uploadPlugin(plugin: Plugin): Promise<string>;
    downloadPlugin(id: string): Promise<Plugin>;
    listPlugins(): Promise<Plugin[]>;
    installPlugin(id: string): Promise<string>;
}