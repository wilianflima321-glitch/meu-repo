import type { MCPToolResult } from '../mcp-core';
import { errorResult, type AethelToolHandler } from './response-schemas';

const MUTATING_TOOLS = new Set([
  'write_file',
  'edit_file',
  'delete_file',
  'create_directory',
  'rename_file',
  'git_commit',
  'run_command',
]);

export function authorizeMcpTool(toolName: string): { allowed: true } | { allowed: false; reason: string } {
  if (process.env.MCP_READONLY === 'true' && MUTATING_TOOLS.has(toolName)) {
    return { allowed: false, reason: `Tool ${toolName} is blocked while MCP_READONLY=true` };
  }

  if (process.env.MCP_DISABLE_TERMINAL === 'true' && toolName === 'run_command') {
    return { allowed: false, reason: 'run_command is blocked while MCP_DISABLE_TERMINAL=true' };
  }

  return { allowed: true };
}

export function withMcpAuthPolicy(toolName: string, handler: AethelToolHandler): AethelToolHandler {
  return async (args): Promise<MCPToolResult> => {
    const decision = authorizeMcpTool(toolName);
    if (!decision.allowed) return errorResult(decision.reason);
    return handler(args);
  };
}
