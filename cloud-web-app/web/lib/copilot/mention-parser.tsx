'use client'

/**
 * @-Mentions Parser for AI Chat
 * Like Cursor/GitHub Copilot - allows referencing files, functions, symbols
 * 
 * Supported mention types:
 * - @file:path/to/file.ts - Reference a file
 * - @function:functionName - Reference a function
 * - @symbol:SymbolName - Reference a class/interface/type
 * - @selection - Reference current selection
 * - @diagnostics - Reference current errors
 * - @git:diff - Reference git diff
 * - @terminal - Reference terminal output
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
        return `[Unable to resolve ${mention.type}]`
    }
  }
  
  private async resolveFile(path: string): Promise<string> {
    // In real implementation, read file from workspace
    return `--- File: ${path} ---\n// File content would be loaded here`
  }
  
  private async resolveFolder(path: string): Promise<string> {
    // In real implementation, list folder contents
    return `--- Folder: ${path} ---\n// Folder structure would be listed here`
  }
  
  private async resolveFunction(name: string): Promise<string> {
    // In real implementation, find function definition
    return `--- Function: ${name} ---\n// Function definition would be here`
  }
  
  private async resolveSymbol(name: string): Promise<string> {
    // In real implementation, find symbol definition
    return `--- Symbol: ${name} ---\n// Symbol definition would be here`
  }
  
  private async resolveSelection(): Promise<string> {
    // In real implementation, get current editor selection
    return `--- Current Selection ---\n// Selected code would be here`
  }
  
  private async resolveDiagnostics(): Promise<string> {
    // In real implementation, get current errors/warnings
    return `--- Diagnostics ---\n// Current errors and warnings would be listed here`
  }
  
  private async resolveGit(type: string): Promise<string> {
    // In real implementation, get git info
    return `--- Git ${type} ---\n// Git information would be here`
  }
  
  private async resolveTerminal(): Promise<string> {
    // In real implementation, get recent terminal output
    return `--- Terminal Output ---\n// Recent terminal output would be here`
  }
  
  private async resolveWeb(url: string): Promise<string> {
    // In real implementation, fetch web content
    return `--- Web: ${url} ---\n// Web content would be fetched here`
  }
  
  private async resolveDocs(query: string): Promise<string> {
    // In real implementation, search documentation
    return `--- Docs: ${query} ---\n// Documentation search results would be here`
  }
  
  private async resolveCodebase(): Promise<string> {
    // In real implementation, get codebase overview
    return `--- Codebase ---\n// Codebase structure and key files would be here`
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
      'src/components/ui/Button.tsx',
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
        { type: 'file', value: '', displayName: '@file:', description: 'Reference a file', icon: '📄' },
        { type: 'folder', value: '', displayName: '@folder:', description: 'Reference a folder', icon: '📁' },
        { type: 'function', value: '', displayName: '@function:', description: 'Reference a function', icon: '🔧' },
        { type: 'symbol', value: '', displayName: '@symbol:', description: 'Reference a class/interface', icon: '🏷️' },
        { type: 'selection', value: '', displayName: '@selection', description: 'Current selection', icon: '✂️' },
        { type: 'diagnostics', value: '', displayName: '@diagnostics', description: 'Current errors', icon: '⚠️' },
        { type: 'git', value: '', displayName: '@git:', description: 'Git diff/status', icon: '🔀' },
        { type: 'terminal', value: '', displayName: '@terminal', description: 'Terminal output', icon: '💻' },
        { type: 'web', value: '', displayName: '@web:', description: 'Fetch web content', icon: '🌐' },
        { type: 'docs', value: '', displayName: '@docs:', description: 'Search docs', icon: '📚' },
        { type: 'codebase', value: '', displayName: '@codebase', description: 'Entire codebase', icon: '🗂️' },
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
            description: 'File reference',
            icon: '📄',
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
            description: 'Function reference',
            icon: '🔧',
          }))
      
      case 'symbol':
        return this.symbols
          .filter(s => s.toLowerCase().includes(mentionValue.toLowerCase()))
          .slice(0, 10)
          .map(s => ({
            type: 'symbol' as MentionType,
            value: s,
            displayName: `@symbol:${s}`,
            description: 'Symbol reference',
            icon: '🏷️',
          }))
      
      case 'git':
        return [
          { type: 'git' as MentionType, value: 'diff', displayName: '@git:diff', description: 'Git diff', icon: '🔀' },
          { type: 'git' as MentionType, value: 'staged', displayName: '@git:staged', description: 'Staged changes', icon: '✅' },
          { type: 'git' as MentionType, value: 'status', displayName: '@git:status', description: 'Git status', icon: '📊' },
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
    file: '📄',
    folder: '📁',
    function: '🔧',
    symbol: '🏷️',
    selection: '✂️',
    diagnostics: '⚠️',
    git: '🔀',
    terminal: '💻',
    web: '🌐',
    docs: '📚',
    codebase: '🗂️',
  }
  
  const colors: Record<MentionType, string> = {
    file: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    folder: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    function: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    symbol: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    selection: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    diagnostics: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    git: 'bg-red-500/20 text-red-300 border-red-500/30',
    terminal: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    web: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    docs: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    codebase: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${colors[mention.type]}`}>
      <span>{icons[mention.type]}</span>
      <span className="text-xs font-medium">
        {mention.value || mention.type}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70"
        >
          ×
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
}

export function SuggestionList({ suggestions, activeIndex, onSelect, onHover }: SuggestionListProps) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
      {suggestions.map((suggestion, idx) => (
        <div
          key={`${suggestion.type}-${suggestion.value}-${idx}`}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
            idx === activeIndex ? 'bg-indigo-600/30' : 'hover:bg-slate-700/50'
          }`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(idx)}
        >
          <span className="text-lg">{suggestion.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {suggestion.displayName}
            </div>
            {suggestion.description && (
              <div className="text-xs text-slate-400 truncate">
                {suggestion.description}
              </div>
            )}
          </div>
          {idx === activeIndex && (
            <span className="text-xs text-slate-500">Tab ↹</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default MentionParser
