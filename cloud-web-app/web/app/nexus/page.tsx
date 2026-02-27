'use client'

import { useState } from 'react'
import NexusCanvas from '@/components/NexusCanvas'
import NexusChatMultimodal from '@/components/nexus/NexusChatMultimodal'
import { 
  Search, Bell, Settings, User, Grid, Layout, 
  Activity, Zap, Shield, Database, Cloud, Share2, Plus, Home,
  Cpu, Terminal, Layers, Wand2
} from 'lucide-react'

export default function NexusPage() {
  const [isAIPainting, setIsAIPainting] = useState(false)
  const [canvasMode, setCanvasMode] = useState<'3d' | 'ui' | 'code'>('3d')

  return (
    <div className="flex h-screen bg-black text-zinc-100 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Nexus Sidebar (Vertical Slim) */}
      <aside className="w-16 flex flex-col items-center py-6 border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-2xl z-20">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-10 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
          <Activity size={24} className="text-white" />
        </div>
        
        <nav className="flex-1 flex flex-col gap-6">
          <button className="p-2 text-blue-400 bg-blue-500/10 rounded-lg border border-blue-500/20"><Home size={22} /></button>
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Grid size={22} /></button>
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Cpu size={22} /></button>
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Database size={22} /></button>
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Cloud size={22} /></button>
          <div className="h-px w-6 bg-zinc-800 mx-auto"></div>
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Plus size={22} /></button>
        </nav>

        <div className="flex flex-col gap-6 mt-auto">
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Settings size={22} /></button>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
            <User size={18} className="text-zinc-400" />
          </div>
        </div>
      </aside>

      {/* Main Nexus Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Nexus Top Bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">The Nexus</h1>
            <div className="h-4 w-px bg-zinc-800"></div>
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Aethel Core Online</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search Nexus..." 
                className="bg-zinc-900/50 border border-zinc-800 rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-64"
              />
            </div>
            <button className="p-2 text-zinc-400 hover:text-zinc-100 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-zinc-950"></span>
            </button>
            <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20">
              Deploy
            </button>
          </div>
        </header>

        {/* Nexus Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Project Explorer / Context (Optional) */}
          <div className="w-64 border-r border-zinc-800 bg-zinc-950/30 flex flex-col hidden lg:flex">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Project Context</h2>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-blue-400 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <Layout size={14} /> <span>Aethel Engine V2</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-900 rounded-lg transition-colors">
                  <Activity size={14} /> <span>Reality Matrix</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-900 rounded-lg transition-colors">
                  <Shield size={14} /> <span>Quality Gates</span>
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Live Assets</h2>
              {/* Asset List Simulation */}
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                    <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-zinc-500 font-mono text-[10px]">3D</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate">Asset_Prototype_0{i}.obj</p>
                      <p className="text-[9px] text-zinc-600 uppercase">Optimized</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: The Nexus Canvas */}
          <div className="flex-1 flex flex-col p-4 bg-[#020202]">
            <NexusCanvas 
              mode={canvasMode} 
              onSelectElement={(id, pos) => console.log('Selected:', id, pos)}
              isAIPainting={isAIPainting}
              content={null}
            />
          </div>

          {/* Right: The Nexus Chat (Multimodal) */}
          <div className="w-96 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-10">
            <NexusChatMultimodal />
          </div>
        </div>
      </main>
    </div>
  )
}
