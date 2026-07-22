import React, { useState } from 'react';
import { Palette, Sparkles, Droplets, Sun, Feather, Eye } from 'lucide-react';

export const AestheticStyleStudioPanel: React.FC = () => {
  const [aestheticPreset, setAestheticPreset] = useState<'PhotorealisticPbr' | 'PainterlyCellContour' | 'HalftoneComic' | 'HandDrawn2dAnime'>('PainterlyCellContour');
  const [fluidChemistry, setFluidChemistry] = useState<'HemoglobinRed' | 'HemocyaninBlue' | 'AcidGreen' | 'BioluminescentGold'>('BioluminescentGold');
  const [inkStrokeWidth, setInkStrokeWidth] = useState(2.4);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold tracking-wide bg-gradient-to-r from-amber-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Aethel Aesthetic & Chromatic Fluid Studio
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/50 font-mono font-semibold">
          NPR KERNEL ACTIVE
        </span>
      </div>

      {/* Preset Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Rendering Aesthetic Shading Preset
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAestheticPreset('PhotorealisticPbr')}
            className={`p-2.5 text-xs font-bold rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
              aestheticPreset === 'PhotorealisticPbr'
                ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Photorealistic PBR</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={() => setAestheticPreset('PainterlyCellContour')}
            className={`p-2.5 text-xs font-bold rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
              aestheticPreset === 'PainterlyCellContour'
                ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-md shadow-purple-950'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Painterly Cell Contour</span>
            <Feather className="w-4 h-4 text-purple-400" />
          </button>

          <button
            onClick={() => setAestheticPreset('HalftoneComic')}
            className={`p-2.5 text-xs font-bold rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
              aestheticPreset === 'HalftoneComic'
                ? 'bg-pink-900/60 border-pink-500 text-pink-200 shadow-md shadow-pink-950'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Halftone Comic Ink</span>
            <Sparkles className="w-4 h-4 text-pink-400" />
          </button>

          <button
            onClick={() => setAestheticPreset('HandDrawn2dAnime')}
            className={`p-2.5 text-xs font-bold rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
              aestheticPreset === 'HandDrawn2dAnime'
                ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Hand-Drawn 2D Anime</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Chromatic Fluid Selector */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Universal Entity Fluid Chemistry & SSS
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setFluidChemistry('HemoglobinRed')}
            className={`p-2 text-xs font-semibold rounded-md border flex items-center gap-2 transition-all cursor-pointer ${
              fluidChemistry === 'HemoglobinRed'
                ? 'bg-red-950/80 border-red-500 text-red-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-red-500" />
            <span>Hemoglobin Red</span>
          </button>

          <button
            onClick={() => setFluidChemistry('HemocyaninBlue')}
            className={`p-2 text-xs font-semibold rounded-md border flex items-center gap-2 transition-all cursor-pointer ${
              fluidChemistry === 'HemocyaninBlue'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hemocyanin Blue</span>
          </button>

          <button
            onClick={() => setFluidChemistry('AcidGreen')}
            className={`p-2 text-xs font-semibold rounded-md border flex items-center gap-2 transition-all cursor-pointer ${
              fluidChemistry === 'AcidGreen'
                ? 'bg-lime-950/80 border-lime-500 text-lime-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-lime-400" />
            <span>Hemolymph Green</span>
          </button>

          <button
            onClick={() => setFluidChemistry('BioluminescentGold')}
            className={`p-2 text-xs font-semibold rounded-md border flex items-center gap-2 transition-all cursor-pointer ${
              fluidChemistry === 'BioluminescentGold'
                ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-amber-400" />
            <span>Bioluminescent Gold</span>
          </button>
        </div>
      </div>

      {/* Dynamic Stroke Width Slider */}
      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-slate-400 font-semibold">Dynamic Ink Contour Width</span>
          <span className="font-mono text-amber-400 font-bold">{inkStrokeWidth}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={inkStrokeWidth}
          onChange={(e) => setInkStrokeWidth(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
      </div>
    </div>
  );
};
