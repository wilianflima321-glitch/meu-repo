'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { tokens } from '@/lib/design-tokens'
import { Check, Copy, Loader2, Sparkles } from 'lucide-react'

import { type InlineAIMessageCodeBlock } from './InlineAIChat.helpers'
import {
  ACCENT_CYAN,
  BORDER_SECONDARY,
  PRIMARY_GRADIENT,
  SURFACE_PRIMARY,
  SURFACE_QUATERNARY,
  SURFACE_SECONDARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  mixColor,
} from './InlineAIChat.styles'

export function ContextBadge({
  label,
  icon,
  accent = TEXT_SECONDARY,
}: {
  label: string
  icon: React.ReactNode
  accent?: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing['1'],
        padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
        borderRadius: tokens.radius.full,
        border: `1px solid ${mixColor(accent, 32)}`,
        background: mixColor(accent, 12),
        color: accent,
        fontSize: tokens.typography.fontSize.xs,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </span>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        padding: tokens.spacing['3'],
        borderRadius: tokens.radius.lg,
        border: `1px solid ${mixColor(ACCENT_CYAN, 28)}`,
        background: mixColor(ACCENT_CYAN, 10),
        color: TEXT_SECONDARY,
        fontSize: tokens.typography.fontSize.sm,
      }}
    >
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      <span>{label}</span>
    </div>
  )
}

export function CodeBlock({
  block,
  onApply,
  onReview,
}: {
  block: InlineAIMessageCodeBlock
  onApply?: (code: string) => void
  onReview?: (code: string) => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeoutId = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timeoutId)
  }, [copied])

  const copyToClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(block.code)
      } else {
        fallbackCopy(block.code)
      }

      setCopied(true)
    } catch {
      fallbackCopy(block.code)
      setCopied(true)
    }
  }

  return (
    <div
      style={{
        marginTop: tokens.spacing['3'],
        border: `1px solid ${BORDER_SECONDARY}`,
        borderRadius: tokens.radius.lg,
        overflow: 'hidden',
        background: SURFACE_PRIMARY,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing['2'],
          padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
          background: mixColor(SURFACE_SECONDARY, 76),
          borderBottom: `1px solid ${BORDER_SECONDARY}`,
        }}
      >
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            color: TEXT_TERTIARY,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {block.language}
        </span>

        <div style={{ display: 'flex', gap: tokens.spacing['2'], flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-label="Copiar bloco de codigo"
            onClick={copyToClipboard}
            style={codeActionButtonStyle}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>

          {onReview && (
            <button
              type="button"
              aria-label="Abrir diff de revisao para o bloco de codigo"
              style={{
                ...codeActionButtonStyle,
                background: PRIMARY_GRADIENT,
                border: 'none',
                color: TEXT_PRIMARY,
              }}
              onClick={() => onReview(block.code)}
            >
              <Sparkles size={12} />
              Review diff
            </button>
          )}
          {onApply && (
            <button
              type="button"
              aria-label="Aplicar bloco de codigo ao editor"
              onClick={() => onApply(block.code)}
              style={codeActionButtonStyle}
            >
              <Sparkles size={12} />
              Aplicar
            </button>
          )}
        </div>
      </div>

      <pre
        style={{
          margin: 0,
          padding: tokens.spacing['3'],
          overflow: 'auto',
          fontSize: tokens.typography.fontSize.xs,
          fontFamily: tokens.typography.fontFamily.mono,
          lineHeight: tokens.typography.lineHeight.normal,
          color: TEXT_SECONDARY,
          maxHeight: '320px',
          tabSize: 2,
        }}
      >
        <code>{block.code}</code>
      </pre>
    </div>
  )
}

export function FormattedMessageBody({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div
      style={{
        fontSize: tokens.typography.fontSize.sm,
        color: TEXT_PRIMARY,
        lineHeight: tokens.typography.lineHeight.relaxed,
      }}
    >
      {lines.map((line, index) => {
        const trimmedLine = line.trim()

        if (!trimmedLine) {
          return <div key={`spacer-${index}`} style={{ height: tokens.spacing['2'] }} />
        }

        const listMatch = trimmedLine.match(/^(\d+\.|-)\s+(.*)$/)

        if (listMatch) {
          const prefix = listMatch[1] === '-' ? '-' : listMatch[1]
          return (
            <div
              key={`line-${index}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: tokens.spacing['2'],
                marginTop: tokens.spacing['1'],
              }}
            >
              <span style={{ color: TEXT_TERTIARY, minWidth: '16px' }}>{prefix}</span>
              <span>{renderInlineFormatting(listMatch[2])}</span>
            </div>
          )
        }

        return (
          <div key={`line-${index}`} style={{ marginTop: index === 0 ? 0 : tokens.spacing['1'] }}>
            {renderInlineFormatting(line)}
          </div>
        )
      })}
    </div>
  )
}

function renderInlineFormatting(content: string): React.ReactNode[] {
  return content
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((segment, index) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        return <strong key={`segment-${index}`}>{segment.slice(2, -2)}</strong>
      }

      if (segment.startsWith('`') && segment.endsWith('`')) {
        return (
          <code
            key={`segment-${index}`}
            style={{
              padding: '2px 4px',
              borderRadius: tokens.radius.sm,
              background: mixColor(SURFACE_QUATERNARY, 76),
              color: TEXT_SECONDARY,
              fontFamily: tokens.typography.fontFamily.mono,
              fontSize: '0.95em',
            }}
          >
            {segment.slice(1, -1)}
          </code>
        )
      }

      if (segment.startsWith('*') && segment.endsWith('*')) {
        return <em key={`segment-${index}`}>{segment.slice(1, -1)}</em>
      }

      return <Fragment key={`segment-${index}`}>{segment}</Fragment>
    })
}

const codeActionButtonStyle: React.CSSProperties = {
  padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
  background: 'transparent',
  border: `1px solid ${BORDER_SECONDARY}`,
  borderRadius: tokens.radius.md,
  color: TEXT_TERTIARY,
  fontSize: tokens.typography.fontSize.xs,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['1'],
}

function fallbackCopy(content: string) {
  if (typeof document === 'undefined') {
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = content
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

