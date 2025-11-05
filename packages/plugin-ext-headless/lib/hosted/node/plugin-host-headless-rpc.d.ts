import { EnvExtImpl } from '@theia/plugin-ext/lib/plugin/env';
import { LocalizationExtImpl } from '@theia/plugin-ext/lib/plugin/localization-ext';
import { HeadlessPluginManagerExtImpl } from '../../plugin/headless-plugin-manager';
import { AbstractPluginHostRPC, ExtInterfaces } from '@theia/plugin-ext/lib/hosted/node/plugin-host-rpc';
import { PluginModel } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { ExtPluginApi } from '../../common/plugin-ext-headless-api-contribution';
type HeadlessExtInterfaces = Pick<ExtInterfaces, 'envExt' | 'localizationExt'>;
/**
 * The RPC handler for headless plugins.
 */
export declare class HeadlessPluginHostRPC extends AbstractPluginHostRPC<HeadlessPluginManagerExtImpl, null, HeadlessExtInterfaces> {
    protected readonly envExt: EnvExtImpl;
    protected readonly localizationExt: LocalizationExtImpl;
    constructor();
    protected createExtInterfaces(): HeadlessExtInterfaces;
    protected createAPIFactory(_extInterfaces: HeadlessExtInterfaces): null;
    protected getBackendPluginPath(pluginModel: PluginModel): string | undefined;
    protected initExtApi(extApi: ExtPluginApi): void;
}
export {};
//# sourceMappingURL=plugin-host-headless-rpc.d.ts.map