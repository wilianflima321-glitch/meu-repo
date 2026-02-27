import type { MaterialNodeDefinition } from './MaterialEditor.types';

const NODE_DEFINITIONS: Record<string, MaterialNodeDefinition> = {
  // OUTPUT
  'material_output': {
    label: 'Material Output',
    type: 'output',
    inputs: [
      { name: 'Albedo', type: 'color' },
      { name: 'Metallic', type: 'float' },
      { name: 'Roughness', type: 'float' },
      { name: 'Normal', type: 'vector3' },
      { name: 'AO', type: 'float' },
      { name: 'Emission', type: 'color' },
      { name: 'Height', type: 'float' },
      { name: 'Opacity', type: 'float' },
    ],
    outputs: [],
    defaultProperties: [],
  },
  
  // CONSTANTS
  'constant_color': {
    label: 'Color',
    type: 'constant',
    inputs: [],
    outputs: [{ name: 'Color', type: 'color' }],
    defaultProperties: [
      { name: 'Color', type: 'color', value: '#ffffff' },
    ],
  },
  'constant_float': {
    label: 'Float',
    type: 'constant',
    inputs: [],
    outputs: [{ name: 'Value', type: 'float' }],
    defaultProperties: [
      { name: 'Value', type: 'float', value: 0.5, min: 0, max: 1 },
    ],
  },
  'constant_vector': {
    label: 'Vector3',
    type: 'constant',
    inputs: [],
    outputs: [{ name: 'Vector', type: 'vector3' }],
    defaultProperties: [
      { name: 'X', type: 'float', value: 0 },
      { name: 'Y', type: 'float', value: 0 },
      { name: 'Z', type: 'float', value: 1 },
    ],
  },
  
  // TEXTURES
  'texture_sample': {
    label: 'Texture Sample',
    type: 'texture',
    inputs: [
      { name: 'UV', type: 'vector2' },
    ],
    outputs: [
      { name: 'RGB', type: 'color' },
      { name: 'R', type: 'float' },
      { name: 'G', type: 'float' },
      { name: 'B', type: 'float' },
      { name: 'A', type: 'float' },
    ],
    defaultProperties: [
      { name: 'Texture', type: 'texture', value: null },
    ],
  },
  'texture_coords': {
    label: 'Texture Coordinates',
    type: 'utility',
    inputs: [],
    outputs: [
      { name: 'UV', type: 'vector2' },
      { name: 'UV2', type: 'vector2' },
    ],
    defaultProperties: [
      { name: 'Tiling X', type: 'float', value: 1 },
      { name: 'Tiling Y', type: 'float', value: 1 },
      { name: 'Offset X', type: 'float', value: 0 },
      { name: 'Offset Y', type: 'float', value: 0 },
    ],
  },
  'normal_map': {
    label: 'Normal Map',
    type: 'texture',
    inputs: [
      { name: 'UV', type: 'vector2' },
    ],
    outputs: [
      { name: 'Normal', type: 'vector3' },
    ],
    defaultProperties: [
      { name: 'Texture', type: 'texture', value: null },
      { name: 'Strength', type: 'float', value: 1, min: 0, max: 2 },
    ],
  },
  
  // MATH
  'math_add': {
    label: 'Add',
    type: 'math',
    inputs: [
      { name: 'A', type: 'float' },
      { name: 'B', type: 'float' },
    ],
    outputs: [{ name: 'Result', type: 'float' }],
    defaultProperties: [],
  },
  'math_multiply': {
    label: 'Multiply',
    type: 'math',
    inputs: [
      { name: 'A', type: 'float' },
      { name: 'B', type: 'float' },
    ],
    outputs: [{ name: 'Result', type: 'float' }],
    defaultProperties: [],
  },
  'math_lerp': {
    label: 'Lerp',
    type: 'math',
    inputs: [
      { name: 'A', type: 'float' },
      { name: 'B', type: 'float' },
      { name: 'T', type: 'float' },
    ],
    outputs: [{ name: 'Result', type: 'float' }],
    defaultProperties: [],
  },
  'math_clamp': {
    label: 'Clamp',
    type: 'math',
    inputs: [
      { name: 'Value', type: 'float' },
      { name: 'Min', type: 'float' },
      { name: 'Max', type: 'float' },
    ],
    outputs: [{ name: 'Result', type: 'float' }],
    defaultProperties: [],
  },
  'math_power': {
    label: 'Power',
    type: 'math',
    inputs: [
      { name: 'Base', type: 'float' },
      { name: 'Exp', type: 'float' },
    ],
    outputs: [{ name: 'Result', type: 'float' }],
    defaultProperties: [],
  },
  'math_one_minus': {
    label: 'One Minus',
    type: 'math',
    inputs: [
      { name: 'Input', type: 'float' },
    ],
    outputs: [{ name: 'Result', type: 'float' }],
    defaultProperties: [],
  },
  
  // COLOR
  'color_blend': {
    label: 'Color Blend',
    type: 'color',
    inputs: [
      { name: 'Base', type: 'color' },
      { name: 'Blend', type: 'color' },
      { name: 'Factor', type: 'float' },
    ],
    outputs: [{ name: 'Result', type: 'color' }],
    defaultProperties: [
      { name: 'Mode', type: 'string' as 'float', value: 'Mix' },
    ],
  },
  'color_hsv': {
    label: 'HSV to RGB',
    type: 'color',
    inputs: [
      { name: 'H', type: 'float' },
      { name: 'S', type: 'float' },
      { name: 'V', type: 'float' },
    ],
    outputs: [{ name: 'RGB', type: 'color' }],
    defaultProperties: [],
  },
  'color_rgb_split': {
    label: 'RGB Split',
    type: 'color',
    inputs: [
      { name: 'Color', type: 'color' },
    ],
    outputs: [
      { name: 'R', type: 'float' },
      { name: 'G', type: 'float' },
      { name: 'B', type: 'float' },
    ],
    defaultProperties: [],
  },
  
  // UTILITY
  'fresnel': {
    label: 'Fresnel',
    type: 'utility',
    inputs: [
      { name: 'Normal', type: 'vector3' },
      { name: 'Power', type: 'float' },
    ],
    outputs: [{ name: 'Factor', type: 'float' }],
    defaultProperties: [
      { name: 'Power', type: 'float', value: 5, min: 0, max: 10 },
    ],
  },
  'noise': {
    label: 'Noise',
    type: 'procedural',
    inputs: [
      { name: 'UV', type: 'vector2' },
    ],
    outputs: [
      { name: 'Value', type: 'float' },
      { name: 'Color', type: 'color' },
    ],
    defaultProperties: [
      { name: 'Scale', type: 'float', value: 10, min: 1, max: 100 },
      { name: 'Detail', type: 'float', value: 2, min: 0, max: 16 },
      { name: 'Type', type: 'string' as 'float', value: 'Perlin' },
    ],
  },
  'voronoi': {
    label: 'Voronoi',
    type: 'procedural',
    inputs: [
      { name: 'UV', type: 'vector2' },
    ],
    outputs: [
      { name: 'Distance', type: 'float' },
      { name: 'Color', type: 'color' },
      { name: 'Position', type: 'vector2' },
    ],
    defaultProperties: [
      { name: 'Scale', type: 'float', value: 5, min: 1, max: 50 },
      { name: 'Randomness', type: 'float', value: 1, min: 0, max: 1 },
    ],
  },
  'gradient': {
    label: 'Gradient',
    type: 'procedural',
    inputs: [
      { name: 'Factor', type: 'float' },
    ],
    outputs: [
      { name: 'Color', type: 'color' },
    ],
    defaultProperties: [
      { name: 'Color A', type: 'color', value: '#000000' },
      { name: 'Color B', type: 'color', value: '#ffffff' },
      { name: 'Type', type: 'string' as 'float', value: 'Linear' },
    ],
  },
};

export { NODE_DEFINITIONS };
