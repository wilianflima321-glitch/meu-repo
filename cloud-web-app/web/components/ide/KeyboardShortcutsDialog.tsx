'use client'

import { useState, useCallback } from 'react'
import Codicon from './Codicon'

const SHORTCUT_CATEGORIES = [
  {
    title: 'Geral',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'], action: 'Abrir Command Palette' },
      { keys: ['Ctrl', 'P'], action: 'Quick Open (Arquivo)' },
      { keys: ['Ctrl', 'Shift', 'N'], action: 'Nova janela' },
      { keys: ['Ctrl', ','], action: 'Abrir Settings' },
      { keys: ['Ctrl', 'K', 'Ctrl', 'S'], action: 'Ver atalhos de teclado' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: ['Ctrl', 'S'], action: 'Salvar arquivo' },
      { keys: ['Ctrl', 'Z'], action: 'Desfazer' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Refazer' },
      { keys: ['Ctrl', 'D'], action: 'Selecionar proxima ocorrencia' },
      { keys: ['Ctrl', 'Shift', 'K'], action: 'Deletar linha' },
      { keys: ['Alt', 'Up'], action: 'Mover linha para cima' },
      { keys: ['Alt', 'Down'], action: 'Mover linha para baixo' },
      { keys: ['Ctrl', '/'], action: 'Comentar/descomentar linha' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Formatar documento' },
    ],
  },
  {
    title: 'AI & Chat',
    shortcuts: [
      { keys: ['Ctrl', 'L'], action: 'Abrir/focar AI Chat' },
      { keys: ['Ctrl', 'I'], action: 'Inline completion' },
      { keys: ['Ctrl', 'Shift', 'I'], action: 'Explicar codigo selecionado' },
      { keys: ['Tab'], action: 'Aceitar sugestao inline' },
      { keys: ['Escape'], action: 'Recusar sugestao inline' },
    ],
  },
  {
    title: 'Navegacao',
    shortcuts: [
      { keys: ['Ctrl', 'G'], action: 'Ir para linha' },
      { keys: ['Ctrl', 'Shift', 'O'], action: 'Ir para simbolo' },
      { keys: ['F12'], action: 'Go to Definition' },
      { keys: ['Alt', 'F12'], action: 'Peek Definition' },
      { keys: ['Ctrl', 'Shift', 'E'], action: 'Focar explorador de arquivos' },
      { keys: ['Ctrl', 'Shift', 'G'], action: 'Focar Git' },
      { keys: ['Ctrl', '`'], action: 'Abrir/fechar terminal' },
    ],
  },
  {
    title: 'Depuracao',
    shortcuts: [
      { keys: ['F5'], action: 'Iniciar/continuar depuracao' },
      { keys: ['F9'], action: 'Toggle breakpoint' },
      { keys: ['F10'], action: 'Step over' },
      { keys: ['F11'], action: 'Step into' },
      { keys: ['Shift', 'F11'], action: 'Step out' },
    ],
  },
]

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const [search, setSearch] = useState('')

  const filteredCategories = SHORTCUT_CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: cat.shortcuts.filter(
      (s) =>
        s.action.toLowerCase().includes(search.toLowerCase()) ||
        s.keys.join(' ').toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.shortcuts.length > 0)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Atalhos de teclado"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Codicon name="keyboard" />
            </div>
            <h2 className="text-lg font-semibold text-white">Atalhos de Teclado</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <Codicon name="close" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-white/[0.06] px-5 py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <Codicon name="search" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar atalho..."
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500/40 focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Nenhum atalho encontrado</p>
          ) : (
            <div className="space-y-6">
              {filteredCategories.map((cat) => (
                <div key={cat.title}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{cat.title}</h3>
                  <div className="space-y-1">
                    {cat.shortcuts.map((s) => (
                      <div
                        key={s.action}
                        className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="text-sm text-zinc-300">{s.action}</span>
                        <div className="flex items-center gap-1">
                          {s.keys.map((key, i) => (
                            <span key={`${s.action}-${i}`}>
                              <kbd className="inline-flex min-w-[24px] items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400">
                                {key}
                              </kbd>
                              {i < s.keys.length - 1 && <span className="mx-0.5 text-zinc-700">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="text-xs text-zinc-600">
            Pressione <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-400">Ctrl</kbd> +{' '}
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-400">K</kbd> +{' '}
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-400">Ctrl</kbd> +{' '}
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-400">S</kbd> para abrir esta lista
          </p>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsDialog
