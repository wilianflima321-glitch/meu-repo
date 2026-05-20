import type { MCPTool } from '../mcp-core';

export const AETHEL_TOOL_DEFINITIONS: MCPTool[] = [
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
{
    name: 'git_status',
    description: 'Mostra o status do repositório Git',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
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
  }
];
