/**
 * Integrated AI workflow tools extracted from ai-integration-total.
 */

type RegistryLike = {
  register: (tool: {
    name: string;
    description: string;
    category: string;
    parameters: unknown[];
    returns: string;
    execute: (params: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  }) => void;
  execute: (name: string, params: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>;
};

type EngineStateLike = {
  particleManager?: { removeEmitter: (id: string) => void } | null;
};

export function registerIntegratedWorkflowTools(deps: {
  aiTools: RegistryLike;
  engineState: EngineStateLike;
}): void {
  const { aiTools, engineState } = deps;

aiTools.register({
  name: 'create_complete_enemy',
  description: 'Cria um inimigo completo com física, IA e animação',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do inimigo', required: true },
    { name: 'position', type: 'object', description: 'Posição inicial', required: true },
    { name: 'aiPreset', type: 'string', description: 'Preset de IA', required: false, enum: ['basicEnemy', 'patrolGuard', 'coward', 'bossAI'], default: 'basicEnemy' },
    { name: 'health', type: 'number', description: 'Vida inicial', required: false, default: 100 },
    { name: 'speed', type: 'number', description: 'Velocidade de movimento', required: false, default: 5 },
  ],
  returns: 'IDs dos sistemas criados para o inimigo',
  execute: async (params) => {
    const name = params.name as string;
    const pos = params.position as { x: number; y: number; z: number };
    
    // Criar corpo físico
    const physicsResult = await aiTools.execute('physics_create_body', {
      type: 'dynamic',
      position: pos,
      mass: 1,
      colliderType: 'capsule',
      colliderSize: { radius: 0.5, height: 1.8 },
    });
    
    // Criar behavior tree
    const btResult = await aiTools.execute('ai_create_behavior_tree', {
      name: `${name}_bt`,
      preset: params.aiPreset,
    });
    
    // Criar skeleton e animação
    const skelResult = await aiTools.execute('animation_create_skeleton', {
      name: `${name}_skel`,
      preset: 'humanoid',
    });
    
    // Adicionar entidade ao level
    const entityResult = await aiTools.execute('level_add_entity', {
      name,
      position: pos,
      components: {
        Health: { current: params.health, max: params.health },
        Movement: { speed: params.speed },
        AI: { behaviorTreeId: `${name}_bt` },
        Animation: { skeletonId: `${name}_skel` },
      },
      tags: ['enemy', 'npc'],
    });
    
    return {
      success: true,
      data: {
        entityId: name,
        physicsBodyId: (physicsResult.data as any)?.bodyId,
        behaviorTreeId: `${name}_bt`,
        skeletonId: `${name}_skel`,
      },
    };
  },
});

aiTools.register({
  name: 'create_particle_effect_at_position',
  description: 'Cria e emite efeito de partículas em uma posição',
  category: 'game',
  parameters: [
    { name: 'effectType', type: 'string', description: 'Tipo de efeito', required: true, enum: ['fire', 'smoke', 'sparks', 'explosion', 'magic'] },
    { name: 'position', type: 'object', description: 'Posição do efeito', required: true },
    { name: 'burstCount', type: 'number', description: 'Quantidade inicial de partículas', required: false, default: 100 },
    { name: 'duration', type: 'number', description: 'Duração do efeito em ms (0 = permanente)', required: false, default: 0 },
  ],
  returns: 'ID do emissor criado',
  execute: async (params) => {
    const emitterId = `effect_${Date.now()}`;
    const pos = params.position as { x: number; y: number; z: number };
    
    // Criar emissor
    await aiTools.execute('particles_create_emitter', {
      name: emitterId,
      preset: params.effectType,
      position: pos,
    });
    
    // Emitir burst inicial
    await aiTools.execute('particles_emit_burst', {
      emitterId,
      count: params.burstCount,
    });
    
    // Se tiver duração, agendar remoção
    if ((params.duration as number) > 0 && engineState.particleManager) {
      setTimeout(() => {
        engineState.particleManager?.removeEmitter(emitterId);
      }, params.duration as number);
    }
    
    return {
      success: true,
      data: { emitterId, effectType: params.effectType, position: pos },
    };
  },
});

aiTools.register({
  name: 'play_procedural_music',
  description: 'Gera e toca música procedural',
  category: 'audio',
  parameters: [
    { name: 'style', type: 'string', description: 'Estilo musical', required: true, enum: ['ambient', 'action', 'sad', 'happy', 'tense'] },
    { name: 'tempo', type: 'number', description: 'BPM', required: false, default: 120 },
    { name: 'key', type: 'string', description: 'Tonalidade', required: false, enum: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], default: 'C' },
    { name: 'duration', type: 'number', description: 'Duração em segundos', required: false, default: 30 },
  ],
  returns: 'IDs dos synths criados',
  execute: async (params) => {
    const style = params.style as string;
    const tempo = params.tempo as number;
    const key = params.key as string;
    
    // Criar synths baseado no estilo
    const synthConfigs: { name: string; preset: string }[] = [];
    
    switch (style) {
      case 'ambient':
        synthConfigs.push({ name: 'pad', preset: 'pad' });
        synthConfigs.push({ name: 'lead', preset: 'strings' });
        break;
      case 'action':
        synthConfigs.push({ name: 'bass', preset: 'bass' });
        synthConfigs.push({ name: 'lead', preset: 'lead' });
        break;
      case 'sad':
        synthConfigs.push({ name: 'pad', preset: 'pad' });
        synthConfigs.push({ name: 'pluck', preset: 'pluck' });
        break;
      default:
        synthConfigs.push({ name: 'pad', preset: 'pad' });
        synthConfigs.push({ name: 'lead', preset: 'lead' });
    }
    
    const createdSynths: string[] = [];
    
    for (const config of synthConfigs) {
      const synthId = `music_${config.name}_${Date.now()}`;
      await aiTools.execute('audio_create_synth', {
        name: synthId,
        preset: config.preset,
      });
      createdSynths.push(synthId);
    }
    
    // Gerar progressão de acordes baseada na tonalidade
    const keyNotes: Record<string, number[]> = {
      'C': [60, 64, 67], // C major triad
      'D': [62, 66, 69],
      'E': [64, 68, 71],
      'F': [65, 69, 72],
      'G': [67, 71, 74],
      'A': [69, 73, 76],
      'B': [71, 75, 78],
    };
    
    const rootChord = keyNotes[key];
    
    // Tocar acorde inicial
    if (createdSynths.length > 0) {
      await aiTools.execute('audio_play_chord', {
        synthId: createdSynths[0],
        notes: rootChord,
        velocity: 0.6,
        duration: (60 / tempo) * 4 * 1000, // 4 beats
      });
    }
    
    return {
      success: true,
      data: {
        style,
        tempo,
        key,
        synths: createdSynths,
      },
    };
  },
});
}
