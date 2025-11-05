import { AbstractPluginManagerExtImpl } from '@theia/plugin-ext/lib/plugin/plugin-manager';
import { HeadlessPluginManagerExt, HeadlessPluginManagerInitializeParams } from '../common/headless-plugin-rpc';
import { Plugin } from '@theia/plugin-ext';
export declare class HeadlessPluginManagerExtImpl extends AbstractPluginManagerExtImpl<HeadlessPluginManagerInitializeParams> implements HeadlessPluginManagerExt {
    private readonly supportedActivationEvents;
    $init(params: HeadlessPluginManagerInitializeParams): Promise<void>;
    protected getActivationEvents(plugin: Plugin): string[] | undefined;
    protected isSupportedActivationEvent(activationEvent: string): boolean;
}
//# sourceMappingURL=headless-plugin-manager.d.ts.map