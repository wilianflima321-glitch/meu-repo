'use client'

// @deprecated V26: legacy PTY surface retained for compatibility only.
// Canonical IDE terminal chrome is `MultiTerminalPanel` via `XTerminal`.
import { MultiTerminalPanel } from '@/components/terminal/XTerminal'

export interface TerminalTab {
  id: string
  name: string
  sessionId: string | null
  cwd?: string
  shell?: string
  isActive: boolean
}

export interface TerminalWidgetProps {
  className?: string
  initialCwd?: string
  initialShell?: string
  theme?: unknown
  fontSize?: number
  showTabs?: boolean
  showToolbar?: boolean
  maxTabs?: number
  onSessionCreated?: (sessionId: string) => void
  onSessionClosed?: (sessionId: string) => void
}

export function TerminalWidget({ className, maxTabs }: TerminalWidgetProps) {
  return <MultiTerminalPanel className={className} initialSessions={Math.max(1, Math.min(maxTabs ?? 1, 4))} />
}

export default TerminalWidget
