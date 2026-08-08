'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { tokens } from '../../web/lib/design-tokens'
import { Check, Copy, Loader2, Sparkles } from 'lucide-react'

import { type InlineAIMessageCodeBlock } from './InlineAIChat.helpers'
import {
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
  accentClass = 'text-[var(--aethel-text-secondary)]',
}: {
  label: string
  icon: React.ReactNode
  accentClass?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border border-current bg-current/10 whitespace-nowrap text-xs ${accentClass}`}
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
      className="flex items-center gap-2 p-3 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-sm text-[var(--aethel-text-secondary)]"
    >
      <Loader2 size={16} className="animate-spin" />
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
            aria-label="Copy code block"
            onClick={copyToClipboard}
            style={codeActionButtonStyle}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {onReview && (
            <button
              type="button"
              aria-label="Open review diff for the code block"
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
              aria-label="Apply code block to editor"
              onClick={() => onApply(block.code)}
              style={codeActionButtonStyle}
            >
              <Sparkles size={12} />
              Apply
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
