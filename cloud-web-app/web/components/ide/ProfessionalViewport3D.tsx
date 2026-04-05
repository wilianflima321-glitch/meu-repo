'use client'

import { useState } from 'react'
import { PreviewViewport3D } from './PreviewViewport3D'
import { Timeline3D } from './Timeline3D'
import { Outliner3D } from './Outliner3D'
import { PropertiesPanel3D } from './PropertiesPanel3D'
import { AIViewportAssistant } from './AIViewportAssistant'
import { AssetBrowser3D } from './AssetBrowser3D'
import { Layout, Layers, Settings, Maximize2, PanelLeft, PanelRight, PanelBottom, Grid3x3 } from 'lucide-react'

type PanelType = 'outliner' | 'properties' | 'assets' | 'ai'

export function ProfessionalViewport3D() {
  const [leftPanel, setLeftPanel] = useState<PanelType>('outliner')
  const [rightPanel, setRightPanel] = useState<PanelType>('properties')
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [showTimeline, setShowTimeline] = useState(true)
  const [showAI, setShowAI] = useState(true)
  const [layoutMode, setLayoutMode] = useState<'default' | 'maximized' | 'focus'>('default')

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-primary)]">
      {/* Left Panel */}
      {showLeftPanel && (
        <div className={`w-64 border-r border-[var(--aethel-border-primary)] flex-shrink-0 transition-all ${layoutMode === 'maximized'  'hidden' : ''}`}>
          {/* Panel Tabs */}
          <div className="flex items-center gap-1 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-2">
            <button
              type="button"
              onClick={() => setLeftPanel('outliner')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] rounded transition-colors ${
                leftPanel === 'outliner'
                   'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
            >
              <Layers className="w-3 h-3" />
              Cena
            </button>
            <button
              type="button"
              onClick={() => setLeftPanel('assets')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] rounded transition-colors ${
                leftPanel === 'assets'
                   'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
            >
              <Grid3x3 className="w-3 h-3" />
              Assets
            </button>
          </div>

          {/* Panel Content */}
          <div className="h-[calc(100%-44px)]">
            {leftPanel === 'outliner' && <Outliner3D />}
            {leftPanel === 'assets' && <AssetBrowser3D />}
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Viewport 3D</span>
            <div className="w-px h-5 bg-[var(--aethel-border-primary)]" />
            <button
              type="button"
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className={`p-1.5 rounded transition-colors ${
                showLeftPanel
                   'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
              title="Painel esquerdo"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={`p-1.5 rounded transition-colors ${
                showRightPanel
                   'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
              title="Painel direito"
            >
              <PanelRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className={`p-1.5 rounded transition-colors ${
                showTimeline
                   'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
              title="Timeline"
            >
              <PanelBottom className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowAI(!showAI)}
              className={`p-1.5 rounded transition-colors ${
                showAI
                   'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
              title="Assistente IA"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLayoutMode(layoutMode === 'maximized'  'default' : 'maximized')}
              className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
              title="Maximizar viewport"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport + AI Assistant */}
        <div className="flex-1 flex min-h-0">
          {/* Main 3D Viewport */}
          <div className="flex-1 min-w-0">
            <PreviewViewport3D />
          </div>

          {/* AI Assistant Panel */}
          {showAI && (
            <div className="w-72 border-l border-[var(--aethel-border-primary)] flex-shrink-0">
              <AIViewportAssistant />
            </div>
          )}
        </div>

        {/* Timeline */}
        {showTimeline && (
          <div className="h-40 border-t border-[var(--aethel-border-primary)] flex-shrink-0">
            <Timeline3D />
          </div>
        )}
      </div>

      {/* Right Panel */}
      {showRightPanel && (
        <div className={`w-72 border-l border-[var(--aethel-border-primary)] flex-shrink-0 transition-all ${layoutMode === 'maximized'  'hidden' : ''}`}>
          <PropertiesPanel3D />
        </div>
      )}
    </div>
  )
}
