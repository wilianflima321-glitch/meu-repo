'use client'

import { useState, useCallback } from 'react'
import {
  Settings,
  Monitor,
  Palette,
  Keyboard,
  Code,
  Bot,
  Cpu,
  Boxes,
  Sparkles,
  Globe,
  Shield,
  Zap,
  Database,
  HardDrive,
  Layers,
  Mountain,
  Clapperboard,
  CloudRain,
  Waves,
  Wind,
  Sun,
  Flame,
  TreePine,
  Users,
  Swords,
  Network,
  Gauge,
  Save,
  RotateCcw,
  Search,
  ChevronRight,
  Check,
  Info,
} from 'lucide-react'

// ============= Types =============

interface SettingSection {
  id: string
  label: string
  icon: typeof Settings
  subsections?: { id: string; label: string }[]
}

interface Setting {
  id: string
  label: string
  description?: string
  type: 'toggle' | 'select' | 'input' | 'slider' | 'color' | 'keybinding'
  value: any
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
}

// ============= Settings Configuration =============

const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    subsections: [
      { id: 'appearance', label: 'Appearance' },
      { id: 'editor', label: 'Editor' },
      { id: 'keyboard', label: 'Keyboard Shortcuts' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & LLM',
    icon: Bot,
    subsections: [
      { id: 'models', label: 'Models' },
      { id: 'agents', label: 'Agents' },
      { id: 'budget', label: 'Budget' },
    ],
  },
  {
    id: 'engine',
    label: 'Engine Features',
    icon: Cpu,
    subsections: [
      { id: 'physics', label: 'Physics' },
      { id: 'rendering', label: 'Rendering' },
      { id: 'particles', label: 'Particles (Niagara)' },
      { id: 'animation', label: 'Animation' },
      { id: 'terrain', label: 'Terrain & Landscape' },
      { id: 'destruction', label: 'Destruction (Chaos)' },
      { id: 'networking', label: 'Networking' },
      { id: 'audio', label: 'Audio' },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: Zap,
    subsections: [
      { id: 'performance', label: 'Performance' },
      { id: 'experimental', label: 'Experimental' },
    ],
  },
]

// Engine settings based on the 28 systems discovered
const ENGINE_SETTINGS: Record<string, Setting[]> = {
  physics: [
    { id: 'physics.enabled', label: 'Enable Physics', description: 'Enable physics simulation', type: 'toggle', value: true },
    { id: 'physics.solver', label: 'Solver Type', type: 'select', value: 'pbd', options: [
      { value: 'pbd', label: 'Position Based Dynamics' },
      { value: 'xpbd', label: 'Extended PBD' },
      { value: 'impulse', label: 'Impulse Based' },
    ]},
    { id: 'physics.substeps', label: 'Substeps', description: 'Physics substeps per frame', type: 'slider', value: 4, min: 1, max: 16, step: 1 },
    { id: 'physics.gravity', label: 'Gravity (m/s²)', type: 'input', value: '-9.81' },
    { id: 'physics.broadphase', label: 'Broadphase', type: 'select', value: 'bvh', options: [
      { value: 'bvh', label: 'BVH' },
      { value: 'sap', label: 'Sweep and Prune' },
      { value: 'grid', label: 'Uniform Grid' },
    ]},
    { id: 'physics.cloth', label: 'Enable Cloth Simulation', type: 'toggle', value: true },
    { id: 'physics.softbody', label: 'Enable Soft Bodies', type: 'toggle', value: false },
  ],
  rendering: [
    { id: 'render.quality', label: 'Quality Preset', type: 'select', value: 'high', options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'ultra', label: 'Ultra' },
      { value: 'cinematic', label: 'Cinematic' },
    ]},
    { id: 'render.raytracing', label: 'Ray Tracing', type: 'toggle', value: false },
    { id: 'render.globalIllumination', label: 'Global Illumination', type: 'select', value: 'lumen', options: [
      { value: 'none', label: 'None' },
      { value: 'ssgi', label: 'Screen Space GI' },
      { value: 'lumen', label: 'Lumen' },
      { value: 'pathtracing', label: 'Path Tracing' },
    ]},
    { id: 'render.shadows', label: 'Shadow Quality', type: 'select', value: 'high', options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'raytraced', label: 'Ray Traced' },
    ]},
    { id: 'render.antialiasing', label: 'Anti-Aliasing', type: 'select', value: 'taa', options: [
      { value: 'none', label: 'None' },
      { value: 'fxaa', label: 'FXAA' },
      { value: 'taa', label: 'TAA' },
      { value: 'msaa', label: 'MSAA' },
      { value: 'dlss', label: 'DLSS' },
    ]},
    { id: 'render.volumetricFog', label: 'Volumetric Fog', type: 'toggle', value: true },
    { id: 'render.volumetricClouds', label: 'Volumetric Clouds', type: 'toggle', value: true },
    { id: 'render.nanite', label: 'Nanite (Virtualized Geometry)', type: 'toggle', value: true },
    { id: 'render.virtualTextures', label: 'Virtual Textures', type: 'toggle', value: true },
  ],
  particles: [
    { id: 'particles.enabled', label: 'Enable Niagara', type: 'toggle', value: true },
    { id: 'particles.maxCount', label: 'Max Particles', type: 'slider', value: 100000, min: 1000, max: 1000000, step: 1000 },
    { id: 'particles.gpuSimulation', label: 'GPU Simulation', type: 'toggle', value: true },
    { id: 'particles.collision', label: 'Particle Collision', type: 'toggle', value: true },
    { id: 'particles.lighting', label: 'Particle Lighting', type: 'select', value: 'per-particle', options: [
      { value: 'none', label: 'None' },
      { value: 'simple', label: 'Simple' },
      { value: 'per-particle', label: 'Per-Particle' },
      { value: 'volumetric', label: 'Volumetric' },
    ]},
    { id: 'particles.vfxGraph', label: 'VFX Graph Editor', type: 'toggle', value: true },
  ],
  animation: [
    { id: 'anim.blendSpaces', label: 'Blend Spaces', type: 'toggle', value: true },
    { id: 'anim.ik', label: 'Inverse Kinematics', type: 'select', value: 'full-body', options: [
      { value: 'none', label: 'Disabled' },
      { value: 'simple', label: 'Simple (Feet only)' },
      { value: 'full-body', label: 'Full Body IK' },
    ]},
    { id: 'anim.rootMotion', label: 'Root Motion', type: 'toggle', value: true },
    { id: 'anim.retargeting', label: 'Animation Retargeting', type: 'toggle', value: true },
    { id: 'anim.physicsBlend', label: 'Physics Blend', type: 'slider', value: 0.5, min: 0, max: 1, step: 0.1 },
    { id: 'anim.proceduralAnimation', label: 'Procedural Animation', type: 'toggle', value: true },
  ],
  terrain: [
    { id: 'terrain.streaming', label: 'World Partition Streaming', type: 'toggle', value: true },
    { id: 'terrain.lodLevels', label: 'LOD Levels', type: 'slider', value: 8, min: 1, max: 16, step: 1 },
    { id: 'terrain.tessellation', label: 'Tessellation', type: 'toggle', value: true },
    { id: 'terrain.foliage', label: 'Foliage System', type: 'toggle', value: true },
    { id: 'terrain.foliageDensity', label: 'Foliage Density', type: 'slider', value: 0.7, min: 0, max: 1, step: 0.1 },
    { id: 'terrain.proceduralGen', label: 'Procedural Generation', type: 'toggle', value: false },
    { id: 'terrain.waterSystem', label: 'Water System', type: 'select', value: 'advanced', options: [
      { value: 'simple', label: 'Simple Planes' },
      { value: 'basic', label: 'Basic Waves' },
      { value: 'advanced', label: 'Advanced (Gerstner)' },
      { value: 'ocean', label: 'Full Ocean Sim' },
    ]},
  ],
  destruction: [
    { id: 'chaos.enabled', label: 'Enable Chaos Destruction', type: 'toggle', value: true },
    { id: 'chaos.fractureDepth', label: 'Fracture Depth', type: 'slider', value: 3, min: 1, max: 8, step: 1 },
    { id: 'chaos.clusterSize', label: 'Cluster Size', type: 'slider', value: 0.5, min: 0.1, max: 2, step: 0.1 },
    { id: 'chaos.damageThreshold', label: 'Damage Threshold', type: 'input', value: '1000' },
    { id: 'chaos.debris', label: 'Debris Spawning', type: 'toggle', value: true },
    { id: 'chaos.dustEffects', label: 'Dust/Smoke Effects', type: 'toggle', value: true },
  ],
  networking: [
    { id: 'net.replication', label: 'Replication Mode', type: 'select', value: 'server-authoritative', options: [
      { value: 'server-authoritative', label: 'Server Authoritative' },
      { value: 'client-predicted', label: 'Client Predicted' },
      { value: 'p2p', label: 'Peer to Peer' },
    ]},
    { id: 'net.tickRate', label: 'Tick Rate (Hz)', type: 'slider', value: 60, min: 20, max: 128, step: 1 },
    { id: 'net.interpolation', label: 'Interpolation', type: 'toggle', value: true },
    { id: 'net.lag.compensation', label: 'Lag Compensation', type: 'toggle', value: true },
    { id: 'net.maxPlayers', label: 'Max Players', type: 'input', value: '100' },
  ],
  audio: [
    { id: 'audio.spatialAudio', label: 'Spatial Audio', type: 'toggle', value: true },
    { id: 'audio.occlusion', label: 'Audio Occlusion', type: 'toggle', value: true },
    { id: 'audio.reverb', label: 'Dynamic Reverb', type: 'toggle', value: true },
    { id: 'audio.maxVoices', label: 'Max Voices', type: 'slider', value: 64, min: 8, max: 256, step: 8 },
    { id: 'audio.quality', label: 'Audio Quality', type: 'select', value: 'high', options: [
      { value: 'low', label: 'Low (22kHz)' },
      { value: 'medium', label: 'Medium (44.1kHz)' },
      { value: 'high', label: 'High (48kHz)' },
    ]},
  ],
}

const AI_SETTINGS: Record<string, Setting[]> = {
  models: [
    { id: 'ai.defaultModel', label: 'Default Model', type: 'select', value: 'gpt-4o', options: [
      { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (OpenAI)' },
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Anthropic)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Google)' },
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    ]},
    { id: 'ai.codeModel', label: 'Code Generation Model', type: 'select', value: 'gpt-4o', options: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ]},
    { id: 'ai.embeddingModel', label: 'Embedding Model', type: 'select', value: 'text-embedding-3-small', options: [
      { value: 'text-embedding-3-small', label: 'OpenAI Small' },
      { value: 'text-embedding-3-large', label: 'OpenAI Large' },
    ]},
    { id: 'ai.temperature', label: 'Temperature', type: 'slider', value: 0.7, min: 0, max: 2, step: 0.1 },
    { id: 'ai.maxTokens', label: 'Max Tokens', type: 'input', value: '4096' },
  ],
  agents: [
    { id: 'agents.architect', label: 'Architect Agent', type: 'toggle', value: true },
    { id: 'agents.coder', label: 'Coder Agent', type: 'toggle', value: true },
    { id: 'agents.research', label: 'Research Agent', type: 'toggle', value: true },
    { id: 'agents.dream', label: 'AI Dream Agent', type: 'toggle', value: true },
    { id: 'agents.autoSelect', label: 'Auto-Select Agent', type: 'toggle', value: true },
  ],
  budget: [
    { id: 'budget.daily', label: 'Daily Budget ($)', type: 'input', value: '10.00' },
    { id: 'budget.monthly', label: 'Monthly Budget ($)', type: 'input', value: '100.00' },
    { id: 'budget.alert', label: 'Alert Threshold (%)', type: 'slider', value: 80, min: 50, max: 100, step: 5 },
    { id: 'budget.autoStop', label: 'Auto-Stop at Limit', type: 'toggle', value: true },
  ],
}

const GENERAL_SETTINGS: Record<string, Setting[]> = {
  appearance: [
    { id: 'theme', label: 'Theme', type: 'select', value: 'dark', options: [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
      { value: 'system', label: 'System' },
      { value: 'aethel-dark', label: 'Aethel Dark' },
      { value: 'aethel-light', label: 'Aethel Light' },
    ]},
    { id: 'accentColor', label: 'Accent Color', type: 'color', value: '#6366f1' },
    { id: 'fontSize', label: 'Font Size', type: 'slider', value: 14, min: 10, max: 24, step: 1 },
    { id: 'fontFamily', label: 'Font Family', type: 'select', value: 'jetbrains-mono', options: [
      { value: 'jetbrains-mono', label: 'JetBrains Mono' },
      { value: 'fira-code', label: 'Fira Code' },
      { value: 'cascadia-code', label: 'Cascadia Code' },
      { value: 'sf-mono', label: 'SF Mono' },
    ]},
    { id: 'iconTheme', label: 'Icon Theme', type: 'select', value: 'material', options: [
      { value: 'default', label: 'Default' },
      { value: 'material', label: 'Material' },
      { value: 'seti', label: 'Seti' },
    ]},
  ],
  editor: [
    { id: 'editor.tabSize', label: 'Tab Size', type: 'slider', value: 2, min: 1, max: 8, step: 1 },
    { id: 'editor.wordWrap', label: 'Word Wrap', type: 'toggle', value: false },
    { id: 'editor.minimap', label: 'Show Minimap', type: 'toggle', value: true },
    { id: 'editor.lineNumbers', label: 'Line Numbers', type: 'select', value: 'on', options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
      { value: 'relative', label: 'Relative' },
    ]},
    { id: 'editor.formatOnSave', label: 'Format on Save', type: 'toggle', value: true },
    { id: 'editor.autoSave', label: 'Auto Save', type: 'select', value: 'afterDelay', options: [
      { value: 'off', label: 'Off' },
      { value: 'afterDelay', label: 'After Delay' },
      { value: 'onFocusChange', label: 'On Focus Change' },
      { value: 'onWindowChange', label: 'On Window Change' },
    ]},
    { id: 'editor.bracketPairs', label: 'Bracket Pair Colorization', type: 'toggle', value: true },
    { id: 'editor.inlayHints', label: 'Inlay Hints', type: 'toggle', value: true },
  ],
  keyboard: [
    { id: 'key.commandPalette', label: 'Command Palette', type: 'keybinding', value: '⌘K' },
    { id: 'key.save', label: 'Save', type: 'keybinding', value: '⌘S' },
    { id: 'key.find', label: 'Find', type: 'keybinding', value: '⌘F' },
    { id: 'key.replace', label: 'Replace', type: 'keybinding', value: '⌘H' },
    { id: 'key.goToFile', label: 'Go to File', type: 'keybinding', value: '⌘P' },
    { id: 'key.goToLine', label: 'Go to Line', type: 'keybinding', value: '⌘G' },
    { id: 'key.toggleTerminal', label: 'Toggle Terminal', type: 'keybinding', value: '⌘J' },
    { id: 'key.toggleSidebar', label: 'Toggle Sidebar', type: 'keybinding', value: '⌘B' },
  ],
}

// ============= Setting Input Components =============

interface SettingInputProps {
  setting: Setting
  onChange: (value: any) => void
}

function SettingInput({ setting, onChange }: SettingInputProps) {
  switch (setting.type) {
    case 'toggle':
      return (
        <button
          onClick={() => onChange(!setting.value)}
          className={`
            w-11 h-6 rounded-full transition-colors relative
            ${setting.value ? 'bg-indigo-600' : 'bg-slate-700'}
          `}
        >
          <div className={`
            absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
            ${setting.value ? 'left-6' : 'left-1'}
          `} />
        </button>
      )

    case 'select':
      return (
        <select
          value={setting.value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
        >
          {setting.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )

    case 'input':
      return (
        <input
          type="text"
          value={setting.value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white w-32"
        />
      )

    case 'slider':
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={setting.value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-32 accent-indigo-600"
          />
          <span className="text-sm text-slate-400 w-12 text-right">{setting.value}</span>
        </div>
      )

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={setting.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded border border-slate-700 cursor-pointer"
          />
          <span className="text-sm text-slate-400 font-mono">{setting.value}</span>
        </div>
      )

    case 'keybinding':
      return (
        <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono">
          {setting.value}
        </button>
      )

    default:
      return null
  }
}

// ============= Main Component =============

export default function EngineSettingsPage() {
  const [activeSection, setActiveSection] = useState('general')
  const [activeSubsection, setActiveSubsection] = useState('appearance')
  const [searchQuery, setSearchQuery] = useState('')
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Get current settings based on selection
  const getCurrentSettings = useCallback((): Setting[] => {
    if (activeSection === 'general') {
      return GENERAL_SETTINGS[activeSubsection] || []
    }
    if (activeSection === 'ai') {
      return AI_SETTINGS[activeSubsection] || []
    }
    if (activeSection === 'engine') {
      return ENGINE_SETTINGS[activeSubsection] || []
    }
    return []
  }, [activeSection, activeSubsection])

  // Handle setting change
  const handleSettingChange = useCallback((id: string, value: any) => {
    setSettings(prev => ({ ...prev, [id]: value }))
    setHasChanges(true)
  }, [])

  // Save settings
  const handleSave = useCallback(() => {
    console.log('Saving settings:', settings)
    setHasChanges(false)
  }, [settings])

  // Reset settings
  const handleReset = useCallback(() => {
    setSettings({})
    setHasChanges(false)
  }, [])

  const currentSettings = getCurrentSettings()

  return (
    <div className="h-full flex bg-slate-950">
      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r border-slate-800">
        {/* Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto py-2">
          {SETTING_SECTIONS.map(section => (
            <div key={section.id}>
              <button
                onClick={() => {
                  setActiveSection(section.id)
                  if (section.subsections) {
                    setActiveSubsection(section.subsections[0].id)
                  }
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-sm
                  ${activeSection === section.id
                    ? 'text-white bg-slate-800/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }
                `}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>

              {/* Subsections */}
              {activeSection === section.id && section.subsections && (
                <div className="ml-4 pl-4 border-l border-slate-800">
                  {section.subsections.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubsection(sub.id)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-1.5 text-sm
                        ${activeSubsection === sub.id
                          ? 'text-indigo-400'
                          : 'text-slate-500 hover:text-slate-300'
                        }
                      `}
                    >
                      <ChevronRight className="w-3 h-3" />
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {SETTING_SECTIONS.find(s => s.id === activeSection)?.label}
            </h1>
            <p className="text-sm text-slate-400">
              {SETTING_SECTIONS.find(s => s.id === activeSection)?.subsections?.find(sub => sub.id === activeSubsection)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Settings List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-6">
            {currentSettings.map(setting => (
              <div key={setting.id} className="flex items-start justify-between gap-8 py-3 border-b border-slate-800/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{setting.label}</span>
                    {setting.description && (
                      <div className="group relative">
                        <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                        <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-slate-800 text-xs text-slate-300 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {setting.description}
                        </div>
                      </div>
                    )}
                  </div>
                  {setting.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
                  )}
                </div>
                <SettingInput
                  setting={{ ...setting, value: settings[setting.id] ?? setting.value }}
                  onChange={(value) => handleSettingChange(setting.id, value)}
                />
              </div>
            ))}

            {currentSettings.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No settings available for this section</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
