import { Paintbrush, Layout, Settings2, Sparkles, Send } from 'lucide-react'
import { useState } from 'react'

export interface ElementInspectData {
  tag: string
  id?: string
  className?: string
  attributes?: Record<string, string>
  computedStyles?: Record<string, string>
}

interface PreviewPropsInspectorProps {
  elementInfo: ElementInspectData | null
  onAgentCommand: (command: string) => void
}

const COMMON_TOKENS = [
  '--aethel-primary',
  '--aethel-surface-primary',
  '--aethel-surface-secondary',
  '--aethel-text-primary',
  '--aethel-text-secondary',
  '--aethel-border-primary',
  '--aethel-warning',
  '--aethel-success',
  '--aethel-error'
]

export function PreviewPropsInspector({ elementInfo, onAgentCommand }: PreviewPropsInspectorProps) {
  const [prompt, setPrompt] = useState('')

  if (!elementInfo) {
    return (
      <div className="w-72 border-l border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] backdrop-blur-xl h-full flex flex-col items-center justify-center text-center p-6 space-y-4 shadow-[-4px_0_24px_rgba(0,0,0,0.1)]">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--aethel-surface-primary)] to-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] flex items-center justify-center shadow-lg">
          <Paintbrush className="w-5 h-5 text-[var(--aethel-text-tertiary)]" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">Props Inspector</h3>
          <p className="text-[11px] text-[var(--aethel-text-tertiary)] mt-1.5 leading-relaxed">
            Select an element in the DOM Tree or use the Magic Wand to inspect its properties and design tokens.
          </p>
        </div>
      </div>
    )
  }

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    onAgentCommand(`Apply to <${elementInfo.tag}${elementInfo.className ? ` class="${elementInfo.className}"` : ''}>: ${prompt}`)
    setPrompt('')
  }

  return (
    <div className="w-[320px] border-l border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] backdrop-blur-2xl h-full flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.2)]">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--aethel-border-primary)] flex items-center gap-3 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] flex items-center justify-center shadow-sm">
          <Settings2 className="w-4 h-4 text-[var(--aethel-primary)]" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--aethel-text-tertiary)]">Selected Element</div>
          <div className="text-sm font-mono text-[var(--aethel-text-primary)] flex items-center gap-1.5">
            <span className="text-[var(--aethel-primary-light)]">{elementInfo.tag}</span>
            {elementInfo.id && <span className="text-[var(--aethel-warning)]">#{elementInfo.id}</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-6">
        
        {/* Classes */}
        {elementInfo.className && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--aethel-text-secondary)]">
              <Layout className="w-3.5 h-3.5" />
              Classes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {elementInfo.className.split(' ').map((cls, i) => cls.trim() && (
                <span key={i} className="px-2 py-1 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] text-[11px] font-mono text-[var(--aethel-text-primary)] shadow-sm">
                  {cls}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Agentic Mutation Prompt */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--aethel-primary)]">
            <Sparkles className="w-3.5 h-3.5" />
            Agentic Mutation
          </div>
          <form onSubmit={handlePromptSubmit} className="relative group">
            <input 
              type="text" 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Make it a glassmorphism card..."
              className="w-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] border border-[color-mix(in_srgb,var(--aethel-primary)_30%,var(--aethel-border-primary))] rounded-xl py-2.5 pl-3 pr-10 text-[12px] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] outline-none focus:border-[var(--aethel-primary)] focus:ring-1 focus:ring-[var(--aethel-primary)] transition-all shadow-inner"
            />
            <button 
              type="submit"
              disabled={!prompt.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 w-7 rounded-lg flex items-center justify-center bg-[var(--aethel-primary)] text-[var(--aethel-surface-primary)] disabled:opacity-30 transition-opacity hover:brightness-110"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Design Tokens Sync */}
        <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-secondary)]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--aethel-text-secondary)]">
            <Paintbrush className="w-3.5 h-3.5" />
            Design Tokens (L.10 Prep)
          </div>
          <div className="grid grid-cols-1 gap-2">
            {COMMON_TOKENS.map(token => (
              <div 
                key={token}
                onClick={() => onAgentCommand(`Apply CSS variable ${token} to the background or text of <${elementInfo.tag}>`)}
                className="group flex items-center gap-2.5 p-2 rounded-lg border border-transparent hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] cursor-pointer transition-all"
              >
                <div 
                  className="w-5 h-5 rounded-full border border-[var(--aethel-border-primary)] shadow-sm"
                  style={{ backgroundColor: `var(${token})` }}
                />
                <span className="text-[11px] font-mono text-[var(--aethel-text-secondary)] group-hover:text-[var(--aethel-text-primary)] truncate">
                  {token}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
