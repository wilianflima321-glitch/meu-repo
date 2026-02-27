/**
 * AI Integration Total - Integração Completa da IA com Todos os Sistemas
 * 
 * Este arquivo integra todos os sistemas do Aethel Engine com a IA,
 * permitindo que a IA controle TUDO na plataforma.
 * 
 * Sistemas integrados:
 * - Physics Engine
 * - Material Editor
 * - Behavior Trees
 * - Navigation Mesh
 * - Video Encoder
 * - Particle System
 * - Skeletal Animation
 * - Level Serialization
 * - Audio Synthesis
 * - Visual Scripting
 * - Game Engine Core
 */

import { aiTools, type AITool, type ToolResult } from './ai-tools-registry';
import * as THREE from 'three';

// Import dos sistemas reais
import { 
  PhysicsWorld,
} from './physics-engine-real';

import {
  BehaviorTree,
  BehaviorTreeBuilder,
  BehaviorPresets,
  Blackboard,
} from './behavior-tree';

import {
  NavigationMesh,
  NavAgentSystem,
  CrowdSimulation,
} from './navigation-mesh';

import {
  VideoEncoderReal,
  AudioEncoderReal,
  VideoExportPipeline,
  ScreenRecorder,
} from './video-encoder-real';

import {
  ParticleEmitter,
  ParticleSystemManager,
  ParticlePresets,
} from './particle-system-real';

import {
  Skeleton,
  AnimationMixer,
  AnimationClip,
  IKSolver,
  ProceduralAnimator,
  SkeletonPresets,
  createSkeleton,
  createAnimationMixer,
} from './skeletal-animation';

import {
  LevelManager,
  LevelHistory,
  LevelSerializer,
  AddEntityCommand,
  RemoveEntityCommand,
  ModifyEntityCommand,
} from './level-serialization';

import {
  AudioContextManager,
  PolySynth,
  Sampler,
  DrumMachine,
  SynthPresets,
  ReverbEffect,
  DelayEffect,
  DistortionEffect,
  ChorusEffect,
  createAudioContext,
  createPolySynth,
} from './audio-synthesis';
import { registerIntegratedWorkflowTools } from './ai-integration-total-workflows';

import {
  engineState,
  initializeEngineState,
  type EngineState,
} from './ai-integration-runtime-state';

aiTools.register({
  name: 'physics_create_body',
  description: 'Cria um corpo físico no mundo de física',
  category: 'game',
  parameters: [
    { name: 'type', type: 'string', description: 'Tipo do corpo', required: true, enum: ['dynamic', 'static', 'kinematic'] },
    { name: 'position', type: 'object', description: 'Posição {x, y, z}', required: true },
    { name: 'mass', type: 'number', description: 'Massa do corpo', required: false, default: 1 },
    { name: 'colliderType', type: 'string', description: 'Tipo de collider', required: true, enum: ['box', 'sphere', 'capsule', 'cylinder'] },
    { name: 'colliderSize', type: 'object', description: 'Tamanho do collider', required: true },
  ],
  returns: 'ID do corpo físico criado',
  execute: async (params) => {
    if (!engineState.physicsWorld) {
      return { success: false, error: 'Physics world not initialized' };
    }
    
    const pos = params.position as { x: number; y: number; z: number };
    const body = engineState.physicsWorld.createBody({
      type: params.type as 'dynamic' | 'static' | 'kinematic',
      position: new THREE.Vector3(pos.x, pos.y, pos.z),
      rotation: new THREE.Quaternion(),
      mass: (params.mass as number) ?? 1,
    });
    
    const size = params.colliderSize as { x?: number; y?: number; z?: number; radius?: number; height?: number };

    const colliderType = params.colliderType as 'box' | 'sphere' | 'capsule' | 'cylinder';
    switch (colliderType) {
      case 'box':
        engineState.physicsWorld.addCollider(body.id, {
          shape: 'box',
          halfExtents: new THREE.Vector3(size.x ?? 1, size.y ?? 1, size.z ?? 1),
        });
        break;
      case 'sphere':
        engineState.physicsWorld.addCollider(body.id, {
          shape: 'sphere',
          radius: size.radius ?? 1,
        });
        break;
      case 'capsule':
        engineState.physicsWorld.addCollider(body.id, {
          shape: 'capsule',
          radius: size.radius ?? 0.5,
          height: size.height ?? 2,
        });
        break;
      case 'cylinder':
        engineState.physicsWorld.addCollider(body.id, {
          shape: 'cylinder',
          radius: size.radius ?? 0.5,
          height: size.height ?? 2,
        });
        break;
      default:
        engineState.physicsWorld.addCollider(body.id, {
          shape: 'box',
          halfExtents: new THREE.Vector3(1, 1, 1),
        });
    }
    
    return {
      success: true,
      data: { bodyId: body.id, type: params.type, position: pos },
    };
  },
});

aiTools.register({
  name: 'physics_apply_force',
  description: 'Aplica força a um corpo físico',
  category: 'game',
  parameters: [
    { name: 'bodyId', type: 'string', description: 'ID do corpo físico', required: true },
    { name: 'force', type: 'object', description: 'Vetor de força {x, y, z}', required: true },
    { name: 'point', type: 'object', description: 'Ponto de aplicação (opcional)', required: false },
  ],
  returns: 'Confirmação da força aplicada',
  execute: async (params) => {
    if (!engineState.physicsWorld) {
      return { success: false, error: 'Physics world not initialized' };
    }
    
    const body = engineState.physicsWorld.getBody(params.bodyId as string);
    if (!body) {
      return { success: false, error: 'Body not found' };
    }
    
    const force = params.force as { x: number; y: number; z: number };
    body.addForce(new THREE.Vector3(force.x, force.y, force.z));
    
    return { success: true, data: { bodyId: params.bodyId, forceApplied: force } };
  },
});

aiTools.register({
  name: 'physics_raycast',
  description: 'Faz raycast no mundo de física',
  category: 'game',
  parameters: [
    { name: 'origin', type: 'object', description: 'Origem do raio {x, y, z}', required: true },
    { name: 'direction', type: 'object', description: 'Direção do raio {x, y, z}', required: true },
    { name: 'maxDistance', type: 'number', description: 'Distância máxima', required: false, default: 100 },
  ],
  returns: 'Informações do hit (se houver)',
  execute: async (params) => {
    if (!engineState.physicsWorld) {
      return { success: false, error: 'Physics world not initialized' };
    }
    
    const origin = params.origin as { x: number; y: number; z: number };
    const direction = params.direction as { x: number; y: number; z: number };
    
    const hit = engineState.physicsWorld.raycast(
      new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(direction.x, direction.y, direction.z).normalize(),
      params.maxDistance as number
    );
    
    if (hit) {
      return {
        success: true,
        data: {
          hit: true,
          bodyId: hit.bodyId,
          point: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
          normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
          distance: hit.distance,
        },
      };
    }
    
    return { success: true, data: { hit: false } };
  },
});

// ============================================================================
// FERRAMENTAS DE BEHAVIOR TREES - IA pode criar/controlar árvores de comportamento
// ============================================================================

aiTools.register({
  name: 'ai_create_behavior_tree',
  description: 'Cria uma árvore de comportamento para NPCs usando presets ou custom',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome da behavior tree', required: true },
    { name: 'preset', type: 'string', description: 'Preset de comportamento', required: false, enum: ['basicEnemy', 'patrolGuard', 'coward', 'bossAI', 'custom'] },
    { name: 'customDefinition', type: 'object', description: 'Definição custom da árvore (se preset=custom)', required: false },
  ],
  returns: 'ID da behavior tree criada',
  execute: async (params) => {
    const name = params.name as string;
    const preset = params.preset as string;
    
    let tree: BehaviorTree;
    
    if (preset && preset !== 'custom' && BehaviorPresets[preset as keyof typeof BehaviorPresets]) {
      tree = BehaviorPresets[preset as keyof typeof BehaviorPresets]();
    } else {
      // Create basic tree
      tree = new BehaviorTreeBuilder()
        .sequence()
          .condition('hasTarget', (ctx) => ctx.blackboard.get<boolean>('hasTarget') === true)
          .action('moveToTarget', (ctx) => {
            const target = ctx.blackboard.get<THREE.Vector3>('target');
            const entity = ctx.entity as { position?: THREE.Vector3 };
            if (!target || !entity?.position) return 'failure';

            const direction = target.clone().sub(entity.position);
            const distance = direction.length();
            if (distance < 0.1) return 'success';

            direction.normalize().multiplyScalar(5 * ctx.deltaTime);
            entity.position.add(direction);
            return 'running';
          })
        .end()
        .build();
    }
    
    engineState.behaviorTrees.set(name, tree);
    
    return {
      success: true,
      data: { treeId: name, preset: preset || 'custom' },
    };
  },
});

aiTools.register({
  name: 'ai_tick_behavior_tree',
  description: 'Executa um tick da behavior tree',
  category: 'game',
  parameters: [
    { name: 'treeId', type: 'string', description: 'ID da behavior tree', required: true },
    { name: 'blackboardData', type: 'object', description: 'Dados do blackboard', required: false },
  ],
  returns: 'Resultado do tick (SUCCESS, FAILURE, RUNNING)',
  execute: async (params) => {
    const tree = engineState.behaviorTrees.get(params.treeId as string);
    if (!tree) {
      return { success: false, error: 'Behavior tree not found' };
    }
    
    if (params.blackboardData) {
      for (const [key, value] of Object.entries(params.blackboardData as object)) {
        tree.blackboard.set(key, value);
      }
    }
    
    const result = tree.tick({}, {}, 1 / 60);
    
    return {
      success: true,
      data: { result, blackboardState: Object.fromEntries(tree.blackboard.data.entries()) },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE NAVIGATION MESH - IA pode criar/usar pathfinding
// ============================================================================

aiTools.register({
  name: 'navmesh_create',
  description: 'Cria um NavMesh para pathfinding',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do NavMesh', required: true },
    { name: 'width', type: 'number', description: 'Largura da área', required: true },
    { name: 'depth', type: 'number', description: 'Profundidade da área', required: true },
    { name: 'cellSize', type: 'number', description: 'Tamanho da célula', required: false, default: 1 },
    { name: 'obstacles', type: 'array', description: 'Lista de obstáculos {x, z, radius}', required: false },
  ],
  returns: 'ID do NavMesh criado',
  execute: async (params) => {
    const navMesh = new NavigationMesh();
    
    // Generate NavMesh from plane with obstacles
    const obstaclesRaw = (params.obstacles as Array<{ x: number; z: number; radius: number }>) || [];
    const obstacles = obstaclesRaw.map(o => ({
      center: new THREE.Vector3(o.x, 0, o.z),
      radius: o.radius,
    }));

    const width = params.width as number;
    const depth = params.depth as number;
    const cellSize = (params.cellSize as number) || 1;
    const subdivisions = Math.max(1, Math.round(Math.max(width, depth) / cellSize));

    navMesh.generateFromPlane(
      width,
      depth,
      subdivisions,
      obstacles
    );
    
    engineState.navMeshes.set(params.name as string, navMesh);
    
    return {
      success: true,
      data: { navMeshId: params.name, polygonCount: navMesh.polygons.length },
    };
  },
});

aiTools.register({
  name: 'navmesh_find_path',
  description: 'Encontra caminho no NavMesh usando A*',
  category: 'game',
  parameters: [
    { name: 'navMeshId', type: 'string', description: 'ID do NavMesh', required: true },
    { name: 'start', type: 'object', description: 'Posição inicial {x, y, z}', required: true },
    { name: 'end', type: 'object', description: 'Posição final {x, y, z}', required: true },
  ],
  returns: 'Array de pontos do caminho',
  execute: async (params) => {
    const navMesh = engineState.navMeshes.get(params.navMeshId as string);
    if (!navMesh) {
      return { success: false, error: 'NavMesh not found' };
    }
    
    const start = params.start as { x: number; y: number; z: number };
    const end = params.end as { x: number; y: number; z: number };
    
    const path = navMesh.findPath(
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(end.x, end.y, end.z)
    );

    if (!path) {
      return {
        success: true,
        data: {
          pathFound: false,
          path: [],
          pathLength: 0,
        },
      };
    }
    
    return {
      success: true,
      data: {
        pathFound: path.length > 0,
        path: path.map(p => ({ x: p.x, y: p.y, z: p.z })),
        pathLength: path.length,
      },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE PARTÍCULAS - IA pode criar efeitos de partículas
// ============================================================================

aiTools.register({
  name: 'particles_create_emitter',
  description: 'Cria um emissor de partículas',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do emissor', required: true },
    { name: 'preset', type: 'string', description: 'Preset de efeito', required: false, enum: ['fire', 'smoke', 'sparks', 'snow', 'rain', 'explosion', 'magic', 'confetti', 'custom'] },
    { name: 'position', type: 'object', description: 'Posição {x, y, z}', required: true },
    { name: 'customConfig', type: 'object', description: 'Configuração custom (se preset=custom)', required: false },
  ],
  returns: 'ID do emissor criado',
  execute: async (params) => {
    if (!engineState.particleManager) {
      return { success: false, error: 'Particle manager not initialized' };
    }
    
    const preset = params.preset as string;
    let config = {};
    
    if (preset && preset !== 'custom' && ParticlePresets[preset as keyof typeof ParticlePresets]) {
      config = ParticlePresets[preset as keyof typeof ParticlePresets]();
    } else if (params.customConfig) {
      config = params.customConfig as object;
    }
    
    const emitter = engineState.particleManager.createEmitter(params.name as string, config);
    
    const pos = params.position as { x: number; y: number; z: number };
    emitter.position.set(pos.x, pos.y, pos.z);
    
    return {
      success: true,
      data: { emitterId: params.name, preset: preset || 'custom' },
    };
  },
});

aiTools.register({
  name: 'particles_emit_burst',
  description: 'Emite uma explosão de partículas',
  category: 'game',
  parameters: [
    { name: 'emitterId', type: 'string', description: 'ID do emissor', required: true },
    { name: 'count', type: 'number', description: 'Quantidade de partículas', required: true },
  ],
  returns: 'Confirmação da emissão',
  execute: async (params) => {
    if (!engineState.particleManager) {
      return { success: false, error: 'Particle manager not initialized' };
    }
    
    const emitter = engineState.particleManager.getEmitter(params.emitterId as string);
    if (!emitter) {
      return { success: false, error: 'Emitter not found' };
    }
    
    emitter.emit(params.count as number);
    
    return {
      success: true,
      data: { emitterId: params.emitterId, emittedCount: params.count },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE ANIMAÇÃO - IA pode controlar animações
// ============================================================================

aiTools.register({
  name: 'animation_create_skeleton',
  description: 'Cria um skeleton para animação',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do skeleton', required: true },
    { name: 'preset', type: 'string', description: 'Preset de skeleton', required: false, enum: ['humanoid', 'quadruped', 'custom'] },
    { name: 'customBones', type: 'array', description: 'Definição custom de bones', required: false },
  ],
  returns: 'ID do skeleton criado',
  execute: async (params) => {
    const preset = params.preset as string;
    let skeletonData;
    
    if (preset && SkeletonPresets[preset as keyof typeof SkeletonPresets]) {
      skeletonData = SkeletonPresets[preset as keyof typeof SkeletonPresets]();
    } else {
      // Use humanoid as default
      skeletonData = SkeletonPresets.humanoid();
    }
    
    const skeleton = createSkeleton(skeletonData);
    engineState.skeletons.set(params.name as string, skeleton);
    
    const mixer = createAnimationMixer(skeleton);
    engineState.animationMixers.set(params.name as string, mixer);
    
    return {
      success: true,
      data: { skeletonId: params.name, boneCount: skeleton.bones.length },
    };
  },
});

aiTools.register({
  name: 'animation_play',
  description: 'Reproduz uma animação',
  category: 'game',
  parameters: [
    { name: 'skeletonId', type: 'string', description: 'ID do skeleton', required: true },
    { name: 'animationName', type: 'string', description: 'Nome da animação', required: true },
    { name: 'fadeTime', type: 'number', description: 'Tempo de transição', required: false, default: 0.2 },
    { name: 'loop', type: 'boolean', description: 'Se deve loopar', required: false, default: true },
  ],
  returns: 'Confirmação da animação iniciada',
  execute: async (params) => {
    const mixer = engineState.animationMixers.get(params.skeletonId as string);
    if (!mixer) {
      return { success: false, error: 'Skeleton not found' };
    }
    
    mixer.play(params.animationName as string, params.fadeTime as number);
    
    return {
      success: true,
      data: { skeletonId: params.skeletonId, animation: params.animationName },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE LEVEL/SCENE - IA pode gerenciar níveis
// ============================================================================

aiTools.register({
  name: 'level_new',
  description: 'Cria um novo nível/cena',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do nível', required: true },
  ],
  returns: 'Confirmação do nível criado',
  execute: async (params) => {
    if (!engineState.levelManager) {
      return { success: false, error: 'Level manager not initialized' };
    }
    
    await engineState.levelManager.newLevel(params.name as string);
    
    return {
      success: true,
      data: { levelName: params.name },
    };
  },
});

aiTools.register({
  name: 'level_add_entity',
  description: 'Adiciona uma entidade ao nível',
  category: 'game',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome da entidade', required: true },
    { name: 'position', type: 'object', description: 'Posição {x, y, z}', required: true },
    { name: 'components', type: 'object', description: 'Componentes da entidade', required: false },
    { name: 'tags', type: 'array', description: 'Tags da entidade', required: false },
  ],
  returns: 'ID da entidade criada',
  execute: async (params) => {
    if (!engineState.levelManager || !engineState.levelHistory) {
      return { success: false, error: 'Level manager not initialized' };
    }
    
    const pos = params.position as { x: number; y: number; z: number };
    
    const entity = {
      name: params.name as string,
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      components: params.components || {},
      tags: params.tags || [],
    };
    
    const command = new AddEntityCommand(engineState.levelManager, entity);
    engineState.levelHistory.execute(command);
    
    return {
      success: true,
      data: { entityId: entity.name, position: pos },
    };
  },
});

aiTools.register({
  name: 'level_save',
  description: 'Salva o nível atual',
  category: 'game',
  parameters: [
    { name: 'filename', type: 'string', description: 'Nome do arquivo', required: false },
  ],
  returns: 'Blob do nível salvo',
  execute: async (params) => {
    if (!engineState.levelManager) {
      return { success: false, error: 'Level manager not initialized' };
    }
    
    const blob = await engineState.levelManager.saveLevel(params.filename as string);
    
    return {
      success: true,
      data: { size: blob.size, type: blob.type },
      artifacts: [{
        type: 'file',
        name: (params.filename as string) || 'level.aelv',
        content: blob,
        mimeType: 'application/x-aethel-level',
      }],
    };
  },
});

aiTools.register({
  name: 'level_undo',
  description: 'Desfaz a última ação no nível',
  category: 'game',
  parameters: [],
  returns: 'Confirmação do undo',
  execute: async (_params) => {
    if (!engineState.levelHistory) {
      return { success: false, error: 'Level history not initialized' };
    }
    
    const success = engineState.levelHistory.undo();
    
    return {
      success,
      data: { undone: success, canUndo: engineState.levelHistory.canUndo() },
    };
  },
});

aiTools.register({
  name: 'level_redo',
  description: 'Refaz a última ação desfeita',
  category: 'game',
  parameters: [],
  returns: 'Confirmação do redo',
  execute: async (_params) => {
    if (!engineState.levelHistory) {
      return { success: false, error: 'Level history not initialized' };
    }
    
    const success = engineState.levelHistory.redo();
    
    return {
      success,
      data: { redone: success, canRedo: engineState.levelHistory.canRedo() },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE ÁUDIO SYNTH - IA pode criar/tocar música procedural
// ============================================================================

aiTools.register({
  name: 'audio_create_synth',
  description: 'Cria um sintetizador',
  category: 'audio',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do synth', required: true },
    { name: 'preset', type: 'string', description: 'Preset de som', required: true, enum: ['lead', 'pad', 'bass', 'pluck', 'organ', 'strings'] },
    { name: 'maxVoices', type: 'number', description: 'Número máximo de vozes', required: false, default: 8 },
  ],
  returns: 'ID do synth criado',
  execute: async (params) => {
    if (!engineState.audioContext) {
      return { success: false, error: 'Audio context not initialized' };
    }
    
    const synth = createPolySynth(
      engineState.audioContext,
      params.preset as keyof typeof SynthPresets
    );
    
    synth.getOutput().connect(AudioContextManager.getInstance().getOutput());
    engineState.synths.set(params.name as string, synth);
    
    return {
      success: true,
      data: { synthId: params.name, preset: params.preset },
    };
  },
});

aiTools.register({
  name: 'audio_play_note',
  description: 'Toca uma nota no sintetizador',
  category: 'audio',
  parameters: [
    { name: 'synthId', type: 'string', description: 'ID do synth', required: true },
    { name: 'note', type: 'number', description: 'Nota MIDI (0-127)', required: true },
    { name: 'velocity', type: 'number', description: 'Velocidade (0-1)', required: false, default: 0.8 },
    { name: 'duration', type: 'number', description: 'Duração em ms (0 = note on, precisa de note off)', required: false, default: 0 },
  ],
  returns: 'Confirmação da nota tocada',
  execute: async (params) => {
    const synth = engineState.synths.get(params.synthId as string);
    if (!synth) {
      return { success: false, error: 'Synth not found' };
    }
    
    synth.noteOn(params.note as number, params.velocity as number);
    
    // Se tiver duração, agendar note off
    if ((params.duration as number) > 0) {
      setTimeout(() => {
        synth.noteOff(params.note as number);
      }, params.duration as number);
    }
    
    return {
      success: true,
      data: { synthId: params.synthId, note: params.note },
    };
  },
});

aiTools.register({
  name: 'audio_stop_note',
  description: 'Para uma nota no sintetizador',
  category: 'audio',
  parameters: [
    { name: 'synthId', type: 'string', description: 'ID do synth', required: true },
    { name: 'note', type: 'number', description: 'Nota MIDI', required: true },
  ],
  returns: 'Confirmação da nota parada',
  execute: async (params) => {
    const synth = engineState.synths.get(params.synthId as string);
    if (!synth) {
      return { success: false, error: 'Synth not found' };
    }
    
    synth.noteOff(params.note as number);
    
    return {
      success: true,
      data: { synthId: params.synthId, note: params.note, stopped: true },
    };
  },
});

aiTools.register({
  name: 'audio_play_chord',
  description: 'Toca um acorde no sintetizador',
  category: 'audio',
  parameters: [
    { name: 'synthId', type: 'string', description: 'ID do synth', required: true },
    { name: 'notes', type: 'array', description: 'Array de notas MIDI', required: true },
    { name: 'velocity', type: 'number', description: 'Velocidade (0-1)', required: false, default: 0.7 },
    { name: 'duration', type: 'number', description: 'Duração em ms', required: false, default: 1000 },
  ],
  returns: 'Confirmação do acorde tocado',
  execute: async (params) => {
    const synth = engineState.synths.get(params.synthId as string);
    if (!synth) {
      return { success: false, error: 'Synth not found' };
    }
    
    const notes = params.notes as number[];
    const velocity = params.velocity as number;
    const duration = params.duration as number;
    
    // Toca todas as notas
    for (const note of notes) {
      synth.noteOn(note, velocity);
    }
    
    // Agenda note off para todas
    if (duration > 0) {
      setTimeout(() => {
        for (const note of notes) {
          synth.noteOff(note);
        }
      }, duration);
    }
    
    return {
      success: true,
      data: { synthId: params.synthId, notes, duration },
    };
  },
});

// ============================================================================
// FERRAMENTAS DE VIDEO - IA pode renderizar vídeos
// ============================================================================

aiTools.register({
  name: 'video_export_start',
  description: 'Inicia exportação de vídeo da timeline',
  category: 'video',
  parameters: [
    { name: 'clips', type: 'array', description: 'Array de clips na timeline', required: true },
    { name: 'duration', type: 'number', description: 'Duração total em segundos', required: true },
    { name: 'width', type: 'number', description: 'Largura do vídeo', required: false, default: 1920 },
    { name: 'height', type: 'number', description: 'Altura do vídeo', required: false, default: 1080 },
    { name: 'fps', type: 'number', description: 'Frames por segundo', required: false, default: 30 },
  ],
  returns: 'ID do job de exportação',
  execute: async (params) => {
    if (!engineState.exportPipeline) {
      return { success: false, error: 'Export pipeline not initialized' };
    }
    
    const jobId = await engineState.exportPipeline.exportVideo(
      params.clips as any[],
      params.duration as number,
      {
        width: params.width as number,
        height: params.height as number,
        fps: params.fps as number,
      }
    );
    
    return {
      success: true,
      data: { jobId, status: 'started' },
    };
  },
});

aiTools.register({
  name: 'video_export_status',
  description: 'Verifica status da exportação de vídeo',
  category: 'video',
  parameters: [
    { name: 'jobId', type: 'string', description: 'ID do job de exportação', required: true },
  ],
  returns: 'Status e progresso da exportação',
  execute: async (params) => {
    if (!engineState.exportPipeline) {
      return { success: false, error: 'Export pipeline not initialized' };
    }
    
    const job = engineState.exportPipeline.getJob(params.jobId as string);
    if (!job) {
      return { success: false, error: 'Job not found' };
    }
    
    return {
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentFrame: job.currentFrame,
        totalFrames: job.totalFrames,
        error: job.error,
      },
    };
  },
});

// Integrated workflow tools (extracted)
registerIntegratedWorkflowTools({ aiTools, engineState });

// EXPORT
export { aiTools, engineState, initializeEngineState };
export type { EngineState };

// Lista de todas as ferramentas para referência da IA
export function getAvailableTools(): string[] {
  return aiTools.getAll().map(tool => tool.name);
}

// Obter ferramentas por categoria para UI
export function getToolsByCategory(category: string): AITool[] {
  return aiTools.getByCategory(category as any);
}

// Executar ferramenta pelo nome
export async function executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
  return aiTools.execute(name, params);
}
