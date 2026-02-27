'use client'

import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Maximize2, Minimize2, MessageSquare, Wand2, Play, Layers, Code, Box } from 'lucide-react'

interface NexusCanvasProps {
  mode: '3d' | 'ui' | 'code'
  onSelectElement: (elementId: string, position: THREE.Vector3) => void
  isAIPainting: boolean
  content: any
}

function Scene3D({ content, onSelect }: { content: any, onSelect: (id: string, pos: THREE.Vector3) => void }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      
      {/* Dynamic Content Rendering based on AI 'Painting' */}
      <mesh position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect('main-box', e.point); }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.8} />
      </mesh>

      <ContactShadows position={[0, -0.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
      <Environment preset="city" />
      <OrbitControls makeDefault />
    </>
  )
}

export default function NexusCanvas({ mode, onSelectElement, isAIPainting, content }: NexusCanvasProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'inspect' | 'logs'>( 'preview')

  return (
    <div className={`relative flex flex-col w-full h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Canvas Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded-md">
            <button onClick={() => {}} className={`p-1 rounded ${mode === '3d' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}><Box size={16} /></button>
            <button onClick={() => {}} className={`p-1 rounded ${mode === 'ui' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}><Layers size={16} /></button>
            <button onClick={() => {}} className={`p-1 rounded ${mode === 'code' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}><Code size={16} /></button>
          </div>
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Nexus Canvas</span>
        </div>

        <div className="flex items-center gap-2">
          {isAIPainting && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full animate-pulse">
              <Wand2 size={12} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400 uppercase">AI Painting...</span>
            </div>
          )}
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 bg-[#050505]">
        {mode === '3d' ? (
          <Canvas shadows camera={{ position: [3, 3, 3], fov: 45 }}>
            <Scene3D content={content} onSelect={onSelectElement} />
          </Canvas>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 font-mono text-sm">
            {/* UI / Code Preview Implementation */}
            [Renderizador de {mode.toUpperCase()} Ativo]
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-2xl">
          <button className="p-2 text-zinc-400 hover:text-white transition-colors"><Play size={20} /></button>
          <div className="w-px h-4 bg-zinc-700"></div>
          <button className="p-2 text-zinc-400 hover:text-white transition-colors"><MessageSquare size={20} /></button>
          <button className="p-2 text-zinc-400 hover:text-white transition-colors"><Wand2 size={20} /></button>
        </div>
      </div>

      {/* Inspection Panel (Optional Overlay) */}
      <div className="absolute top-16 right-4 w-64 p-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-2xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Element Inspector</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]"><span className="text-zinc-500">ID:</span><span className="text-blue-400">main-box</span></div>
          <div className="flex justify-between text-[10px]"><span className="text-zinc-500">Status:</span><span className="text-emerald-400">Optimized</span></div>
        </div>
      </div>
    </div>
  )
}
