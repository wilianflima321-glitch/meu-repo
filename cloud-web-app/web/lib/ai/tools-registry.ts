/**
 * Tools Registry - Central registry for all AI agent tools
 * Provides dynamic tool discovery and execution
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<ToolResult>;
  category: 'filesystem' | 'code' | 'git' | 'terminal' | 'web' | 'game-engine' | 'ai';
  requiresConfirmation?: boolean;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: unknown;
}

class ToolsRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    
    // Add to category index
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, new Set());
    }
    this.categories.get(tool.category)!.add(tool.name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const tool = this.tools.get(name);
    if (tool) {
      this.tools.delete(name);
      this.categories.get(tool.category)?.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Get all registered tools
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    const toolNames = this.categories.get(category);
    if (!toolNames) return [];
    return Array.from(toolNames)
      .map(name => this.tools.get(name)!)
      .filter(Boolean);
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool by name
   */
  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool '${name}' not found` };
    }

    try {
      // Validate required params
      const required = tool.inputSchema.required || [];
      for (const param of required) {
        if (params[param] === undefined) {
          return { success: false, error: `Missing required parameter: ${param}` };
        }
      }

      return await tool.handler(params);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get tool schemas for LLM (OpenAI/Anthropic format)
   */
  getToolSchemas(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  }> {
    return this.getTools().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }

  /**
   * Get tools that require confirmation
   */
  getDangerousTools(): ToolDefinition[] {
    return this.getTools().filter(t => t.requiresConfirmation);
  }
}

// Singleton instance
export const toolsRegistry = new ToolsRegistry();

// ==========================================
// REGISTER CORE TOOLS
// ==========================================

// Filesystem tools
toolsRegistry.register({
  name: 'read_file',
  description: 'Lê conteúdo de um arquivo do projeto',
  category: 'filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Caminho do arquivo' },
      startLine: { type: 'number', description: 'Linha inicial (opcional)' },
      endLine: { type: 'number', description: 'Linha final (opcional)' }
    },
    required: ['path']
  },
  handler: async (params) => {
    // This will be connected to the actual file system service
    const { path, startLine, endLine } = params as { path: string; startLine?: number; endLine?: number };
    try {
      const response = await fetch('/api/files/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, startLine, endLine })
      });
      const data = await response.json();
      return { success: true, output: data.content, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'write_file',
  description: 'Escreve ou cria um arquivo no projeto',
  category: 'filesystem',
  requiresConfirmation: true,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Caminho do arquivo' },
      content: { type: 'string', description: 'Conteúdo a escrever' }
    },
    required: ['path', 'content']
  },
  handler: async (params) => {
    const { path, content } = params as { path: string; content: string };
    try {
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      const data = await response.json();
      return { success: true, output: `File written: ${path}`, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'delete_file',
  description: 'Deleta um arquivo ou diretório',
  category: 'filesystem',
  requiresConfirmation: true,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Caminho do arquivo/diretório' },
      recursive: { type: 'boolean', description: 'Deletar recursivamente (para diretórios)' }
    },
    required: ['path']
  },
  handler: async (params) => {
    const { path, recursive } = params as { path: string; recursive?: boolean };
    try {
      const response = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, recursive })
      });
      const data = await response.json();
      return { success: true, output: `Deleted: ${path}`, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'list_directory',
  description: 'Lista arquivos e pastas em um diretório',
  category: 'filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Caminho do diretório' },
      recursive: { type: 'boolean', description: 'Listar recursivamente' }
    },
    required: ['path']
  },
  handler: async (params) => {
    const { path, recursive } = params as { path: string; recursive?: boolean };
    try {
      const response = await fetch('/api/files/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, recursive })
      });
      const data = await response.json();
      return { success: true, output: JSON.stringify(data.files, null, 2), data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

// Code tools
toolsRegistry.register({
  name: 'search_code',
  description: 'Busca texto ou regex nos arquivos do projeto',
  category: 'code',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Texto ou padrão regex para buscar' },
      isRegex: { type: 'boolean', description: 'Tratar query como regex' },
      includePattern: { type: 'string', description: 'Glob pattern para filtrar arquivos' }
    },
    required: ['query']
  },
  handler: async (params) => {
    const { query, isRegex, includePattern } = params as { query: string; isRegex?: boolean; includePattern?: string };
    try {
      const response = await fetch('/api/search/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, isRegex, includePattern })
      });
      const data = await response.json();
      return { success: true, output: JSON.stringify(data.results, null, 2), data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'get_definitions',
  description: 'Encontra definições de funções, classes ou variáveis',
  category: 'code',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string', description: 'Nome do símbolo a buscar' },
      file: { type: 'string', description: 'Arquivo específico para buscar (opcional)' }
    },
    required: ['symbol']
  },
  handler: async (params) => {
    const { symbol, file } = params as { symbol: string; file?: string };
    try {
      const response = await fetch('/api/lsp/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, file })
      });
      const data = await response.json();
      return { success: true, output: JSON.stringify(data.definitions, null, 2), data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

// Terminal tools
toolsRegistry.register({
  name: 'run_command',
  description: 'Executa comando no terminal (com segurança)',
  category: 'terminal',
  requiresConfirmation: true,
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Comando a executar' },
      cwd: { type: 'string', description: 'Diretório de trabalho' }
    },
    required: ['command']
  },
  handler: async (params) => {
    const { command, cwd } = params as { command: string; cwd?: string };
    try {
      const response = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd })
      });
      const data = await response.json();
      return { success: data.exitCode === 0, output: data.output, error: data.stderr, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

// Git tools
toolsRegistry.register({
  name: 'git_status',
  description: 'Mostra status atual do repositório Git',
  category: 'git',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      const response = await fetch('/api/git/status');
      const data = await response.json();
      return { success: true, output: data.status, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'git_diff',
  description: 'Mostra diferenças de arquivos no Git',
  category: 'git',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Arquivo específico (opcional)' },
      staged: { type: 'boolean', description: 'Mostrar apenas staged' }
    }
  },
  handler: async (params) => {
    const { file, staged } = params as { file?: string; staged?: boolean };
    try {
      const response = await fetch('/api/git/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, staged })
      });
      const data = await response.json();
      return { success: true, output: data.diff, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'git_commit',
  description: 'Cria um commit com mensagem',
  category: 'git',
  requiresConfirmation: true,
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Mensagem do commit' },
      files: { type: 'string', description: 'Arquivos específicos (opcional, usa staged se não especificado)' }
    },
    required: ['message']
  },
  handler: async (params) => {
    const { message, files } = params as { message: string; files?: string[] };
    try {
      const response = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, files })
      });
      const data = await response.json();
      return { success: true, output: `Commit created: ${data.hash}`, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

// Web tools
toolsRegistry.register({
  name: 'web_search',
  description: 'Pesquisa na internet via DuckDuckGo',
  category: 'web',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Termo de busca' },
      maxResults: { type: 'number', description: 'Número máximo de resultados' }
    },
    required: ['query']
  },
  handler: async (params) => {
    const { query, maxResults = 5 } = params as { query: string; maxResults?: number };
    try {
      const response = await fetch('/api/web/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults })
      });
      const data = await response.json();
      return { success: true, output: JSON.stringify(data.results, null, 2), data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'fetch_url',
  description: 'Busca e parseia conteúdo de uma URL',
  category: 'web',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL para buscar' },
      selector: { type: 'string', description: 'CSS selector para extrair (opcional)' }
    },
    required: ['url']
  },
  handler: async (params) => {
    const { url, selector } = params as { url: string; selector?: string };
    try {
      const response = await fetch('/api/web/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selector })
      });
      const data = await response.json();
      return { success: true, output: data.content, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

// Game Engine tools
toolsRegistry.register({
  name: 'create_blueprint',
  description: 'Cria um blueprint visual para comportamento de jogo',
  category: 'game-engine',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nome do blueprint' },
      type: { type: 'string', enum: ['Actor', 'Character', 'GameMode', 'Widget', 'Component'], description: 'Tipo do blueprint' },
      parent: { type: 'string', description: 'Blueprint pai (opcional)' }
    },
    required: ['name', 'type']
  },
  handler: async (params) => {
    const { name, type, parent } = params as { name: string; type: string; parent?: string };
    try {
      const response = await fetch('/api/engine/blueprint/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, parent })
      });
      const data = await response.json();
      return { success: true, output: `Blueprint '${name}' created`, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'create_level',
  description: 'Cria um novo level/cena de jogo',
  category: 'game-engine',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nome do level' },
      template: { type: 'string', enum: ['empty', 'basic', 'outdoor', 'indoor'], description: 'Template inicial' }
    },
    required: ['name']
  },
  handler: async (params) => {
    const { name, template = 'basic' } = params as { name: string; template?: string };
    try {
      const response = await fetch('/api/engine/level/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, template })
      });
      const data = await response.json();
      return { success: true, output: `Level '${name}' created with template '${template}'`, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

toolsRegistry.register({
  name: 'spawn_actor',
  description: 'Spawna um ator no level atual',
  category: 'game-engine',
  inputSchema: {
    type: 'object',
    properties: {
      blueprintId: { type: 'string', description: 'ID do blueprint do ator' },
      position: { type: 'string', description: 'Posição [x,y,z]' },
      rotation: { type: 'string', description: 'Rotação [pitch,yaw,roll]' }
    },
    required: ['blueprintId']
  },
  handler: async (params) => {
    const { blueprintId, position, rotation } = params as { blueprintId: string; position?: string; rotation?: string };
    try {
      const response = await fetch('/api/engine/actor/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          blueprintId, 
          position: position ? JSON.parse(position) : [0, 0, 0],
          rotation: rotation ? JSON.parse(rotation) : [0, 0, 0]
        })
      });
      const data = await response.json();
      return { success: true, output: `Actor spawned: ${data.actorId}`, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

// Export for use in agent-mode.ts
export default toolsRegistry;
