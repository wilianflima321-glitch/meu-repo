'use client';

export interface SettingCategory {
  id: string;
  name: string;
  icon: string;
  sections: SettingSection[];
}

export interface SettingSection {
  id: string;
  name: string;
  description?: string;
  isAdvanced?: boolean;
  settings: Setting[];
}

export interface Setting {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'enum' | 'color' | 'vector2' | 'vector3' | 'path' | 'array' | 'keybind';
  value: unknown;
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
  step?: number;
  isAdvanced?: boolean;
  requiresRestart?: boolean;
}

// ============================================================================
// DEFAULT SETTINGS DATA
// ============================================================================

export const defaultProjectSettings: SettingCategory[] = [
  {
    id: 'project',
    name: 'Project',
    icon: '📁',
    sections: [
      {
        id: 'description',
        name: 'Description',
        description: 'Basic project information',
        settings: [
          { id: 'project_name', name: 'Project Name', description: 'The display name of your project', type: 'string', value: 'My Game' },
          { id: 'project_version', name: 'Project Version', description: 'Current version number', type: 'string', value: '1.0.0' },
          { id: 'company_name', name: 'Company Name', description: 'Your company or studio name', type: 'string', value: '' },
          { id: 'project_description', name: 'Description', description: 'A brief description of your project', type: 'string', value: '' },
          { id: 'copyright', name: 'Copyright', description: 'Copyright notice', type: 'string', value: '' },
        ],
      },
      {
        id: 'maps',
        name: 'Maps & Modes',
        settings: [
          { id: 'default_map', name: 'Default Map', description: 'Map loaded when starting the game', type: 'path', value: '/Game/Maps/MainMenu' },
          { id: 'game_mode', name: 'Default Game Mode', description: 'Default game mode class', type: 'path', value: '/Game/Blueprints/BP_DefaultGameMode' },
          { id: 'editor_startup_map', name: 'Editor Startup Map', description: 'Map loaded when opening the editor', type: 'path', value: '' },
        ],
      },
      {
        id: 'packaging',
        name: 'Packaging',
        settings: [
          { id: 'build_config', name: 'Build Configuration', description: 'Target build configuration', type: 'enum', value: 'Development', options: [
            { label: 'Debug', value: 'Debug' },
            { label: 'Development', value: 'Development' },
            { label: 'Shipping', value: 'Shipping' },
          ]},
          { id: 'pak_files', name: 'Use Pak Files', description: 'Package assets into PAK files', type: 'boolean', value: true },
          { id: 'compress_pak', name: 'Compress PAK Files', description: 'Compress PAK files for smaller size', type: 'boolean', value: true },
          { id: 'staging_directory', name: 'Staging Directory', description: 'Output directory for packaged builds', type: 'path', value: '' },
        ],
      },
    ],
  },
  {
    id: 'engine',
    name: 'Engine',
    icon: '⚙️',
    sections: [
      {
        id: 'general',
        name: 'General Settings',
        settings: [
          { id: 'fixed_timestep', name: 'Use Fixed Timestep', description: 'Use fixed delta time for physics', type: 'boolean', value: true },
          { id: 'timestep', name: 'Fixed Timestep', description: 'Fixed timestep value in seconds', type: 'number', value: 0.01667, min: 0.001, max: 0.1, step: 0.001 },
          { id: 'max_fps', name: 'Max FPS', description: 'Maximum frames per second (0 = unlimited)', type: 'number', value: 0, min: 0, max: 300, step: 1 },
          { id: 'vsync', name: 'Enable VSync', description: 'Synchronize frame rate with display', type: 'boolean', value: true },
        ],
      },
      {
        id: 'physics',
        name: 'Physics',
        settings: [
          { id: 'physics_engine', name: 'Physics Engine', description: 'Physics simulation backend', type: 'enum', value: 'Default', options: [
            { label: 'Default', value: 'Default' },
            { label: 'PhysX', value: 'PhysX' },
            { label: 'Bullet', value: 'Bullet' },
            { label: 'Custom', value: 'Custom' },
          ]},
          { id: 'gravity', name: 'Default Gravity', description: 'World gravity vector', type: 'vector3', value: { x: 0, y: -981, z: 0 } },
          { id: 'physics_substeps', name: 'Physics Substeps', description: 'Number of physics substeps per frame', type: 'number', value: 1, min: 1, max: 8 },
          { id: 'collision_iterations', name: 'Collision Iterations', description: 'Solver iterations for collision', type: 'number', value: 8, min: 1, max: 32 },
        ],
      },
      {
        id: 'garbage_collection',
        name: 'Garbage Collection',
        isAdvanced: true,
        settings: [
          { id: 'gc_enabled', name: 'Enable GC', description: 'Enable automatic garbage collection', type: 'boolean', value: true },
          { id: 'gc_frequency', name: 'GC Frequency', description: 'How often to run GC (seconds)', type: 'number', value: 60, min: 1, max: 600 },
          { id: 'gc_threshold', name: 'GC Memory Threshold', description: 'Memory threshold to trigger GC (MB)', type: 'number', value: 100, min: 10, max: 1000 },
        ],
      },
    ],
  },
  {
    id: 'rendering',
    name: 'Rendering',
    icon: '🎨',
    sections: [
      {
        id: 'quality',
        name: 'Quality Settings',
        settings: [
          { id: 'quality_preset', name: 'Quality Preset', description: 'Overall quality level', type: 'enum', value: 'High', options: [
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' },
            { label: 'Ultra', value: 'Ultra' },
            { label: 'Custom', value: 'Custom' },
          ]},
          { id: 'resolution_scale', name: 'Resolution Scale', description: 'Internal resolution percentage', type: 'number', value: 100, min: 25, max: 200, step: 5 },
          { id: 'anti_aliasing', name: 'Anti-Aliasing', description: 'Anti-aliasing method', type: 'enum', value: 'TAA', options: [
            { label: 'None', value: 'None' },
            { label: 'FXAA', value: 'FXAA' },
            { label: 'SMAA', value: 'SMAA' },
            { label: 'TAA', value: 'TAA' },
            { label: 'MSAA 2x', value: 'MSAA2' },
            { label: 'MSAA 4x', value: 'MSAA4' },
            { label: 'MSAA 8x', value: 'MSAA8' },
          ]},
        ],
      },
      {
        id: 'shadows',
        name: 'Shadows',
        settings: [
          { id: 'shadows_enabled', name: 'Enable Shadows', description: 'Enable shadow rendering', type: 'boolean', value: true },
          { id: 'shadow_quality', name: 'Shadow Quality', description: 'Shadow map resolution', type: 'enum', value: 'High', options: [
            { label: 'Low (512)', value: 'Low' },
            { label: 'Medium (1024)', value: 'Medium' },
            { label: 'High (2048)', value: 'High' },
            { label: 'Ultra (4096)', value: 'Ultra' },
          ]},
          { id: 'shadow_distance', name: 'Shadow Distance', description: 'Maximum shadow rendering distance', type: 'number', value: 50000, min: 1000, max: 200000 },
          { id: 'cascade_count', name: 'Shadow Cascades', description: 'Number of shadow cascades', type: 'number', value: 4, min: 1, max: 6 },
          { id: 'soft_shadows', name: 'Soft Shadows', description: 'Enable soft shadow edges', type: 'boolean', value: true },
        ],
      },
      {
        id: 'lighting',
        name: 'Lighting',
        settings: [
          { id: 'global_illumination', name: 'Global Illumination', description: 'GI method', type: 'enum', value: 'Lumen', options: [
            { label: 'None', value: 'None' },
            { label: 'Baked', value: 'Baked' },
            { label: 'Screen Space', value: 'SSGI' },
            { label: 'Lumen', value: 'Lumen' },
            { label: 'Ray Traced', value: 'RTGI' },
          ]},
          { id: 'reflection_quality', name: 'Reflection Quality', description: 'Screen space reflection quality', type: 'enum', value: 'High', options: [
            { label: 'Off', value: 'Off' },
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' },
          ]},
          { id: 'ambient_occlusion', name: 'Ambient Occlusion', description: 'AO method', type: 'enum', value: 'GTAO', options: [
            { label: 'None', value: 'None' },
            { label: 'SSAO', value: 'SSAO' },
            { label: 'GTAO', value: 'GTAO' },
            { label: 'HBAO+', value: 'HBAO' },
          ]},
        ],
      },
      {
        id: 'postprocess',
        name: 'Post Processing',
        settings: [
          { id: 'bloom_enabled', name: 'Bloom', description: 'Enable bloom effect', type: 'boolean', value: true },
          { id: 'bloom_intensity', name: 'Bloom Intensity', description: 'Bloom effect strength', type: 'number', value: 0.5, min: 0, max: 2, step: 0.1 },
          { id: 'motion_blur', name: 'Motion Blur', description: 'Enable motion blur', type: 'boolean', value: true },
          { id: 'depth_of_field', name: 'Depth of Field', description: 'Enable DOF', type: 'boolean', value: false },
          { id: 'chromatic_aberration', name: 'Chromatic Aberration', description: 'CA intensity', type: 'number', value: 0, min: 0, max: 1, step: 0.05 },
          { id: 'film_grain', name: 'Film Grain', description: 'Film grain intensity', type: 'number', value: 0, min: 0, max: 1, step: 0.05 },
          { id: 'vignette', name: 'Vignette', description: 'Vignette intensity', type: 'number', value: 0.2, min: 0, max: 1, step: 0.05 },
          { id: 'tonemapper', name: 'Tonemapper', description: 'Tone mapping method', type: 'enum', value: 'ACES', options: [
            { label: 'None', value: 'None' },
            { label: 'Reinhard', value: 'Reinhard' },
            { label: 'ACES', value: 'ACES' },
            { label: 'Filmic', value: 'Filmic' },
          ]},
        ],
      },
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    icon: '🔊',
    sections: [
      {
        id: 'general_audio',
        name: 'General',
        settings: [
          { id: 'master_volume', name: 'Master Volume', description: 'Overall audio volume', type: 'number', value: 1, min: 0, max: 1, step: 0.05 },
          { id: 'music_volume', name: 'Music Volume', description: 'Music track volume', type: 'number', value: 0.8, min: 0, max: 1, step: 0.05 },
          { id: 'sfx_volume', name: 'SFX Volume', description: 'Sound effects volume', type: 'number', value: 1, min: 0, max: 1, step: 0.05 },
          { id: 'voice_volume', name: 'Voice Volume', description: 'Voice/dialogue volume', type: 'number', value: 1, min: 0, max: 1, step: 0.05 },
          { id: 'ambient_volume', name: 'Ambient Volume', description: 'Ambient sounds volume', type: 'number', value: 0.7, min: 0, max: 1, step: 0.05 },
        ],
      },
      {
        id: 'spatial_audio',
        name: 'Spatial Audio',
        settings: [
          { id: 'spatial_audio_enabled', name: 'Enable Spatial Audio', description: 'Enable 3D positional audio', type: 'boolean', value: true },
          { id: 'hrtf_enabled', name: 'HRTF', description: 'Enable head-related transfer function', type: 'boolean', value: false },
          { id: 'max_channels', name: 'Max Channels', description: 'Maximum simultaneous audio channels', type: 'number', value: 32, min: 8, max: 128 },
          { id: 'distance_model', name: 'Distance Model', description: 'Audio attenuation model', type: 'enum', value: 'Inverse', options: [
            { label: 'Linear', value: 'Linear' },
            { label: 'Inverse', value: 'Inverse' },
            { label: 'Exponential', value: 'Exponential' },
          ]},
        ],
      },
    ],
  },
  {
    id: 'input',
    name: 'Input',
    icon: '🎮',
    sections: [
      {
        id: 'mouse',
        name: 'Mouse',
        settings: [
          { id: 'mouse_sensitivity', name: 'Mouse Sensitivity', description: 'Mouse movement sensitivity', type: 'number', value: 1, min: 0.1, max: 5, step: 0.1 },
          { id: 'invert_y', name: 'Invert Y Axis', description: 'Invert vertical mouse movement', type: 'boolean', value: false },
          { id: 'raw_input', name: 'Raw Input', description: 'Use raw mouse input', type: 'boolean', value: true },
          { id: 'mouse_smoothing', name: 'Mouse Smoothing', description: 'Enable mouse smoothing', type: 'boolean', value: false },
        ],
      },
      {
        id: 'controller',
        name: 'Controller',
        settings: [
          { id: 'controller_enabled', name: 'Enable Controller', description: 'Enable gamepad support', type: 'boolean', value: true },
          { id: 'stick_deadzone', name: 'Stick Deadzone', description: 'Analog stick deadzone', type: 'number', value: 0.2, min: 0, max: 0.5, step: 0.05 },
          { id: 'trigger_deadzone', name: 'Trigger Deadzone', description: 'Trigger button deadzone', type: 'number', value: 0.1, min: 0, max: 0.5, step: 0.05 },
          { id: 'vibration', name: 'Controller Vibration', description: 'Enable haptic feedback', type: 'boolean', value: true },
          { id: 'vibration_intensity', name: 'Vibration Intensity', description: 'Haptic feedback strength', type: 'number', value: 1, min: 0, max: 1, step: 0.1 },
        ],
      },
      {
        id: 'keybinds',
        name: 'Key Bindings',
        settings: [
          { id: 'key_forward', name: 'Move Forward', description: 'Key to move forward', type: 'keybind', value: 'W' },
          { id: 'key_backward', name: 'Move Backward', description: 'Key to move backward', type: 'keybind', value: 'S' },
          { id: 'key_left', name: 'Move Left', description: 'Key to strafe left', type: 'keybind', value: 'A' },
          { id: 'key_right', name: 'Move Right', description: 'Key to strafe right', type: 'keybind', value: 'D' },
          { id: 'key_jump', name: 'Jump', description: 'Key to jump', type: 'keybind', value: 'Space' },
          { id: 'key_crouch', name: 'Crouch', description: 'Key to crouch', type: 'keybind', value: 'LeftCtrl' },
          { id: 'key_sprint', name: 'Sprint', description: 'Key to sprint', type: 'keybind', value: 'LeftShift' },
          { id: 'key_interact', name: 'Interact', description: 'Key to interact', type: 'keybind', value: 'E' },
          { id: 'key_inventory', name: 'Inventory', description: 'Key to open inventory', type: 'keybind', value: 'I' },
          { id: 'key_map', name: 'Map', description: 'Key to open map', type: 'keybind', value: 'M' },
        ],
      },
    ],
  },
  {
    id: 'platforms',
    name: 'Platforms',
    icon: '💻',
    sections: [
      {
        id: 'windows',
        name: 'Windows',
        settings: [
          { id: 'win_fullscreen', name: 'Fullscreen Mode', description: 'Default window mode', type: 'enum', value: 'Fullscreen', options: [
            { label: 'Windowed', value: 'Windowed' },
            { label: 'Borderless', value: 'Borderless' },
            { label: 'Fullscreen', value: 'Fullscreen' },
          ]},
          { id: 'win_resolution', name: 'Default Resolution', description: 'Default screen resolution', type: 'vector2', value: { x: 1920, y: 1080 } },
          { id: 'win_dx12', name: 'Use DirectX 12', description: 'Windows export target only (web runtime uses WebGL/WebGPU)', type: 'boolean', value: true, requiresRestart: true },
          { id: 'win_raytracing', name: 'Ray Tracing', description: 'Enable ray tracing (requires RTX)', type: 'boolean', value: false },
        ],
      },
      {
        id: 'linux',
        name: 'Linux',
        settings: [
          { id: 'linux_vulkan', name: 'Use Vulkan', description: 'Enable Vulkan rendering', type: 'boolean', value: true, requiresRestart: true },
          { id: 'linux_wayland', name: 'Wayland Support', description: 'Enable Wayland display server', type: 'boolean', value: false },
        ],
      },
      {
        id: 'mac',
        name: 'macOS',
        settings: [
          { id: 'mac_metal', name: 'Use Metal', description: 'Enable Metal rendering', type: 'boolean', value: true, requiresRestart: true },
          { id: 'mac_retina', name: 'Retina Support', description: 'Enable high DPI rendering', type: 'boolean', value: true },
        ],
      },
    ],
  },
];
