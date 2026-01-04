'use client'

import dynamic from 'next/dynamic'
import { useState, Suspense } from 'react'
import IDELayout from '@/components/ide/IDELayout'
import FileExplorerPro from '@/components/ide/FileExplorerPro'
import GitPanelPro from '@/components/ide/GitPanelPro'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'
import EngineSettingsPage from '@/components/ide/EngineSettingsPage'

// Lazy load heavy components
const MultiTerminalPanel = dynamic(
  () => import('@/components/terminal/XTerminal').then(mod => ({ default: mod.MultiTerminalPanel })),
  {
    ssr: false,
    loading: () => <TerminalSkeleton />,
  }
)

// ============= Skeleton Components =============

function TerminalSkeleton() {
  return (
    <div className="h-full bg-slate-950 p-4">
      <div className="flex items-center gap-2 text-slate-600">
        <div className="w-2 h-4 bg-slate-700 animate-pulse" />
        <span>Loading terminal...</span>
      </div>
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="h-full bg-slate-950 flex items-center justify-center">
      <div className="text-slate-500 animate-pulse">Loading editor...</div>
    </div>
  )
}

// ============= Editor Tool Content =============

type EditorTool = 
  | 'code-editor'
  | 'visual-scripting'
  | '3d-viewport'
  | 'level-editor'
  | 'material-editor'
  | 'animation-editor'
  | 'particle-editor'
  | 'landscape-editor'
  | 'sequencer'
  | 'settings'

function EditorContent({ tool }: { tool: EditorTool }) {
  switch (tool) {
    case 'settings':
      return <EngineSettingsPage />
    case 'code-editor':
      return <MonacoPlaceholder />
    case 'visual-scripting':
      return <VisualScriptingPlaceholder />
    case '3d-viewport':
      return <ViewportPlaceholder />
    case 'level-editor':
      return <LevelEditorPlaceholder />
    case 'material-editor':
      return <MaterialEditorPlaceholder />
    case 'animation-editor':
      return <AnimationEditorPlaceholder />
    case 'particle-editor':
      return <ParticleEditorPlaceholder />
    case 'landscape-editor':
      return <LandscapeEditorPlaceholder />
    case 'sequencer':
      return <SequencerPlaceholder />
    default:
      return <MonacoPlaceholder />
  }
}

// ============= Placeholder Components =============

function MonacoPlaceholder() {
  return (
    <div className="h-full bg-slate-950 p-4 font-mono text-sm">
      <div className="flex items-center gap-3 mb-4 text-slate-500 border-b border-slate-800 pb-2">
        <span className="text-indigo-400">App.tsx</span>
        <span>×</span>
        <span className="text-slate-600">index.tsx</span>
        <span className="text-slate-600">styles.css</span>
      </div>
      <div className="space-y-1">
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">1</span>
          <span className="text-purple-400">import</span>
          <span className="text-white ml-2">{'{'}</span>
          <span className="text-cyan-400 ml-1">useState</span>
          <span className="text-white">{'}'}</span>
          <span className="text-purple-400 ml-2">from</span>
          <span className="text-emerald-400 ml-2">'react'</span>
        </div>
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">2</span>
        </div>
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">3</span>
          <span className="text-purple-400">export</span>
          <span className="text-purple-400 ml-2">default</span>
          <span className="text-purple-400 ml-2">function</span>
          <span className="text-yellow-400 ml-2">App</span>
          <span className="text-white">()</span>
          <span className="text-white ml-2">{'{'}</span>
        </div>
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">4</span>
          <span className="ml-8 text-purple-400">const</span>
          <span className="text-white ml-2">[</span>
          <span className="text-cyan-400">count</span>
          <span className="text-white">,</span>
          <span className="text-cyan-400 ml-1">setCount</span>
          <span className="text-white">]</span>
          <span className="text-white ml-2">=</span>
          <span className="text-yellow-400 ml-2">useState</span>
          <span className="text-white">(</span>
          <span className="text-orange-400">0</span>
          <span className="text-white">)</span>
        </div>
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">5</span>
        </div>
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">6</span>
          <span className="ml-8 text-purple-400">return</span>
          <span className="text-white ml-2">(</span>
        </div>
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">7</span>
          <span className="ml-12 text-slate-400">{'<'}</span>
          <span className="text-blue-400">div</span>
          <span className="text-slate-400">{'>'}</span>
        </div>
        <div className="flex">
          <span className="w-12 text-slate-600 select-none">8</span>
          <span className="ml-16 text-slate-400">{'<'}</span>
          <span className="text-blue-400">h1</span>
          <span className="text-slate-400">{'>'}</span>
          <span className="text-white">Aethel Engine</span>
          <span className="text-slate-400">{'</'}</span>
          <span className="text-blue-400">h1</span>
          <span className="text-slate-400">{'>'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-12 text-slate-600 select-none">9</span>
          <span className="ml-16 w-2 h-5 bg-indigo-500 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function VisualScriptingPlaceholder() {
  return (
    <div className="h-full bg-slate-900 relative overflow-hidden">
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Sample nodes */}
      <div className="absolute top-20 left-20 w-48 bg-slate-800 rounded-lg border border-slate-700 shadow-xl">
        <div className="px-3 py-2 bg-emerald-600 rounded-t-lg text-sm font-medium">Event: Begin Play</div>
        <div className="p-3">
          <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
            <span>Exec</span>
            <div className="w-3 h-3 border-2 border-white rounded-sm" />
          </div>
        </div>
      </div>

      <div className="absolute top-20 left-80 w-48 bg-slate-800 rounded-lg border border-slate-700 shadow-xl">
        <div className="px-3 py-2 bg-blue-600 rounded-t-lg text-sm font-medium">Print String</div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 bg-white rounded-sm" />
            <span>Exec</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-pink-400 rounded-full" />
            <span className="text-pink-400">String</span>
          </div>
        </div>
      </div>

      {/* Connection line */}
      <svg className="absolute inset-0 pointer-events-none">
        <path
          d="M 262 70 C 300 70, 280 70, 320 70"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
        />
      </svg>

      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 px-4 py-2 bg-slate-800/80 backdrop-blur rounded-lg text-sm text-slate-400">
        Visual Scripting Editor (Blueprint-style)
      </div>
    </div>
  )
}

function ViewportPlaceholder() {
  return (
    <div className="h-full bg-gradient-to-b from-slate-800 to-slate-900 relative">
      {/* Fake 3D grid */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="w-full h-full opacity-30"
          style={{
            background: `
              linear-gradient(90deg, #334155 1px, transparent 1px),
              linear-gradient(#334155 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Cube */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-24 h-24 bg-indigo-500/50 border-2 border-indigo-400 transform rotate-45" />
      </div>

      {/* Gizmo */}
      <div className="absolute bottom-20 left-20">
        <div className="relative w-16 h-16">
          <div className="absolute bottom-0 left-1/2 w-0.5 h-12 bg-green-500 -translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-12 h-0.5 bg-red-500" />
          <div className="absolute bottom-0 left-1/2 w-0.5 h-8 bg-blue-500 -translate-x-1/2 -rotate-45 origin-bottom" />
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-green-500 text-xs">Y</span>
          <span className="absolute bottom-0 -right-4 text-red-500 text-xs">X</span>
          <span className="absolute top-2 right-0 text-blue-500 text-xs">Z</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-slate-800/80 backdrop-blur rounded-lg">
        <button className="px-2 py-1 text-xs bg-slate-700 rounded">Select</button>
        <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded">Move</button>
        <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded">Rotate</button>
        <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded">Scale</button>
      </div>

      {/* Info */}
      <div className="absolute bottom-4 right-4 px-4 py-2 bg-slate-800/80 backdrop-blur rounded-lg text-sm text-slate-400">
        3D Viewport (WebGPU/Three.js)
      </div>
    </div>
  )
}

function LevelEditorPlaceholder() {
  return (
    <div className="h-full bg-slate-900 flex">
      {/* Outliner */}
      <div className="w-64 border-r border-slate-800 p-2">
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">World Outliner</div>
        <div className="space-y-1 text-sm">
          <div className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">⊕ DirectionalLight</div>
          <div className="px-2 py-1 hover:bg-slate-800 rounded">⊕ SkyAtmosphere</div>
          <div className="px-2 py-1 hover:bg-slate-800 rounded">⊕ Floor_Mesh</div>
          <div className="px-2 py-1 hover:bg-slate-800 rounded">⊕ PlayerStart</div>
          <div className="px-2 py-1 hover:bg-slate-800 rounded">⊕ BP_GameMode</div>
        </div>
      </div>
      
      {/* Viewport */}
      <div className="flex-1 relative">
        <ViewportPlaceholder />
      </div>

      {/* Details */}
      <div className="w-72 border-l border-slate-800 p-2">
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Details</div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-slate-400 text-xs mb-1">Transform</div>
            <div className="grid grid-cols-3 gap-1">
              <input className="px-2 py-1 bg-slate-800 rounded text-xs" placeholder="X" defaultValue="0" />
              <input className="px-2 py-1 bg-slate-800 rounded text-xs" placeholder="Y" defaultValue="0" />
              <input className="px-2 py-1 bg-slate-800 rounded text-xs" placeholder="Z" defaultValue="0" />
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Light Intensity</div>
            <input type="range" className="w-full accent-indigo-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MaterialEditorPlaceholder() {
  return (
    <div className="h-full bg-slate-900 flex">
      {/* Node graph */}
      <div className="flex-1 relative">
        <VisualScriptingPlaceholder />
        <div className="absolute bottom-4 right-4 px-4 py-2 bg-slate-800/80 backdrop-blur rounded-lg text-sm text-slate-400">
          Material Graph Editor
        </div>
      </div>
      
      {/* Preview */}
      <div className="w-80 border-l border-slate-800 p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase mb-3">Material Preview</div>
        <div className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 shadow-2xl" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Shader Model</span>
            <span>PBR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Blend Mode</span>
            <span>Opaque</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnimationEditorPlaceholder() {
  return (
    <div className="h-full bg-slate-900 flex flex-col">
      {/* Viewport */}
      <div className="flex-1 relative">
        <ViewportPlaceholder />
      </div>
      
      {/* Timeline */}
      <div className="h-48 border-t border-slate-800 p-2">
        <div className="flex items-center gap-4 mb-2">
          <button className="p-1 hover:bg-slate-800 rounded">▶</button>
          <button className="p-1 hover:bg-slate-800 rounded">⏸</button>
          <button className="p-1 hover:bg-slate-800 rounded">⏹</button>
          <span className="text-sm text-slate-400">0:00 / 2:30</span>
        </div>
        <div className="space-y-1">
          {['Root', 'Spine', 'L_Arm', 'R_Arm', 'L_Leg', 'R_Leg'].map(bone => (
            <div key={bone} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-slate-400">{bone}</span>
              <div className="flex-1 h-4 bg-slate-800 rounded relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full" />
                <div className="absolute left-20 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full" />
                <div className="absolute left-40 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ParticleEditorPlaceholder() {
  return (
    <div className="h-full bg-slate-900 flex">
      {/* Emitter stack */}
      <div className="w-64 border-r border-slate-800 p-2">
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Emitter Stack</div>
        <div className="space-y-2">
          <div className="p-2 bg-orange-500/20 border border-orange-500/50 rounded text-sm">
            <div className="font-medium text-orange-300">Emitter: Sparks</div>
            <div className="text-xs text-slate-400 mt-1">GPU • 10,000 particles</div>
          </div>
          <div className="p-2 bg-blue-500/20 border border-blue-500/50 rounded text-sm">
            <div className="font-medium text-blue-300">Emitter: Smoke</div>
            <div className="text-xs text-slate-400 mt-1">GPU • 500 particles</div>
          </div>
        </div>
      </div>
      
      {/* Preview */}
      <div className="flex-1 relative bg-slate-950">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Simulated particles */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-orange-400 rounded-full animate-ping"
              style={{
                left: `${45 + Math.random() * 10}%`,
                top: `${40 + Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>
        <div className="absolute bottom-4 right-4 px-4 py-2 bg-slate-800/80 backdrop-blur rounded-lg text-sm text-slate-400">
          Niagara Particle System
        </div>
      </div>
      
      {/* Properties */}
      <div className="w-72 border-l border-slate-800 p-2">
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Module Properties</div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-slate-400 text-xs mb-1">Spawn Rate</div>
            <input type="range" className="w-full accent-orange-600" defaultValue="70" />
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Lifetime</div>
            <input className="w-full px-2 py-1 bg-slate-800 rounded text-xs" defaultValue="2.0" />
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Initial Velocity</div>
            <div className="grid grid-cols-3 gap-1">
              <input className="px-2 py-1 bg-slate-800 rounded text-xs" defaultValue="0" />
              <input className="px-2 py-1 bg-slate-800 rounded text-xs" defaultValue="100" />
              <input className="px-2 py-1 bg-slate-800 rounded text-xs" defaultValue="0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LandscapeEditorPlaceholder() {
  return (
    <div className="h-full bg-slate-900 flex">
      {/* Tools */}
      <div className="w-64 border-r border-slate-800 p-2">
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Sculpt Tools</div>
        <div className="grid grid-cols-3 gap-1 mb-4">
          {['Sculpt', 'Smooth', 'Flatten', 'Erosion', 'Noise', 'Paint'].map(tool => (
            <button
              key={tool}
              className="p-2 text-xs bg-slate-800 hover:bg-slate-700 rounded"
            >
              {tool}
            </button>
          ))}
        </div>
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Brush Settings</div>
        <div className="space-y-2">
          <div>
            <div className="text-xs text-slate-400 mb-1">Size</div>
            <input type="range" className="w-full accent-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Strength</div>
            <input type="range" className="w-full accent-emerald-600" />
          </div>
        </div>
      </div>
      
      {/* Viewport */}
      <div className="flex-1 relative">
        <ViewportPlaceholder />
        <div className="absolute bottom-4 right-4 px-4 py-2 bg-slate-800/80 backdrop-blur rounded-lg text-sm text-slate-400">
          Landscape Editor
        </div>
      </div>
      
      {/* Layers */}
      <div className="w-64 border-l border-slate-800 p-2">
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Terrain Layers</div>
        <div className="space-y-2">
          {[
            { name: 'Grass', color: 'bg-emerald-500' },
            { name: 'Dirt', color: 'bg-amber-700' },
            { name: 'Rock', color: 'bg-slate-500' },
            { name: 'Snow', color: 'bg-white' },
          ].map(layer => (
            <div key={layer.name} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
              <div className={`w-8 h-8 ${layer.color} rounded`} />
              <span className="text-sm">{layer.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SequencerPlaceholder() {
  return (
    <div className="h-full bg-slate-900 flex flex-col">
      {/* Viewport preview */}
      <div className="h-1/2 relative border-b border-slate-800">
        <ViewportPlaceholder />
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 rounded text-xs font-medium">
          ● REC
        </div>
      </div>
      
      {/* Sequencer timeline */}
      <div className="flex-1 p-2 overflow-auto">
        <div className="flex items-center gap-4 mb-3">
          <button className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded">⏮</button>
          <button className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded">▶</button>
          <button className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded">⏭</button>
          <span className="text-sm font-mono text-slate-400">00:00:00:00</span>
          <span className="text-sm text-slate-500">/ 00:01:30:00</span>
        </div>
        
        {/* Tracks */}
        <div className="space-y-1">
          {[
            { name: 'Camera_Main', type: 'camera', color: 'bg-purple-500' },
            { name: 'Character_Hero', type: 'actor', color: 'bg-blue-500' },
            { name: 'Audio_BGM', type: 'audio', color: 'bg-emerald-500' },
            { name: 'FX_Explosion', type: 'particle', color: 'bg-orange-500' },
          ].map(track => (
            <div key={track.name} className="flex items-center gap-2">
              <div className="w-40 flex items-center gap-2 px-2 py-1.5 bg-slate-800 rounded-l text-sm">
                <div className={`w-2 h-2 ${track.color} rounded-full`} />
                <span className="truncate">{track.name}</span>
              </div>
              <div className="flex-1 h-8 bg-slate-800/50 rounded-r relative">
                <div className={`absolute top-1 bottom-1 left-10 right-20 ${track.color}/30 rounded`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============= Main Page Component =============

export default function IDEPage() {
  const [activeTool, setActiveTool] = useState<EditorTool>('code-editor')

  return (
    <IDELayout
      fileExplorer={<FileExplorerPro />}
      gitPanel={<GitPanelPro />}
      aiChatPanel={<AIChatPanelPro />}
      terminal={
        <Suspense fallback={<TerminalSkeleton />}>
          <MultiTerminalPanel />
        </Suspense>
      }
    >
      <EditorContent tool={activeTool} />
    </IDELayout>
  )
}
