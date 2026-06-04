'use client'

import Link from 'next/link'
import { ArrowLeft, Code, Terminal, Eye, MessageSquare, GitBranch, Keyboard } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const IDE_FEATURES = [
  {
    icon: Code,
    title: 'Monaco Editor',
    description: 'Code, navigate, and edit in a familiar IDE.',
    shortcut: null,
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Panel',
    description: 'Ask with files, diffs, docs, and errors in scope.',
    shortcut: 'Cmd+Shift+A',
  },
  {
    icon: Eye,
    title: 'Live Preview',
    description: 'Review app changes next to code.',
    shortcut: 'Cmd+Shift+P',
  },
  {
    icon: Terminal,
    title: 'Integrated Terminal',
    description: 'Run commands without leaving the workspace.',
    shortcut: 'Cmd+`',
  },
  {
    icon: GitBranch,
    title: 'Git Integration',
    description: 'Review diffs before changes leave the IDE.',
    shortcut: 'Cmd+Shift+G',
  },
  {
    icon: Keyboard,
    title: 'Command Palette',
    description: 'Jump to actions without hunting through panels.',
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

        <h1 className="text-4xl font-bold">IDE and agents</h1>
        <p className="mt-3 text-lg text-[var(--aethel-text-tertiary)]">
          A focused shell for code, agents, preview, and terminal.
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

        <details className="mt-10 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] p-5">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--aethel-text-primary)]">
            AI context mentions
          </summary>
          <div className="mt-4 grid gap-2">
            {[
              { mention: '@Codebase', desc: 'Project search' },
              { mention: '@Docs', desc: 'Relevant docs' },
              { mention: '@Diff', desc: 'Current changes' },
              { mention: '@Error', desc: 'Latest error' },
              { mention: '@git:log', desc: 'Commit history' },
            ].map((item) => (
              <div key={item.mention} className="flex items-center gap-3 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] px-3 py-2">
                <code className="text-sm font-mono font-semibold text-[var(--aethel-primary-light)]">{item.mention}</code>
                <span className="text-sm text-[var(--aethel-text-tertiary)]">{item.desc}</span>
              </div>
            ))}
          </div>
        </details>
      </main>
      <PublicFooter />
    </div>
  )
}
