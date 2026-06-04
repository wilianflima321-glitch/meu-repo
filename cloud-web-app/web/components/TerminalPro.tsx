'use client'

// @deprecated V26: compatibility-only wrapper. Route shells and IDE regions
// must use `MultiTerminalPanel` from `@/components/terminal/XTerminal`.
import { MultiTerminalPanel } from '@/components/terminal/XTerminal'

interface TerminalProps {
  initialLines?: Array<{
    id: string
    type: 'input' | 'output' | 'error' | 'info'
    content: string
    timestamp: Date
  }>
  onCommand?: (command: string) => Promise<string | void>
  className?: string
}

export function TerminalPro({ className }: TerminalProps) {
  return <MultiTerminalPanel className={className} />
}

export default TerminalPro
