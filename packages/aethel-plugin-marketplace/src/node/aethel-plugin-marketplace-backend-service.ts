import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { AethelPluginMarketplaceService, Plugin } from '../common/aethel-plugin-marketplace-service';
import { RpcConnectionHandler } from '@theia/core/lib/common/messaging/proxy-factory';

@injectable()
export class AethelPluginMarketplaceBackendService implements AethelPluginMarketplaceService, BackendApplicationContribution {

    private plugins: Plugin[] = [];

    onStart(): void {
        console.log('Aethel Plugin Marketplace Backend started');
    }

    async uploadPlugin(plugin: Plugin): Promise<string> {
        plugin.id = `plugin-${Date.now()}`;
        this.plugins.push(plugin);
        return `Plugin ${plugin.name} uploaded with ID ${plugin.id}`;
    }

    async downloadPlugin(id: string): Promise<Plugin> {
        const plugin = this.plugins.find(p => p.id === id);
        if (!plugin) throw new Error('Plugin not found');
        return plugin;
    }

    async listPlugins(): Promise<Plugin[]> {
        return this.plugins;
    }

    async installPlugin(id: string): Promise<string> {
        // Install logic
        return `Plugin ${id} installed`;
    }
}

export const AethelPluginMarketplaceServiceHandler: RpcConnectionHandler<AethelPluginMarketplaceService> = {
    path: '/services/aethel-plugin-marketplace',
    handler: AethelPluginMarketplaceBackendService
};