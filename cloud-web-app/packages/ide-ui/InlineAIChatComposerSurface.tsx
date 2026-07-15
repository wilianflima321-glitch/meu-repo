'use client'

import React, { useState } from 'react'
import { tokens } from '../../web/lib/design-tokens'
import { Check, FileText, Loader2, Send, Sparkles } from 'lucide-react'

import { buildSuggestionChips, getInlineAIFileName, type InlineAIChatProps } from './InlineAIChat.helpers'
import {
  ACCENT_SUCCESS,
  BORDER_FOCUS,
  BORDER_SECONDARY,
  FOCUS_RING,
  PRIMARY_GRADIENT,
  SURFACE_PRIMARY,
  SURFACE_SECONDARY,
  SURFACE_TERTIARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  mixColor,
} from './InlineAIChat.styles'
import { ContextBadge } from './InlineAIChatPrimitives'

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

export function SuggestionStrip({ activeFile, onSelect }: SuggestionStripProps) {
  const chips = buildSuggestionChips(activeFile)

  return (
    <div
      style={{
        padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
        borderTop: `1px solid ${BORDER_SECONDARY}`,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing['2'],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing['2'],
          color: TEXT_TERTIARY,
          fontSize: tokens.typography.fontSize.xs,
        }}
      >
        <span>Operator shortcuts</span>
        <span>Fill the composer before sending</span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: tokens.spacing['2'],
          overflowX: 'auto',
          paddingBottom: tokens.spacing['1'],
        }}
      >
        {chips.map((chip) => {
          const Icon = chip.icon

          return (
            <button
              key={chip.id}
              type="button"
              aria-label={`Use quick suggestion ${chip.label}`}
              onClick={() => onSelect(chip.prompt)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: tokens.spacing['1'],
                minWidth: '164px',
                padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
                background: mixColor(SURFACE_SECONDARY, 74),
                border: `1px solid ${BORDER_SECONDARY}`,
                borderRadius: tokens.radius.lg,
                color: TEXT_SECONDARY,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
                <Icon size={14} />
                <span
                  style={{
                    fontSize: tokens.typography.fontSize.sm,
                    color: TEXT_PRIMARY,
                  }}
                >
                  {chip.label}
                </span>
              </span>
              <span
                style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: TEXT_TERTIARY,
                  lineHeight: tokens.typography.lineHeight.relaxed,
                }}
              >
                {chip.operatorHint}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
    ? `Ask about ${getInlineAIFileName(activeFile.path)} or request a patch/refactor...`
    : 'Describe the task or use a shortcut to structure the request...'

  return (
    <div
      style={{
        padding: tokens.spacing['2'],
        borderRadius: tokens.radius['2xl'],
        background: mixColor(SURFACE_SECONDARY, 85),
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing['2'],
          flexWrap: 'wrap',
          marginBottom: tokens.spacing['3'],
        }}
      >
        {activeFile && <ContextBadge label={getInlineAIFileName(activeFile.path)} icon={<FileText size={12} />} />}
        {projectContext && <ContextBadge label={projectContext.name} icon={<Sparkles size={12} />} />}
        <ContextBadge
          label={canApplyDirectly ? 'Manual apply' : 'Ask mode'}
          icon={<Check size={12} />}
          accent={canApplyDirectly ? ACCENT_SUCCESS : TEXT_SECONDARY}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing['2'],
          padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
          background: SURFACE_PRIMARY,
          border: `1px solid ${isFocused ? BORDER_FOCUS : BORDER_SECONDARY}`,
          borderRadius: tokens.radius.full,
          boxShadow: isFocused ? FOCUS_RING : (isLoading ? `0 0 15px ${PRIMARY_GRADIENT.split(' ')[1] || 'var(--aethel-primary)'}` : 'none'),
          transition: `all ${tokens.animation.duration.normal} ease-out`,
          animation: isLoading ? 'pulse 2s infinite' : 'none',
        }}
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
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: TEXT_PRIMARY,
            fontSize: tokens.typography.fontSize.sm,
            fontFamily: tokens.typography.fontFamily.sans,
            resize: 'none',
            minHeight: '24px',
            maxHeight: '120px',
            lineHeight: '1.5',
          }}
          rows={1}
        />

        <button
          type="button"
          aria-label="Send inline chat message"
          onClick={onSend}
          disabled={!hasInput || isLoading}
          style={{
            padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
            background: hasInput && !isLoading ? PRIMARY_GRADIENT : SURFACE_TERTIARY,
            border: 'none',
            borderRadius: tokens.radius.full,
            color: TEXT_PRIMARY,
            cursor: hasInput && !isLoading ? 'pointer' : 'not-allowed',
            opacity: hasInput && !isLoading ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
            height: '32px',
          }}
        >
          {isLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>

      <div
        style={{
          marginTop: tokens.spacing['1'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: TEXT_TERTIARY,
        }}
      >
        <span>Enter to send • Esc to close</span>
      </div>
    </div>
  )
}
