import type { AgentToolDescriptor } from './agent-mode-contracts';

export const CORE_AGENT_TOOL_DESCRIPTORS: AgentToolDescriptor[] = [
  {
    name: 'read_file',
    description: 'Read a project file.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'write_file',
    description: 'Create or replace a project file.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Patch part of a project file.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' }, operation: { type: 'string' }, search: { type: 'string' }, replace: { type: 'string' } },
      required: ['path', 'operation', 'search'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file or directory.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, recursive: { type: 'boolean' } }, required: ['path'] },
  },
  {
    name: 'create_directory',
    description: 'Create a directory.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'rename_file',
    description: 'Rename or move a file.',
    inputSchema: {
      type: 'object',
      properties: { oldPath: { type: 'string' }, newPath: { type: 'string' } },
      required: ['oldPath', 'newPath'],
    },
  },
  {
    name: 'run_command',
    description: 'Run an approved terminal command.',
    inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
  },
  {
    name: 'search_code',
    description: 'Search project code.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, isRegex: { type: 'boolean' } }, required: ['query'] },
  },
  {
    name: 'web_search',
    description: 'Search the web when live evidence is required.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'fetch_url',
    description: 'Fetch a URL for evidence collection.',
    inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  },
  {
    name: 'list_directory',
    description: 'List files and directories.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, recursive: { type: 'boolean' } }, required: ['path'] },
  },
  {
    name: 'git_status',
    description: 'Read Git working tree status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'git_diff',
    description: 'Read Git diff output.',
    inputSchema: { type: 'object', properties: { file: { type: 'string' } } },
  },
  {
    name: 'git_commit',
    description: 'Create a Git commit after approval.',
    inputSchema: { type: 'object', properties: { message: { type: 'string' }, files: { type: 'array' } }, required: ['message'] },
  },
  {
    name: 'get_definitions',
    description: 'Find symbol definitions.',
    inputSchema: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] },
  },
  {
    name: 'create_blueprint',
    description: 'Create a governed gameplay blueprint draft.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' } }, required: ['name', 'type'] },
  },
  {
    name: 'create_level',
    description: 'Create a governed level or scene draft.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, template: { type: 'string' } }, required: ['name'] },
  },
];
