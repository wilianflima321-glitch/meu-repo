'use client'

import { useState } from 'react'
import type { PortDefinition } from './visual-node-catalog'

/**
 * Evaluates a literal math expression typed into a numeric port field (e.g.
 * `1.5 * 3`) — same safe-eval contract used across the AGDS numeric input
 * family (`PropertiesPanel3D.tsx`, `web/components/ui/ScrubbableInput.tsx`):
 * a `Function` constructor over a whitelisted `+ - * / ( ) .` + digit
 * character set, never a raw `eval`.
 */
function evaluateMathExpression(expression: string): number | null {
  const sanitized = expression.replace(/\s/g, '')
  if (!sanitized) return null
  if (!/^[\d+\-*/().]+$/.test(sanitized)) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${sanitized})`)()
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

/**
 * Node inspector input for a single port's literal value. Numeric ports
 * (`number` / `float`) get Math On-the-Fly + monospaced tabular digits —
 * the same "invisible slider" input contract as the rest of the AGDS
 * Inspector family — so typing `duration = 0.5 * 3` in a GAS `Wait Delay`
 * node (or any other numeric port, in any category) just works. Non-numeric
 * ports render as a plain text field, unchanged.
 */
export function NodePortValueInput({
  port,
  value,
  onCommit,
  className,
}: {
  port: PortDefinition
  value: unknown
  onCommit: (value: string) => void
  className?: string
}) {
  const isNumeric = port.type === 'number' || port.type === 'float'
  const [draft, setDraft] = useState<string | null>(null)
  const committedText = String(value ?? port.default ?? '')
  const displayValue = draft ?? committedText

  if (!isNumeric) {
    return (
      <input
        type="text"
        defaultValue={committedText}
        onChange={(e) => onCommit(e.target.value)}
        aria-label={`Value for input ${port.label}`}
        className={className}
      />
    )
  }

  const commit = () => {
    if (draft === null) return
    const trimmed = draft.trim()
    if (trimmed.length > 0) {
      const evaluated = evaluateMathExpression(trimmed)
      onCommit(evaluated !== null ? String(evaluated) : committedText)
    }
    setDraft(null)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setDraft(committedText)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === 'Escape') {
          setDraft(null)
          ;(e.target as HTMLInputElement).blur()
        }
        // Stop ReactFlow from treating Backspace/Delete as "delete this node" while typing a value.
        e.stopPropagation()
      }}
      aria-label={`Value for input ${port.label}`}
      title="Accepts math expressions, e.g. 0.5 * 3"
      className={`${className} font-mono tabular-nums`}
    />
  )
}

export default NodePortValueInput
