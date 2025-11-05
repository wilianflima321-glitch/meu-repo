import { interfaces } from '@theia/core/shared/inversify';
import { RPCProtocol } from '../../common/rpc-protocol';
import { McpServerDefinitionRegistryMain, McpServerDefinitionDto } from '../../common/lm-protocol';
export declare class McpServerDefinitionRegistryMainImpl implements McpServerDefinitionRegistryMain {
    private readonly proxy;
    private readonly providers;
    private readonly mcpServerManager;
    constructor(rpc: RPCProtocol, container: interfaces.Container);
    $registerMcpServerDefinitionProvider(handle: number, name: string): void;
    $unregisterMcpServerDefinitionProvider(handle: number): Promise<void>;
    $onDidChangeMcpServerDefinitions(handle: number): void;
    $getServerDefinitions(handle: number): Promise<McpServerDefinitionDto[]>;
    $resolveServerDefinition(handle: number, server: McpServerDefinitionDto): Promise<McpServerDefinitionDto | undefined>;
    private loadServerDefinitions;
    private convertToMcpServerDescription;
}
//# sourceMappingURL=lm-main.d.ts.map