'use client'

import Link from 'next/link'
import { ArrowLeft, Code, Terminal, Eye, MessageSquare, GitBranch, Keyboard } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const IDE_FEATURES = [
  {
    icon: Code,
    title: 'Monaco Editor',
    description: 'Full VS Code-powered editor with syntax highlighting, IntelliSense, and multi-cursor support.',
    shortcut: null,
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Panel',
    description: 'Context-aware AI assistant with @mentions for codebase, docs, diffs, and errors.',
    shortcut: 'Cmd+Shift+A',
  },
  {
    icon: Eye,
    title: 'Preview ao vivo',
    description: 'Preview em tempo real com HMR. Sandbox E2B ou fallback WebContainers.',
    shortcut: 'Cmd+Shift+P',
  },
  {
    icon: Terminal,
    title: 'Integrated Terminal',
    description: 'Full terminal with tabs, split panes, and command history.',
    shortcut: 'Cmd+`',
  },
  {
    icon: GitBranch,
    title: 'Git Integration',
    description: 'Built-in git panel with diff view, commit, push, and branch management.',
    shortcut: 'Cmd+Shift+G',
  },
  {
    icon: Keyboard,
    title: 'Command Palette',
    description: 'Fuzzy-search command palette for quick access to all IDE features.',
    shortcut: 'Cmd+Shift+K',
  },
]

const KEYBOARD_SHORTCUTS = [
  { key: 'Cmd+S', action: 'Save file' },
  { key: 'Cmd+Shift+K', action: 'Command palette' },
  { key: 'Cmd+Shift+A', action: 'AI chat' },
  { key: 'Cmd+Shift+P', action: 'Preview toggle' },
  { key: 'Cmd+`', action: 'Toggle terminal' },
  { key: 'Cmd+Shift+G', action: 'Git panel' },
  { key: 'Cmd+B', action: 'Toggle sidebar' },
  { key: 'Cmd+J', action: 'Toggle output panel' },
  { key: 'Cmd+/', action: 'Toggle comment' },
  { key: 'Cmd+D', action: 'Select next occurrence' },
]

export default function IDEDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-20">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <h1 className="text-4xl font-bold">IDE / Workbench</h1>
        <p className="mt-3 text-lg text-[var(--aethel-text-tertiary)]">
          IDE cloud completa com assistencia de IA, preview ao vivo e terminal integrado.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">Features</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {IDE_FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-5 w-5 text-[var(--aethel-primary-light)]" />
                  <h3 className="font-semibold">{feature.title}</h3>
                  {feature.shortcut && (
                    <kbd className="ml-auto rounded border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--aethel-text-tertiary)]">
                      {feature.shortcut}
                    </kbd>
                  )}
                </div>
                <p className="text-sm text-[var(--aethel-text-tertiary)]">{feature.description}</p>
              </div>
            )
          })}
        </div>

        <h2 className="mt-10 text-2xl font-semibold">Keyboard Shortcuts</h2>
        <div className="mt-4 rounded-xl border border-[var(--aethel-border-primary)] overflow-hidden">
          {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
            <div
              key={shortcut.key}
              className={`flex items-center justify-between px-4 py-2.5 ${
                i < KEYBOARD_SHORTCUTS.length - 1 ? 'border-b border-[var(--aethel-border-subtle)]' : ''
              }`}
            >
              <span className="text-sm text-[var(--aethel-text-secondary)]">{shortcut.action}</span>
              <kbd className="rounded border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] px-2 py-0.5 text-xs font-mono text-[var(--aethel-text-tertiary)]">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-2xl font-semibold">AI Context Mentions</h2>
        <div className="mt-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] p-6">
          <p className="text-sm text-[var(--aethel-text-tertiary)] mb-4">
            Use @mentions in the AI chat to inject specific context:
          </p>
          <div className="grid gap-2">
            {[
              { mention: '@Codebase', desc: 'Search the entire project codebase semantically' },
              { mention: '@Docs', desc: 'Reference project documentation' },
              { mention: '@Diff', desc: 'Include recent git changes as context' },
              { mention: '@Error', desc: 'Inject current error/stacktrace from console' },
              { mention: '@git:log', desc: 'Include relevant commit history' },
            ].map((item) => (
              <div key={item.mention} className="flex items-center gap-3 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] px-3 py-2">
                <code className="text-sm font-mono font-semibold text-[var(--aethel-primary-light)]">{item.mention}</code>
                <span className="text-sm text-[var(--aethel-text-tertiary)]">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

