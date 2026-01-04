'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  File,
  Folder,
  Code2,
  FileText,
  Hash,
  ArrowRight,
  Clock,
  Star,
  X,
  Command,
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'file' | 'folder' | 'symbol' | 'command' | 'recent'
  title: string
  subtitle?: string
  icon?: typeof File
  path?: string
  action?: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (path: string) => void
}

const QUICK_ACTIONS: SearchResult[] = [
  { id: 'new-file', type: 'command', title: 'Criar novo arquivo', subtitle: '⌘N', icon: File },
  { id: 'new-folder', type: 'command', title: 'Criar nova pasta', subtitle: '⇧⌘N', icon: Folder },
  { id: 'open-terminal', type: 'command', title: 'Abrir terminal', subtitle: '⌘J', icon: Code2 },
  { id: 'go-dashboard', type: 'command', title: 'Ir para Dashboard', icon: ArrowRight },
  { id: 'go-settings', type: 'command', title: 'Abrir Configurações', subtitle: '⌘,', icon: ArrowRight },
]

const SAMPLE_FILES: SearchResult[] = [
  { id: 'f1', type: 'file', title: 'App.tsx', path: 'src/App.tsx', icon: Code2 },
  { id: 'f2', type: 'file', title: 'index.html', path: 'public/index.html', icon: FileText },
  { id: 'f3', type: 'file', title: 'package.json', path: 'package.json', icon: FileText },
  { id: 'f4', type: 'folder', title: 'components', path: 'src/components', icon: Folder },
  { id: 'f5', type: 'file', title: 'tailwind.config.js', path: 'tailwind.config.js', icon: Code2 },
]

export default function CommandPalettePro({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('aethel-recent-searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults(QUICK_ACTIONS)
      return
    }

    const lowerQuery = query.toLowerCase()
    
    const fileResults = SAMPLE_FILES.filter(
      (f) =>
        f.title.toLowerCase().includes(lowerQuery) ||
        f.path?.toLowerCase().includes(lowerQuery)
    )
    
    const commandResults = QUICK_ACTIONS.filter((c) =>
      c.title.toLowerCase().includes(lowerQuery)
    )

    setResults([...commandResults, ...fileResults])
    setSelectedIndex(0)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, results, selectedIndex, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement
    selectedElement?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = (result: SearchResult) => {
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('aethel-recent-searches', JSON.stringify(updated))
    }

    if (result.action) {
      result.action()
    } else if (result.path && onNavigate) {
      onNavigate(result.path)
    }

    onClose()
  }

  const getIcon = (result: SearchResult) => {
    if (result.icon) return result.icon
    switch (result.type) {
      case 'file':
        return File
      case 'folder':
        return Folder
      case 'symbol':
        return Hash
      case 'command':
        return ArrowRight
      case 'recent':
        return Clock
      default:
        return File
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar arquivos, comandos, ou digite > para ações..."
            className="flex-1 py-4 bg-transparent text-white text-lg placeholder-slate-500 outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-slate-500 bg-slate-800 rounded">
            <Command className="w-3 h-3" />K
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500">Nenhum resultado encontrado</p>
            </div>
          ) : (
            <>
              {['command', 'file', 'folder'].map((type) => {
                const typeResults = results.filter((r) => r.type === type)
                if (typeResults.length === 0) return null

                return (
                  <div key={type} className="mb-2">
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {type === 'command'
                        ? 'Ações rápidas'
                        : type === 'file'
                        ? 'Arquivos'
                        : 'Pastas'}
                    </div>
                    {typeResults.map((result) => {
                      const globalIndex = results.indexOf(result)
                      const Icon = getIcon(result)

                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                            ${
                              selectedIndex === globalIndex
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }
                          `}
                        >
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${
                              selectedIndex === globalIndex
                                ? 'text-indigo-200'
                                : 'text-slate-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{result.title}</div>
                            {result.path && (
                              <div
                                className={`text-sm truncate ${
                                  selectedIndex === globalIndex
                                    ? 'text-indigo-200'
                                    : 'text-slate-500'
                                }`}
                              >
                                {result.path}
                              </div>
                            )}
                          </div>
                          {result.subtitle && (
                            <span
                              className={`text-xs ${
                                selectedIndex === globalIndex
                                  ? 'text-indigo-200'
                                  : 'text-slate-600'
                              }`}
                            >
                              {result.subtitle}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">esc</kbd>
              fechar
            </span>
          </div>
          <span>Powered by Aethel</span>
        </div>
      </div>
    </div>
  )
}

// Hook to open command palette with keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }
}
