import type { MCPServer } from '../mcp-core';
import { AETHEL_TOOL_DEFINITIONS } from './tool-definitions';
import { AETHEL_TOOL_HANDLERS } from './tool-handlers';
import { withMcpAuthPolicy } from './auth-policy';

export function registerAethelTools(server: MCPServer): void {
  if (AETHEL_TOOL_DEFINITIONS.length !== AETHEL_TOOL_HANDLERS.length) {
    throw new Error('Aethel MCP tool definitions/handlers length mismatch');
  }

  AETHEL_TOOL_DEFINITIONS.forEach((tool, index) => {
    server.registerTool(tool, withMcpAuthPolicy(tool.name, AETHEL_TOOL_HANDLERS[index]));
  });
}
