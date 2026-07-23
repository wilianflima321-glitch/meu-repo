import React, { useState } from 'react';
import { Activity, ShieldAlert, Cpu, HardDrive, Thermometer, RefreshCw } from 'lucide-react';

export const SentinelHardwareMonitorPanel: React.FC = () => {
  const [gpuTemp, setGpuTemp] = useState(62);
  const [vramSliceMb, setVramSliceMb] = useState(256);
  const [agentHappiness, setAgentHappiness] = useState(98.5);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-bold tracking-wide bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
            Kernel 0 Sentinel & Hardware Resilience
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 font-mono font-semibold">
          SYSTEM HEALTHY
        </span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-3 my-4">
        {/* GPU Temp */}
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>GPU Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-2">
            {gpuTemp}°C
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
            Safe-Bound (&lt;80°C)
          </div>
        </div>

        {/* Virtual VRAM Pager */}
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>VRAM Neural Slice</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-mono font-bold text-cyan-300 mt-2">
            {vramSliceMb} MB
          </div>
          <div className="text-[10px] text-cyan-400 font-semibold mt-1">
            Overflow Blocked
          </div>
        </div>

        {/* Agent Health */}
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hardware Happiness</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-2">
            {agentHappiness}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            60s Health Check Active
          </div>
        </div>
      </div>

      {/* WASM Micro-Kernel Health Table */}
      <div className="flex-1 bg-slate-900/80 rounded-lg border border-slate-800 p-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          WASM Micro-Kernel Isolation Status
        </div>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-200">kernel-vfx (Magia & Partículas)</span>
            <span className="text-emerald-400 font-bold">RUNNING</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-200">kernel-phys (P4/P7 Física)</span>
            <span className="text-emerald-400 font-bold">RUNNING</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-200">kernel-ai-local (IA de Baixa Latência)</span>
            <span className="text-emerald-400 font-bold">RUNNING</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-200">kernel-lux (Raymarcher Espectral)</span>
            <span className="text-emerald-400 font-bold">RUNNING</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-200">kernel-netcode (Serializador Binário zero-alloc)</span>
            <span className="text-emerald-400 font-bold">RUNNING</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-200">kernel-ast (Indexador Simbólico AST)</span>
            <span className="text-emerald-400 font-bold">RUNNING</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-slate-200">kernel-fallback (RTX 3060 Tier 2 / Tier 0 Legacy Auto)</span>
            <span className="text-emerald-400 font-bold">TIER 2 ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
