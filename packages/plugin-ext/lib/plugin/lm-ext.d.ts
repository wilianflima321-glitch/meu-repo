/// <reference types="@theia/plugin/src/theia.proposed.debugVisualization" />
/// <reference types="@theia/plugin/lib/theia.proposed.multiDocumentHighlightProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookCellExecutionState" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookKernelSource" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookMessaging" />
/// <reference types="@theia/plugin/src/theia.proposed.portsAttributes" />
/// <reference types="@theia/plugin/src/theia.proposed.terminalCompletionProvider" />
/// <reference types="@theia/plugin/src/theia-extra" />
/// <reference types="@theia/plugin/src/theia.proposed.canonicalUriProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.customEditorMove" />
/// <reference types="@theia/plugin/src/theia.proposed.diffCommand" />
/// <reference types="@theia/plugin/src/theia.proposed.editSessionIdentityProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.extensionsAny" />
/// <reference types="@theia/plugin/src/theia.proposed.externalUriOpener" />
/// <reference types="@theia/plugin/src/theia.proposed.findTextInFiles" />
/// <reference types="@theia/plugin/src/theia.proposed.fsChunks" />
/// <reference types="@theia/plugin/src/theia.proposed.interactiveWindow" />
/// <reference types="@theia/plugin/src/theia.proposed.mappedEditsProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.profileContentHandlers" />
/// <reference types="@theia/plugin/src/theia.proposed.resolvers" />
/// <reference types="@theia/plugin/src/theia.proposed.scmValidation" />
/// <reference types="@theia/plugin/src/theia.proposed.shareProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.terminalQuickFixProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.textSearchProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.timeline" />
import type * as theia from '@theia/plugin';
import { RPCProtocol } from '../common/rpc-protocol';
import { McpServerDefinitionRegistryExt, McpServerDefinitionDto } from '../common/lm-protocol';
import { PluginPackageMcpServerDefinitionProviderContribution } from '../common';
import { McpServerDefinition } from './types-impl';
interface McpServerDefinitionProvider {
    readonly onDidChangeMcpServerDefinitions?: theia.Event<void>;
    provideMcpServerDefinitions(): theia.ProviderResult<McpServerDefinition[]>;
    resolveMcpServerDefinition?(server: McpServerDefinition): theia.ProviderResult<McpServerDefinition>;
}
export declare class LmExtImpl implements McpServerDefinitionRegistryExt {
    protected readonly rpc: RPCProtocol;
    private proxy;
    private logger;
    private readonly providers;
    private readonly providerChangeListeners;
    private handleCounter;
    private announcedMCPProviders;
    constructor(rpc: RPCProtocol);
    registerMcpServerDefinitionProvider(id: string, provider: McpServerDefinitionProvider): theia.Disposable;
    $provideServerDefinitions(handle: number): Promise<McpServerDefinitionDto[]>;
    $resolveServerDefinition(handle: number, server: McpServerDefinitionDto): Promise<McpServerDefinitionDto | undefined>;
    private convertToDto;
    private convertFromDto;
    registerMcpContributions(mcpContributions: PluginPackageMcpServerDefinitionProviderContribution[]): void;
}
export {};
//# sourceMappingURL=lm-ext.d.ts.map