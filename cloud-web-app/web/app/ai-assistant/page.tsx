'use client';

/**
 * Aethel AI Assistant Page
 * Interface principal de IA com chat moderno e preview integrado
 * Design profissional estilo GitHub Copilot + Gemini
 */

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  PanelRightClose,
  PanelRight,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Layers,
  Box,
  Move3D,
  Sun,
  Moon,
  Grid3X3,
  Camera,
  Wand2,
  MessageSquare,
  Code2,
  Terminal,
  ChevronDown,
  X,
} from 'lucide-react';

// Dynamic imports para componentes pesados
const ModernAIChat = dynamic(() => import('@/components/chat/ModernAIChat'), {
  ssr: false,
  loading: () => <ChatSkeleton />,
});

const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
);

// ============= Skeletons =============

function ChatSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-950">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 animate-pulse mb-4" />
      <div className="w-48 h-4 bg-gray-800 rounded animate-pulse mb-2" />
      <div className="w-32 h-3 bg-gray-800 rounded animate-pulse" />
    </div>
  );
}

// ============= 3D Preview Component =============

function PreviewScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#06b6d4" metalness={0.3} roughness={0.4} />
      </mesh>
      
      <mesh position={[2.5, 0, 0]} castShadow>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.5} roughness={0.2} />
      </mesh>
      
      <mesh position={[-2.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.5, 32]} />
        <meshStandardMaterial color="#22c55e" metalness={0.4} roughness={0.3} />
      </mesh>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" metalness={0.1} roughness={0.9} />
      </mesh>
      
      <gridHelper args={[20, 20, '#374151', '#1f2937']} position={[0, -0.99, 0]} />
    </>
  );
}

function LivePreviewPanel({ onClose }: { onClose: () => void }) {
  const [viewMode, setViewMode] = useState<'perspective' | 'top' | 'front'>('perspective');
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="h-full flex flex-col bg-gray-950 border-l border-white/10">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Live Preview</span>
          </div>
          
          {/* View Mode Selector */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5">
            {(['perspective', 'top', 'front'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === mode 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/5 text-gray-400'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
            <Camera className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Canvas
            shadows
            camera={{ position: [5, 5, 5], fov: 50 }}
            className="!absolute inset-0"
          >
            <PreviewScene />
          </Canvas>
        </Suspense>

        {/* Overlay Tools */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {[
            { icon: Move3D, label: 'Move' },
            { icon: Box, label: 'Scale' },
            { icon: RefreshCw, label: 'Rotate' },
          ].map((tool) => (
            <button
              key={tool.label}
              className="p-2 bg-gray-900/80 hover:bg-gray-800/80 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* AI Suggestion Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/90 border border-purple-500/30 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Wand2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300">
                Clique em um objeto para pedir melhorias à IA
              </p>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-medium transition-colors">
              Sugerir
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-900/80 backdrop-blur-sm text-xs">
          <span className="text-gray-500">FPS:</span>
          <span className="text-green-400 font-mono">60</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">Verts:</span>
          <span className="text-cyan-400 font-mono">2.4k</span>
        </div>
      </div>
    </div>
  );
}

// ============= Main Page =============

export default function AIAssistantPage() {
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="h-screen flex bg-gray-950 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Layout */}
      <div className="relative z-10 flex flex-1">
        {/* Chat Panel */}
        <motion.div
          layout
          className={`flex flex-col ${showPreview ? 'w-1/2' : 'flex-1'}`}
        >
          <Suspense fallback={<ChatSkeleton />}>
            <ModernAIChat
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview(!showPreview)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            />
          </Suspense>
        </motion.div>

        {/* Preview Panel */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '50%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <LivePreviewPanel onClose={() => setShowPreview(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Preview Button (when hidden) */}
      <AnimatePresence>
        {!showPreview && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setShowPreview(true)}
            className="fixed right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 border border-white/10 text-gray-400 hover:text-white transition-all shadow-xl"
          >
            <PanelRight className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
