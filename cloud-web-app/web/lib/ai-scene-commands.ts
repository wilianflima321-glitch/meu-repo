/**
 * AI Scene Commands - Comandos de IA para Manipulação de Cena
 * 
 * Conecta o AI Command Center ao Scene Editor.
 * Permite que a IA execute comandos diretamente na cena 3D.
 */

import { SceneObject, sceneIntegration } from './asset-drag-drop';

// ============================================================================
// TYPES
// ============================================================================

export interface SceneCommand {
  type: SceneCommandType;
  params: Record<string, unknown>;
}

export type SceneCommandType =
  | 'ADD_OBJECT'
  | 'REMOVE_OBJECT'
  | 'TRANSFORM_OBJECT'
  | 'SET_MATERIAL'
  | 'CREATE_LIGHT'
  | 'SET_CAMERA'
  | 'GROUP_OBJECTS'
  | 'DUPLICATE_OBJECT'
  | 'SELECT_OBJECT'
  | 'FOCUS_OBJECT'
  | 'CLEAR_SCENE'
  | 'LOAD_PREFAB'
  | 'CREATE_BLUEPRINT';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  objectId?: string;
}

// ============================================================================
// PRIMITIVE GEOMETRIES
// ============================================================================

export const PRIMITIVE_GEOMETRIES = {
  cube: { type: 'BoxGeometry', args: [1, 1, 1] },
  sphere: { type: 'SphereGeometry', args: [0.5, 32, 16] },
  cylinder: { type: 'CylinderGeometry', args: [0.5, 0.5, 1, 32] },
  cone: { type: 'ConeGeometry', args: [0.5, 1, 32] },
  plane: { type: 'PlaneGeometry', args: [1, 1] },
  torus: { type: 'TorusGeometry', args: [0.5, 0.2, 16, 32] },
  capsule: { type: 'CapsuleGeometry', args: [0.25, 0.5, 4, 8] },
  ring: { type: 'RingGeometry', args: [0.3, 0.5, 32] },
};

export const MATERIAL_COLORS: Record<string, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  white: '#ffffff',
  black: '#1a1a1a',
  gray: '#6b7280',
  gold: '#fbbf24',
  silver: '#94a3b8',
};

export const LIGHT_TYPES = {
  point: { type: 'PointLight', intensity: 1, distance: 10 },
  directional: { type: 'DirectionalLight', intensity: 1 },
  spot: { type: 'SpotLight', intensity: 1, distance: 10, angle: 0.5 },
  ambient: { type: 'AmbientLight', intensity: 0.5 },
  hemisphere: { type: 'HemisphereLight', intensity: 0.5 },
};

// ============================================================================
// COMMAND PARSER - Interpreta comandos em linguagem natural
// ============================================================================

export class CommandParser {
  /**
   * Parse comando em linguagem natural para SceneCommand
   */
  static parse(input: string): SceneCommand | null {
    const lower = input.toLowerCase().trim();

    // ADD OBJECT patterns
    if (this.matchesPattern(lower, ['crie', 'criar', 'adicione', 'adicionar', 'add', 'create'])) {
      return this.parseAddCommand(lower);
    }

    // REMOVE patterns
    if (this.matchesPattern(lower, ['remova', 'remover', 'delete', 'deletar', 'apague', 'apagar'])) {
      return this.parseRemoveCommand(lower);
    }

    // TRANSFORM patterns
    if (this.matchesPattern(lower, ['mova', 'mover', 'move', 'posicione', 'posicionar'])) {
      return this.parseTransformCommand(lower, 'position');
    }

    if (this.matchesPattern(lower, ['rotacione', 'rotacionar', 'rotate', 'gire', 'girar'])) {
      return this.parseTransformCommand(lower, 'rotation');
    }

    if (this.matchesPattern(lower, ['escale', 'escalar', 'scale', 'redimensione'])) {
      return this.parseTransformCommand(lower, 'scale');
    }

    // LIGHT patterns
    if (this.matchesPattern(lower, ['luz', 'light', 'iluminação'])) {
      return this.parseLightCommand(lower);
    }

    // CLEAR pattern
    if (this.matchesPattern(lower, ['limpe', 'limpar', 'clear', 'reset'])) {
      return { type: 'CLEAR_SCENE', params: {} };
    }

    // DUPLICATE pattern
    if (this.matchesPattern(lower, ['duplique', 'duplicar', 'duplicate', 'clone', 'clonar'])) {
      return this.parseDuplicateCommand(lower);
    }

    return null;
  }

  private static matchesPattern(input: string, patterns: string[]): boolean {
    return patterns.some(p => input.includes(p));
  }

  private static parseAddCommand(input: string): SceneCommand {
    // Detectar geometria
    let geometry = 'cube';
    for (const geo of Object.keys(PRIMITIVE_GEOMETRIES)) {
      const ptBr = this.getPortugueseGeometry(geo);
      if (input.includes(geo) || input.includes(ptBr)) {
        geometry = geo;
        break;
      }
    }

    // Detectar cor
    let color = '#3b82f6'; // default blue
    for (const [name, hex] of Object.entries(MATERIAL_COLORS)) {
      const ptBr = this.getPortugueseColor(name);
      if (input.includes(name) || input.includes(ptBr)) {
        color = hex;
        break;
      }
    }

    // Detectar posição
    const position = this.extractPosition(input);

    // Detectar nome
    const name = this.extractName(input) || `${geometry}_${Date.now()}`;

    return {
      type: 'ADD_OBJECT',
      params: {
        geometry,
        color,
        position,
        name,
      },
    };
  }

  private static parseRemoveCommand(input: string): SceneCommand {
    const name = this.extractName(input);
    return {
      type: 'REMOVE_OBJECT',
      params: { name },
    };
  }

  private static parseTransformCommand(input: string, transformType: string): SceneCommand {
    const name = this.extractName(input);
    const value = this.extractVector(input);
    
    return {
      type: 'TRANSFORM_OBJECT',
      params: {
        name,
        transformType,
        value,
      },
    };
  }

  private static parseLightCommand(input: string): SceneCommand {
    let lightType = 'point';
    for (const lt of Object.keys(LIGHT_TYPES)) {
      if (input.includes(lt)) {
        lightType = lt;
        break;
      }
    }

    // Detectar cor
    let color = '#ffffff';
    for (const [name, hex] of Object.entries(MATERIAL_COLORS)) {
      const ptBr = this.getPortugueseColor(name);
      if (input.includes(name) || input.includes(ptBr)) {
        color = hex;
        break;
      }
    }

    const position = this.extractPosition(input);

    return {
      type: 'CREATE_LIGHT',
      params: {
        lightType,
        color,
        position,
      },
    };
  }

  private static parseDuplicateCommand(input: string): SceneCommand {
    const name = this.extractName(input);
    return {
      type: 'DUPLICATE_OBJECT',
      params: { name },
    };
  }

  private static extractPosition(input: string): { x: number; y: number; z: number } {
    // Padrão: "em (x, y, z)" ou "at x,y,z" ou "posição x y z"
    const patterns = [
      /em\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i,
      /at\s*([-\d.]+)\s*,?\s*([-\d.]+)\s*,?\s*([-\d.]+)/i,
      /posição\s*([-\d.]+)\s*,?\s*([-\d.]+)\s*,?\s*([-\d.]+)/i,
      /position\s*([-\d.]+)\s*,?\s*([-\d.]+)\s*,?\s*([-\d.]+)/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          x: parseFloat(match[1]) || 0,
          y: parseFloat(match[2]) || 0,
          z: parseFloat(match[3]) || 0,
        };
      }
    }

    return { x: 0, y: 0, z: 0 };
  }

  private static extractVector(input: string): { x: number; y: number; z: number } {
    return this.extractPosition(input);
  }

  private static extractName(input: string): string | undefined {
    // Padrão: "chamado X" ou "nome X" ou 'X' ou "X"
    const patterns = [
      /chamado\s+["']?(\w+)["']?/i,
      /nome\s+["']?(\w+)["']?/i,
      /named\s+["']?(\w+)["']?/i,
      /["'](\w+)["']/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private static getPortugueseGeometry(eng: string): string {
    const map: Record<string, string> = {
      cube: 'cubo',
      sphere: 'esfera',
      cylinder: 'cilindro',
      cone: 'cone',
      plane: 'plano',
      torus: 'torus',
      capsule: 'cápsula',
      ring: 'anel',
    };
    return map[eng] || eng;
  }

  private static getPortugueseColor(eng: string): string {
    const map: Record<string, string> = {
      red: 'vermelho',
      green: 'verde',
      blue: 'azul',
      yellow: 'amarelo',
      orange: 'laranja',
      purple: 'roxo',
      pink: 'rosa',
      cyan: 'ciano',
      white: 'branco',
      black: 'preto',
      gray: 'cinza',
      gold: 'dourado',
      silver: 'prateado',
    };
    return map[eng] || eng;
  }
}

// ============================================================================
// COMMAND EXECUTOR - Executa comandos na cena
// ============================================================================

export class SceneCommandExecutor {
  private listeners: Set<(result: CommandResult, command: SceneCommand) => void> = new Set();

  /**
   * Executa um comando na cena
   */
  execute(command: SceneCommand): CommandResult {
    let result: CommandResult;

    switch (command.type) {
      case 'ADD_OBJECT':
        result = this.addObject(command.params);
        break;
      case 'REMOVE_OBJECT':
        result = this.removeObject(command.params);
        break;
      case 'TRANSFORM_OBJECT':
        result = this.transformObject(command.params);
        break;
      case 'CREATE_LIGHT':
        result = this.createLight(command.params);
        break;
      case 'DUPLICATE_OBJECT':
        result = this.duplicateObject(command.params);
        break;
      case 'CLEAR_SCENE':
        result = this.clearScene();
        break;
      default:
        result = { success: false, message: `Unknown command type: ${command.type}` };
    }

    // Notificar listeners
    this.listeners.forEach(cb => cb(result, command));

    return result;
  }

  /**
   * Executa comando a partir de texto em linguagem natural
   */
  executeFromText(input: string): CommandResult {
    const command = CommandParser.parse(input);
    
    if (!command) {
      return {
        success: false,
        message: `Não entendi o comando: "${input}". Tente algo como "Crie um cubo vermelho" ou "Adicione uma esfera azul em (0, 1, 0)".`,
      };
    }

    return this.execute(command);
  }

  /**
   * Subscribe para notificações de execução
   */
  subscribe(callback: (result: CommandResult, command: SceneCommand) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Command implementations
  private addObject(params: Record<string, unknown>): CommandResult {
    const { geometry, color, position, name } = params as {
      geometry: string;
      color: string;
      position: { x: number; y: number; z: number };
      name: string;
    };

    const geoConfig = PRIMITIVE_GEOMETRIES[geometry as keyof typeof PRIMITIVE_GEOMETRIES];
    if (!geoConfig) {
      return { success: false, message: `Unknown geometry: ${geometry}` };
    }

    const obj: SceneObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name,
      type: 'mesh',
      position: position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      metadata: {
        geometry: geoConfig.type,
        geometryArgs: geoConfig.args,
        materialColor: color,
        createdByAI: true,
        createdAt: new Date().toISOString(),
      },
    };

    sceneIntegration.addObject(obj);

    return {
      success: true,
      message: `✅ Criado: ${name} (${geometry}) na posição (${position.x}, ${position.y}, ${position.z})`,
      objectId: obj.id,
      data: obj,
    };
  }

  private removeObject(params: Record<string, unknown>): CommandResult {
    const { name } = params as { name?: string };
    
    if (!name) {
      return { success: false, message: 'Nome do objeto não especificado.' };
    }

    const objects = sceneIntegration.getObjects();
    const obj = objects.find(o => o.name.toLowerCase() === name.toLowerCase());

    if (!obj) {
      return { success: false, message: `Objeto "${name}" não encontrado na cena.` };
    }

    sceneIntegration.removeObject(obj.id);

    return {
      success: true,
      message: `✅ Removido: ${obj.name}`,
      objectId: obj.id,
    };
  }

  private transformObject(params: Record<string, unknown>): CommandResult {
    const { name, transformType, value } = params as {
      name?: string;
      transformType: 'position' | 'rotation' | 'scale';
      value: { x: number; y: number; z: number };
    };

    if (!name) {
      return { success: false, message: 'Nome do objeto não especificado.' };
    }

    const objects = sceneIntegration.getObjects();
    const obj = objects.find(o => o.name.toLowerCase() === name.toLowerCase());

    if (!obj) {
      return { success: false, message: `Objeto "${name}" não encontrado.` };
    }

    const update: Partial<SceneObject> = {};
    update[transformType] = value;

    sceneIntegration.updateObject(obj.id, update);

    return {
      success: true,
      message: `✅ ${transformType} de "${name}" atualizado para (${value.x}, ${value.y}, ${value.z})`,
      objectId: obj.id,
    };
  }

  private createLight(params: Record<string, unknown>): CommandResult {
    const { lightType, color, position } = params as {
      lightType: string;
      color: string;
      position: { x: number; y: number; z: number };
    };

    const lightConfig = LIGHT_TYPES[lightType as keyof typeof LIGHT_TYPES];
    if (!lightConfig) {
      return { success: false, message: `Unknown light type: ${lightType}` };
    }

    const obj: SceneObject = {
      id: `light_${Date.now()}`,
      name: `Light_${lightType}_${Date.now()}`,
      type: 'light',
      position: position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      metadata: {
        lightType: lightConfig.type,
        color,
        intensity: lightConfig.intensity,
        createdByAI: true,
      },
    };

    sceneIntegration.addObject(obj);

    return {
      success: true,
      message: `✅ Luz ${lightType} criada na posição (${position.x}, ${position.y}, ${position.z})`,
      objectId: obj.id,
      data: obj,
    };
  }

  private duplicateObject(params: Record<string, unknown>): CommandResult {
    const { name } = params as { name?: string };

    if (!name) {
      return { success: false, message: 'Nome do objeto não especificado.' };
    }

    const objects = sceneIntegration.getObjects();
    const obj = objects.find(o => o.name.toLowerCase() === name.toLowerCase());

    if (!obj) {
      return { success: false, message: `Objeto "${name}" não encontrado.` };
    }

    const newObj: SceneObject = {
      ...obj,
      id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${obj.name}_copy`,
      position: {
        x: obj.position.x + 1,
        y: obj.position.y,
        z: obj.position.z,
      },
    };

    sceneIntegration.addObject(newObj);

    return {
      success: true,
      message: `✅ Duplicado: ${obj.name} → ${newObj.name}`,
      objectId: newObj.id,
      data: newObj,
    };
  }

  private clearScene(): CommandResult {
    const count = sceneIntegration.getObjects().length;
    sceneIntegration.clear();

    return {
      success: true,
      message: `✅ Cena limpa. ${count} objeto(s) removido(s).`,
    };
  }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

export const sceneCommandExecutor = new SceneCommandExecutor();

export function executeAISceneCommand(input: string): CommandResult {
  return sceneCommandExecutor.executeFromText(input);
}
