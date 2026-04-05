'use client'

import { useState } from 'react'
import { X, Sparkles, Eye, Layers, Code, Palette, Box, Settings, Wand2 } from 'lucide-react'

interface MagicWandChatProps {
  position: { x: number; y: number }
  elementInfo: {
    tag: string
    id?: string
    className?: string
    textContent?: string
    computedStyles?: Record<string, string>
    boxModel?: {
      width: number
      height: number
      margin: string
      padding: string
      border: string
    }
    attributes?: Record<string, string>
  }
  onClose: () => void
  onSendMessage: (message: string, context: any) => void
}

export function MagicWandChat({ position, elementInfo, onClose, onSendMessage }: MagicWandChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'inspector'>('chat')

  const quickActions = [
    { icon: Eye, label: 'Explique', prompt: 'Explique este elemento:' },
    { icon: Sparkles, label: 'Melhore', prompt: 'Melhore o design deste elemento:' },
    { icon: Layers, label: 'Animação', prompt: 'Adicione animação a este elemento:' },
    { icon: Palette, label: 'Estilo', prompt: 'Melhore o estilo deste elemento:' },
  ]

  const handleSend = () => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue, { element: elementInfo })
    setInputValue('')
  }

  return (
    <div
      className="fixed z-50 w-80 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-100%)',
        marginTop: '-10px',
      }}
    >
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-[var(--aethel-primary-light)]" />
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Magic Wand</span>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-[var(--aethel-border-primary)]">
        <button type="button" onClick={() => setActiveTab('chat')} className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'chat' ? 'text-[var(--aethel-primary-light)] border-b-2 border-[var(--aethel-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'}`}>Chat</button>
        <button type="button" onClick={() => setActiveTab('inspector')} className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'inspector' ? 'text-[var(--aethel-primary-light)] border-b-2 border-[var(--aethel-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'}`}>Inspector</button>
      </div>

      <div className="p-4">
        {activeTab === 'chat' ? (
          <>
            <div className="mb-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
              <div className="flex items-center gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
                <Code className="w-3 h-3" />
                <span className="font-mono">{elementInfo.tag}</span>
                {elementInfo.id && <span className="font-mono">#{elementInfo.id}</span>}
                {elementInfo.className && <span className="font-mono">.{elementInfo.className}</span>}
              </div>
              {elementInfo.textContent && <div className="mt-1 text-[10px] text-[var(--aethel-text-secondary)] truncate">{elementInfo.textContent}</div>}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button key={action.label} type="button" onClick={() => setInputValue(`${action.prompt} ${elementInfo.tag}`)} className="flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-2 py-1.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] hover:text-[var(--aethel-text-primary)]">
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Descreva a mudança..." className="w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]" />
              <button type="button" onClick={handleSend} disabled={!inputValue.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] opacity-0 transition-opacity disabled:opacity-0 hover:opacity-100"><Sparkles className="w-3 h-3" /></button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider"><Code className="w-3 h-3" />Element</div>
              <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                <div className="font-mono text-[10px] text-[var(--aethel-text-primary)]">{elementInfo.tag}</div>
                {elementInfo.id && <div className="mt-1 font-mono text-[10px] text-[var(--aethel-text-secondary)]">id: {elementInfo.id}</div>}
                {elementInfo.className && <div className="mt-1 font-mono text-[10px] text-[var(--aethel-text-secondary)]">class: {elementInfo.className}</div>}
              </div>
            </div>

            {elementInfo.computedStyles && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider"><Palette className="w-3 h-3" />Styles</div>
                <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2 max-h-32 overflow-auto">
                  {Object.entries(elementInfo.computedStyles).slice(0, 10).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-1"><span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">{key}</span><span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">{value}</span></div>
                  ))}
                </div>
              </div>
            )}

            {elementInfo.boxModel && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider"><Box className="w-3 h-3" />Box Model</div>
                <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-[var(--aethel-text-tertiary)]">Width:</span><span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">{elementInfo.boxModel.width}px</span></div>
                    <div><span className="text-[var(--aethel-text-tertiary)]">Height:</span><span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">{elementInfo.boxModel.height}px</span></div>
                    <div><span className="text-[var(--aethel-text-tertiary)]">Margin:</span><span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">{elementInfo.boxModel.margin}</span></div>
                    <div><span className="text-[var(--aethel-text-tertiary)]">Padding:</span><span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">{elementInfo.boxModel.padding}</span></div>
                  </div>
                </div>
              </div>
            )}

            {elementInfo.attributes && Object.keys(elementInfo.attributes).length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider"><Settings className="w-3 h-3" />Attributes</div>
                <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                  {Object.entries(elementInfo.attributes).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-1"><span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">{key}</span><span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)] truncate max-w-24">{value}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
