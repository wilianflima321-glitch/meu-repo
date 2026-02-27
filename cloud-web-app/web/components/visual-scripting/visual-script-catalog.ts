/**
 * Visual Scripting node catalog
 */

import type { NodeDefinition } from './visual-script-types';

export const NODE_CATALOG: NodeDefinition[] = [
  // === EVENTOS ===
  {
    type: 'event_start',
    category: 'event',
    label: 'On Start',
    description: 'Executa quando o jogo inicia',
    inputs: [],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#e74c3c',
  },
  {
    type: 'event_update',
    category: 'event',
    label: 'On Update',
    description: 'Executa a cada frame',
    inputs: [],
    outputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'deltaTime', label: 'Delta Time', type: 'number' },
    ],
    color: '#e74c3c',
  },
  {
    type: 'event_collision',
    category: 'event',
    label: 'On Collision',
    description: 'Executa quando há colisão',
    inputs: [],
    outputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'other', label: 'Other Object', type: 'object' },
      { id: 'point', label: 'Point', type: 'vector3' },
    ],
    color: '#e74c3c',
  },
  {
    type: 'event_trigger',
    category: 'event',
    label: 'On Trigger',
    description: 'Executa quando entra em trigger',
    inputs: [],
    outputs: [
      { id: 'enter', label: 'Enter', type: 'exec' },
      { id: 'exit', label: 'Exit', type: 'exec' },
      { id: 'other', label: 'Other', type: 'object' },
    ],
    color: '#e74c3c',
  },

  // === AÇÕES ===
  {
    type: 'action_move',
    category: 'action',
    label: 'Move',
    description: 'Move o objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'direction', label: 'Direction', type: 'vector3' },
      { id: 'speed', label: 'Speed', type: 'number', default: 5 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },
  {
    type: 'action_rotate',
    category: 'action',
    label: 'Rotate',
    description: 'Rotaciona o objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'euler', label: 'Euler Angles', type: 'vector3' },
      { id: 'speed', label: 'Speed', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },
  {
    type: 'action_spawn',
    category: 'action',
    label: 'Spawn Object',
    description: 'Cria um novo objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'prefab', label: 'Prefab', type: 'string' },
      { id: 'position', label: 'Position', type: 'vector3' },
    ],
    outputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'spawned', label: 'Spawned', type: 'object' },
    ],
    color: '#3498db',
  },
  {
    type: 'action_destroy',
    category: 'action',
    label: 'Destroy',
    description: 'Destrói um objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'target', label: 'Target', type: 'object' },
      { id: 'delay', label: 'Delay', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },
  {
    type: 'action_log',
    category: 'action',
    label: 'Print',
    description: 'Imprime mensagem no console',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'message', label: 'Message', type: 'string' },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },

  // === FLOW CONTROL (Unreal-Style) ===
  {
    type: 'flow_branch',
    category: 'flow',
    label: 'Branch',
    description: 'If/Else condicional',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'condition', label: 'Condition', type: 'boolean' },
    ],
    outputs: [
      { id: 'true', label: 'True', type: 'exec' },
      { id: 'false', label: 'False', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_sequence',
    category: 'flow',
    label: 'Sequence',
    description: 'Executa múltiplas saídas em sequência',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
    ],
    outputs: [
      { id: 'then_0', label: 'Then 0', type: 'exec' },
      { id: 'then_1', label: 'Then 1', type: 'exec' },
      { id: 'then_2', label: 'Then 2', type: 'exec' },
      { id: 'then_3', label: 'Then 3', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_for_loop',
    category: 'flow',
    label: 'For Loop',
    description: 'Loop com índice de iteração',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'first', label: 'First Index', type: 'number', default: 0 },
      { id: 'last', label: 'Last Index', type: 'number', default: 10 },
    ],
    outputs: [
      { id: 'loop', label: 'Loop Body', type: 'exec' },
      { id: 'index', label: 'Index', type: 'number' },
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_for_each',
    category: 'flow',
    label: 'For Each',
    description: 'Loop sobre elementos de array',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'array', label: 'Array', type: 'any' },
    ],
    outputs: [
      { id: 'loop', label: 'Loop Body', type: 'exec' },
      { id: 'element', label: 'Element', type: 'any' },
      { id: 'index', label: 'Index', type: 'number' },
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_while',
    category: 'flow',
    label: 'While Loop',
    description: 'Executa enquanto condição for verdadeira',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'condition', label: 'Condition', type: 'boolean' },
    ],
    outputs: [
      { id: 'loop', label: 'Loop Body', type: 'exec' },
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_do_once',
    category: 'flow',
    label: 'Do Once',
    description: 'Executa apenas uma vez até ser resetado',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'reset', label: 'Reset', type: 'exec' },
    ],
    outputs: [
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_do_n',
    category: 'flow',
    label: 'Do N',
    description: 'Executa N vezes, depois para',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'n', label: 'N', type: 'number', default: 3 },
      { id: 'reset', label: 'Reset', type: 'exec' },
    ],
    outputs: [
      { id: 'exit', label: 'Exit', type: 'exec' },
      { id: 'counter', label: 'Counter', type: 'number' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_gate',
    category: 'flow',
    label: 'Gate',
    description: 'Portão que pode ser aberto/fechado',
    inputs: [
      { id: 'exec', label: 'Enter', type: 'exec' },
      { id: 'open', label: 'Open', type: 'exec' },
      { id: 'close', label: 'Close', type: 'exec' },
      { id: 'toggle', label: 'Toggle', type: 'exec' },
    ],
    outputs: [
      { id: 'exit', label: 'Exit', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_flip_flop',
    category: 'flow',
    label: 'Flip Flop',
    description: 'Alterna entre duas saídas',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
    ],
    outputs: [
      { id: 'a', label: 'A', type: 'exec' },
      { id: 'b', label: 'B', type: 'exec' },
      { id: 'is_a', label: 'Is A', type: 'boolean' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_delay',
    category: 'flow',
    label: 'Delay',
    description: 'Aguarda tempo antes de continuar',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'duration', label: 'Duration (s)', type: 'number', default: 1 },
    ],
    outputs: [
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_retriggerable_delay',
    category: 'flow',
    label: 'Retriggerable Delay',
    description: 'Delay que reseta ao receber nova entrada',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'duration', label: 'Duration (s)', type: 'number', default: 1 },
    ],
    outputs: [
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_multi_gate',
    category: 'flow',
    label: 'Multi Gate',
    description: 'Distribui execução entre múltiplas saídas',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'reset', label: 'Reset', type: 'exec' },
      { id: 'loop', label: 'Loop', type: 'boolean', default: false },
      { id: 'random', label: 'Random', type: 'boolean', default: false },
    ],
    outputs: [
      { id: 'out_0', label: 'Out 0', type: 'exec' },
      { id: 'out_1', label: 'Out 1', type: 'exec' },
      { id: 'out_2', label: 'Out 2', type: 'exec' },
      { id: 'out_3', label: 'Out 3', type: 'exec' },
    ],
    color: '#9b59b6',
  },

  // === CONDIÇÕES ===
  {
    type: 'condition_compare',
    category: 'condition',
    label: 'Compare',
    description: 'Compara dois valores',
    inputs: [
      { id: 'a', label: 'A', type: 'number' },
      { id: 'b', label: 'B', type: 'number' },
    ],
    outputs: [
      { id: 'equal', label: 'A == B', type: 'boolean' },
      { id: 'greater', label: 'A > B', type: 'boolean' },
      { id: 'less', label: 'A < B', type: 'boolean' },
    ],
    color: '#f39c12',
  },

  // === MATEMÁTICA ===
  {
    type: 'math_add',
    category: 'math',
    label: 'Add',
    description: 'Soma dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 0 },
      { id: 'b', label: 'B', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_subtract',
    category: 'math',
    label: 'Subtract',
    description: 'Subtrai dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 0 },
      { id: 'b', label: 'B', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_multiply',
    category: 'math',
    label: 'Multiply',
    description: 'Multiplica dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 1 },
      { id: 'b', label: 'B', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_divide',
    category: 'math',
    label: 'Divide',
    description: 'Divide dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 1 },
      { id: 'b', label: 'B', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_vector3',
    category: 'math',
    label: 'Make Vector3',
    description: 'Cria um Vector3',
    inputs: [
      { id: 'x', label: 'X', type: 'number', default: 0 },
      { id: 'y', label: 'Y', type: 'number', default: 0 },
      { id: 'z', label: 'Z', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'vector', label: 'Vector', type: 'vector3' }],
    color: '#27ae60',
  },
  {
    type: 'math_break_vector3',
    category: 'math',
    label: 'Break Vector3',
    description: 'Separa componentes de um Vector3',
    inputs: [{ id: 'vector', label: 'Vector', type: 'vector3' }],
    outputs: [
      { id: 'x', label: 'X', type: 'number' },
      { id: 'y', label: 'Y', type: 'number' },
      { id: 'z', label: 'Z', type: 'number' },
    ],
    color: '#27ae60',
  },
  {
    type: 'math_random',
    category: 'math',
    label: 'Random',
    description: 'Gera número aleatório',
    inputs: [
      { id: 'min', label: 'Min', type: 'number', default: 0 },
      { id: 'max', label: 'Max', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
    color: '#27ae60',
  },

  // === INPUT ===
  {
    type: 'input_key',
    category: 'input',
    label: 'Get Key',
    description: 'Verifica se tecla está pressionada',
    inputs: [{ id: 'key', label: 'Key', type: 'string', default: 'Space' }],
    outputs: [
      { id: 'pressed', label: 'Pressed', type: 'boolean' },
      { id: 'just_pressed', label: 'Just Pressed', type: 'boolean' },
      { id: 'just_released', label: 'Just Released', type: 'boolean' },
    ],
    color: '#e67e22',
  },
  {
    type: 'input_axis',
    category: 'input',
    label: 'Get Axis',
    description: 'Obtém valor de eixo de input',
    inputs: [{ id: 'axis', label: 'Axis', type: 'string', default: 'Horizontal' }],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
    color: '#e67e22',
  },
  {
    type: 'input_mouse',
    category: 'input',
    label: 'Get Mouse',
    description: 'Obtém posição do mouse',
    inputs: [],
    outputs: [
      { id: 'position', label: 'Screen Pos', type: 'vector3' },
      { id: 'delta', label: 'Delta', type: 'vector3' },
      { id: 'left', label: 'Left Button', type: 'boolean' },
      { id: 'right', label: 'Right Button', type: 'boolean' },
    ],
    color: '#e67e22',
  },

  // === PHYSICS ===
  {
    type: 'physics_raycast',
    category: 'physics',
    label: 'Raycast',
    description: 'Lança raio e detecta colisão',
    inputs: [
      { id: 'origin', label: 'Origin', type: 'vector3' },
      { id: 'direction', label: 'Direction', type: 'vector3' },
      { id: 'distance', label: 'Distance', type: 'number', default: 100 },
    ],
    outputs: [
      { id: 'hit', label: 'Hit', type: 'boolean' },
      { id: 'point', label: 'Point', type: 'vector3' },
      { id: 'normal', label: 'Normal', type: 'vector3' },
      { id: 'object', label: 'Object', type: 'object' },
    ],
    color: '#1abc9c',
  },
  {
    type: 'physics_add_force',
    category: 'physics',
    label: 'Add Force',
    description: 'Adiciona força a um objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'target', label: 'Target', type: 'object' },
      { id: 'force', label: 'Force', type: 'vector3' },
      { id: 'impulse', label: 'Impulse', type: 'boolean', default: false },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#1abc9c',
  },

  // === AUDIO ===
  {
    type: 'audio_play',
    category: 'audio',
    label: 'Play Sound',
    description: 'Toca um som',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'sound', label: 'Sound', type: 'string' },
      { id: 'volume', label: 'Volume', type: 'number', default: 1 },
      { id: 'loop', label: 'Loop', type: 'boolean', default: false },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#9b59b6',
  },

  // === FLOW ===
  {
    type: 'flow_sequence',
    category: 'flow',
    label: 'Sequence',
    description: 'Executa em sequência',
    inputs: [{ id: 'exec', label: '', type: 'exec' }],
    outputs: [
      { id: 'then_0', label: 'Then 0', type: 'exec' },
      { id: 'then_1', label: 'Then 1', type: 'exec' },
      { id: 'then_2', label: 'Then 2', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_delay',
    category: 'flow',
    label: 'Delay',
    description: 'Aguarda tempo antes de continuar',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'duration', label: 'Duration', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#9b59b6',
  },
  {
    type: 'flow_loop',
    category: 'flow',
    label: 'For Loop',
    description: 'Loop com contador',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'start', label: 'Start', type: 'number', default: 0 },
      { id: 'end', label: 'End', type: 'number', default: 10 },
    ],
    outputs: [
      { id: 'body', label: 'Loop Body', type: 'exec' },
      { id: 'index', label: 'Index', type: 'number' },
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },

  // === VARIÁVEIS ===
  {
    type: 'variable_get',
    category: 'variable',
    label: 'Get Variable',
    description: 'Obtém valor de variável',
    inputs: [{ id: 'name', label: 'Name', type: 'string' }],
    outputs: [{ id: 'value', label: 'Value', type: 'any' }],
    color: '#2ecc71',
  },
  {
    type: 'variable_set',
    category: 'variable',
    label: 'Set Variable',
    description: 'Define valor de variável',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'name', label: 'Name', type: 'string' },
      { id: 'value', label: 'Value', type: 'any' },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#2ecc71',
  },
];

// ============================================================================
// COMPONENTES DE NÓS CUSTOMIZADOS
// ============================================================================

const portColors: Record<string, string> = {
  exec: '#ffffff',
  boolean: '#e74c3c',
  number: '#27ae60',
  string: '#f39c12',
  vector3: '#9b59b6',
  object: '#3498db',
  any: '#95a5a6',
};

