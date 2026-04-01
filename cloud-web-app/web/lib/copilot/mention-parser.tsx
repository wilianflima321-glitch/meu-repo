'use client'

/**
 * @-Mentions Parser for AI Chat
 * Similar ao Cursor/GitHub Copilot - permite referenciar arquivos, funcoes e simbolos
 * 
 * Supported mention types:
 * - @file:path/to/file.ts - Referencia um arquivo
 * - @function:functionName - Referencia uma funcao
 * - @symbol:SymbolName - Referencia uma classe/interface/tipo
 * - @selection - Referencia a selecao atual
 * - @diagnostics - Referencia erros atuais
 * - @git:diff - Referencia o diff do git
 * - @terminal - Referencia a saida do terminal
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

// ============= Types =============

export type MentionType = 
  | 'file' 
  | 'folder'
  | 'function' 
  | 'symbol' 
  | 'selection' 
  | 'diagnostics'
  | 'git'
  | 'terminal'
  | 'web'
  | 'docs'
  | 'codebase'

export interface Mention {
  type: MentionType
  value: string
  displayName: string
  resolved?: boolean
  content?: string // Resolved content
  range?: { start: number; end: number }
}

export interface ParsedMessage {
  text: string
  mentions: Mention[]
  cleanText: string // Text with mentions removed
}

export interface MentionSuggestion {
  type: MentionType
  value: string
  displayName: string
  description?: string
  icon: string
  preview?: string
}

// ============= Mention Patterns =============

const MENTION_PATTERNS: Record<MentionType, RegExp> = {
  file: /@file:([^\s]+)/g,
  folder: /@folder:([^\s]+)/g,
  function: /@function:([^\s]+)/g,
  symbol: /@symbol:([^\s]+)/g,
  selection: /@selection/g,
  diagnostics: /@diagnostics/g,
  git: /@git:(diff|staged|status)/g,
  terminal: /@terminal/g,
  web: /@web:([^\s]+)/g,
  docs: /@docs:([^\s]+)/g,
  codebase: /@codebase/g,
}

// Combined pattern for detecting any mention
const ANY_MENTION_PATTERN = /@(file|folder|function|symbol|selection|diagnostics|git|terminal|web|docs|codebase)(:([^\s]*))?/g

// ============= Parser Class =============

export class MentionParser {
  private fileIndex: Map<string, string> = new Map()
  private symbolIndex: Map<string, { type: string; file: string; line: number }> = new Map()
  
  constructor() {
    // Initialize indices (would be populated from workspace)
  }
  
  /**
   * Parse a message and extract all mentions
   */
  parse(text: string): ParsedMessage {
    const mentions: Mention[] = []
    let cleanText = text
    
    // Find all mentions
    const matches = text.matchAll(ANY_MENTION_PATTERN)
    
    for (const match of matches) {
      const fullMatch = match[0]
      const type = match[1] as MentionType
      const value = match[3] || ''
      
      mentions.push({
        type,
        value,
        displayName: fullMatch,
        resolved: false,
        range: {
          start: match.index!,
          end: match.index! + fullMatch.length,
        },
      })
      
      // Don't remove from cleanText yet - we'll do it after resolving
    }
    
    return {
      text,
      mentions,
      cleanText,
    }
  }
  
  /**
   * Resolve mentions to their actual content
   */
  async resolveMentions(parsed: ParsedMessage): Promise<ParsedMessage> {
    const resolvedMentions = await Promise.all(
      parsed.mentions.map(async (mention) => {
        const content = await this.resolveContent(mention)
        return {
          ...mention,
          resolved: true,
          content,
        }
      })
    )
    
    // Build clean text by replacing mentions with resolved content markers
    let cleanText = parsed.text
    for (const mention of resolvedMentions.reverse()) { // Reverse to maintain indices
      if (mention.range) {
        const marker = `[${mention.type}:${mention.value || 'current'}]`
        cleanText = cleanText.slice(0, mention.range.start) + marker + cleanText.slice(mention.range.end)
      }
    }
    
    return {
      ...parsed,
      mentions: resolvedMentions,
      cleanText,
    }
  }
  
  /**
   * Resolve content for a single mention
   */
  private async resolveContent(mention: Mention): Promise<string> {
    switch (mention.type) {
      case 'file':
        return this.resolveFile(mention.value)
      case 'folder':
        return this.resolveFolder(mention.value)
      case 'function':
        return this.resolveFunction(mention.value)
      case 'symbol':
        return this.resolveSymbol(mention.value)
      case 'selection':
        return this.resolveSelection()
      case 'diagnostics':
        return this.resolveDiagnostics()
      case 'git':
        return this.resolveGit(mention.value)
      case 'terminal':
        return this.resolveTerminal()
      case 'web':
        return this.resolveWeb(mention.value)
      case 'docs':
        return this.resolveDocs(mention.value)
      case 'codebase':
        return this.resolveCodebase()
      default:
        return `[Nao foi possivel resolver ${mention.type}]`
    }
  }
  
  private async resolveFile(path: string): Promise<string> {
    // In real implementation, read file from workspace
    return `--- Arquivo: ${path} ---\n// O conteudo do arquivo seria carregado aqui`
  }
  
  private async resolveFolder(path: string): Promise<string> {
    // In real implementation, list folder contents
    return `--- Pasta: ${path} ---\n// A estrutura da pasta seria listada aqui`
  }
  
  private async resolveFunction(name: string): Promise<string> {
    // In real implementation, find function definition
    return `--- Funcao: ${name} ---\n// A definicao da funcao apareceria aqui`
  }
  
  private async resolveSymbol(name: string): Promise<string> {
    // In real implementation, find symbol definition
    return `--- Simbolo: ${name} ---\n// A definicao do simbolo apareceria aqui`
  }
  
  private async resolveSelection(): Promise<string> {
    // In real implementation, get current editor selection
    return `--- Selecao Atual ---\n// O codigo selecionado apareceria aqui`
  }
  
  private async resolveDiagnostics(): Promise<string> {
    // In real implementation, get current errors/warnings
    return `--- Diagnosticos ---\n// Os erros e avisos atuais apareceriam aqui`
  }
  
  private async resolveGit(type: string): Promise<string> {
    // In real implementation, get git info
    return `--- Git ${type} ---\n// As informacoes do Git apareceriam aqui`
  }
  
  private async resolveTerminal(): Promise<string> {
    // In real implementation, get recent terminal output
    return `--- Saida do Terminal ---\n// A saida recente do terminal apareceria aqui`
  }
  
  private async resolveWeb(url: string): Promise<string> {
    // In real implementation, fetch web content
    return `--- Web: ${url} ---\n// O conteudo da web seria buscado aqui`
  }
  
  private async resolveDocs(query: string): Promise<string> {
    // In real implementation, search documentation
    return `--- Docs: ${query} ---\n// Os resultados da documentacao apareceriam aqui`
  }
  
  private async resolveCodebase(): Promise<string> {
    // In real implementation, get codebase overview
    return `--- Codebase ---\n// A estrutura da codebase e os arquivos principais apareceriam aqui`
  }
}

// ============= Suggestion Provider =============

export class MentionSuggestionProvider {
  private files: string[] = []
  private functions: string[] = []
  private symbols: string[] = []
  
  constructor(workspace?: any) {
    // Initialize from workspace
    this.loadWorkspaceIndex()
  }
  
  private async loadWorkspaceIndex() {
    // In real implementation, index workspace files, functions, symbols
    // For now, mock data
    this.files = [
      'src/App.tsx',
      'src/index.tsx',
      'src/main.ts',
      'src/components/Button.tsx',
      'src/services/api.ts',
    ]
    this.functions = [
      'handleClick',
      'fetchData',
      'processResponse',
      'validateInput',
      'formatOutput',
    ]
    this.symbols = [
      'User',
      'ApiResponse',
      'Config',
      'AppState',
      'Theme',
    ]
  }
  
  /**
   * Get suggestions based on current input
   */
  getSuggestions(query: string, cursorPosition: number): MentionSuggestion[] {
    // Check if user is typing a mention
    const textBeforeCursor = query.slice(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)(:([^\s]*))?$/)
    
    if (!mentionMatch) {
      return []
    }
    
    const mentionType = mentionMatch[1] || ''
    const mentionValue = mentionMatch[3] || ''
    
    const suggestions: MentionSuggestion[] = []
    
    // If no type specified yet, show all mention types
    if (!mentionType || !Object.keys(MENTION_PATTERNS).includes(mentionType)) {
      const allTypes: MentionSuggestion[] = [
        { type: 'file', value: '', displayName: '@file:', description: 'Referenciar arquivo', icon: 'FILE' },
        { type: 'folder', value: '', displayName: '@folder:', description: 'Referenciar pasta', icon: 'DIR' },
        { type: 'function', value: '', displayName: '@function:', description: 'Referenciar funcao', icon: 'FN' },
        { type: 'symbol', value: '', displayName: '@symbol:', description: 'Referenciar classe, interface ou tipo', icon: 'SYM' },
        { type: 'selection', value: '', displayName: '@selection', description: 'Selecao atual', icon: 'SEL' },
        { type: 'diagnostics', value: '', displayName: '@diagnostics', description: 'Erros e avisos atuais', icon: 'ERR' },
        { type: 'git', value: '', displayName: '@git:', description: 'Diff, staged ou status do Git', icon: 'GIT' },
        { type: 'terminal', value: '', displayName: '@terminal', description: 'Saida recente do terminal', icon: 'TERM' },
        { type: 'web', value: '', displayName: '@web:', description: 'Buscar conteudo da web', icon: 'WEB' },
        { type: 'docs', value: '', displayName: '@docs:', description: 'Buscar documentacao', icon: 'DOC' },
        { type: 'codebase', value: '', displayName: '@codebase', description: 'Codebase inteira', icon: 'CODE' },
      ]
      
      // Filter by partial type match
      return allTypes.filter(s => 
        s.displayName.toLowerCase().includes(('@' + mentionType).toLowerCase())
      )
    }
    
    // Type specified, show value suggestions
    switch (mentionType) {
      case 'file':
        return this.files
          .filter(f => f.toLowerCase().includes(mentionValue.toLowerCase()))
          .slice(0, 10)
          .map(f => ({
            type: 'file' as MentionType,
            value: f,
            displayName: `@file:${f}`,
            description: 'Referencia de arquivo',
            icon: 'FILE',
            preview: `// ${f}`,
          }))
      
      case 'function':
        return this.functions
          .filter(f => f.toLowerCase().includes(mentionValue.toLowerCase()))
          .slice(0, 10)
          .map(f => ({
            type: 'function' as MentionType,
            value: f,
            displayName: `@function:${f}`,
            description: 'Referencia de funcao',
            icon: 'FN',
          }))
      
      case 'symbol':
        return this.symbols
          .filter(s => s.toLowerCase().includes(mentionValue.toLowerCase()))
          .slice(0, 10)
          .map(s => ({
            type: 'symbol' as MentionType,
            value: s,
            displayName: `@symbol:${s}`,
            description: 'Referencia de simbolo',
            icon: 'SYM',
          }))
      
      case 'git':
        return [
          { type: 'git' as MentionType, value: 'diff', displayName: '@git:diff', description: 'Diff do Git', icon: 'DIFF' },
          { type: 'git' as MentionType, value: 'staged', displayName: '@git:staged', description: 'Mudancas em staged', icon: 'OK' },
          { type: 'git' as MentionType, value: 'status', displayName: '@git:status', description: 'Status do Git', icon: 'STAT' },
        ].filter(s => s.value.includes(mentionValue.toLowerCase()))
      
      default:
        return []
    }
  }
  
  /**
   * Update file index
   */
  updateFileIndex(files: string[]) {
    this.files = files
  }
  
  /**
   * Update function index
   */
  updateFunctionIndex(functions: string[]) {
    this.functions = functions
  }
  
  /**
   * Update symbol index
   */
  updateSymbolIndex(symbols: string[]) {
    this.symbols = symbols
  }
}

// ============= React Hook =============

export function useMentions(initialValue = '') {
  const [text, setText] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const parserRef = useRef(new MentionParser())
  const suggestionProviderRef = useRef(new MentionSuggestionProvider())
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Parse mentions when text changes
  const parsed = useMemo(() => {
    return parserRef.current.parse(text)
  }, [text])
  
  // Update suggestions based on cursor position
  const updateSuggestions = useCallback((cursorPosition: number) => {
    const newSuggestions = suggestionProviderRef.current.getSuggestions(text, cursorPosition)
    setSuggestions(newSuggestions)
    setShowSuggestions(newSuggestions.length > 0)
    setActiveSuggestionIndex(0)
  }, [text])
  
  // Handle text change
  const handleTextChange = useCallback((newText: string, cursorPosition: number) => {
    setText(newText)
    updateSuggestions(cursorPosition)
  }, [updateSuggestions])
  
  // Apply suggestion
  const applySuggestion = useCallback((suggestion: MentionSuggestion) => {
    if (!inputRef.current) return
    
    const cursorPosition = inputRef.current.selectionStart
    const textBeforeCursor = text.slice(0, cursorPosition)
    const textAfterCursor = text.slice(cursorPosition)
    
    // Find the @ mention to replace
    const mentionMatch = textBeforeCursor.match(/@\w*(:([^\s]*))?$/)
    if (!mentionMatch) return
    
    const mentionStart = textBeforeCursor.lastIndexOf('@')
    const newText = text.slice(0, mentionStart) + suggestion.displayName + ' ' + textAfterCursor.trimStart()
    
    setText(newText)
    setShowSuggestions(false)
    
    // Move cursor after the mention
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionStart + suggestion.displayName.length + 1
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        inputRef.current.focus()
      }
    }, 0)
  }, [text])
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Tab':
      case 'Enter':
        if (suggestions[activeSuggestionIndex]) {
          e.preventDefault()
          applySuggestion(suggestions[activeSuggestionIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }, [showSuggestions, suggestions, activeSuggestionIndex, applySuggestion])
  
  // Resolve all mentions
  const resolveMentions = useCallback(async () => {
    return parserRef.current.resolveMentions(parsed)
  }, [parsed])
  
  return {
    text,
    setText: handleTextChange,
    replaceText: (newText: string) => {
      setText(newText)
      setShowSuggestions(false)
      setActiveSuggestionIndex(0)
    },
    parsed,
    suggestions,
    showSuggestions,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    applySuggestion,
    handleKeyDown,
    resolveMentions,
    inputRef,
    hideSuggestions: () => setShowSuggestions(false),
  }
}

// ============= Mention Chip Component =============

interface MentionChipProps {
  mention: Mention
  onRemove?: () => void
}

export function MentionChip({ mention, onRemove }: MentionChipProps) {
  const icons: Record<MentionType, string> = {
    file: 'FILE',
    folder: 'DIR',
    function: 'FN',
    symbol: 'SYM',
    selection: 'SEL',
    diagnostics: 'ERR',
    git: 'GIT',
    terminal: 'TERM',
    web: 'WEB',
    docs: 'DOC',
    codebase: 'CODE',
  }

  const colors: Record<MentionType, string> = {
    file: 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-info-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
    folder: 'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-warning-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]',
    function: 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-primary-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]',
    symbol: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-secondary)_85%,white)] border-[color-mix(in_srgb,var(--aethel-secondary)_30%,transparent)]',
    selection: 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-success-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)]',
    diagnostics: 'bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-error)_88%,white)] border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)]',
    git: 'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-warning-light)_88%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]',
    terminal: 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] text-[var(--aethel-text-secondary)] border-[var(--aethel-border-secondary)]',
    web: 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-info-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]',
    docs: 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-primary-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)]',
    codebase: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-secondary)_85%,white)] border-[color-mix(in_srgb,var(--aethel-secondary)_28%,transparent)]',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${colors[mention.type]}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{icons[mention.type]}</span>
      <span className="text-xs font-medium">
        {mention.value || mention.type}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover mention ${mention.value || mention.type}`}
          className="ml-1 hover:opacity-70"
        >
          x
        </button>
      )}
    </span>
  )
}

// ============= Suggestion List Component =============

interface SuggestionListProps {
  suggestions: MentionSuggestion[]
  activeIndex: number
  onSelect: (suggestion: MentionSuggestion) => void
  onHover: (index: number) => void
  listboxId?: string
}

export function SuggestionList({ suggestions, activeIndex, onSelect, onHover, listboxId }: SuggestionListProps) {
  return (
    <div
      id={listboxId}
      role="listbox"
      aria-label="Sugestoes de mentions"
      aria-activedescendant={activeIndex >= 0 ? `mention-suggestion-${activeIndex}` : undefined}
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-xl z-50"
    >
      {suggestions.map((suggestion, idx) => (
        <div
          key={`${suggestion.type}-${suggestion.value}-${idx}`}
          id={`mention-suggestion-${idx}`}
          role="option"
          aria-selected={idx === activeIndex}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
            idx === activeIndex ? 'bg-[color-mix(in_srgb,var(--aethel-primary-dark)_30%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)]'
          }`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(idx)}
        >
          <span className="min-w-[2.75rem] text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            {suggestion.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--aethel-text-primary)] truncate">
              {suggestion.displayName}
            </div>
            {suggestion.description && (
              <div className="text-xs text-[var(--aethel-text-tertiary)] truncate">
                {suggestion.description}
              </div>
            )}
          </div>
          {idx === activeIndex && (
            <span className="text-xs text-[var(--aethel-text-quaternary)]">Tab</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default MentionParser

