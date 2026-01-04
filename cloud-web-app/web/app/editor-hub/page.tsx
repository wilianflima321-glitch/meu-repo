'use client';

/**
 * Aethel Engine - Editor Hub
 * 
 * Página central de navegação para todos os editores do engine.
 * Design profissional estilo Unreal Engine / Unity Hub.
 */

import React from 'react';
import Link from 'next/link';

interface EditorCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  features: string[];
  status: 'stable' | 'beta' | 'experimental';
}

const editors: EditorCard[] = [
  {
    id: 'level-editor',
    name: 'Level Editor',
    description: 'Editor de níveis completo com viewport 3D, transformações e todos os sistemas integrados.',
    icon: '🎮',
    href: '/level-editor',
    color: 'from-green-600 to-green-800',
    features: ['3D Viewport', 'Transform Gizmos', 'World Outliner', 'Details Panel'],
    status: 'stable',
  },
  {
    id: 'blueprint-editor',
    name: 'Blueprint Editor',
    description: 'Editor visual de lógica de gameplay com sistema de nós estilo Unreal Engine.',
    icon: '📘',
    href: '/blueprint-editor',
    color: 'from-blue-600 to-blue-800',
    features: ['Visual Scripting', 'Node Graph', 'Variables', 'Functions'],
    status: 'stable',
  },
  {
    id: 'animation-blueprint',
    name: 'Animation Blueprint',
    description: 'Editor de state machines para animações com blending e transições.',
    icon: '🎬',
    href: '/animation-blueprint',
    color: 'from-cyan-600 to-cyan-800',
    features: ['State Machine', 'Blend Spaces', 'Transitions', 'Preview'],
    status: 'stable',
  },
  {
    id: 'niagara-editor',
    name: 'Niagara VFX Editor',
    description: 'Sistema de partículas avançado com preview 3D em tempo real.',
    icon: '✨',
    href: '/niagara-editor',
    color: 'from-orange-600 to-orange-800',
    features: ['Particle Systems', '3D Preview', 'Effect Presets', 'Node Graph'],
    status: 'stable',
  },
  {
    id: 'landscape-editor',
    name: 'Landscape Editor',
    description: 'Editor de terrenos com sculpting, pintura e foliage system.',
    icon: '🏔️',
    href: '/landscape-editor',
    color: 'from-emerald-600 to-emerald-800',
    features: ['Terrain Sculpting', 'Layer Painting', 'Foliage', 'Erosion'],
    status: 'stable',
  },
  {
    id: 'project-settings',
    name: 'Project Settings',
    description: 'Configurações completas do projeto com todas as opções do engine.',
    icon: '⚙️',
    href: '/project-settings',
    color: 'from-purple-600 to-purple-800',
    features: ['Engine Settings', 'Rendering', 'Input Mapping', 'Platforms'],
    status: 'stable',
  },
  {
    id: 'material-editor',
    name: 'Material Editor',
    description: 'Editor de materiais PBR com node graph para shaders customizados.',
    icon: '🎨',
    href: '/explorer',
    color: 'from-pink-600 to-pink-800',
    features: ['PBR Materials', 'Shader Graph', 'Live Preview', 'Texture Layers'],
    status: 'stable',
  },
  {
    id: 'sequencer',
    name: 'Sequencer',
    description: 'Editor de cinematics e cutscenes com timeline profissional.',
    icon: '🎥',
    href: '/explorer',
    color: 'from-red-600 to-red-800',
    features: ['Timeline', 'Keyframes', 'Camera Tracks', 'Audio Sync'],
    status: 'beta',
  },
];

const quickActions = [
  { label: 'New Project', icon: '📁', action: '/dashboard' },
  { label: 'Open Project', icon: '📂', action: '/explorer' },
  { label: 'Import Asset', icon: '📥', action: '/explorer' },
  { label: 'Documentation', icon: '📖', action: '/docs' },
  { label: 'Settings', icon: '⚙️', action: '/settings' },
  { label: 'Marketplace', icon: '🛒', action: '/marketplace' },
];

const recentProjects = [
  { name: 'My First Game', path: '/projects/my-first-game', lastOpened: '2 hours ago' },
  { name: 'RPG Demo', path: '/projects/rpg-demo', lastOpened: '1 day ago' },
  { name: 'Shooter Prototype', path: '/projects/shooter', lastOpened: '3 days ago' },
];

export default function EditorHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">⚡</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Aethel Engine
              </h1>
              <p className="text-xs text-gray-500">Professional Game Development Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full border border-green-600/30">
              v1.0.0 Stable
            </span>
            <button className="p-2 hover:bg-white/10 rounded-lg transition">
              <span>👤</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map(action => (
              <Link
                key={action.label}
                href={action.action}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-gray-700/50 rounded-lg text-sm flex items-center gap-2 transition"
              >
                <span>{action.icon}</span>
                {action.label}
              </Link>
            ))}
          </div>
        </section>
        
        {/* Editors Grid */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
            Editors & Tools
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {editors.map(editor => (
              <Link
                key={editor.id}
                href={editor.href}
                className="group relative bg-[#1a1a2e]/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20"
              >
                {/* Status Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className={`
                    px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full
                    ${editor.status === 'stable' 
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                      : editor.status === 'beta'
                      ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                      : 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                    }
                  `}>
                    {editor.status}
                  </span>
                </div>
                
                {/* Gradient Header */}
                <div className={`h-24 bg-gradient-to-br ${editor.color} flex items-center justify-center`}>
                  <span className="text-5xl group-hover:scale-110 transition-transform">
                    {editor.icon}
                  </span>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {editor.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                    {editor.description}
                  </p>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-1">
                    {editor.features.slice(0, 3).map(feature => (
                      <span
                        key={feature}
                        className="px-2 py-0.5 bg-white/5 text-[10px] text-gray-400 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {editor.features.length > 3 && (
                      <span className="px-2 py-0.5 text-[10px] text-gray-500">
                        +{editor.features.length - 3}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Link>
            ))}
          </div>
        </section>
        
        {/* Recent Projects */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
            Recent Projects
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentProjects.map(project => (
              <Link
                key={project.name}
                href={project.path}
                className="p-4 bg-white/5 border border-gray-700/50 rounded-lg hover:bg-white/10 hover:border-gray-600 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-xl">
                    🎮
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500">{project.lastOpened}</p>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 transition">→</span>
                </div>
              </Link>
            ))}
            
            {/* Create New */}
            <Link
              href="/dashboard"
              className="p-4 border-2 border-dashed border-gray-700/50 rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 transition flex items-center justify-center gap-2 text-gray-500 hover:text-blue-400"
            >
              <span className="text-2xl">+</span>
              <span>Create New Project</span>
            </Link>
          </div>
        </section>
        
        {/* Stats & Info */}
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
            Engine Statistics
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 border border-gray-700/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-400">30+</div>
              <div className="text-xs text-gray-500">Core Systems</div>
            </div>
            <div className="p-4 bg-white/5 border border-gray-700/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-400">10</div>
              <div className="text-xs text-gray-500">Editor Tools</div>
            </div>
            <div className="p-4 bg-white/5 border border-gray-700/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-400">60+</div>
              <div className="text-xs text-gray-500">Library Modules</div>
            </div>
            <div className="p-4 bg-white/5 border border-gray-700/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-orange-400">100%</div>
              <div className="text-xs text-gray-500">TypeScript</div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-500">
          <div>© 2025 Aethel Engine. Professional Game Development Platform.</div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-white transition">Documentation</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/support" className="hover:text-white transition">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
