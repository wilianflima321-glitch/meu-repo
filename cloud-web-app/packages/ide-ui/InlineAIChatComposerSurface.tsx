'use client'

import React, { useState } from 'react'
import { Check, FileText, Loader2, Send, Sparkles } from 'lucide-react'

import { buildSuggestionChips, getInlineAIFileName, type InlineAIChatProps } from './InlineAIChat.helpers'
import { ContextBadge } from './InlineAIChatPrimitives'

// ─── Types ───────────────────────────────────────────────────────────────────

type SuggestionStripProps = {
  activeFile?: InlineAIChatProps['activeFile']
  onSelect: (prompt: string) => void
}

type InlineAIComposerProps = {
  activeFile?: InlineAIChatProps['activeFile']
  canApplyDirectly: boolean
  input: string
  inputRef: React.RefObject<HTMLTextAreaElement>
  isLoading: boolean
  onChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  projectContext?: InlineAIChatProps['projectContext']
}

// ─── SuggestionStrip ─────────────────────────────────────────────────────────

/**
 * Horizontally scrolling suggestion chip strip.
 * All styles use `var(--aethel-*)` tokens via Tailwind — no inline `style={{ }}`
 * so the design system theme propagates correctly.
 */
export function SuggestionStrip({ activeFile, onSelect }: SuggestionStripProps) {
  const chips = buildSuggestionChips(activeFile)

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--aethel-border-secondary)] px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--aethel-text-tertiary)]">
        <span>Operator shortcuts</span>
        <span>Fill the composer before sending</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Quick prompts">
        {chips.map((chip) => {
          const Icon = chip.icon
          return (
            <button
              key={chip.id}
              type="button"
              role="listitem"
              aria-label={`Use quick suggestion: ${chip.label}`}
              onClick={() => onSelect(chip.prompt)}
              className="flex min-w-[164px] flex-col items-start gap-1 rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-3 py-2 text-left text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]"
            >
              <span className="flex items-center gap-2">
                <Icon size={14} aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
                  {chip.label}
                </span>
              </span>
              <span className="text-xs leading-relaxed text-[var(--aethel-text-tertiary)]">
                {chip.operatorHint}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── InlineAIComposer ────────────────────────────────────────────────────────

/**
 * The primary composer input for the Inline AI Chat surface.
 *
 * Design system compliance: all colours reference `var(--aethel-*)` CSS custom
 * properties via Tailwind utility classes. No inline `style={{ color: ... }}`
 * blocks — this allows the full theme to propagate (light/dark, custom palettes)
 * without needing to fork this component.
 */
export function InlineAIComposer({
  activeFile,
  canApplyDirectly,
  input,
  inputRef,
  isLoading,
  onChange,
  onKeyDown,
  onSend,
  projectContext,
}: InlineAIComposerProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hasInput = input.trim().length > 0

  const placeholder = activeFile
    ? `Ask about ${getInlineAIFileName(activeFile.path)} or request a patch/refactor…`
    : 'Describe the task or use a shortcut to structure the request…'

  return (
    <div className="rounded-2xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_85%,transparent)] p-2 backdrop-blur-sm">
      {/* Context badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {activeFile && (
          <ContextBadge label={getInlineAIFileName(activeFile.path)} icon={<FileText size={12} />} />
        )}
        {projectContext && (
          <ContextBadge label={projectContext.name} icon={<Sparkles size={12} />} />
        )}
        {/* Apply/Ask mode badge */}
        <ContextBadge
          label={canApplyDirectly ? 'Apply mode' : 'Ask mode'}
          icon={<Check size={12} />}
          accentClass={canApplyDirectly
            ? 'text-[var(--aethel-success-light)]'
            : 'text-[var(--aethel-text-secondary)]'}
        />
      </div>

      {/* Input row */}
      <div
        className={[
          'flex items-center gap-2 rounded-full border px-2 py-1 transition-all duration-150',
          isFocused
            ? 'border-[var(--aethel-border-focus)] bg-[var(--aethel-surface-primary)] shadow-[0_0_0_3px_rgba(6,182,212,0.12)]'
            : isLoading
              ? 'border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[var(--aethel-surface-primary)] animate-pulse'
              : 'border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]',
        ].join(' ')}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsFocused(false)
          }
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none border-none bg-transparent text-sm leading-6 text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)]"
          style={{ minHeight: '24px', maxHeight: '120px' }}
          aria-label="Inline AI chat message"
          aria-multiline="true"
        />

        <button
          type="button"
          aria-label={isLoading ? 'AI is responding…' : 'Send inline chat message'}
          onClick={onSend}
          disabled={!hasInput || isLoading}
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-none transition-all duration-150',
            hasInput && !isLoading
              ? 'bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] text-white cursor-pointer hover:brightness-110'
              : 'cursor-not-allowed bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] text-[var(--aethel-text-quaternary)] opacity-50',
          ].join(' ')}
        >
          {isLoading
            ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            : <Send size={14} aria-hidden="true" />}
        </button>
      </div>

      {/* Hint footer */}
      <p className="mt-1.5 text-center text-[10px] text-[var(--aethel-text-quaternary)]">
        Enter to send&nbsp;·&nbsp;Shift+Enter for new line&nbsp;·&nbsp;Esc to close
      </p>
    </div>
  )
}
