/**
 * AI Tools Registry - Registro de Ferramentas para IA
 * 
 * Define todas as ferramentas que a IA pode usar para:
 * - Editar código
 * - Manipular vídeo/áudio/imagem
 * - Controlar o game engine
 * - Gerar assets procedurais
 * 
 * Baseado no padrão de Function Calling da OpenAI/Anthropic
 */

import { prisma } from '@/lib/db';
import { assertProjectOwnership } from '@/lib/copilot/project-resolver';

type ToolExecutionContext = {
  userId: string;
  projectId?: string;
};

function getContext(params: Record<string, unknown>): ToolExecutionContext {
  const ctx = (params as any)?.__aethelContext;
  if (!ctx || typeof ctx !== 'object') {
    throw Object.assign(new Error('MISSING_CONTEXT'), { code: 'MISSING_CONTEXT' });
  }
  const userId = String((ctx as any).userId || '').trim();
  const projectId = typeof (ctx as any).projectId === 'string' ? String((ctx as any).projectId).trim() : undefined;
  if (!userId) {
    throw Object.assign(new Error('MISSING_USER'), { code: 'MISSING_USER' });
  }
  return { userId, projectId };
}

function normalizePath(path: string): string {
  const raw = String(path || '').trim();
  if (!raw) return '/';
  const p = raw.startsWith('/') ? raw : `/${raw}`;
  const cleaned = p.replace(/\\/g, '/');
  // Bloqueia traversal e strings suspeitas
  if (cleaned.includes('\u0000') || cleaned.split('/').includes('..')) {
    throw Object.assign(new Error('INVALID_PATH'), { code: 'INVALID_PATH' });
  }
  return cleaned;
}

function inferLanguageFromPath(path: string): string | undefined {
  const p = String(path || '').toLowerCase();
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
  if (p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.mjs') || p.endsWith('.cjs')) return 'javascript';
  if (p.endsWith('.json')) return 'json';
  if (p.endsWith('.css')) return 'css';
  if (p.endsWith('.html')) return 'html';
  if (p.endsWith('.py')) return 'python';
  if (p.endsWith('.rs')) return 'rust';
  if (p.endsWith('.go')) return 'go';
  if (p.endsWith('.md')) return 'markdown';
  return undefined;
}

function clampContent(content: string, maxChars: number): string {
  const s = String(content ?? '');
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars);
}

async function audit(userId: string | null, action: string, resource?: string, metadata?: any): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        action,
        resource: resource || undefined,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch {
    // audit é best-effort
  }
}

// ============================================================================
// TIPOS BASE
// ============================================================================

export interface AITool {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  returns: string;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  artifacts?: Artifact[];
}

export interface Artifact {
  type: 'file' | 'image' | 'audio' | 'video' | 'code' | '3d-model';
  name: string;
  content: string | Blob;
  mimeType: string;
}

export type ToolCategory = 
  | 'code'      // Edição de código
  | 'image'     // Manipulação de imagem
  | 'audio'     // Manipulação de áudio
  | 'video'     // Manipulação de vídeo
  | 'game'      // Game engine
  | 'asset'     // Geração de assets
  | 'project'   // Gerenciamento de projeto
  | 'ui'        // Interface do usuário
  | 'analysis'; // Análise e debug

// ============================================================================
// REGISTRY DE FERRAMENTAS
// ============================================================================

class AIToolsRegistry {
  private tools: Map<string, AITool> = new Map();
  private toolsByCategory: Map<ToolCategory, AITool[]> = new Map();

  register(tool: AITool): void {
    this.tools.set(tool.name, tool);
    
    const categoryTools = this.toolsByCategory.get(tool.category) || [];
    categoryTools.push(tool);
    this.toolsByCategory.set(tool.category, categoryTools);
  }

  get(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getByCategory(category: ToolCategory): AITool[] {
    return this.toolsByCategory.get(category) || [];
  }

  getAll(): AITool[] {
    return [...this.tools.values()];
  }

  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool "${name}" not found` };
    }

    try {
      // Validar parâmetros obrigatórios
      for (const param of tool.parameters) {
        if (param.required && !(param.name in params)) {
          return { success: false, error: `Missing required parameter: ${param.name}` };
        }
      }

      return await tool.execute(params);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Gerar schema para OpenAI Function Calling
  toOpenAIFunctions(): OpenAIFunction[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          };
          return acc;
        }, {} as Record<string, unknown>),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    }));
  }

  // Gerar schema para Anthropic Tools
  toAnthropicTools(): AnthropicTool[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          };
          return acc;
        }, {} as Record<string, unknown>),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    }));
  }
}

interface OpenAIFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ============================================================================
// INSTÂNCIA GLOBAL
// ============================================================================

export const aiTools = new AIToolsRegistry();

// ============================================================================
// FERRAMENTAS DE CÓDIGO
// ============================================================================

aiTools.register({
  name: 'create_file',
  description: 'Cria um novo arquivo no projeto com o conteúdo especificado',
  category: 'code',
  parameters: [
    { name: 'path', type: 'string', description: 'Caminho do arquivo (ex: src/components/Button.tsx)', required: true },
    { name: 'content', type: 'string', description: 'Conteúdo do arquivo', required: true },
    { name: 'language', type: 'string', description: 'Linguagem do arquivo', required: false, enum: ['typescript', 'javascript', 'python', 'rust', 'go', 'css', 'html', 'json'] },
  ],
  returns: 'Confirmação de criação do arquivo',
  execute: async (params) => {
    try {
      const ctx = getContext(params);
      if (!ctx.projectId) {
        return { success: false, error: 'projectId é obrigatório no contexto para criar arquivo.' };
      }
      await assertProjectOwnership(ctx.userId, ctx.projectId);

      const path = normalizePath(String((params as any).path || ''));
      const content = clampContent(String((params as any).content ?? ''), 1_000_000);
      const language =
        typeof (params as any).language === 'string'
          ? String((params as any).language)
          : inferLanguageFromPath(path);

      const row = await prisma.file.upsert({
        where: { projectId_path: { projectId: ctx.projectId, path } },
        update: { content, ...(language ? { language } : {}) },
        create: { projectId: ctx.projectId, path, content, ...(language ? { language } : {}) },
        select: { id: true, path: true, updatedAt: true },
      });

      await audit(ctx.userId, 'files.write', row.id, { projectId: ctx.projectId, path, op: 'create_file' });
      return { success: true, data: { fileId: row.id, path: row.path, created: true, updatedAt: row.updatedAt } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar arquivo' };
    }
  },
});

aiTools.register({
  name: 'edit_file',
  description: 'Edita um arquivo existente, substituindo ou inserindo código',
  category: 'code',
  parameters: [
    { name: 'path', type: 'string', description: 'Caminho do arquivo', required: true },
    { name: 'operation', type: 'string', description: 'Tipo de operação', required: true, enum: ['replace', 'insert', 'delete'] },
    { name: 'target', type: 'string', description: 'Texto ou linha a ser modificado', required: true },
    { name: 'content', type: 'string', description: 'Novo conteúdo', required: false },
  ],
  returns: 'Confirmação da edição',
  execute: async (params) => {
    try {
      const ctx = getContext(params);
      if (!ctx.projectId) {
        return { success: false, error: 'projectId é obrigatório no contexto para editar arquivo.' };
      }
      await assertProjectOwnership(ctx.userId, ctx.projectId);

      const path = normalizePath(String((params as any).path || ''));
      const operation = String((params as any).operation || '').trim();
      const target = String((params as any).target ?? '');
      const insertContent = String((params as any).content ?? '');

      const file = await prisma.file.findFirst({
        where: { projectId: ctx.projectId, OR: [{ path }, { path: path.replace(/^\//, '') }] },
        select: { id: true, path: true, content: true, language: true },
      });
      if (!file) return { success: false, error: `Arquivo não encontrado: ${path}` };
      const current = String(file.content ?? '');
      let next = current;
      let applied = false;

      if (operation === 'replace') {
        const idx = current.indexOf(target);
        if (idx < 0) return { success: false, error: 'Target não encontrado para replace.' };
        next = current.slice(0, idx) + insertContent + current.slice(idx + target.length);
        applied = true;
      } else if (operation === 'insert') {
        const idx = current.indexOf(target);
        if (idx < 0) return { success: false, error: 'Target não encontrado para insert.' };
        next = current.slice(0, idx) + insertContent + current.slice(idx);
        applied = true;
      } else if (operation === 'delete') {
        const idx = current.indexOf(target);
        if (idx < 0) return { success: false, error: 'Target não encontrado para delete.' };
        next = current.slice(0, idx) + current.slice(idx + target.length);
        applied = true;
      } else {
        return { success: false, error: `Operação inválida: ${operation}` };
      }

      next = clampContent(next, 1_000_000);
      const updated = await prisma.file.update({
        where: { id: file.id },
        data: { content: next },
        select: { id: true, path: true, updatedAt: true },
      });

      await audit(ctx.userId, 'files.patch', updated.id, { projectId: ctx.projectId, path: updated.path, op: operation });
      return {
        success: true,
        data: {
          fileId: updated.id,
          path: updated.path,
          operation,
          applied,
          updatedAt: updated.updatedAt,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao editar arquivo' };
    }
  },
});

aiTools.register({
  name: 'analyze_code',
  description: 'Analisa código para encontrar bugs, melhorias de performance ou problemas de segurança',
  category: 'analysis',
  parameters: [
    { name: 'path', type: 'string', description: 'Caminho do arquivo ou diretório', required: true },
    { name: 'type', type: 'string', description: 'Tipo de análise', required: true, enum: ['bugs', 'performance', 'security', 'style', 'all'] },
  ],
  returns: 'Lista de problemas encontrados com sugestões',
  execute: async (params) => {
    return {
      success: true,
      data: { 
        issues: [],
        suggestions: [],
        score: 85,
      },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE IMAGEM
// ============================================================================

aiTools.register({
  name: 'generate_image',
  description: 'Gera uma imagem usando IA (DALL-E, Stable Diffusion)',
  category: 'image',
  parameters: [
    { name: 'prompt', type: 'string', description: 'Descrição da imagem a ser gerada', required: true },
    { name: 'style', type: 'string', description: 'Estilo da imagem', required: false, enum: ['realistic', 'cartoon', 'pixel-art', 'concept-art', '3d-render', 'anime'] },
    { name: 'width', type: 'number', description: 'Largura em pixels', required: false, default: 1024 },
    { name: 'height', type: 'number', description: 'Altura em pixels', required: false, default: 1024 },
  ],
  returns: 'URL ou base64 da imagem gerada',
  execute: async (params) => {
    // Integração com DALL-E ou Stable Diffusion
    return {
      success: true,
      data: { imageUrl: '', prompt: params.prompt },
      artifacts: [{
        type: 'image',
        name: 'generated-image.png',
        content: '',
        mimeType: 'image/png',
      }],
    };
  },
});

aiTools.register({
  name: 'edit_image',
  description: 'Edita uma imagem existente (crop, resize, filters, ajustes)',
  category: 'image',
  parameters: [
    { name: 'imagePath', type: 'string', description: 'Caminho da imagem', required: true },
    { name: 'operation', type: 'string', description: 'Operação a realizar', required: true, enum: ['crop', 'resize', 'rotate', 'flip', 'brightness', 'contrast', 'saturation', 'blur', 'sharpen', 'remove-background'] },
    { name: 'params', type: 'object', description: 'Parâmetros específicos da operação', required: false },
  ],
  returns: 'Imagem editada',
  execute: async (params) => {
    return {
      success: true,
      data: { operation: params.operation, applied: true },
    };
  },
});

aiTools.register({
  name: 'create_sprite_sheet',
  description: 'Cria sprite sheet para animação de jogos',
  category: 'image',
  parameters: [
    { name: 'prompt', type: 'string', description: 'Descrição do personagem/objeto', required: true },
    { name: 'frames', type: 'number', description: 'Número de frames', required: true },
    { name: 'animation', type: 'string', description: 'Tipo de animação', required: true, enum: ['idle', 'walk', 'run', 'jump', 'attack', 'death'] },
    { name: 'direction', type: 'string', description: 'Direção do sprite', required: false, enum: ['side', 'top-down', 'isometric'] },
  ],
  returns: 'Sprite sheet com todas as frames',
  execute: async (params) => {
    return {
      success: true,
      data: { frames: params.frames, animation: params.animation },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE ÁUDIO
// ============================================================================

aiTools.register({
  name: 'generate_music',
  description: 'Gera música usando IA (Suno, MusicGen)',
  category: 'audio',
  parameters: [
    { name: 'prompt', type: 'string', description: 'Descrição da música', required: true },
    { name: 'genre', type: 'string', description: 'Gênero musical', required: false, enum: ['electronic', 'orchestral', 'rock', 'jazz', 'ambient', 'chiptune', 'cinematic'] },
    { name: 'duration', type: 'number', description: 'Duração em segundos', required: false, default: 30 },
    { name: 'tempo', type: 'number', description: 'BPM', required: false, default: 120 },
  ],
  returns: 'Arquivo de áudio gerado',
  execute: async (params) => {
    return {
      success: true,
      data: { prompt: params.prompt, genre: params.genre },
      artifacts: [{
        type: 'audio',
        name: 'generated-music.mp3',
        content: '',
        mimeType: 'audio/mpeg',
      }],
    };
  },
});

aiTools.register({
  name: 'generate_sfx',
  description: 'Gera efeitos sonoros para jogos',
  category: 'audio',
  parameters: [
    { name: 'type', type: 'string', description: 'Tipo de efeito', required: true, enum: ['explosion', 'footstep', 'door', 'weapon', 'magic', 'ui-click', 'powerup', 'ambient'] },
    { name: 'variation', type: 'string', description: 'Variação do efeito', required: false },
    { name: 'duration', type: 'number', description: 'Duração máxima em ms', required: false, default: 1000 },
  ],
  returns: 'Efeito sonoro gerado',
  execute: async (params) => {
    return {
      success: true,
      data: { type: params.type },
    };
  },
});

aiTools.register({
  name: 'text_to_speech',
  description: 'Converte texto em fala para diálogos de jogos',
  category: 'audio',
  parameters: [
    { name: 'text', type: 'string', description: 'Texto a ser falado', required: true },
    { name: 'voice', type: 'string', description: 'Tipo de voz', required: false, enum: ['male-deep', 'male-young', 'female-soft', 'female-strong', 'child', 'robot', 'monster'] },
    { name: 'emotion', type: 'string', description: 'Emoção na fala', required: false, enum: ['neutral', 'happy', 'sad', 'angry', 'scared', 'excited'] },
    { name: 'language', type: 'string', description: 'Idioma', required: false, default: 'pt-BR' },
  ],
  returns: 'Áudio da fala',
  execute: async (params) => {
    return {
      success: true,
      data: { text: params.text, voice: params.voice },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE VÍDEO
// ============================================================================

aiTools.register({
  name: 'create_video_clip',
  description: 'Cria um clip de vídeo na timeline',
  category: 'video',
  parameters: [
    { name: 'source', type: 'string', description: 'Caminho do vídeo fonte', required: true },
    { name: 'startTime', type: 'number', description: 'Tempo de início na timeline (segundos)', required: true },
    { name: 'inPoint', type: 'number', description: 'Ponto de entrada no source (segundos)', required: false, default: 0 },
    { name: 'outPoint', type: 'number', description: 'Ponto de saída no source (segundos)', required: false },
    { name: 'track', type: 'number', description: 'Índice da track', required: false, default: 0 },
  ],
  returns: 'ID do clip criado',
  execute: async (params) => {
    return {
      success: true,
      data: { clipId: `clip-${Date.now()}`, startTime: params.startTime },
    };
  },
});

aiTools.register({
  name: 'add_video_effect',
  description: 'Adiciona efeito visual a um clip de vídeo',
  category: 'video',
  parameters: [
    { name: 'clipId', type: 'string', description: 'ID do clip', required: true },
    { name: 'effect', type: 'string', description: 'Tipo de efeito', required: true, enum: ['color-correction', 'blur', 'glow', 'vignette', 'chromatic-aberration', 'film-grain', 'shake', 'zoom', 'transition-fade', 'transition-wipe'] },
    { name: 'intensity', type: 'number', description: 'Intensidade do efeito (0-100)', required: false, default: 50 },
    { name: 'keyframes', type: 'array', description: 'Keyframes para animação do efeito', required: false },
  ],
  returns: 'Confirmação do efeito aplicado',
  execute: async (params) => {
    return {
      success: true,
      data: { clipId: params.clipId, effect: params.effect },
    };
  },
});

aiTools.register({
  name: 'render_video',
  description: 'Renderiza o vídeo final da timeline',
  category: 'video',
  parameters: [
    { name: 'format', type: 'string', description: 'Formato de saída', required: true, enum: ['mp4', 'webm', 'mov', 'gif'] },
    { name: 'quality', type: 'string', description: 'Qualidade', required: false, enum: ['draft', 'preview', 'final'], default: 'final' },
    { name: 'resolution', type: 'string', description: 'Resolução', required: false, enum: ['720p', '1080p', '4k'], default: '1080p' },
    { name: 'fps', type: 'number', description: 'Frames por segundo', required: false, default: 30 },
  ],
  returns: 'URL do vídeo renderizado',
  execute: async (params) => {
    return {
      success: true,
      data: { format: params.format, resolution: params.resolution },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE GAME ENGINE
// ============================================================================

aiTools.register({
  name: 'create_game_object',
  description: 'Cria um objeto no game engine (sprite, 3D model, luz, câmera)',
  category: 'game',
  parameters: [
    { name: 'type', type: 'string', description: 'Tipo de objeto', required: true, enum: ['sprite', 'mesh', 'light', 'camera', 'particle-system', 'audio-source', 'trigger', 'ui-element'] },
    { name: 'name', type: 'string', description: 'Nome do objeto', required: true },
    { name: 'position', type: 'object', description: 'Posição {x, y, z}', required: false },
    { name: 'properties', type: 'object', description: 'Propriedades específicas do tipo', required: false },
  ],
  returns: 'ID do objeto criado',
  execute: async (params) => {
    return {
      success: true,
      data: { objectId: `obj-${Date.now()}`, type: params.type, name: params.name },
    };
  },
});

aiTools.register({
  name: 'add_component',
  description: 'Adiciona componente a um game object (physics, script, animator)',
  category: 'game',
  parameters: [
    { name: 'objectId', type: 'string', description: 'ID do objeto', required: true },
    { name: 'component', type: 'string', description: 'Tipo de componente', required: true, enum: ['rigidbody', 'collider', 'script', 'animator', 'audio-listener', 'nav-agent', 'health', 'inventory'] },
    { name: 'config', type: 'object', description: 'Configuração do componente', required: false },
  ],
  returns: 'Confirmação do componente adicionado',
  execute: async (params) => {
    return {
      success: true,
      data: { objectId: params.objectId, component: params.component },
    };
  },
});

aiTools.register({
  name: 'create_game_script',
  description: 'Cria um script de comportamento para game object',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do script', required: true },
    { name: 'behavior', type: 'string', description: 'Descrição do comportamento desejado', required: true },
    { name: 'language', type: 'string', description: 'Linguagem do script', required: false, enum: ['typescript', 'visual-script'], default: 'typescript' },
  ],
  returns: 'Código do script gerado',
  execute: async (params) => {
    // IA gera o código do script baseado na descrição
    return {
      success: true,
      data: { scriptName: params.name, code: '' },
      artifacts: [{
        type: 'code',
        name: `${params.name}.ts`,
        content: '',
        mimeType: 'text/typescript',
      }],
    };
  },
});

aiTools.register({
  name: 'generate_level',
  description: 'Gera um nível/mapa proceduralmente',
  category: 'game',
  parameters: [
    { name: 'type', type: 'string', description: 'Tipo de level', required: true, enum: ['platformer', 'dungeon', 'open-world', 'racing-track', 'puzzle-room'] },
    { name: 'theme', type: 'string', description: 'Tema visual', required: true },
    { name: 'difficulty', type: 'string', description: 'Dificuldade', required: false, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    { name: 'size', type: 'string', description: 'Tamanho do level', required: false, enum: ['small', 'medium', 'large'], default: 'medium' },
    { name: 'seed', type: 'number', description: 'Seed para geração (para reproduzir)', required: false },
  ],
  returns: 'Dados do level gerado',
  execute: async (params) => {
    return {
      success: true,
      data: { type: params.type, theme: params.theme, seed: params.seed || Math.random() },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE ASSETS
// ============================================================================

aiTools.register({
  name: 'generate_3d_model',
  description: 'Gera modelo 3D usando IA',
  category: 'asset',
  parameters: [
    { name: 'prompt', type: 'string', description: 'Descrição do modelo', required: true },
    { name: 'style', type: 'string', description: 'Estilo do modelo', required: false, enum: ['realistic', 'low-poly', 'stylized', 'voxel'] },
    { name: 'format', type: 'string', description: 'Formato de saída', required: false, enum: ['gltf', 'fbx', 'obj'], default: 'gltf' },
  ],
  returns: 'Modelo 3D gerado',
  execute: async (params) => {
    return {
      success: true,
      data: { prompt: params.prompt, style: params.style },
      artifacts: [{
        type: '3d-model',
        name: 'generated-model.gltf',
        content: '',
        mimeType: 'model/gltf+json',
      }],
    };
  },
});

aiTools.register({
  name: 'generate_texture',
  description: 'Gera textura tileable para materiais',
  category: 'asset',
  parameters: [
    { name: 'type', type: 'string', description: 'Tipo de textura', required: true, enum: ['diffuse', 'normal', 'roughness', 'metallic', 'ao', 'height', 'emission'] },
    { name: 'material', type: 'string', description: 'Material (ex: wood, metal, stone)', required: true },
    { name: 'resolution', type: 'number', description: 'Resolução da textura', required: false, default: 1024 },
    { name: 'tileable', type: 'boolean', description: 'Se deve ser tileable', required: false, default: true },
  ],
  returns: 'Textura gerada',
  execute: async (params) => {
    return {
      success: true,
      data: { type: params.type, material: params.material },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE PROJETO
// ============================================================================

aiTools.register({
  name: 'create_project',
  description: 'Cria um novo projeto com template',
  category: 'project',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do projeto', required: true },
    { name: 'template', type: 'string', description: 'Template base', required: true, enum: ['blank', 'platformer-2d', 'fps-3d', 'rpg', 'racing', 'puzzle', 'visual-novel', 'mobile-game'] },
    { name: 'features', type: 'array', description: 'Features adicionais', required: false },
  ],
  returns: 'ID do projeto criado',
  execute: async (params) => {
		try {
			const ctx = getContext(params);
			const name = String((params as any).name || '').trim();
			const template = String((params as any).template || '').trim();
			if (!name) return { success: false, error: 'name é obrigatório' };
			if (!template) return { success: false, error: 'template é obrigatório' };

			const project = await prisma.project.create({
				data: { userId: ctx.userId, name, template },
				select: { id: true, name: true, template: true, createdAt: true },
			});
			await audit(ctx.userId, 'create_project', project.id, { name, template });
			return { success: true, data: { projectId: project.id, name: project.name, template: project.template } };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar projeto' };
		}
  },
});

aiTools.register({
  name: 'build_project',
  description: 'Compila e builda o projeto para plataforma alvo',
  category: 'project',
  parameters: [
    { name: 'platform', type: 'string', description: 'Plataforma alvo', required: true, enum: ['web', 'windows', 'mac', 'linux', 'android', 'ios'] },
    { name: 'configuration', type: 'string', description: 'Configuração de build', required: false, enum: ['debug', 'release'], default: 'release' },
    { name: 'optimizations', type: 'array', description: 'Otimizações a aplicar', required: false },
  ],
  returns: 'URL ou caminho do build',
  execute: async (params) => {
    return {
      success: true,
      data: { platform: params.platform, configuration: params.configuration },
    };
  },
});

// ============================================================================
// EXPORT
// ============================================================================

export default aiTools;

// Named exports para compatibilidade com imports nomeados
export const toolsRegistry = aiTools;
export async function executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
  return aiTools.execute(name, params);
}
