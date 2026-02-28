'use client'

import React, { useState } from 'react'
import { Clapperboard, Film, Play, Pause, SkipBack, SkipForward, Settings, Layers, Eye, Shield, CheckCircle, AlertCircle, Sparkles, Wand2, Box } from 'lucide-react'

interface Shot {
  id: string
  title: string
  status: 'draft' | 'rendering' | 'completed' | 'error'
  continuityScore: number
  visualQuality: 'low' | 'medium' | 'high' | 'aaa'
}

export default function DirectorMode() {
  const [shots, setShots] = useState<Shot[]>([
    { id: '1', title: 'Abertura Cinemática', status: 'completed', continuityScore: 0.98, visualQuality: 'aaa' },
    { id: '2', title: 'Combate em Tempo Real', status: 'rendering', continuityScore: 0.92, visualQuality: 'high' },
    { id: '3', title: 'Exploração de Ambiente', status: 'draft', continuityScore: 0, visualQuality: 'medium' }
  ])

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-600/20 rounded-lg border border-pink-500/30">
            <Clapperboard className="text-pink-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider">Director Mode</h2>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Continuity & Visual Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Engine AAA Online</span>
        </div>
      </div>

      {/* Timeline / Shot List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Film size={14} /> Linha de Tempo de Produção
        </h3>
        <div className="space-y-3">
          {shots.map(shot => (
            <div key={shot.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    shot.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    shot.status === 'rendering' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {shot.id}
                  </div>
                  <span className="text-sm font-bold text-zinc-200">{shot.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    shot.visualQuality === 'aaa' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    shot.visualQuality === 'high' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {shot.visualQuality}
                  </span>
                  <Settings size={14} className="text-zinc-600 hover:text-zinc-300 cursor-pointer" />
                </div>
              </div>

              {/* Progress / Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">
                    <span>Continuidade</span>
                    <span>{Math.round(shot.continuityScore * 100)}%</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${shot.continuityScore * 100}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {shot.status === 'completed' ? (
                    <CheckCircle size={14} className="text-emerald-500" />
                  ) : shot.status === 'rendering' ? (
                    <Sparkles size={14} className="text-blue-400 animate-pulse" />
                  ) : (
                    <AlertCircle size={14} className="text-zinc-600" />
                  )}
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{shot.status}</span>
                </div>
              </div>

              {/* Action Overlay (Hover) */}
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300 transition-colors"><Play size={20} /></button>
                <button className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors"><Wand2 size={20} /></button>
                <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300 transition-colors"><Eye size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center justify-center gap-6 mb-4">
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><SkipBack size={20} /></button>
          <button className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-200 transition-colors"><Play size={24} /></button>
          <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><SkipForward size={20} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button className="flex flex-col items-center gap-1 p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
            <Layers size={16} className="text-blue-400" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Camadas</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
            <Shield size={16} className="text-emerald-400" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Qualidade</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
            <Box size={16} className="text-purple-400" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Assets</span>
          </button>
        </div>
      </div>
    </div>
  )
}
