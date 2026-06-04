'use client'

// @deprecated V26: keep only for legacy imports. The IDE shell must use
// `MultiTerminalPanel` from `@/components/terminal/XTerminal`.
import { MultiTerminalPanel } from '@/components/terminal/XTerminal'

interface IntegratedTerminalProps {
  initialCwd?: string
  onCommand?: (command: string) => void
}

export function IntegratedTerminal(_props: IntegratedTerminalProps) {
  return <MultiTerminalPanel className="h-full" />
}

export default IntegratedTerminal
