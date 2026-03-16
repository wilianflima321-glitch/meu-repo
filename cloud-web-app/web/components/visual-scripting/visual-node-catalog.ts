export type NodeCategory = 
  | 'event'     // Eventos (OnStart, OnUpdate, etc.)
  | 'action'    // Acoes (Move, Jump, Spawn, etc.)
  | 'condition' // Condicoes (If, Compare, etc.)
  | 'variable'  // Variaveis (Get, Set)
  | 'math'      // Matematica (Add, Multiply, etc.)
  | 'flow'      // Controle de fluxo (Branch, Loop, etc.)
  | 'input'     // Input do jogador
  | 'physics'   // Fisica (Raycast, Force, etc.)
  | 'audio'     // Audio (Play Sound, etc.)
  | 'ui';       // Interface do usuario

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  color: string;
  icon?: string;
}

export interface PortDefinition {
  id: string;
  label: string;
  type: 'exec' | 'boolean' | 'number' | 'string' | 'vector3' | 'object' | 'any';
  default?: unknown;
}

export interface VisualNodeData extends Record<string, unknown> {
	definition: NodeDefinition;
	values?: Record<string, unknown>;
	onValueChange?: (portId: string, value: unknown) => void;
}


// ============================================================================
// CATALOGO DE NOS
// ============================================================================

export const NODE_CATALOG: NodeDefinition[] = [
  // === EVENTOS ===
  {
    type: 'event_start',
    category: 'event',
    label: 'On Start',
    description: 'Executa quando o jogo inicia',
    inputs: [],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: 'var(--aethel-error)',
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
    color: 'var(--aethel-error)',
  },
  {
    type: 'event_collision',
    category: 'event',
    label: 'On Collision',
    description: 'Executa quando ha colisao',
    inputs: [],
    outputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'other', label: 'Other Object', type: 'object' },
      { id: 'point', label: 'Point', type: 'vector3' },
    ],
    color: 'var(--aethel-error)',
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
    color: 'var(--aethel-error)',
  },

  // === ACOES ===
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
    color: 'var(--aethel-primary)',
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
    color: 'var(--aethel-primary)',
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
    color: 'var(--aethel-primary)',
  },
  {
    type: 'action_destroy',
    category: 'action',
    label: 'Destroy',
    description: 'Destroi um objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'target', label: 'Target', type: 'object' },
      { id: 'delay', label: 'Delay', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: 'var(--aethel-primary)',
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
    color: 'var(--aethel-primary)',
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
    color: 'var(--aethel-accent)',
  },
  {
    type: 'flow_sequence',
    category: 'flow',
    label: 'Sequence',
    description: 'Executa multiplas saidas em sequencia',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
    ],
    outputs: [
      { id: 'then_0', label: 'Then 0', type: 'exec' },
      { id: 'then_1', label: 'Then 1', type: 'exec' },
      { id: 'then_2', label: 'Then 2', type: 'exec' },
      { id: 'then_3', label: 'Then 3', type: 'exec' },
    ],
    color: 'var(--aethel-accent)',
  },
  {
    type: 'flow_for_loop',
    category: 'flow',
    label: 'For Loop',
    description: 'Loop com indice de iteracao',
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
    color: 'var(--aethel-accent)',
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
    color: 'var(--aethel-accent)',
  },
  {
    type: 'flow_while',
    category: 'flow',
    label: 'While Loop',
    description: 'Executa enquanto condicao for verdadeira',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'condition', label: 'Condition', type: 'boolean' },
    ],
    outputs: [
      { id: 'loop', label: 'Loop Body', type: 'exec' },
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: 'var(--aethel-accent)',
  },
  {
    type: 'flow_do_once',
    category: 'flow',
    label: 'Do Once',
    description: 'Executa apenas uma vez ate ser resetado',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'reset', label: 'Reset', type: 'exec' },
    ],
    outputs: [
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: 'var(--aethel-accent)',
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
    color: 'var(--aethel-accent)',
  },
  {
    type: 'flow_gate',
    category: 'flow',
    label: 'Gate',
    description: 'Portao que pode ser aberto/fechado',
    inputs: [
      { id: 'exec', label: 'Enter', type: 'exec' },
      { id: 'open', label: 'Open', type: 'exec' },
      { id: 'close', label: 'Close', type: 'exec' },
      { id: 'toggle', label: 'Toggle', type: 'exec' },
    ],
    outputs: [
      { id: 'exit', label: 'Exit', type: 'exec' },
    ],
    color: 'var(--aethel-accent)',
  },
  {
    type: 'flow_flip_flop',
    category: 'flow',
    label: 'Flip Flop',
    description: 'Alterna entre duas saidas',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
    ],
    outputs: [
      { id: 'a', label: 'A', type: 'exec' },
      { id: 'b', label: 'B', type: 'exec' },
      { id: 'is_a', label: 'Is A', type: 'boolean' },
    ],
    color: 'var(--aethel-accent)',
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
    color: 'var(--aethel-accent)',
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
    color: 'var(--aethel-accent)',
  },
  {
    type: 'flow_multi_gate',
    category: 'flow',
    label: 'Multi Gate',
    description: 'Distribui execucao entre multiplas saidas',
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
    color: 'var(--aethel-accent)',
  },

  // === CONDICOES ===
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
    color: 'var(--aethel-warning)',
  },

  // === MATEMATICA ===
  {
    type: 'math_add',
    category: 'math',
    label: 'Add',
    description: 'Soma dois numeros',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 0 },
      { id: 'b', label: 'B', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: 'var(--aethel-success)',
  },
  {
    type: 'math_subtract',
    category: 'math',
    label: 'Subtract',
    description: 'Subtrai dois numeros',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 0 },
      { id: 'b', label: 'B', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: 'var(--aethel-success)',
  },
  {
    type: 'math_multiply',
    category: 'math',
    label: 'Multiply',
    description: 'Multiplica dois numeros',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 1 },
      { id: 'b', label: 'B', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: 'var(--aethel-success)',
  },
  {
    type: 'math_divide',
    category: 'math',
    label: 'Divide',
    description: 'Divide dois numeros',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 1 },
      { id: 'b', label: 'B', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: 'var(--aethel-success)',
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
    color: 'var(--aethel-success)',
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
    color: 'var(--aethel-success)',
  },
  {
    type: 'math_random',
    category: 'math',
    label: 'Random',
    description: 'Gera numero aleatorio',
    inputs: [
      { id: 'min', label: 'Min', type: 'number', default: 0 },
      { id: 'max', label: 'Max', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
    color: 'var(--aethel-success)',
  },

  // === INPUT ===
  {
    type: 'input_key',
    category: 'input',
    label: 'Get Key',
    description: 'Verifica se tecla esta pressionada',
    inputs: [{ id: 'key', label: 'Key', type: 'string', default: 'Space' }],
    outputs: [
      { id: 'pressed', label: 'Pressed', type: 'boolean' },
      { id: 'just_pressed', label: 'Just Pressed', type: 'boolean' },
      { id: 'just_released', label: 'Just Released', type: 'boolean' },
    ],
    color: 'var(--aethel-warning)',
  },
  {
    type: 'input_axis',
    category: 'input',
    label: 'Get Axis',
    description: 'Obtem valor de eixo de input',
    inputs: [{ id: 'axis', label: 'Axis', type: 'string', default: 'Horizontal' }],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
    color: 'var(--aethel-warning)',
  },
  {
    type: 'input_mouse',
    category: 'input',
    label: 'Get Mouse',
    description: 'Obtem posicao do mouse',
    inputs: [],
    outputs: [
      { id: 'position', label: 'Screen Pos', type: 'vector3' },
      { id: 'delta', label: 'Delta', type: 'vector3' },
      { id: 'left', label: 'Left Button', type: 'boolean' },
      { id: 'right', label: 'Right Button', type: 'boolean' },
    ],
    color: 'var(--aethel-warning)',
  },

  // === PHYSICS ===
  {
    type: 'physics_raycast',
    category: 'physics',
    label: 'Raycast',
    description: 'Lanca raio e detecta colisao',
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
    color: 'var(--aethel-info)',
  },
  {
    type: 'physics_add_force',
    category: 'physics',
    label: 'Add Force',
    description: 'Adiciona forca a um objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'target', label: 'Target', type: 'object' },
      { id: 'force', label: 'Force', type: 'vector3' },
      { id: 'impulse', label: 'Impulse', type: 'boolean', default: false },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: 'var(--aethel-info)',
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
    color: 'var(--aethel-accent)',
  },

  // === FLOW ===
  {
    type: 'flow_sequence',
    category: 'flow',
    label: 'Sequence',
    description: 'Executa em sequencia',
    inputs: [{ id: 'exec', label: '', type: 'exec' }],
    outputs: [
      { id: 'then_0', label: 'Then 0', type: 'exec' },
      { id: 'then_1', label: 'Then 1', type: 'exec' },
      { id: 'then_2', label: 'Then 2', type: 'exec' },
    ],
    color: 'var(--aethel-accent)',
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
    color: 'var(--aethel-accent)',
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
    color: 'var(--aethel-accent)',
  },

  // === VARIAVEIS ===
  {
    type: 'variable_get',
    category: 'variable',
    label: 'Get Variable',
    description: 'Obtem valor de variavel',
    inputs: [{ id: 'name', label: 'Name', type: 'string' }],
    outputs: [{ id: 'value', label: 'Value', type: 'any' }],
    color: 'var(--aethel-success)',
  },
  {
    type: 'variable_set',
    category: 'variable',
    label: 'Set Variable',
    description: 'Define valor de variavel',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'name', label: 'Name', type: 'string' },
      { id: 'value', label: 'Value', type: 'any' },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: 'var(--aethel-success)',
  },
];
