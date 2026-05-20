import { prisma } from '@/lib/db';
import type { MCPToolResult } from '../mcp-core';
import { getFileSystemAdapter, type FileSystemAdapter } from './filesystem';
import type {
  DuckDuckGoResponse,
  GitCommitResponse,
  GitStatusResponse,
  TerminalCommandResponse,
} from './response-schemas';
import type { AethelToolHandler } from './response-schemas';

const fsAdapter: FileSystemAdapter = {
  readFile: (...args) => getFileSystemAdapter().readFile(...args),
  writeFile: (...args) => getFileSystemAdapter().writeFile(...args),
  deleteFile: (...args) => getFileSystemAdapter().deleteFile(...args),
  listDirectory: (...args) => getFileSystemAdapter().listDirectory(...args),
  exists: (...args) => getFileSystemAdapter().exists(...args),
  mkdir: (...args) => getFileSystemAdapter().mkdir(...args),
};

export const AETHEL_TOOL_HANDLERS: AethelToolHandler[] = [
async (args): Promise<MCPToolResult> => {
    const { path, startLine, endLine } = args as { path: string; startLine?: number; endLine?: number };

    try {
      const result = await fsAdapter.readFile(path, { startLine, endLine });

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
  },
async (args): Promise<MCPToolResult> => {
    const { path, content } = args as { path: string; content: string };

    try {
      const success = await fsAdapter.writeFile(path, content);

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
  },
async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };

    try {
      const success = await fsAdapter.deleteFile(path);

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
  },
async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };

    try {
      const success = await fsAdapter.mkdir(path);

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
  },
async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };

    try {
      const exists = await fsAdapter.exists(path);
      return { content: [{ type: 'text', text: exists ? 'true' : 'false' }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Erro: ${error}` }],
        isError: true
      };
    }
  },
async (args): Promise<MCPToolResult> => {
    const { path, operation, search, replace } = args as {
      path: string;
      operation: 'replace' | 'insert_before' | 'insert_after' | 'delete';
      search: string;
      replace?: string;
    };

    try {
      const file = await fsAdapter.readFile(path);
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

      const success = await fsAdapter.writeFile(path, content);
      if (!success) {
        return { content: [{ type: 'text', text: `Erro ao salvar edição` }], isError: true };
      }

      return { content: [{ type: 'text', text: `Arquivo editado: ${path}` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro ao editar: ${error}` }], isError: true };
    }
  },
async (args): Promise<MCPToolResult> => {
    const { path, recursive } = args as { path: string; recursive?: boolean };

    try {
      const items = await fsAdapter.listDirectory(path, recursive);
      return { content: [{ type: 'text', text: items.join('\n') || 'Diretório vazio' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
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
  },
async (args): Promise<MCPToolResult> => {
    const { command, cwd, timeout = 30000 } = args as {
      command: string;
      cwd?: string;
      timeout?: number;
    };

    try {
      const response = await fetch('/api/terminal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd, timeout }),
      });

      const data = await response.json() as TerminalCommandResponse;

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
  },
async (): Promise<MCPToolResult> => {
    try {
      const response = await fetch('/api/git/status');
      const data = await response.json() as GitStatusResponse;

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  },
async (args): Promise<MCPToolResult> => {
    const { file, staged } = args as { file?: string; staged?: boolean };

    try {
      const response = await fetch('/api/git/status');
      const data = await response.json() as GitStatusResponse;

      let diffText = '';

      if (data.staged?.length) {
        diffText += '=== STAGED ===\n';
        diffText += data.staged.map((f) => `${f.status}: ${f.path}`).join('\n');
        diffText += '\n\n';
      }

      if (data.unstaged?.length && !staged) {
        diffText += '=== UNSTAGED ===\n';
        diffText += data.unstaged.map((f) => `${f.status}: ${f.path}`).join('\n');
      }

      return { content: [{ type: 'text', text: diffText || 'Nenhuma mudança' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  },
async (args): Promise<MCPToolResult> => {
    const { message, files } = args as { message: string; files?: string };

    try {
      if (files) {
        await fetch('/api/git/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: files.split(',').map(f => f.trim()) }),
        });
      }

      const response = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json() as GitCommitResponse;

      return { content: [{ type: 'text', text: data.message || 'Commit criado' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error}` }], isError: true };
    }
  },
async (args): Promise<MCPToolResult> => {
    const { query, numResults = 5 } = args as { query: string; numResults?: number };

    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      const response = await fetch(url);
      const data = await response.json() as DuckDuckGoResponse;

      const results: string[] = [];

      if (data.Abstract) {
        results.push(`## ${data.Heading || query}`);
        results.push(data.Abstract);
        if (data.AbstractURL) results.push(`Fonte: ${data.AbstractURL}`);
      }

      if (data.RelatedTopics) {
        results.push('\n### Tópicos Relacionados:');
        data.RelatedTopics.slice(0, numResults).forEach((topic) => {
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
  },
async (args): Promise<MCPToolResult> => {
    const { url } = args as { url: string };

    try {
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
  },
async (args): Promise<MCPToolResult> => {
    const { path, recursive } = args as { path: string; recursive?: boolean };

    try {
      const file = await prisma.file.findFirst({
        where: { path: { contains: path } }
      });

      if (file) {
        await prisma.file.delete({ where: { id: file.id } });
        return { content: [{ type: 'text', text: `Arquivo deletado: ${path}` }] };
      }

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
  },
async (args): Promise<MCPToolResult> => {
    const { path } = args as { path: string };

    try {
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
];
