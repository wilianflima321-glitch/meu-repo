import { toolsRegistry } from '@/lib/ai-tools-registry';
import '@/lib/ai-web-tools';
import type { AgentToolDescriptor } from './agent-mode-contracts';
import { CORE_AGENT_TOOL_DESCRIPTORS } from './agent-mode-default-tools';

export function getAvailableAgentTools(): AgentToolDescriptor[] {
  const registeredTools: AgentToolDescriptor[] = [];

  try {
    const mcpTools = toolsRegistry?.getAll?.() || [];
    for (const tool of mcpTools) {
      const inputSchema = {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          };
          return acc;
        }, {} as Record<string, unknown>),
        required: tool.parameters.filter((param) => param.required).map((param) => param.name),
      };

      registeredTools.push({
        name: tool.name,
        description: tool.description,
        inputSchema,
      });
    }
  } catch {
    // MCP runtime catalog is optional; the core tool descriptors stay available.
  }

  if (registeredTools.length === 0) registeredTools.push(...CORE_AGENT_TOOL_DESCRIPTORS);
  return registeredTools;
}
