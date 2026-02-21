/**
 * Aethel MCP Server - Built-in Tools Server
 * 
 * Servidor MCP nativo do Aethel IDE com todas as ferramentas
 * de desenvolvimento, engine e IA integradas.
 * 
 * Suporta dois modos:
 * - REAL_FS: Usa filesystem real (Node.js fs)
 * - PRISMA_DB: Usa banco de dados Prisma (para cloud/serverless)
 */

import { MCPServer, MCPTool, MCPToolResult, MCPResource, MCPPrompt } from './mcp-core';
import { prisma } from '@/lib/db';
import { getFileSystemAdapter } from './aethel-mcp-filesystem';

export { getFileSystemAdapter, setFileSystemMode } from './aethel-mcp-filesystem';

// ============================================================================
// AETHEL MCP SERVER INSTANCE
// ============================================================================

export const aethelMCPServer = new MCPServer('aethel-ide', '1.0.0');

// ============================================================================
// FILESYSTEM TOOLS
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'read_file',
    description: 'Lê o conteúdo de um arquivo do projeto',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo relativo ao projeto' },
        startLine: { type: 'number', description: 'Linha inicial (opcional)' },
        endLine: { type: 'number', description: 'Linha final (opcional)' },
      },
      required: ['path'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path, startLine, endLine } = args as { path: string; startLine?: number; endLine?: number };
    
    try {
      const result = await getFileSystemAdapter().readFile(path, { startLine, endLine });
      
      if (!result) {
        return { content: [{ type: 'text', text: `Arquivo não encontrado: ${path}` }], isError: true };
      }
      
      return { content: [{ type: 'text', text: result.content }] };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao ler arquivo: ${error}` }], 
        isError: true 
      };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'write_file',
    description: 'Cria ou sobrescreve um arquivo no projeto',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
        content: { type: 'string', description: 'Conteúdo do arquivo' },
      },
      required: ['path', 'content'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path, content } = args as { path: string; content: string };
    
    try {
      const success = await getFileSystemAdapter().writeFile(path, content);
      
      if (!success) {
        return { content: [{ type: 'text', text: `Erro ao salvar arquivo: ${path}` }], isError: true };
      }
      
      return { content: [{ type: 'text', text: `Arquivo salvo: ${path}` }] };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao salvar arquivo: ${error}` }], 
        isError: true 
      };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'delete_file',
    description: 'Deleta um arquivo do projeto',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
      },
      required: ['path'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };
    
    try {
      const success = await getFileSystemAdapter().deleteFile(path);
      
      if (!success) {
        return { content: [{ type: 'text', text: `Erro ao deletar arquivo: ${path}` }], isError: true };
      }
      
      return { content: [{ type: 'text', text: `Arquivo deletado: ${path}` }] };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao deletar arquivo: ${error}` }], 
        isError: true 
      };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'create_directory',
    description: 'Cria um diretório no projeto',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do diretório' },
      },
      required: ['path'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };
    
    try {
      const success = await getFileSystemAdapter().mkdir(path);
      
      if (!success) {
        return { content: [{ type: 'text', text: `Erro ao criar diretório: ${path}` }], isError: true };
      }
      
      return { content: [{ type: 'text', text: `Diretório criado: ${path}` }] };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao criar diretório: ${error}` }], 
        isError: true 
      };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'file_exists',
    description: 'Verifica se um arquivo existe',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
      },
      required: ['path'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };
    
    try {
      const exists = await getFileSystemAdapter().exists(path);
      return { content: [{ type: 'text', text: exists ? 'true' : 'false' }] };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro: ${error}` }], 
        isError: true 
      };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'edit_file',
    description: 'Edita uma parte específica de um arquivo (replace, insert, delete)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
        operation: { 
          type: 'string', 
          description: 'Tipo de operação',
          enum: ['replace', 'insert_before', 'insert_after', 'delete'],
        },
        search: { type: 'string', description: 'Texto a ser encontrado' },
        replace: { type: 'string', description: 'Texto de substituição/inserção' },
      },
      required: ['path', 'operation', 'search'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path, operation, search, replace } = args as {
      path: string;
      operation: 'replace' | 'insert_before' | 'insert_after' | 'delete';
      search: string;
      replace?: string;
    };
    
    try {
      const file = await getFileSystemAdapter().readFile(path);
      if (!file) {
        return { content: [{ type: 'text', text: `Arquivo não encontrado: ${path}` }], isError: true };
      }
      
      let content = file.content;
      const index = content.indexOf(search);
      
      if (index === -1) {
        return { content: [{ type: 'text', text: `Texto não encontrado no arquivo` }], isError: true };
      }
      
      switch (operation) {
        case 'replace':
          content = content.replace(search, replace || '');
          break;
        case 'insert_before':
          content = content.slice(0, index) + (replace || '') + content.slice(index);
          break;
        case 'insert_after':
          content = content.slice(0, index + search.length) + (replace || '') + content.slice(index + search.length);
          break;
        case 'delete':
          content = content.replace(search, '');
          break;
      }
      
      const success = await getFileSystemAdapter().writeFile(path, content);
      if (!success) {
        return { content: [{ type: 'text', text: `Erro ao salvar edição` }], isError: true };
      }
      
      return { content: [{ type: 'text', text: `Arquivo editado: ${path}` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro ao editar: ${error}` }], isError: true };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'list_directory',
    description: 'Lista arquivos e pastas em um diretório',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do diretório' },
        recursive: { type: 'boolean', description: 'Listar recursivamente' },
      },
      required: ['path'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path, recursive } = args as { path: string; recursive?: boolean };
    
    try {
      const items = await getFileSystemAdapter().listDirectory(path, recursive);
      return { content: [{ type: 'text', text: items.join('\n') || 'Diretório vazio' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  }
);

// ============================================================================
// CODE ANALYSIS TOOLS
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'search_code',
    description: 'Busca texto/regex em todos os arquivos do projeto',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto ou regex para buscar' },
        isRegex: { type: 'boolean', description: 'Tratar como regex' },
        filePattern: { type: 'string', description: 'Filtro de arquivos (glob)' },
        maxResults: { type: 'number', description: 'Máximo de resultados' },
      },
      required: ['query'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { query, isRegex, filePattern, maxResults = 50 } = args as {
      query: string;
      isRegex?: boolean;
      filePattern?: string;
      maxResults?: number;
    };
    
    try {
      const files = await prisma.file.findMany({
        where: filePattern ? { path: { contains: filePattern } } : undefined,
        select: { path: true, content: true },
      });
      
      const results: string[] = [];
      const regex = isRegex ? new RegExp(query, 'gmi') : null;
      
      for (const file of files) {
        if (results.length >= maxResults) break;
        
        const content = file.content || '';
        const lines = content.split('\n');
        
        lines.forEach((line, idx) => {
          if (results.length >= maxResults) return;
          
          const matches = regex 
            ? regex.test(line) 
            : line.toLowerCase().includes(query.toLowerCase());
          
          if (matches) {
            results.push(`${file.path}:${idx + 1}: ${line.trim()}`);
          }
        });
      }
      
      return { 
        content: [{ 
          type: 'text', 
          text: results.length > 0 
            ? results.join('\n') 
            : 'Nenhum resultado encontrado' 
        }] 
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro na busca: ${error}` }], isError: true };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'get_definitions',
    description: 'Encontra definições de funções, classes, variáveis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Nome do símbolo' },
        type: { 
          type: 'string', 
          description: 'Tipo de símbolo',
          enum: ['function', 'class', 'interface', 'type', 'variable', 'any'],
        },
      },
      required: ['symbol'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { symbol, type = 'any' } = args as { symbol: string; type?: string };
    
    try {
      const files = await prisma.file.findMany({
        where: { 
          OR: [
            { language: 'typescript' },
            { language: 'javascript' },
            { path: { endsWith: '.ts' } },
            { path: { endsWith: '.tsx' } },
            { path: { endsWith: '.js' } },
            { path: { endsWith: '.jsx' } },
          ]
        },
        select: { path: true, content: true },
      });
      
      const patterns: Record<string, RegExp> = {
        function: new RegExp(`(?:function|const|let|var)\\s+${symbol}\\s*[=(]`, 'gm'),
        class: new RegExp(`class\\s+${symbol}\\s*(?:extends|implements|{)`, 'gm'),
        interface: new RegExp(`interface\\s+${symbol}\\s*(?:extends|{)`, 'gm'),
        type: new RegExp(`type\\s+${symbol}\\s*=`, 'gm'),
        variable: new RegExp(`(?:const|let|var)\\s+${symbol}\\s*[=:]`, 'gm'),
        any: new RegExp(`(?:function|class|interface|type|const|let|var)\\s+${symbol}\\b`, 'gm'),
      };
      
      const pattern = patterns[type] || patterns.any;
      const results: string[] = [];
      
      for (const file of files) {
        const content = file.content || '';
        const lines = content.split('\n');
        
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            results.push(`${file.path}:${idx + 1}`);
            results.push(`  ${line.trim()}`);
          }
          pattern.lastIndex = 0;
        });
      }
      
      return { 
        content: [{ 
          type: 'text', 
          text: results.length > 0 
            ? results.join('\n') 
            : `Nenhuma definição encontrada para "${symbol}"` 
        }] 
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  }
);

// ============================================================================
// TERMINAL/SHELL TOOLS
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'run_command',
    description: 'Executa um comando no terminal',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Comando a executar' },
        cwd: { type: 'string', description: 'Diretório de trabalho' },
        timeout: { type: 'number', description: 'Timeout em ms (default: 30000)' },
      },
      required: ['command'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { command, cwd, timeout = 30000 } = args as {
      command: string;
      cwd?: string;
      timeout?: number;
    };
    
    // Em ambiente web, delega para API
    try {
      const response = await fetch('/api/terminal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd, timeout }),
      });
      
      const data = await response.json();
      
      return { 
        content: [{ 
          type: 'text', 
          text: data.output || data.error || 'Comando executado' 
        }],
        isError: !!data.error,
      };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao executar comando: ${error}` }], 
        isError: true 
      };
    }
  }
);

// ============================================================================
// GIT TOOLS
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'git_status',
    description: 'Mostra o status do repositório Git',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  async (): Promise<MCPToolResult> => {
    try {
      const response = await fetch('/api/git/status');
      const data = await response.json();
      
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'git_diff',
    description: 'Mostra as diferenças de arquivos modificados',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Arquivo específico (opcional)' },
        staged: { type: 'boolean', description: 'Mostrar apenas staged' },
      },
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { file, staged } = args as { file?: string; staged?: boolean };
    
    try {
      const response = await fetch('/api/git/status');
      const data = await response.json();
      
      // Format diff info
      let diffText = '';
      
      if (data.staged?.length) {
        diffText += '=== STAGED ===\n';
        diffText += data.staged.map((f: any) => `${f.status}: ${f.path}`).join('\n');
        diffText += '\n\n';
      }
      
      if (data.unstaged?.length && !staged) {
        diffText += '=== UNSTAGED ===\n';
        diffText += data.unstaged.map((f: any) => `${f.status}: ${f.path}`).join('\n');
      }
      
      return { content: [{ type: 'text', text: diffText || 'Nenhuma mudança' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'git_commit',
    description: 'Cria um commit com as mudanças staged',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem do commit' },
        files: { type: 'string', description: 'Arquivos específicos (separados por vírgula)' },
      },
      required: ['message'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { message, files } = args as { message: string; files?: string };
    
    try {
      // Stage files if specified
      if (files) {
        await fetch('/api/git/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: files.split(',').map(f => f.trim()) }),
        });
      }
      
      // Commit
      const response = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      const data = await response.json();
      
      return { content: [{ type: 'text', text: data.message || 'Commit criado' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  }
);

// ============================================================================
// WEB SEARCH TOOLS
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'web_search',
    description: 'Pesquisa na internet',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca' },
        numResults: { type: 'number', description: 'Número de resultados (1-10)' },
      },
      required: ['query'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { query, numResults = 5 } = args as { query: string; numResults?: number };
    
    try {
      // DuckDuckGo Instant Answer API (gratuita)
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      const results: string[] = [];
      
      if (data.Abstract) {
        results.push(`## ${data.Heading || query}`);
        results.push(data.Abstract);
        if (data.AbstractURL) results.push(`Fonte: ${data.AbstractURL}`);
      }
      
      if (data.RelatedTopics) {
        results.push('\n### Tópicos Relacionados:');
        data.RelatedTopics.slice(0, numResults).forEach((topic: any) => {
          if (topic.Text) {
            results.push(`- ${topic.Text}`);
          }
        });
      }
      
      return { 
        content: [{ 
          type: 'text', 
          text: results.length > 0 ? results.join('\n') : 'Nenhum resultado encontrado' 
        }] 
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro na busca: ${error}` }], isError: true };
    }
  }
);

aethelMCPServer.registerTool(
  {
    name: 'fetch_url',
    description: 'Lê o conteúdo de uma URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL para ler' },
      },
      required: ['url'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { url } = args as { url: string };
    
    try {
      // Use Jina Reader para converter para markdown
      const jinaUrl = `https://r.jina.ai/${url}`;
      const response = await fetch(jinaUrl, {
        headers: { 'User-Agent': 'AethelEngine-MCP/1.0' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const content = await response.text();
      
      return { content: [{ type: 'text', text: content.slice(0, 50000) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro ao ler URL: ${error}` }], isError: true };
    }
  }
);

// ============================================================================
// GAME ENGINE TOOLS
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'create_blueprint',
    description: 'Cria um novo Blueprint (visual script)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do blueprint' },
        type: { 
          type: 'string', 
          description: 'Tipo do blueprint',
          enum: ['actor', 'component', 'widget', 'animation', 'ai'],
        },
        parentClass: { type: 'string', description: 'Classe pai (opcional)' },
      },
      required: ['name', 'type'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { name, type, parentClass } = args as {
      name: string;
      type: string;
      parentClass?: string;
    };
    
    const blueprintTemplate = {
      name,
      type,
      parentClass: parentClass || 'Object',
      nodes: [],
      variables: [],
      functions: [],
      events: ['BeginPlay', 'Tick'],
    };
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Blueprint criado: ${name}\n\n${JSON.stringify(blueprintTemplate, null, 2)}` 
      }] 
    };
  }
);

aethelMCPServer.registerTool(
  {
    name: 'create_level',
    description: 'Cria um novo nível/mapa',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do nível' },
        template: { 
          type: 'string', 
          description: 'Template base',
          enum: ['empty', 'default', 'landscape', 'interior'],
        },
        size: {
          type: 'string',
          description: 'Tamanho do mapa',
          enum: ['small', 'medium', 'large', 'huge'],
        },
      },
      required: ['name'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { name, template = 'default', size = 'medium' } = args as {
      name: string;
      template?: string;
      size?: string;
    };
    
    const sizeMap = {
      small: { width: 1024, height: 1024 },
      medium: { width: 4096, height: 4096 },
      large: { width: 8192, height: 8192 },
      huge: { width: 16384, height: 16384 },
    };
    
    const levelData = {
      name,
      template,
      size: sizeMap[size as keyof typeof sizeMap],
      actors: [],
      lighting: { type: 'directional', intensity: 1.0 },
      skybox: template === 'interior' ? null : 'default_sky',
      navmesh: true,
    };
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Nível criado: ${name}\n\n${JSON.stringify(levelData, null, 2)}` 
      }] 
    };
  }
);

// ============================================================================
// RESOURCES
// ============================================================================

aethelMCPServer.registerResource(
  {
    uri: 'aethel://project/structure',
    name: 'Project Structure',
    description: 'Estrutura completa do projeto atual',
    mimeType: 'application/json',
  },
  async () => {
    const files = await prisma.file.findMany({
      select: { path: true, language: true },
    });
    return JSON.stringify(files.map(f => f.path), null, 2);
  }
);

aethelMCPServer.registerResource(
  {
    uri: 'aethel://config/settings',
    name: 'IDE Settings',
    description: 'Configurações atuais do IDE',
    mimeType: 'application/json',
  },
  async () => {
    return JSON.stringify({
      theme: 'dark',
      fontSize: 14,
      tabSize: 2,
      autoSave: true,
      formatOnSave: true,
    }, null, 2);
  }
);

// ============================================================================
// PROMPTS
// ============================================================================

aethelMCPServer.registerPrompt(
  {
    name: 'code_review',
    description: 'Analisa código e sugere melhorias',
    arguments: [
      { name: 'file', description: 'Arquivo para revisar', required: true },
    ],
  },
  async (args) => {
    const file = args.file as string;
    return `Analise o arquivo ${file} e forneça:
1. Bugs potenciais
2. Melhorias de performance
3. Melhores práticas não seguidas
4. Sugestões de refatoração
5. Problemas de segurança`;
  }
);

aethelMCPServer.registerPrompt(
  {
    name: 'explain_code',
    description: 'Explica o que um trecho de código faz',
    arguments: [
      { name: 'code', description: 'Código para explicar', required: true },
    ],
  },
  async (args) => {
    return `Explique detalhadamente o que este código faz:

\`\`\`
${args.code}
\`\`\`

Inclua:
1. Propósito geral
2. Explicação linha por linha
3. Dependências e efeitos colaterais
4. Exemplos de uso`;
  }
);

aethelMCPServer.registerPrompt(
  {
    name: 'generate_tests',
    description: 'Gera testes unitários para código',
    arguments: [
      { name: 'file', description: 'Arquivo para testar', required: true },
    ],
  },
  async (args) => {
    return `Gere testes unitários completos para o arquivo ${args.file}:

1. Use Jest como framework
2. Cubra todos os casos de borda
3. Inclua mocks quando necessário
4. Teste tanto casos de sucesso quanto de erro
5. Adicione descrições claras para cada teste`;
  }
);

// ============================================================================
// DELETE FILE TOOL (NEW!)
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'delete_file',
    description: 'Deleta um arquivo ou diretório do projeto',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo/diretório a deletar' },
        recursive: { type: 'boolean', description: 'Deletar recursivamente (para diretórios)' },
      },
      required: ['path'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path, recursive } = args as { path: string; recursive?: boolean };
    
    try {
      // Try database first
      const file = await prisma.file.findFirst({ 
        where: { path: { contains: path } } 
      });
      
      if (file) {
        await prisma.file.delete({ where: { id: file.id } });
        return { content: [{ type: 'text', text: `Arquivo deletado: ${path}` }] };
      }
      
      // If recursive, delete all files in directory
      if (recursive) {
        const deleted = await prisma.file.deleteMany({
          where: { path: { startsWith: path } }
        });
        return { 
          content: [{ 
            type: 'text', 
            text: `Diretório deletado: ${path} (${deleted.count} arquivos)` 
          }] 
        };
      }
      
      return { 
        content: [{ type: 'text', text: `Arquivo não encontrado: ${path}` }], 
        isError: true 
      };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao deletar: ${error}` }], 
        isError: true 
      };
    }
  }
);

// ============================================================================
// CREATE DIRECTORY TOOL (NEW!)
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'create_directory',
    description: 'Cria um novo diretório no projeto',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do diretório a criar' },
      },
      required: ['path'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };
    
    try {
      // Create a placeholder file to represent directory
      await prisma.file.create({
        data: {
          path: `${path}/.gitkeep`,
          content: '',
          projectId: 'default',
        }
      });
      
      return { content: [{ type: 'text', text: `Diretório criado: ${path}` }] };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao criar diretório: ${error}` }], 
        isError: true 
      };
    }
  }
);

// ============================================================================
// RENAME/MOVE FILE TOOL (NEW!)
// ============================================================================

aethelMCPServer.registerTool(
  {
    name: 'rename_file',
    description: 'Renomeia ou move um arquivo',
    inputSchema: {
      type: 'object',
      properties: {
        oldPath: { type: 'string', description: 'Caminho atual do arquivo' },
        newPath: { type: 'string', description: 'Novo caminho do arquivo' },
      },
      required: ['oldPath', 'newPath'],
    },
  },
  async (args): Promise<MCPToolResult> => {
    const { oldPath, newPath } = args as { oldPath: string; newPath: string };
    
    try {
      const file = await prisma.file.findFirst({ 
        where: { path: { contains: oldPath } } 
      });
      
      if (!file) {
        return { 
          content: [{ type: 'text', text: `Arquivo não encontrado: ${oldPath}` }], 
          isError: true 
        };
      }
      
      await prisma.file.update({
        where: { id: file.id },
        data: { path: newPath }
      });
      
      return { 
        content: [{ type: 'text', text: `Arquivo movido: ${oldPath} -> ${newPath}` }] 
      };
    } catch (error) {
      return { 
        content: [{ type: 'text', text: `Erro ao mover: ${error}` }], 
        isError: true 
      };
    }
  }
);

// ============================================================================
// EXPORTS
// ============================================================================

export default aethelMCPServer;
