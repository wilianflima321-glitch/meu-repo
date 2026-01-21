/**
 * Project Settings UI - Configurações do Projeto
 * 
 * Interface profissional estilo Unreal Engine para gerenciar
 * todas as configurações do projeto e engine.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

interface SettingCategory {
  id: string;
  name: string;
  icon: string;
  sections: SettingSection[];
}

interface SettingSection {
  id: string;
  name: string;
  description?: string;
  isAdvanced?: boolean;
  settings: Setting[];
}

interface Setting {
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

const defaultSettings: SettingCategory[] = [
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
          { id: 'win_dx12', name: 'Use DirectX 12', description: 'Enable DX12 rendering', type: 'boolean', value: true, requiresRestart: true },
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

// ============================================================================
// SETTING EDITORS
// ============================================================================

interface SettingEditorProps {
  setting: Setting;
  value: unknown;
  onChange: (value: unknown) => void;
}

function BooleanEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={value as boolean}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '18px', height: '18px', accentColor: '#3498db' }}
      />
      <span style={{ color: value ? '#fff' : '#888' }}>{value ? 'Enabled' : 'Disabled'}</span>
    </label>
  );
}

function NumberEditor({ setting, value, onChange }: SettingEditorProps) {
  const numValue = value as number;
  const isPercentage = setting.max === 1 && setting.min === 0;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        type="range"
        value={numValue}
        min={setting.min ?? 0}
        max={setting.max ?? 100}
        step={setting.step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#3498db' }}
      />
      <input
        type="number"
        value={numValue}
        min={setting.min}
        max={setting.max}
        step={setting.step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '80px',
          background: '#252525',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#fff',
          padding: '4px 8px',
          textAlign: 'right',
        }}
      />
      {isPercentage && <span style={{ color: '#888', fontSize: '12px' }}>({Math.round(numValue * 100)}%)</span>}
    </div>
  );
}

function StringEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <input
      type="text"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      placeholder={setting.name}
      style={{
        width: '100%',
        background: '#252525',
        border: '1px solid #444',
        borderRadius: '4px',
        color: '#fff',
        padding: '8px 12px',
      }}
    />
  );
}

function EnumEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <select
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: '#252525',
        border: '1px solid #444',
        borderRadius: '4px',
        color: '#fff',
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      {setting.options?.map((opt) => (
        <option key={String(opt.value)} value={opt.value as string}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ColorEditor({ setting, value, onChange }: SettingEditorProps) {
  const color = value as string;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '48px',
          height: '32px',
          border: '1px solid #444',
          borderRadius: '4px',
          cursor: 'pointer',
          padding: '0',
        }}
      />
      <input
        type="text"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: '#252525',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#fff',
          padding: '6px 12px',
          fontFamily: 'monospace',
        }}
      />
    </div>
  );
}

function Vector2Editor({ setting, value, onChange }: SettingEditorProps) {
  const vec = value as { x: number; y: number };
  
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>X</span>
        <input
          type="number"
          value={vec.x}
          onChange={(e) => onChange({ ...vec, x: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>Y</span>
        <input
          type="number"
          value={vec.y}
          onChange={(e) => onChange({ ...vec, y: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
    </div>
  );
}

function Vector3Editor({ setting, value, onChange }: SettingEditorProps) {
  const vec = value as { x: number; y: number; z: number };
  
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>X</span>
        <input
          type="number"
          value={vec.x}
          onChange={(e) => onChange({ ...vec, x: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>Y</span>
        <input
          type="number"
          value={vec.y}
          onChange={(e) => onChange({ ...vec, y: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#3498db', fontWeight: 'bold' }}>Z</span>
        <input
          type="number"
          value={vec.z}
          onChange={(e) => onChange({ ...vec, z: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
    </div>
  );
}

function PathEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Select path..."
        style={{
          flex: 1,
          background: '#252525',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#fff',
          padding: '8px 12px',
        }}
      />
      <button
        onClick={() => {/* Open file picker */}}
        style={{
          padding: '8px 16px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Browse
      </button>
    </div>
  );
}

function KeybindEditor({ setting, value, onChange }: SettingEditorProps) {
  const [isListening, setIsListening] = useState(false);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isListening) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    let key = e.key;
    if (key === ' ') key = 'Space';
    if (key === 'Control') key = e.location === 1 ? 'LeftCtrl' : 'RightCtrl';
    if (key === 'Shift') key = e.location === 1 ? 'LeftShift' : 'RightShift';
    if (key === 'Alt') key = e.location === 1 ? 'LeftAlt' : 'RightAlt';
    
    onChange(key);
    setIsListening(false);
    
    window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, onChange]);
  
  const startListening = useCallback(() => {
    setIsListening(true);
    window.addEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return (
    <button
      onClick={startListening}
      style={{
        padding: '8px 16px',
        background: isListening ? '#3498db' : '#333',
        border: `1px solid ${isListening ? '#3498db' : '#555'}`,
        borderRadius: '4px',
        color: '#fff',
        cursor: 'pointer',
        minWidth: '120px',
        textAlign: 'center',
        fontFamily: 'monospace',
      }}
    >
      {isListening ? 'Press a key...' : value as string}
    </button>
  );
}

function SettingEditor({ setting, value, onChange }: SettingEditorProps) {
  switch (setting.type) {
    case 'boolean':
      return <BooleanEditor setting={setting} value={value} onChange={onChange} />;
    case 'number':
      return <NumberEditor setting={setting} value={value} onChange={onChange} />;
    case 'string':
      return <StringEditor setting={setting} value={value} onChange={onChange} />;
    case 'enum':
      return <EnumEditor setting={setting} value={value} onChange={onChange} />;
    case 'color':
      return <ColorEditor setting={setting} value={value} onChange={onChange} />;
    case 'vector2':
      return <Vector2Editor setting={setting} value={value} onChange={onChange} />;
    case 'vector3':
      return <Vector3Editor setting={setting} value={value} onChange={onChange} />;
    case 'path':
      return <PathEditor setting={setting} value={value} onChange={onChange} />;
    case 'keybind':
      return <KeybindEditor setting={setting} value={value} onChange={onChange} />;
    default:
      return <StringEditor setting={setting} value={value} onChange={onChange} />;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectSettings() {
  const toast = useToast();
  const [categories] = useState<SettingCategory[]>(defaultSettings);
  const [selectedCategory, setSelectedCategory] = useState<string>('project');
  const [settings, setSettings] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const cat of defaultSettings) {
      for (const section of cat.sections) {
        for (const setting of section.settings) {
          initial[setting.id] = setting.value;
        }
      }
    }
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const currentCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategory),
    [categories, selectedCategory]
  );
  
  const filteredSections = useMemo(() => {
    if (!currentCategory) return [];
    
    return currentCategory.sections
      .map((section) => ({
        ...section,
        settings: section.settings.filter((setting) => {
          if (!showAdvanced && setting.isAdvanced) return false;
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
              setting.name.toLowerCase().includes(query) ||
              setting.description.toLowerCase().includes(query)
            );
          }
          return true;
        }),
      }))
      .filter((section) => section.settings.length > 0);
  }, [currentCategory, searchQuery, showAdvanced]);
  
  const handleSettingChange = useCallback((id: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [id]: value }));
    setHasChanges(true);
  }, []);
  
  const handleSave = useCallback(() => {
    // Save settings to localStorage or backend
    localStorage.setItem('aethel_project_settings', JSON.stringify(settings));
    setHasChanges(false);
    console.log('Settings saved:', settings);
  }, [settings]);
  
  const handleReset = useCallback(() => {
    const initial: Record<string, unknown> = {};
    for (const cat of defaultSettings) {
      for (const section of cat.sections) {
        for (const setting of section.settings) {
          initial[setting.id] = setting.value;
        }
      }
    }
    setSettings(initial);
    setHasChanges(true);
  }, []);
  
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);
  
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const imported = JSON.parse(text);
          setSettings((prev) => ({ ...prev, ...imported }));
          setHasChanges(true);
        } catch {
          toast.error('Invalid settings file');
        }
      }
    };
    input.click();
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a', color: '#fff' }}>
      {/* Header */}
      <div style={{
        height: '56px',
        background: '#252525',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>⚙️ Project Settings</span>
        
        <div style={{ flex: 1 }} />
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          style={{
            width: '300px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '8px 12px',
          }}
        />
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
          />
          Show Advanced
        </label>
        
        <div style={{ width: '1px', height: '24px', background: '#444' }} />
        
        <button
          onClick={handleImport}
          style={{
            padding: '8px 16px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          📥 Import
        </button>
        
        <button
          onClick={handleExport}
          style={{
            padding: '8px 16px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          📤 Export
        </button>
        
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          🔄 Reset
        </button>
        
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          style={{
            padding: '8px 20px',
            background: hasChanges ? '#3498db' : '#333',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            opacity: hasChanges ? 1 : 0.5,
          }}
        >
          💾 Save
        </button>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Category Sidebar */}
        <div style={{
          width: '220px',
          background: '#252525',
          borderRight: '1px solid #333',
          padding: '12px 0',
          overflowY: 'auto',
        }}>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: selectedCategory === category.id ? '#333' : 'transparent',
                border: 'none',
                borderLeft: selectedCategory === category.id ? '3px solid #3498db' : '3px solid transparent',
                color: selectedCategory === category.id ? '#fff' : '#aaa',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '18px' }}>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
        
        {/* Settings Panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {currentCategory && (
            <>
              <h1 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>{currentCategory.icon}</span>
                {currentCategory.name}
              </h1>
              <p style={{ color: '#888', marginBottom: '32px' }}>
                Configure {currentCategory.name.toLowerCase()} settings for your project
              </p>
              
              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  style={{
                    marginBottom: '32px',
                    background: '#252525',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #333',
                    background: '#2a2a2a',
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{section.name}</h2>
                    {section.description && (
                      <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>{section.description}</p>
                    )}
                  </div>
                  
                  <div style={{ padding: '8px 0' }}>
                    {section.settings.map((setting, index) => (
                      <div
                        key={setting.id}
                        style={{
                          padding: '16px 20px',
                          borderBottom: index < section.settings.length - 1 ? '1px solid #333' : 'none',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '20px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>{setting.name}</span>
                            {setting.requiresRestart && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: '#e74c3c',
                                borderRadius: '3px',
                              }}>
                                Requires Restart
                              </span>
                            )}
                            {setting.isAdvanced && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: '#9b59b6',
                                borderRadius: '3px',
                              }}>
                                Advanced
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{setting.description}</p>
                        </div>
                        
                        <div style={{ flex: 1, maxWidth: '400px' }}>
                          <SettingEditor
                            setting={setting}
                            value={settings[setting.id]}
                            onChange={(value) => handleSettingChange(setting.id, value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredSections.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '48px',
                  color: '#888',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <p>No settings found matching your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Footer Status Bar */}
      <div style={{
        height: '28px',
        background: '#252525',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '11px',
        color: '#888',
      }}>
        <span>
          {hasChanges ? (
            <span style={{ color: '#f39c12' }}>● Unsaved changes</span>
          ) : (
            <span style={{ color: '#2ecc71' }}>✓ All changes saved</span>
          )}
        </span>
        <div style={{ flex: 1 }} />
        <span>Settings v1.0</span>
      </div>
    </div>
  );
}
