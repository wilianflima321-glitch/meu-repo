import URI from '@theia/core/lib/common/uri';
export declare const HostedPluginUriPostProcessorSymbolName = "HostedPluginUriPostProcessor";
export interface HostedPluginUriPostProcessor {
    processUri(uri: URI): Promise<URI>;
    processOptions(options: object): Promise<object>;
}
//# sourceMappingURL=hosted-plugin-uri-postprocessor.d.ts.map