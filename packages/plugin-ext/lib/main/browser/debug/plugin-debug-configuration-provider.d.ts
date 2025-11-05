import { DebugConfigurationProvider, DebugConfigurationProviderDescriptor, DebugConfigurationProviderTriggerKind, DebugExt } from '../../../common/plugin-api-rpc';
import { DebugConfiguration } from '@theia/debug/lib/common/debug-configuration';
export declare class PluginDebugConfigurationProvider implements DebugConfigurationProvider {
    protected readonly debugExt: DebugExt;
    /**
     * After https://github.com/eclipse-theia/theia/pull/13196, the debug config handles might change.
     * Store the original handle to be able to call the extension host when getting by handle.
     */
    protected readonly originalHandle: number;
    handle: number;
    type: string;
    triggerKind: DebugConfigurationProviderTriggerKind;
    provideDebugConfigurations: (folder: string | undefined) => Promise<DebugConfiguration[]>;
    resolveDebugConfiguration: (folder: string | undefined, debugConfiguration: DebugConfiguration) => Promise<DebugConfiguration | undefined | null>;
    resolveDebugConfigurationWithSubstitutedVariables: (folder: string | undefined, debugConfiguration: DebugConfiguration) => Promise<DebugConfiguration | undefined | null>;
    constructor(description: DebugConfigurationProviderDescriptor, debugExt: DebugExt);
}
//# sourceMappingURL=plugin-debug-configuration-provider.d.ts.map