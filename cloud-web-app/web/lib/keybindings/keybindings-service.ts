/**
 * Aethel Keybindings System
 * 
 * Sistema de atalhos de teclado customizáveis com
 * contextos, when clauses e conflito detection.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface Keybinding {
  key: string;
  command: string;
  args?: any;
  when?: string;
}

export interface KeybindingWithSource extends Keybinding {
  source: 'default' | 'user' | 'extension';
  extensionId?: string;
}

export interface KeyCombo {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface WhenContext {
  [key: string]: any;
}

// ============================================================================
// DEFAULT KEYBINDINGS
// ============================================================================

export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  // File operations
  { key: 'ctrl+n', command: 'workbench.action.files.newUntitledFile' },
  { key: 'ctrl+o', command: 'workbench.action.files.openFile' },
  { key: 'ctrl+s', command: 'workbench.action.files.save' },
  { key: 'ctrl+shift+s', command: 'workbench.action.files.saveAs' },
  { key: 'ctrl+k s', command: 'workbench.action.files.saveAll' },
  { key: 'ctrl+w', command: 'workbench.action.closeActiveEditor' },
  { key: 'ctrl+k ctrl+w', command: 'workbench.action.closeAllEditors' },
  
  // Edit
  { key: 'ctrl+z', command: 'undo' },
  { key: 'ctrl+y', command: 'redo' },
  { key: 'ctrl+shift+z', command: 'redo' },
  { key: 'ctrl+x', command: 'editor.action.clipboardCutAction', when: 'editorTextFocus' },
  { key: 'ctrl+c', command: 'editor.action.clipboardCopyAction', when: 'editorTextFocus' },
  { key: 'ctrl+v', command: 'editor.action.clipboardPasteAction', when: 'editorTextFocus' },
  { key: 'ctrl+a', command: 'editor.action.selectAll' },
  { key: 'ctrl+d', command: 'editor.action.addSelectionToNextFindMatch', when: 'editorTextFocus' },
  { key: 'ctrl+shift+l', command: 'editor.action.selectHighlights', when: 'editorTextFocus' },
  
  // Find & Replace
  { key: 'ctrl+f', command: 'actions.find', when: 'editorTextFocus' },
  { key: 'ctrl+h', command: 'editor.action.startFindReplaceAction', when: 'editorTextFocus' },
  { key: 'ctrl+shift+f', command: 'workbench.action.findInFiles' },
  { key: 'ctrl+shift+h', command: 'workbench.action.replaceInFiles' },
  { key: 'f3', command: 'editor.action.nextMatchFindAction', when: 'editorTextFocus' },
  { key: 'shift+f3', command: 'editor.action.previousMatchFindAction', when: 'editorTextFocus' },
  
  // Navigation
  { key: 'ctrl+g', command: 'workbench.action.gotoLine' },
  { key: 'ctrl+p', command: 'workbench.action.quickOpen' },
  { key: 'ctrl+shift+p', command: 'workbench.action.showCommands' },
  { key: 'ctrl+shift+o', command: 'workbench.action.gotoSymbol' },
  { key: 'ctrl+t', command: 'workbench.action.showAllSymbols' },
  { key: 'f12', command: 'editor.action.revealDefinition', when: 'editorTextFocus' },
  { key: 'ctrl+click', command: 'editor.action.revealDefinition', when: 'editorTextFocus' },
  { key: 'alt+f12', command: 'editor.action.peekDefinition', when: 'editorTextFocus' },
  { key: 'ctrl+shift+f10', command: 'editor.action.peekImplementation', when: 'editorTextFocus' },
  { key: 'shift+f12', command: 'editor.action.goToReferences', when: 'editorTextFocus' },
  
  // View
  { key: 'ctrl+b', command: 'workbench.action.toggleSidebarVisibility' },
  { key: 'ctrl+j', command: 'workbench.action.togglePanel' },
  { key: 'ctrl+`', command: 'workbench.action.terminal.toggleTerminal' },
  { key: 'ctrl+shift+e', command: 'workbench.view.explorer' },
  { key: 'ctrl+shift+g', command: 'workbench.view.scm' },
  { key: 'ctrl+shift+d', command: 'workbench.view.debug' },
  { key: 'ctrl+shift+x', command: 'workbench.view.extensions' },
  { key: 'f11', command: 'workbench.action.toggleFullScreen' },
  { key: 'ctrl+k z', command: 'workbench.action.toggleZenMode' },
  
  // Editor
  { key: 'ctrl+/', command: 'editor.action.commentLine', when: 'editorTextFocus' },
  { key: 'ctrl+shift+/', command: 'editor.action.blockComment', when: 'editorTextFocus' },
  { key: 'ctrl+]', command: 'editor.action.indentLines', when: 'editorTextFocus' },
  { key: 'ctrl+[', command: 'editor.action.outdentLines', when: 'editorTextFocus' },
  { key: 'alt+up', command: 'editor.action.moveLinesUpAction', when: 'editorTextFocus' },
  { key: 'alt+down', command: 'editor.action.moveLinesDownAction', when: 'editorTextFocus' },
  { key: 'shift+alt+up', command: 'editor.action.copyLinesUpAction', when: 'editorTextFocus' },
  { key: 'shift+alt+down', command: 'editor.action.copyLinesDownAction', when: 'editorTextFocus' },
  { key: 'ctrl+shift+k', command: 'editor.action.deleteLines', when: 'editorTextFocus' },
  { key: 'ctrl+enter', command: 'editor.action.insertLineAfter', when: 'editorTextFocus' },
  { key: 'ctrl+shift+enter', command: 'editor.action.insertLineBefore', when: 'editorTextFocus' },
  { key: 'ctrl+shift+\\', command: 'editor.action.jumpToBracket', when: 'editorTextFocus' },
  
  // Multi-cursor
  { key: 'alt+click', command: 'editor.action.insertCursorAtEndOfEachLineSelected' },
  { key: 'ctrl+alt+up', command: 'editor.action.insertCursorAbove', when: 'editorTextFocus' },
  { key: 'ctrl+alt+down', command: 'editor.action.insertCursorBelow', when: 'editorTextFocus' },
  { key: 'ctrl+u', command: 'cursorUndo', when: 'editorTextFocus' },
  
  // Code actions
  { key: 'ctrl+.', command: 'editor.action.quickFix', when: 'editorTextFocus' },
  { key: 'ctrl+shift+r', command: 'editor.action.refactor', when: 'editorTextFocus' },
  { key: 'f2', command: 'editor.action.rename', when: 'editorTextFocus' },
  { key: 'shift+alt+f', command: 'editor.action.formatDocument', when: 'editorTextFocus' },
  { key: 'ctrl+k ctrl+f', command: 'editor.action.formatSelection', when: 'editorTextFocus && editorHasSelection' },
  
  // Debug
  { key: 'f5', command: 'workbench.action.debug.start', when: '!inDebugMode' },
  { key: 'f5', command: 'workbench.action.debug.continue', when: 'inDebugMode' },
  { key: 'shift+f5', command: 'workbench.action.debug.stop' },
  { key: 'ctrl+shift+f5', command: 'workbench.action.debug.restart' },
  { key: 'f9', command: 'editor.debug.action.toggleBreakpoint', when: 'editorTextFocus' },
  { key: 'f10', command: 'workbench.action.debug.stepOver' },
  { key: 'f11', command: 'workbench.action.debug.stepInto' },
  { key: 'shift+f11', command: 'workbench.action.debug.stepOut' },
  
  // Terminal
  { key: 'ctrl+shift+`', command: 'workbench.action.terminal.new' },
  { key: 'ctrl+shift+c', command: 'workbench.action.terminal.copySelection', when: 'terminalFocus' },
  { key: 'ctrl+shift+v', command: 'workbench.action.terminal.paste', when: 'terminalFocus' },
  
  // AI Features
  { key: 'ctrl+i', command: 'aethel.ai.inlineChat', when: 'editorTextFocus' },
  { key: 'ctrl+shift+i', command: 'aethel.ai.openChat' },
  { key: 'ctrl+k ctrl+i', command: 'aethel.ai.explain', when: 'editorTextFocus' },
  { key: 'tab', command: 'aethel.ai.acceptGhostText', when: 'editorTextFocus && ghostTextVisible' },
  { key: 'escape', command: 'aethel.ai.dismissGhostText', when: 'editorTextFocus && ghostTextVisible' },
  
  // Tasks
  { key: 'ctrl+shift+b', command: 'workbench.action.tasks.build' },
  { key: 'ctrl+shift+t', command: 'workbench.action.tasks.test' },
];

// ============================================================================
// KEY PARSER
// ============================================================================

export function parseKeyCombo(keyString: string): KeyCombo {
  const parts = keyString.toLowerCase().split('+');
  
  const combo: KeyCombo = {
    key: '',
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  };
  
  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        combo.ctrl = true;
        break;
      case 'shift':
        combo.shift = true;
        break;
      case 'alt':
        combo.alt = true;
        break;
      case 'meta':
      case 'cmd':
      case 'win':
        combo.meta = true;
        break;
      default:
        combo.key = part;
    }
  }
  
  return combo;
}

export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = [];
  
  if (combo.ctrl) parts.push('Ctrl');
  if (combo.shift) parts.push('Shift');
  if (combo.alt) parts.push('Alt');
  if (combo.meta) parts.push('Meta');
  
  if (combo.key) {
    parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  }
  
  return parts.join('+');
}

export function matchesKeyEvent(combo: KeyCombo, event: KeyboardEvent): boolean {
  return (
    combo.ctrl === event.ctrlKey &&
    combo.shift === event.shiftKey &&
    combo.alt === event.altKey &&
    combo.meta === event.metaKey &&
    combo.key === event.key.toLowerCase()
  );
}

// ============================================================================
// WHEN CLAUSE PARSER
// ============================================================================

export function evaluateWhenClause(when: string | undefined, context: WhenContext): boolean {
  if (!when) return true;
  
  // Simple parser for when clauses
  // Supports: &&, ||, !, ==, !=, and bare identifiers
  
  const tokens = tokenizeWhenClause(when);
  return evaluateExpression(tokens, context);
}

function tokenizeWhenClause(when: string): string[] {
  const tokens: string[] = [];
  let current = '';
  
  for (let i = 0; i < when.length; i++) {
    const char = when[i];
    
    if (char === ' ') {
      if (current) tokens.push(current);
      current = '';
    } else if (char === '&' && when[i + 1] === '&') {
      if (current) tokens.push(current);
      tokens.push('&&');
      current = '';
      i++;
    } else if (char === '|' && when[i + 1] === '|') {
      if (current) tokens.push(current);
      tokens.push('||');
      current = '';
      i++;
    } else if (char === '!' && when[i + 1] !== '=') {
      if (current) tokens.push(current);
      tokens.push('!');
      current = '';
    } else if (char === '=' && when[i + 1] === '=') {
      if (current) tokens.push(current);
      tokens.push('==');
      current = '';
      i++;
    } else if (char === '!' && when[i + 1] === '=') {
      if (current) tokens.push(current);
      tokens.push('!=');
      current = '';
      i++;
    } else {
      current += char;
    }
  }
  
  if (current) tokens.push(current);
  return tokens;
}

function evaluateExpression(tokens: string[], context: WhenContext): boolean {
  let result = true;
  let currentOp = '&&';
  let negate = false;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token === '&&' || token === '||') {
      currentOp = token;
    } else if (token === '!') {
      negate = !negate;
    } else if (token === '==' || token === '!=') {
      const left = tokens[i - 1];
      const right = tokens[i + 1];
      let value = context[left] == (right.replace(/'/g, ''));
      if (token === '!=') value = !value;
      
      if (currentOp === '&&') result = result && value;
      else result = result || value;
      
      i++; // Skip right operand
    } else {
      // Bare identifier - check if truthy in context
      let value = !!context[token];
      if (negate) value = !value;
      negate = false;
      
      if (currentOp === '&&') result = result && value;
      else result = result || value;
    }
  }
  
  return result;
}

// ============================================================================
// KEYBINDINGS SERVICE
// ============================================================================

export class KeybindingsService extends EventEmitter {
  private keybindings: KeybindingWithSource[] = [];
  private userKeybindings: Keybinding[] = [];
  private context: WhenContext = {};
  private chordState: KeyCombo | null = null;
  private chordTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.loadDefaultKeybindings();
  }
  
  // ==========================================================================
  // LOADING
  // ==========================================================================
  
  private loadDefaultKeybindings(): void {
    this.keybindings = DEFAULT_KEYBINDINGS.map(kb => ({
      ...kb,
      source: 'default' as const,
    }));
  }
  
  loadUserKeybindings(keybindings: Keybinding[]): void {
    this.userKeybindings = keybindings;
    this.rebuildKeybindings();
    this.emit('keybindingsChanged');
  }
  
  loadExtensionKeybindings(extensionId: string, keybindings: Keybinding[]): void {
    const extBindings = keybindings.map(kb => ({
      ...kb,
      source: 'extension' as const,
      extensionId,
    }));
    
    this.keybindings.push(...extBindings);
    this.rebuildKeybindings();
    this.emit('keybindingsChanged');
  }
  
  private rebuildKeybindings(): void {
    // Start with defaults
    const all: KeybindingWithSource[] = DEFAULT_KEYBINDINGS.map(kb => ({
      ...kb,
      source: 'default' as const,
    }));
    
    // Add extension keybindings
    const extBindings = this.keybindings.filter(kb => kb.source === 'extension');
    all.push(...extBindings);
    
    // Add user keybindings (override others)
    const userBindings = this.userKeybindings.map(kb => ({
      ...kb,
      source: 'user' as const,
    }));
    all.push(...userBindings);
    
    this.keybindings = all;
  }
  
  // ==========================================================================
  // CONTEXT
  // ==========================================================================
  
  setContext(key: string, value: any): void {
    this.context[key] = value;
  }
  
  getContext(key: string): any {
    return this.context[key];
  }
  
  clearContext(key: string): void {
    delete this.context[key];
  }
  
  // ==========================================================================
  // RESOLUTION
  // ==========================================================================
  
  resolveKeybinding(event: KeyboardEvent): Keybinding | null {
    const combo = {
      key: event.key.toLowerCase(),
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    };
    
    // Check for chord continuation
    if (this.chordState) {
      const chordKey = `${formatKeyCombo(this.chordState).toLowerCase()} ${formatKeyCombo(combo).toLowerCase()}`;
      this.clearChord();
      
      const chordBinding = this.findKeybinding(chordKey);
      if (chordBinding) {
        return chordBinding;
      }
    }
    
    // Check for single key or chord start
    const keyString = formatKeyCombo(combo).toLowerCase();
    
    // Check if this could be the start of a chord
    const couldBeChord = this.keybindings.some(kb => 
      kb.key.toLowerCase().startsWith(keyString + ' ')
    );
    
    if (couldBeChord) {
      this.startChord(combo);
      return null;
    }
    
    return this.findKeybinding(keyString);
  }
  
  private findKeybinding(keyString: string): Keybinding | null {
    // Find all matching keybindings
    const matches = this.keybindings.filter(kb => {
      if (kb.key.toLowerCase() !== keyString) return false;
      return evaluateWhenClause(kb.when, this.context);
    });
    
    if (matches.length === 0) return null;
    
    // User bindings take priority, then extension, then default
    const userMatch = matches.find(kb => kb.source === 'user');
    if (userMatch) return userMatch;
    
    const extMatch = matches.find(kb => kb.source === 'extension');
    if (extMatch) return extMatch;
    
    return matches[0];
  }
  
  private startChord(combo: KeyCombo): void {
    this.chordState = combo;
    
    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout);
    }
    
    this.chordTimeout = setTimeout(() => {
      this.clearChord();
    }, 3000);
    
    this.emit('chordStarted', combo);
  }
  
  private clearChord(): void {
    this.chordState = null;
    
    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout);
      this.chordTimeout = null;
    }
    
    this.emit('chordCleared');
  }
  
  // ==========================================================================
  // GETTERS
  // ==========================================================================
  
  getAllKeybindings(): KeybindingWithSource[] {
    return [...this.keybindings];
  }
  
  getKeybindingsForCommand(command: string): KeybindingWithSource[] {
    return this.keybindings.filter(kb => kb.command === command);
  }
  
  getUserKeybindings(): Keybinding[] {
    return [...this.userKeybindings];
  }
  
  // ==========================================================================
  // MODIFICATION
  // ==========================================================================
  
  addUserKeybinding(keybinding: Keybinding): void {
    // Remove any existing binding for this key
    this.userKeybindings = this.userKeybindings.filter(kb => kb.key !== keybinding.key);
    this.userKeybindings.push(keybinding);
    this.rebuildKeybindings();
    this.emit('keybindingsChanged');
  }
  
  removeUserKeybinding(key: string): void {
    this.userKeybindings = this.userKeybindings.filter(kb => kb.key !== key);
    this.rebuildKeybindings();
    this.emit('keybindingsChanged');
  }
  
  resetKeybinding(key: string): void {
    this.removeUserKeybinding(key);
  }
  
  resetAll(): void {
    this.userKeybindings = [];
    this.rebuildKeybindings();
    this.emit('keybindingsChanged');
  }
  
  // ==========================================================================
  // CONFLICTS
  // ==========================================================================
  
  findConflicts(): Array<{ key: string; bindings: KeybindingWithSource[] }> {
    const conflicts: Array<{ key: string; bindings: KeybindingWithSource[] }> = [];
    const grouped = new Map<string, KeybindingWithSource[]>();
    
    for (const kb of this.keybindings) {
      const key = kb.key.toLowerCase();
      const existing = grouped.get(key) || [];
      existing.push(kb);
      grouped.set(key, existing);
    }
    
    for (const [key, bindings] of grouped) {
      if (bindings.length > 1) {
        // Check if they have different when clauses
        const uniqueWhens = new Set(bindings.map(b => b.when || ''));
        if (uniqueWhens.size < bindings.length) {
          conflicts.push({ key, bindings });
        }
      }
    }
    
    return conflicts;
  }
  
  // ==========================================================================
  // EXPORT
  // ==========================================================================
  
  exportUserKeybindings(): string {
    return JSON.stringify(this.userKeybindings, null, 2);
  }
  
  importUserKeybindings(json: string): void {
    const keybindings = JSON.parse(json);
    this.loadUserKeybindings(keybindings);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const keybindingsService = new KeybindingsService();

export default keybindingsService;
