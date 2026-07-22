import React, { useState } from 'react';
import { Film, Play, Pause, Video, Disc, Sliders, Volume2, Sparkles } from 'lucide-react';

export const CinemaCompositorTimelinePanel: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(120);
  const [exportFormat, setExportFormat] = useState<'ProRes4444Xq' | 'OpenExrFloat16' | 'RawAethelStream'>('ProRes4444Xq');
  const [selectedShot, setSelectedShot] = useState('Plano Fechado no Olho ao Pôr do Sol');

  const handleExport = () => {
    alert(`Exporting Zero-Loss Master in ${exportFormat} format at Frame ${currentFrame}!`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h2 className="text-lg font-bold tracking-wide bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Aethel Cinema Compositor & Director Timeline
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 font-mono font-semibold">
            ZERO-LOSS PRORES 4444 ACTIVE
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
          >
            <Disc className="w-4 h-4" /> Export Cinema Master
          </button>
        </div>
      </div>

      {/* Main Director Storyboard Control */}
      <div className="grid grid-cols-3 gap-4 my-4">
        <div className="col-span-2 p-3 bg-slate-900/80 rounded-lg border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Agentic Storyboard Directive
            </div>
            <div className="text-sm font-medium text-purple-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              "{selectedShot}"
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span>Lens: <strong className="text-slate-200">105mm Anamorphic 2x</strong></span>
            <span>Aperture: <strong className="text-slate-200">f/1.4</strong></span>
            <span>Lighting: <strong className="text-amber-300">Golden Hour Rembrandt</strong></span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Export Master Settings
          </div>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="mt-2 bg-slate-950 border border-slate-700 text-xs rounded-md p-2 text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value="ProRes4444Xq">ProRes 4444 XQ (16-bit Master)</option>
            <option value="OpenExrFloat16">OpenEXR Float16 Linear</option>
            <option value="RawAethelStream">Raw Aethel Spectral Stream</option>
          </select>
        </div>
      </div>

      {/* Timeline Controls & Scrubber */}
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="font-mono text-sm text-indigo-300">
            FRAME <span className="text-white font-bold">{currentFrame}</span> / 1800 (00:05:00)
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>FPS: <strong className="text-emerald-400">82.4 Live</strong></span>
          <span>Buffer: <strong className="text-indigo-400">0ms Lag</strong></span>
        </div>
      </div>

      {/* Multi-Track Timeline Visualizer */}
      <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-3 space-y-2 font-mono text-xs overflow-y-auto">
        <div className="flex items-center gap-3 bg-indigo-950/40 p-2 rounded border border-indigo-800/40">
          <Video className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="w-28 text-indigo-300 font-bold">Track 1: Camera</span>
          <div className="flex-1 bg-indigo-900/60 h-5 rounded relative overflow-hidden flex items-center px-2 text-[10px] text-indigo-200">
            [000 - 450] Anamorphic Close-up (Eye) ➔ Sunset Wide Transition
          </div>
        </div>

        <div className="flex items-center gap-3 bg-purple-950/40 p-2 rounded border border-purple-800/40">
          <Sliders className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="w-28 text-purple-300 font-bold">Track 2: Shading</span>
          <div className="flex-1 bg-purple-900/60 h-5 rounded relative overflow-hidden flex items-center px-2 text-[10px] text-purple-200">
            Photorealistic PBR ➔ Stylized Painterly 4-Band Cell Morphing
          </div>
        </div>

        <div className="flex items-center gap-3 bg-pink-950/40 p-2 rounded border border-pink-800/40">
          <Volume2 className="w-4 h-4 text-pink-400 shrink-0" />
          <span className="w-28 text-pink-300 font-bold">Track 3: Audio Sync</span>
          <div className="flex-1 bg-pink-900/60 h-5 rounded relative overflow-hidden flex items-center px-2 text-[10px] text-pink-200">
            Multilingual Viseme Lip-Sync (Facial Muscle Retargeting)
          </div>
        </div>
      </div>
    </div>
  );
};
