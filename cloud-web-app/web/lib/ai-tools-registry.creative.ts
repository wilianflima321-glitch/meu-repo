import type { AITool, ToolResult } from './ai-tools-registry-types';

type ToolRegistry = {
  register(tool: AITool): void;
};

/**
 * Creative generation tools (image, audio, video, procedural game content).
 *
 * Honesty contract: none of these capabilities are wired to a real provider in
 * this build. They MUST fail closed with a provider_unavailable result instead
 * of returning fake `success: true` payloads with empty artifacts. An agent that
 * receives `success: true` would believe an artifact exists when it does not,
 * which violates the product's "never lie" governance.
 *
 * To enable a tool, replace its `execute` with a real provider call and return
 * the produced artifact. Until then, the governed failure surfaces a clear
 * next action to the agent and the human reviewer.
 */
function providerUnavailable(capability: string, envHint: string): ToolResult {
  return {
    success: false,
    error: `${capability} is not wired to a real provider in this build. Configure ${envHint} and connect a provider before calling this tool. No placeholder artifact is produced.`,
  };
}

export function registerCreativeTools(registry: ToolRegistry): void {
  // ============================================================================
  // IMAGE TOOLS
  // ============================================================================

  registry.register({
    name: 'generate_image',
    description: 'Generate an image with AI (provider not yet wired in this build).',
    category: 'image',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Description of the image to generate', required: true },
      { name: 'style', type: 'string', description: 'Image style', required: false, enum: ['realistic', 'cartoon', 'pixel-art', 'concept-art', '3d-render', 'anime'] },
      { name: 'width', type: 'number', description: 'Width in pixels', required: false, default: 1024 },
      { name: 'height', type: 'number', description: 'Height in pixels', required: false, default: 1024 },
    ],
    returns: 'URL or base64 of the generated image once a provider is configured',
    execute: async () => providerUnavailable('Image generation', 'an image provider (e.g. OPENAI_API_KEY or a Stable Diffusion endpoint)'),
  });

  registry.register({
    name: 'edit_image',
    description: 'Edit an existing image (provider not yet wired in this build).',
    category: 'image',
    parameters: [
      { name: 'imagePath', type: 'string', description: 'Path to the image', required: true },
      { name: 'operation', type: 'string', description: 'Operation to perform', required: true, enum: ['crop', 'resize', 'rotate', 'flip', 'brightness', 'contrast', 'saturation', 'blur', 'sharpen', 'remove-background'] },
      { name: 'params', type: 'object', description: 'Operation-specific parameters', required: false },
    ],
    returns: 'The edited image once a provider is configured',
    execute: async () => providerUnavailable('Image editing', 'an image-processing provider'),
  });

  registry.register({
    name: 'create_sprite_sheet',
    description: 'Create a sprite sheet for game animation (provider not yet wired in this build).',
    category: 'image',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Description of the character/object', required: true },
      { name: 'frames', type: 'number', description: 'Number of frames', required: true },
      { name: 'animation', type: 'string', description: 'Animation type', required: true, enum: ['idle', 'walk', 'run', 'jump', 'attack', 'death'] },
      { name: 'direction', type: 'string', description: 'Sprite direction', required: false, enum: ['side', 'top-down', 'isometric'] },
    ],
    returns: 'A sprite sheet with all frames once a provider is configured',
    execute: async () => providerUnavailable('Sprite sheet generation', 'an image provider'),
  });

  // ============================================================================
  // AUDIO TOOLS
  // ============================================================================

  registry.register({
    name: 'generate_music',
    description: 'Generate music with AI (provider not yet wired in this build).',
    category: 'audio',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Description of the music', required: true },
      { name: 'genre', type: 'string', description: 'Musical genre', required: false, enum: ['electronic', 'orchestral', 'rock', 'jazz', 'ambient', 'chiptune', 'cinematic'] },
      { name: 'duration', type: 'number', description: 'Duration in seconds', required: false, default: 30 },
      { name: 'tempo', type: 'number', description: 'BPM', required: false, default: 120 },
    ],
    returns: 'A generated audio file once a provider is configured',
    execute: async () => providerUnavailable('Music generation', 'a music provider (e.g. Suno or MusicGen endpoint)'),
  });

  registry.register({
    name: 'generate_sfx',
    description: 'Generate sound effects for games (provider not yet wired in this build).',
    category: 'audio',
    parameters: [
      { name: 'type', type: 'string', description: 'Effect type', required: true, enum: ['explosion', 'footstep', 'door', 'weapon', 'magic', 'ui-click', 'powerup', 'ambient'] },
      { name: 'variation', type: 'string', description: 'Effect variation', required: false },
      { name: 'duration', type: 'number', description: 'Maximum duration in ms', required: false, default: 1000 },
    ],
    returns: 'A generated sound effect once a provider is configured',
    execute: async () => providerUnavailable('Sound effect generation', 'an audio provider'),
  });

  registry.register({
    name: 'text_to_speech',
    description: 'Convert text to speech for game dialogue (provider not yet wired in this build).',
    category: 'audio',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to speak', required: true },
      { name: 'voice', type: 'string', description: 'Voice type', required: false, enum: ['male-deep', 'male-young', 'female-soft', 'female-strong', 'child', 'robot', 'monster'] },
      { name: 'emotion', type: 'string', description: 'Speaking emotion', required: false, enum: ['neutral', 'happy', 'sad', 'angry', 'scared', 'excited'] },
      { name: 'language', type: 'string', description: 'Language', required: false, default: 'en-US' },
    ],
    returns: 'Speech audio once a provider is configured',
    execute: async () => providerUnavailable('Text-to-speech', 'a TTS provider (e.g. ElevenLabs, OpenAI, or Azure Speech)'),
  });

  // ============================================================================
  // VIDEO TOOLS
  // ============================================================================

  registry.register({
    name: 'create_video_clip',
    description: 'Create a video clip on the timeline (timeline runtime not yet wired in this build).',
    category: 'video',
    parameters: [
      { name: 'source', type: 'string', description: 'Path to the source video', required: true },
      { name: 'startTime', type: 'number', description: 'Start time on the timeline (seconds)', required: true },
      { name: 'inPoint', type: 'number', description: 'In point in the source (seconds)', required: false, default: 0 },
      { name: 'outPoint', type: 'number', description: 'Out point in the source (seconds)', required: false },
      { name: 'track', type: 'number', description: 'Track index', required: false, default: 0 },
    ],
    returns: 'The created clip id once the timeline runtime is wired',
    execute: async () => providerUnavailable('Timeline clip creation', 'a video timeline runtime'),
  });

  registry.register({
    name: 'add_video_effect',
    description: 'Add a visual effect to a video clip (timeline runtime not yet wired in this build).',
    category: 'video',
    parameters: [
      { name: 'clipId', type: 'string', description: 'Clip id', required: true },
      { name: 'effect', type: 'string', description: 'Effect type', required: true, enum: ['color-correction', 'blur', 'glow', 'vignette', 'chromatic-aberration', 'film-grain', 'shake', 'zoom', 'transition-fade', 'transition-wipe'] },
      { name: 'intensity', type: 'number', description: 'Effect intensity (0-100)', required: false, default: 50 },
      { name: 'keyframes', type: 'array', description: 'Keyframes for animating the effect', required: false },
    ],
    returns: 'Confirmation once the timeline runtime is wired',
    execute: async () => providerUnavailable('Video effect application', 'a video timeline runtime'),
  });

  registry.register({
    name: 'render_video',
    description: 'Render the final timeline video (render runtime is governed and not wired in this build).',
    category: 'video',
    parameters: [
      { name: 'format', type: 'string', description: 'Output format', required: true, enum: ['mp4', 'webm', 'mov', 'gif'] },
      { name: 'quality', type: 'string', description: 'Quality', required: false, enum: ['draft', 'preview', 'final'], default: 'final' },
      { name: 'resolution', type: 'string', description: 'Resolution', required: false, enum: ['720p', '1080p', '4k'], default: '1080p' },
      { name: 'fps', type: 'number', description: 'Frames per second', required: false, default: 30 },
    ],
    returns: 'The rendered video URL once a governed render runtime is wired',
    execute: async () => providerUnavailable('Video rendering', 'a governed cloud/native render runtime with cost and teardown receipts'),
  });

  // ============================================================================
  // GAME ENGINE TOOLS
  // ============================================================================

  registry.register({
    name: 'create_game_object',
    description: 'Create an object in the game engine (engine runtime not yet wired in this build).',
    category: 'game',
    parameters: [
      { name: 'type', type: 'string', description: 'Object type', required: true, enum: ['sprite', 'mesh', 'light', 'camera', 'particle-system', 'audio-source', 'trigger', 'ui-element'] },
      { name: 'name', type: 'string', description: 'Object name', required: true },
      { name: 'position', type: 'object', description: 'Position {x, y, z}', required: false },
      { name: 'properties', type: 'object', description: 'Type-specific properties', required: false },
    ],
    returns: 'The created object id once the engine runtime is wired',
    execute: async () => providerUnavailable('Game object creation', 'a connected scene/engine runtime'),
  });

  registry.register({
    name: 'add_component',
    description: 'Add a component to a game object (engine runtime not yet wired in this build).',
    category: 'game',
    parameters: [
      { name: 'objectId', type: 'string', description: 'Object id', required: true },
      { name: 'component', type: 'string', description: 'Component type', required: true, enum: ['rigidbody', 'collider', 'script', 'animator', 'audio-listener', 'nav-agent', 'health', 'inventory'] },
      { name: 'config', type: 'object', description: 'Component configuration', required: false },
    ],
    returns: 'Confirmation once the engine runtime is wired',
    execute: async () => providerUnavailable('Component attachment', 'a connected scene/engine runtime'),
  });

  registry.register({
    name: 'create_game_script',
    description: 'Create a behavior script for a game object (script generation not yet wired in this build).',
    category: 'game',
    parameters: [
      { name: 'name', type: 'string', description: 'Script name', required: true },
      { name: 'behavior', type: 'string', description: 'Description of the desired behavior', required: true },
      { name: 'language', type: 'string', description: 'Script language', required: false, enum: ['typescript', 'visual-script'], default: 'typescript' },
    ],
    returns: 'The generated script code once a provider is configured',
    execute: async () => providerUnavailable('Game script generation', 'a code generation provider'),
  });

  registry.register({
    name: 'generate_level',
    description: 'Generate a level/map procedurally (level generator not yet wired in this build).',
    category: 'game',
    parameters: [
      { name: 'type', type: 'string', description: 'Level type', required: true, enum: ['platformer', 'dungeon', 'open-world', 'racing-track', 'puzzle-room'] },
      { name: 'theme', type: 'string', description: 'Visual theme', required: true },
      { name: 'difficulty', type: 'string', description: 'Difficulty', required: false, enum: ['easy', 'medium', 'hard'], default: 'medium' },
      { name: 'size', type: 'string', description: 'Level size', required: false, enum: ['small', 'medium', 'large'], default: 'medium' },
      { name: 'seed', type: 'number', description: 'Seed for generation (for reproducibility)', required: false },
    ],
    returns: 'The generated level data once a generator is wired',
    execute: async () => providerUnavailable('Procedural level generation', 'a level generation runtime'),
  });
}
