import type { MCPToolResult } from '../mcp-core';

export type GitStatusFile = {
  status: string;
  path: string;
};

export type GitStatusResponse = {
  staged?: GitStatusFile[];
  unstaged?: GitStatusFile[];
};

export type TerminalCommandResponse = {
  output?: string;
  error?: string;
};

export type GitCommitResponse = {
  message?: string;
  error?: string;
};

export type DuckDuckGoTopic = {
  Text?: string;
};

export type DuckDuckGoResponse = {
  Abstract?: string;
  Heading?: string;
  AbstractURL?: string;
  RelatedTopics?: DuckDuckGoTopic[];
};

export type AethelToolHandler = (args: Record<string, unknown>) => Promise<MCPToolResult>;

export function textResult(text: string, isError = false): MCPToolResult {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

export function errorResult(text: string): MCPToolResult {
  return textResult(text, true);
}
