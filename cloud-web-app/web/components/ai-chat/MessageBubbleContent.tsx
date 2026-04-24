'use client'

import { Check, Copy } from 'lucide-react'
import { MessageBubbleCodeActions } from '@/components/ai-chat/MessageBubbleCodeActions'

interface MessageBubbleContentProps {
  content: string
  copiedCode: boolean
  onCopy: (content: string) => void | Promise<void>
}

function renderTextBlock(content: string) {
  const lines = content.split('\n')
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line.startsWith('- ') ? (
        <span className="relative block pl-4 before:absolute before:left-0 before:text-[var(--aethel-text-quaternary)] before:content-['-']">
          {line.slice(2)}
        </span>
      ) : line.startsWith('**') && line.endsWith('**') ? (
        <strong>{line.slice(2, -2)}</strong>
      ) : (
        line
      )}
      {index < lines.length - 1 && <br />}
    </span>
  ))
}

export function MessageBubbleContent({
  content,
  copiedCode,
  onCopy,
}: MessageBubbleContentProps) {
  const parts = content.split(/(```[\s\S]*```)/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)\n([\s\S]*)```/)
          if (match) {
            const [, language = 'text', code] = match
            return (
              <div
                key={`code-${index}`}
                className="group/message my-3 overflow-hidden rounded-lg border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.88))]"
              >
                <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-3 py-1.5">
                  <span className="text-xs text-[var(--aethel-text-tertiary)]">{language}</span>
                  <button
                    type="button"
                    aria-label={copiedCode ? 'Bloco de codigo copiado' : 'Copiar bloco de codigo'}
                    onClick={() => onCopy(code)}
                    className="rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)] hover:text-[var(--aethel-text-primary)]"
                    title={copiedCode ? 'Bloco de codigo copiado' : 'Copiar bloco de codigo'}
                  >
                    {copiedCode ? (
                      <Check className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 text-sm">
                  <code className="text-[var(--aethel-text-secondary)]">{code}</code>
                </pre>
                <MessageBubbleCodeActions code={code} copied={copiedCode} onCopy={onCopy} />
              </div>
            )
          }
        }

        return (
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {renderTextBlock(part)}
          </span>
        )
      })}
    </>
  )
}
