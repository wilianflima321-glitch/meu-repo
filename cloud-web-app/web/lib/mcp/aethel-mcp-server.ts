import { MCPServer } from './mcp-core';
import { registerAethelTools } from './aethel/register-tools';
import { registerAethelResources } from './aethel/resources';
import { registerAethelPrompts } from './aethel/prompts';

export { getFileSystemAdapter, setFileSystemMode } from './aethel/filesystem';

export const aethelMCPServer = new MCPServer('aethel-ide', '1.0.0');

registerAethelTools(aethelMCPServer);
registerAethelResources(aethelMCPServer);
registerAethelPrompts(aethelMCPServer);

export default aethelMCPServer;
