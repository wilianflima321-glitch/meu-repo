'use client'

/**
 * BlueprintsAIInput — floating AI command bar for Blueprint node generation.
 *
 * Triggered by Ctrl+I (or a toolbar button) on the Visual Script canvas.
 * The user types a natural-language instruction such as:
 *   "Create a collision trigger that plays a sound and destroys the object"
 * and the AI generates the corresponding node graph.
 *
 * Visual style: cyberpunk glassmorphic, notched corners, typing-glow cyan.
 * All colours reference --aethel-* design tokens — no raw hex values.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
// @aethel-heavy-async-boundary
import { AnimatePresence, motion } from 'framer-motion'
import { Cpu, Sparkles, X } from 'lucide-react'

export interface BlueprintsAIInputProps {
  /** Whether the overlay is visible */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Called with the user's natural-language prompt */
  onGenerate: (prompt: string) => void | Promise<void>
  /** Optional loading state (while AI is generating nodes) */
  isGenerating?: boolean
}

const QUICK_PROMPTS = [
  'Collision trigger → play sound',
  'Move forward on input',
  'Spawn particle on death',
  'Timer loop every 2 seconds',
  'Damage player on overlap',
]

export function BlueprintsAIInput({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false,
}: BlueprintsAIInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen) {
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [isOpen, onClose])

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || isGenerating) return
    await onGenerate(trimmed)
    setValue('')
  }, [value, isGenerating, onGenerate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }, [handleSubmit])

  const isFilled = value.trim().length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="bp-ai-input"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.34, 1.2, 0.64, 1] }}
          className="pointer-events-auto absolute bottom-16 left-1/2 z-50 w-[520px] -translate-x-1/2"
          style={{ filter: 'drop-shadow(0 0 32px color-mix(in srgb, var(--aethel-neon-cyan) 14%, transparent))' }}
          role="dialog"
          aria-label="Blueprint AI node generator"
          aria-modal="true"
        >
          {/* Scan-line animation: horizontal sweep on mount */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0.7 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-transparent via-[var(--aethel-neon-cyan)] to-transparent"
            aria-hidden
          />

          {/* Main panel */}
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--aethel-surface-elevated)',
              border: '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 26%, transparent)',
              borderRadius: 14,
              backdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 24px 64px color-mix(in srgb, var(--aethel-bg-base) 60%, transparent), 0 0 0 1px color-mix(in srgb, var(--aethel-neon-cyan) 8%, transparent)',
              clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)',
            }}
          >
            {/* Neon top-accent line */}
            <div
              className="pointer-events-none h-px w-full"
              style={{ background: 'linear-gradient(90deg, transparent, var(--aethel-neon-cyan) 40%, var(--aethel-accent) 70%, transparent)' }}
              aria-hidden
            />

            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)] px-4 py-2.5">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{
                  background: 'color-mix(in srgb, var(--aethel-neon-cyan) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 28%, transparent)',
                }}
              >
                <Cpu className="h-3.5 w-3.5 text-[var(--aethel-neon-cyan)]" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-neon-cyan)]">
                Blueprint AI
              </span>
              <span className="text-[10px] text-[var(--aethel-text-quaternary)]">Ctrl+I</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Blueprint AI input"
                className="ml-auto min-h-[32px] min-w-[32px] rounded-md p-1 text-[var(--aethel-text-quaternary)] transition hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Input row */}
            <div className="relative px-4 py-3">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the Blueprint logic to generate…"
                disabled={isGenerating}
                className="w-full rounded-xl bg-transparent px-0 py-1 pr-10 text-[13px] font-medium text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] outline-none disabled:opacity-50"
                style={{
                  caretColor: 'var(--aethel-neon-cyan)',
                }}
                aria-label="Blueprint AI prompt"
              />

              {/* Typing glow border */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl transition-all duration-300"
                style={{
                  border: isFilled
                    ? '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 45%, transparent)'
                    : '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 12%, transparent)',
                  boxShadow: isFilled
                    ? '0 0 12px color-mix(in srgb, var(--aethel-neon-cyan) 15%, transparent), inset 0 0 8px color-mix(in srgb, var(--aethel-neon-cyan) 4%, transparent)'
                    : 'none',
                }}
              />

              {/* Submit button — glows when filled */}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!isFilled || isGenerating}
                aria-label="Generate Blueprint nodes"
                className={[
                  'absolute right-6 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-1.5 transition-all disabled:opacity-30',
                  isFilled && !isGenerating ? 'animate-glow-cyan' : '',
                ].join(' ')}
                style={{
                  background: isFilled && !isGenerating
                    ? 'color-mix(in srgb, var(--aethel-neon-cyan) 15%, transparent)'
                    : 'transparent',
                  border: isFilled && !isGenerating
                    ? '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 35%, transparent)'
                    : '1px solid transparent',
                }}
              >
                {isGenerating ? (
                  <Sparkles className="h-4 w-4 animate-pulse text-[var(--aethel-neon-cyan)]" />
                ) : (
                  <Sparkles className="h-4 w-4 text-[var(--aethel-neon-cyan)]" />
                )}
              </button>
            </div>

            {/* Quick prompts */}
            <div className="border-t border-[color-mix(in_srgb,var(--aethel-neon-cyan)_8%,transparent)] px-4 pb-3 pt-2">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
                Quick templates
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setValue(p); inputRef.current?.focus() }}
                    className="rounded-md border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_12%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_4%,transparent)] px-2 py-1 text-[9px] font-medium text-[var(--aethel-text-tertiary)] transition hover:border-[color-mix(in_srgb,var(--aethel-neon-cyan)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_8%,transparent)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Generating state overlay */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-[color-mix(in_srgb,var(--aethel-bg-base)_75%,transparent)] [backdrop-filter:blur(4px)]"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-spin text-[var(--aethel-neon-cyan)]" />
                  <span className="text-[12px] font-semibold text-[var(--aethel-neon-cyan)]">Generating nodes…</span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
