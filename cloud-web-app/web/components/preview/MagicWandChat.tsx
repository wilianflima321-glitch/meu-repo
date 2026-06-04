'use client'

import { useState } from 'react'
import { Box, Code, Eye, Layers, Palette, Sparkles, Wand2, X } from 'lucide-react'

interface MagicWandChatProps {
  position: { x: number; y: number }
  elementInfo?: {
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
  onSendMessage: (message: string, context: Record<string, unknown>) => void
}

export function MagicWandChat({
  position,
  elementInfo,
  onClose,
  onSendMessage,
}: MagicWandChatProps) {
  const safeElementInfo = elementInfo ?? { tag: 'element' }
  const [inputValue, setInputValue] = useState('')

  const quickActions = [
    { icon: Eye, label: 'Explain', prompt: 'Explain this element:' },
    { icon: Sparkles, label: 'Improve', prompt: 'Improve this element design:' },
    { icon: Layers, label: 'Animate', prompt: 'Add motion to this element:' },
    { icon: Palette, label: 'Restyle', prompt: 'Restyle this element:' },
  ]

  const handleSend = () => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue, { element: safeElementInfo })
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
      <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-[var(--aethel-primary-light)]" />
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">
            Inspect
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] hover:text-[var(--aethel-text-secondary)]"
          aria-label="Close element inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
          <div className="flex items-center gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
            <Code className="h-3 w-3" />
            <span className="font-mono">{safeElementInfo.tag}</span>
            {safeElementInfo.id && (
              <span className="font-mono">#{safeElementInfo.id}</span>
            )}
            {safeElementInfo.className && (
              <span className="truncate font-mono">
                .{safeElementInfo.className}
              </span>
            )}
          </div>
          {safeElementInfo.textContent && (
            <div className="mt-1 truncate text-[10px] text-[var(--aethel-text-secondary)]">
              {safeElementInfo.textContent}
            </div>
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() =>
                setInputValue(`${action.prompt} ${safeElementInfo.tag}`)
              }
              className="flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-2 py-1.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder="Describe a change..."
            className="w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 pr-9 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="absolute right-2 top-1/2 rounded bg-[var(--aethel-primary)] p-1 text-[var(--aethel-text-primary)] opacity-80 transition-opacity -translate-y-1/2 disabled:opacity-20 hover:opacity-100"
            aria-label="Send element change request"
          >
            <Sparkles className="h-3 w-3" />
          </button>
        </div>

        <details className="mt-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-2 text-xs text-[var(--aethel-text-secondary)]">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] [&::-webkit-details-marker]:hidden">
            Element details
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
                <Code className="h-3 w-3" />
                Element
              </div>
              <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                <div className="font-mono text-[10px] text-[var(--aethel-text-primary)]">
                  {safeElementInfo.tag}
                </div>
                {safeElementInfo.id && (
                  <div className="mt-1 font-mono text-[10px] text-[var(--aethel-text-secondary)]">
                    id: {safeElementInfo.id}
                  </div>
                )}
                {safeElementInfo.className && (
                  <div className="mt-1 font-mono text-[10px] text-[var(--aethel-text-secondary)]">
                    class: {safeElementInfo.className}
                  </div>
                )}
              </div>
            </div>

            {safeElementInfo.computedStyles && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
                  <Palette className="h-3 w-3" />
                  Styles
                </div>
                <div className="max-h-32 overflow-auto rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                  {Object.entries(safeElementInfo.computedStyles)
                    .slice(0, 10)
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">
                          {key}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {safeElementInfo.boxModel && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
                  <Box className="h-3 w-3" />
                  Box model
                </div>
                <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-[var(--aethel-text-tertiary)]">Width:</span>
                      <span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">
                        {safeElementInfo.boxModel.width}px
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--aethel-text-tertiary)]">Height:</span>
                      <span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">
                        {safeElementInfo.boxModel.height}px
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--aethel-text-tertiary)]">Margin:</span>
                      <span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">
                        {safeElementInfo.boxModel.margin}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--aethel-text-tertiary)]">Padding:</span>
                      <span className="ml-1 font-mono text-[var(--aethel-text-secondary)]">
                        {safeElementInfo.boxModel.padding}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {safeElementInfo.attributes &&
              Object.keys(safeElementInfo.attributes).length > 0 && (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
                    Attributes
                  </div>
                  <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                    {Object.entries(safeElementInfo.attributes).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">
                          {key}
                        </span>
                        <span className="max-w-24 truncate font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </details>
      </div>
    </div>
  )
}
