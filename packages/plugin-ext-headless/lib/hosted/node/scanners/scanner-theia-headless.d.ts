import { DeployedPlugin, PluginPackage, PluginEntryPoint } from '@theia/plugin-ext';
import { AbstractPluginScanner } from '@theia/plugin-ext/lib/hosted/node/scanners/scanner-theia';
export declare class TheiaHeadlessPluginScanner extends AbstractPluginScanner {
    constructor();
    protected getEntryPoint(plugin: PluginPackage): PluginEntryPoint;
    /**
     * Adapt the given `plugin`'s metadata for headless deployment, where it does not
     * already natively specify its headless deployment, such as is the case for plugins
     * declaring the `"vscode"` or `"theiaPlugin"` engine. This consists of cloning the
     * relevant properties of its deployment metadata and modifying them as required,
     * including but not limited to:
     *
     * - renaming the `lifecycle` start and stop functions as 'activate' and 'deactivate'
     *   following the VS Code naming convention (in case the `plugin` is a Theia-style
     *   plugin that uses 'start' and 'stop')
     * - deleting inapplicable information such as frontend and backend init script paths
     * - filtering/rewriting contributions and/or activation events
     *
     * The cloning is necessary to retain the original information for the non-headless
     * deployments that the plugin also supports.
     */
    adaptForHeadless(plugin: DeployedPlugin): DeployedPlugin;
    protected adaptMetadataForHeadless(plugin: DeployedPlugin): DeployedPlugin['metadata'];
    protected adaptContributesForHeadless(plugin: DeployedPlugin): DeployedPlugin['contributes'];
}
//# sourceMappingURL=scanner-theia-headless.d.ts.map