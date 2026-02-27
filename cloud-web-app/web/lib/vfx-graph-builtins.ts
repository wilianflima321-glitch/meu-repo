import type { VFXNodeDefinition } from './vfx-graph-editor';

export function registerBuiltinVFXNodes(register: (definition: VFXNodeDefinition) => void): void {

// Spawn Context
register({
  type: 'spawn_burst',
  category: 'Spawn',
  title: 'Spawn Burst',
  description: 'Spawn particles in a burst',
  inputs: [
    { name: 'Count', type: 'int', value: 100 },
    { name: 'Delay', type: 'float', value: 0 }
  ],
  outputs: [
    { name: 'SpawnEvent', type: 'float' }
  ],
  compute: (inputs) => ({ SpawnEvent: inputs.Count })
});

register({
  type: 'spawn_rate',
  category: 'Spawn',
  title: 'Spawn Rate',
  description: 'Spawn particles over time',
  inputs: [
    { name: 'Rate', type: 'float', value: 10 }
  ],
  outputs: [
    { name: 'SpawnEvent', type: 'float' }
  ],
  compute: (inputs, ctx) => ({ SpawnEvent: inputs.Rate * ctx.deltaTime })
});

// Position
register({
  type: 'position_sphere',
  category: 'Position',
  title: 'Position Sphere',
  description: 'Set position on sphere surface',
  inputs: [
    { name: 'Center', type: 'float3', value: [0, 0, 0] },
    { name: 'Radius', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Position', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const theta = ctx.random() * Math.PI * 2;
    const phi = Math.acos(2 * ctx.random() - 1);
    const r = inputs.Radius;
    return {
      Position: [
        inputs.Center[0] + r * Math.sin(phi) * Math.cos(theta),
        inputs.Center[1] + r * Math.sin(phi) * Math.sin(theta),
        inputs.Center[2] + r * Math.cos(phi)
      ]
    };
  },
  glsl: `
    float theta = random() * 6.28318;
    float phi = acos(2.0 * random() - 1.0);
    float r = uRadius;
    vec3 position = uCenter + r * vec3(sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi));
  `
});

register({
  type: 'position_box',
  category: 'Position',
  title: 'Position Box',
  description: 'Set position within box',
  inputs: [
    { name: 'Center', type: 'float3', value: [0, 0, 0] },
    { name: 'Size', type: 'float3', value: [1, 1, 1] }
  ],
  outputs: [
    { name: 'Position', type: 'float3' }
  ],
  compute: (inputs, ctx) => ({
    Position: [
      inputs.Center[0] + (ctx.random() - 0.5) * inputs.Size[0],
      inputs.Center[1] + (ctx.random() - 0.5) * inputs.Size[1],
      inputs.Center[2] + (ctx.random() - 0.5) * inputs.Size[2]
    ]
  })
});

register({
  type: 'position_cone',
  category: 'Position',
  title: 'Position Cone',
  description: 'Set position within cone',
  inputs: [
    { name: 'Origin', type: 'float3', value: [0, 0, 0] },
    { name: 'Angle', type: 'float', value: 45 },
    { name: 'Radius', type: 'float', value: 1 },
    { name: 'Height', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Position', type: 'float3' },
    { name: 'Direction', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const angleRad = inputs.Angle * Math.PI / 180;
    const theta = ctx.random() * Math.PI * 2;
    const r = Math.sqrt(ctx.random()) * inputs.Radius;
    const spreadAngle = ctx.random() * angleRad;
    
    return {
      Position: [
        inputs.Origin[0] + r * Math.cos(theta),
        inputs.Origin[1],
        inputs.Origin[2] + r * Math.sin(theta)
      ],
      Direction: [
        Math.sin(spreadAngle) * Math.cos(theta),
        Math.cos(spreadAngle),
        Math.sin(spreadAngle) * Math.sin(theta)
      ]
    };
  }
});

// Velocity
register({
  type: 'velocity_random',
  category: 'Velocity',
  title: 'Random Velocity',
  description: 'Set random velocity',
  inputs: [
    { name: 'Min', type: 'float3', value: [-1, -1, -1] },
    { name: 'Max', type: 'float3', value: [1, 1, 1] }
  ],
  outputs: [
    { name: 'Velocity', type: 'float3' }
  ],
  compute: (inputs, ctx) => ({
    Velocity: [
      inputs.Min[0] + ctx.random() * (inputs.Max[0] - inputs.Min[0]),
      inputs.Min[1] + ctx.random() * (inputs.Max[1] - inputs.Min[1]),
      inputs.Min[2] + ctx.random() * (inputs.Max[2] - inputs.Min[2])
    ]
  })
});

register({
  type: 'velocity_from_direction',
  category: 'Velocity',
  title: 'Velocity From Direction',
  description: 'Set velocity from direction',
  inputs: [
    { name: 'Direction', type: 'float3', value: [0, 1, 0] },
    { name: 'Speed', type: 'float', value: 5 }
  ],
  outputs: [
    { name: 'Velocity', type: 'float3' }
  ],
  compute: (inputs) => {
    const len = Math.sqrt(
      inputs.Direction[0] ** 2 +
      inputs.Direction[1] ** 2 +
      inputs.Direction[2] ** 2
    );
    const normalized = len > 0 ? inputs.Direction.map((d: number) => d / len) : [0, 1, 0];
    return {
      Velocity: normalized.map((d: number) => d * inputs.Speed)
    };
  }
});

// Forces
register({
  type: 'force_gravity',
  category: 'Force',
  title: 'Gravity',
  description: 'Apply gravity force',
  inputs: [
    { name: 'Gravity', type: 'float3', value: [0, -9.81, 0] }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs) => ({ Force: inputs.Gravity })
});

register({
  type: 'force_wind',
  category: 'Force',
  title: 'Wind',
  description: 'Apply wind force with turbulence',
  inputs: [
    { name: 'Direction', type: 'float3', value: [1, 0, 0] },
    { name: 'Strength', type: 'float', value: 2 },
    { name: 'Turbulence', type: 'float', value: 0.5 }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs, ctx) => ({
    Force: inputs.Direction.map((d: number) => 
      d * inputs.Strength * (1 + (ctx.random() - 0.5) * inputs.Turbulence)
    )
  })
});

register({
  type: 'force_drag',
  category: 'Force',
  title: 'Drag',
  description: 'Apply drag force',
  inputs: [
    { name: 'Coefficient', type: 'float', value: 0.1 }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const vel = ctx.getAttribute('velocity') || [0, 0, 0];
    return {
      Force: vel.map((v: number) => -v * inputs.Coefficient)
    };
  }
});

register({
  type: 'force_vortex',
  category: 'Force',
  title: 'Vortex',
  description: 'Apply vortex force',
  inputs: [
    { name: 'Center', type: 'float3', value: [0, 0, 0] },
    { name: 'Axis', type: 'float3', value: [0, 1, 0] },
    { name: 'Strength', type: 'float', value: 5 },
    { name: 'Pull', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const pos = ctx.getAttribute('position') || [0, 0, 0];
    const toCenter = [
      inputs.Center[0] - pos[0],
      inputs.Center[1] - pos[1],
      inputs.Center[2] - pos[2]
    ];
    
    // Cross product with axis for tangent
    const tangent = [
      inputs.Axis[1] * toCenter[2] - inputs.Axis[2] * toCenter[1],
      inputs.Axis[2] * toCenter[0] - inputs.Axis[0] * toCenter[2],
      inputs.Axis[0] * toCenter[1] - inputs.Axis[1] * toCenter[0]
    ];
    
    return {
      Force: [
        tangent[0] * inputs.Strength + toCenter[0] * inputs.Pull,
        tangent[1] * inputs.Strength + toCenter[1] * inputs.Pull,
        tangent[2] * inputs.Strength + toCenter[2] * inputs.Pull
      ]
    };
  }
});

// Color
register({
  type: 'color_constant',
  category: 'Color',
  title: 'Constant Color',
  description: 'Set constant color',
  inputs: [
    { name: 'Color', type: 'color', value: [1, 1, 1, 1] }
  ],
  outputs: [
    { name: 'Color', type: 'color' }
  ],
  compute: (inputs) => ({ Color: inputs.Color })
});

register({
  type: 'color_over_life',
  category: 'Color',
  title: 'Color Over Life',
  description: 'Interpolate color over particle lifetime',
  inputs: [
    { name: 'Gradient', type: 'gradient', value: null }
  ],
  outputs: [
    { name: 'Color', type: 'color' }
  ],
  compute: (inputs, ctx) => {
    const life = ctx.getAttribute('normalizedAge') || 0;
    const gradient = inputs.Gradient;
    
    if (!gradient || gradient.length === 0) {
      return { Color: [1, 1, 1, 1] };
    }
    
    // Sample gradient
    for (let i = 0; i < gradient.length - 1; i++) {
      if (life >= gradient[i].position && life <= gradient[i + 1].position) {
        const t = (life - gradient[i].position) / (gradient[i + 1].position - gradient[i].position);
        return {
          Color: gradient[i].color.map((c: number, j: number) => 
            c + t * (gradient[i + 1].color[j] - c)
          )
        };
      }
    }
    
    return { Color: gradient[gradient.length - 1].color };
  }
});

// Size
register({
  type: 'size_constant',
  category: 'Size',
  title: 'Constant Size',
  description: 'Set constant size',
  inputs: [
    { name: 'Size', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Size', type: 'float' }
  ],
  compute: (inputs) => ({ Size: inputs.Size })
});

register({
  type: 'size_random',
  category: 'Size',
  title: 'Random Size',
  description: 'Set random size between min and max',
  inputs: [
    { name: 'Min', type: 'float', value: 0.5 },
    { name: 'Max', type: 'float', value: 1.5 }
  ],
  outputs: [
    { name: 'Size', type: 'float' }
  ],
  compute: (inputs, ctx) => ({
    Size: inputs.Min + ctx.random() * (inputs.Max - inputs.Min)
  })
});

register({
  type: 'size_over_life',
  category: 'Size',
  title: 'Size Over Life',
  description: 'Animate size over particle lifetime',
  inputs: [
    { name: 'Curve', type: 'curve', value: null },
    { name: 'Scale', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Size', type: 'float' }
  ],
  compute: (inputs, ctx) => {
    const life = ctx.getAttribute('normalizedAge') || 0;
    const curve = inputs.Curve;
    
    // Sample curve (simple linear interpolation)
    let value = 1;
    if (curve && curve.length > 0) {
      for (let i = 0; i < curve.length - 1; i++) {
        if (life >= curve[i].time && life <= curve[i + 1].time) {
          const t = (life - curve[i].time) / (curve[i + 1].time - curve[i].time);
          value = curve[i].value + t * (curve[i + 1].value - curve[i].value);
          break;
        }
      }
    }
    
    return { Size: value * inputs.Scale };
  }
});

// Math
register({
  type: 'math_add',
  category: 'Math',
  title: 'Add',
  description: 'Add two values',
  inputs: [
    { name: 'A', type: 'float', value: 0 },
    { name: 'B', type: 'float', value: 0 }
  ],
  outputs: [
    { name: 'Result', type: 'float' }
  ],
  compute: (inputs) => ({ Result: inputs.A + inputs.B }),
  glsl: 'float result = a + b;'
});

register({
  type: 'math_multiply',
  category: 'Math',
  title: 'Multiply',
  description: 'Multiply two values',
  inputs: [
    { name: 'A', type: 'float', value: 1 },
    { name: 'B', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Result', type: 'float' }
  ],
  compute: (inputs) => ({ Result: inputs.A * inputs.B }),
  glsl: 'float result = a * b;'
});

register({
  type: 'math_lerp',
  category: 'Math',
  title: 'Lerp',
  description: 'Linear interpolation',
  inputs: [
    { name: 'A', type: 'float', value: 0 },
    { name: 'B', type: 'float', value: 1 },
    { name: 'T', type: 'float', value: 0.5 }
  ],
  outputs: [
    { name: 'Result', type: 'float' }
  ],
  compute: (inputs) => ({ Result: inputs.A + (inputs.B - inputs.A) * inputs.T }),
  glsl: 'float result = mix(a, b, t);'
});

register({
  type: 'math_noise',
  category: 'Math',
  title: 'Noise',
  description: 'Generate noise value',
  inputs: [
    { name: 'Position', type: 'float3', value: [0, 0, 0] },
    { name: 'Frequency', type: 'float', value: 1 },
    { name: 'Octaves', type: 'int', value: 4 }
  ],
  outputs: [
    { name: 'Value', type: 'float' }
  ],
  compute: (inputs) => {
    // Simple FBM noise
    let value = 0;
    let amplitude = 1;
    let frequency = inputs.Frequency;
    let maxValue = 0;
    
    for (let i = 0; i < inputs.Octaves; i++) {
      // Simplified noise using sin
      value += amplitude * Math.sin(
        inputs.Position[0] * frequency + 
        inputs.Position[1] * frequency * 1.3 + 
        inputs.Position[2] * frequency * 0.7
      );
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return { Value: (value / maxValue + 1) * 0.5 };
  }
});

// Lifetime
register({
  type: 'lifetime_constant',
  category: 'Lifetime',
  title: 'Constant Lifetime',
  description: 'Set constant particle lifetime',
  inputs: [
    { name: 'Lifetime', type: 'float', value: 2 }
  ],
  outputs: [
    { name: 'Lifetime', type: 'float' }
  ],
  compute: (inputs) => ({ Lifetime: inputs.Lifetime })
});

register({
  type: 'lifetime_random',
  category: 'Lifetime',
  title: 'Random Lifetime',
  description: 'Set random particle lifetime',
  inputs: [
    { name: 'Min', type: 'float', value: 1 },
    { name: 'Max', type: 'float', value: 3 }
  ],
  outputs: [
    { name: 'Lifetime', type: 'float' }
  ],
  compute: (inputs, ctx) => ({
    Lifetime: inputs.Min + ctx.random() * (inputs.Max - inputs.Min)
  })
});

// Output
register({
  type: 'output_particle',
  category: 'Output',
  title: 'Output Particle',
  description: 'Final particle output',
  inputs: [
    { name: 'Position', type: 'float3', value: [0, 0, 0] },
    { name: 'Velocity', type: 'float3', value: [0, 0, 0] },
    { name: 'Color', type: 'color', value: [1, 1, 1, 1] },
    { name: 'Size', type: 'float', value: 1 },
    { name: 'Lifetime', type: 'float', value: 2 },
    { name: 'Rotation', type: 'float', value: 0 }
  ],
  outputs: [],
  compute: (inputs, ctx) => {
    ctx.setAttribute('position', inputs.Position);
    ctx.setAttribute('velocity', inputs.Velocity);
    ctx.setAttribute('color', inputs.Color);
    ctx.setAttribute('size', inputs.Size);
    ctx.setAttribute('lifetime', inputs.Lifetime);
    ctx.setAttribute('rotation', inputs.Rotation);
    return {};
  }
});
}
