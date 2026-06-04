import type { AITool } from './ai-tools-registry-types';

type ToolRegistry = {
  register(tool: AITool): void;
};

export function registerCreativeTools(registry: ToolRegistry): void {
  // ============================================================================
  // FERRAMENTAS DE IMAGEM
  // ============================================================================

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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

  registry.register({
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
}
