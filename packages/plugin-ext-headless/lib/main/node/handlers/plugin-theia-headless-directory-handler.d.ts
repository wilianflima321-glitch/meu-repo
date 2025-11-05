import { PluginDeployerDirectoryHandlerContext, PluginPackage } from '@theia/plugin-ext';
import { AbstractPluginDirectoryHandler } from '@theia/plugin-ext/lib/main/node/handlers/plugin-theia-directory-handler';
export declare class PluginTheiaHeadlessDirectoryHandler extends AbstractPluginDirectoryHandler {
    protected acceptManifest(plugin: PluginPackage): boolean;
    handle(context: PluginDeployerDirectoryHandlerContext): Promise<void>;
}
//# sourceMappingURL=plugin-theia-headless-directory-handler.d.ts.map