/**
 * Status Bar Manager
 * Manages status bar items and quick selectors
 */

export type StatusBarAlignment = 'left' | 'right';

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  command?: string;
  alignment: StatusBarAlignment;
  priority: number;
  visible: boolean;
  backgroundColor?: string;
  color?: string;
}

export interface LanguageInfo {
  id: string;
  name: string;
  extensions: string[];
}

export interface EncodingInfo {
  id: string;
  name: string;
}

export interface EOLInfo {
  id: string;
  name: string;
  value: string;
}

export class StatusBarManager {
  private items: Map<string, StatusBarItem> = new Map();
  private listeners: Set<() => void> = new Set();

  // Built-in items
  private languageItem: StatusBarItem;
  private encodingItem: StatusBarItem;
  private eolItem: StatusBarItem;
  private indentationItem: StatusBarItem;
  private cursorPositionItem: StatusBarItem;
  private selectionItem: StatusBarItem;
  private gitBranchItem: StatusBarItem;
  private problemsItem: StatusBarItem;

  constructor() {
    this.languageItem = this.createBuiltInItem('language', 'Plain Text', 'left', 100);
    this.encodingItem = this.createBuiltInItem('encoding', 'UTF-8', 'right', 100);
    this.eolItem = this.createBuiltInItem('eol', 'LF', 'right', 90);
    this.indentationItem = this.createBuiltInItem('indentation', 'Spaces: 2', 'right', 80);
    this.cursorPositionItem = this.createBuiltInItem('cursor', 'Ln 1, Col 1', 'right', 70);
    this.selectionItem = this.createBuiltInItem('selection', '', 'right', 60);
    this.gitBranchItem = this.createBuiltInItem('git-branch', '', 'left', 90);
    this.problemsItem = this.createBuiltInItem('problems', '', 'left', 80);

    this.selectionItem.visible = false;
  }

  /**
   * Create status bar item
   */
  createItem(id: string, alignment: StatusBarAlignment, priority: number): StatusBarItem {
    const item: StatusBarItem = {
      id,
      text: '',
      alignment,
      priority,
      visible: true,
    };

    this.items.set(id, item);
    this.notifyListeners();

    console.log(`[Status Bar] Created item: ${id}`);
    return item;
  }

  /**
   * Get status bar item
   */
  getItem(id: string): StatusBarItem | undefined {
    return this.items.get(id);
  }

  /**
   * Remove status bar item
   */
  removeItem(id: string): void {
    this.items.delete(id);
    this.notifyListeners();
    console.log(`[Status Bar] Removed item: ${id}`);
  }

  /**
   * Update item
   */
  updateItem(id: string, updates: Partial<StatusBarItem>): void {
    const item = this.items.get(id);
    if (!item) return;

    Object.assign(item, updates);
    this.notifyListeners();
  }

  /**
   * Get all items
   */
  getItems(): StatusBarItem[] {
    return Array.from(this.items.values()).sort((a, b) => {
      if (a.alignment !== b.alignment) {
        return a.alignment === 'left' ? -1 : 1;
      }
      return b.priority - a.priority;
    });
  }

  /**
   * Get items by alignment
   */
  getItemsByAlignment(alignment: StatusBarAlignment): StatusBarItem[] {
    return this.getItems().filter(item => item.alignment === alignment && item.visible);
  }

  /**
   * Update language
   */
  updateLanguage(languageId: string, languageName: string): void {
    this.languageItem.text = languageName;
    this.languageItem.tooltip = `Select Language Mode (${languageId})`;
    this.languageItem.command = 'workbench.action.editor.changeLanguageMode';
    this.notifyListeners();
  }

  /**
   * Update encoding
   */
  updateEncoding(encoding: string): void {
    this.encodingItem.text = encoding;
    this.encodingItem.tooltip = 'Select Encoding';
    this.encodingItem.command = 'workbench.action.editor.changeEncoding';
    this.notifyListeners();
  }

  /**
   * Update EOL
   */
  updateEOL(eol: 'LF' | 'CRLF'): void {
    this.eolItem.text = eol;
    this.eolItem.tooltip = 'Select End of Line Sequence';
    this.eolItem.command = 'workbench.action.editor.changeEOL';
    this.notifyListeners();
  }

  /**
   * Update indentation
   */
  updateIndentation(useSpaces: boolean, size: number): void {
    this.indentationItem.text = useSpaces ? `Spaces: ${size}` : `Tab Size: ${size}`;
    this.indentationItem.tooltip = 'Select Indentation';
    this.indentationItem.command = 'workbench.action.editor.changeIndentation';
    this.notifyListeners();
  }

  /**
   * Update cursor position
   */
  updateCursorPosition(line: number, column: number): void {
    this.cursorPositionItem.text = `Ln ${line}, Col ${column}`;
    this.cursorPositionItem.tooltip = 'Go to Line/Column';
    this.cursorPositionItem.command = 'workbench.action.gotoLine';
    this.notifyListeners();
  }

  /**
   * Update selection
   */
  updateSelection(selectedChars: number, selectedLines: number): void {
    if (selectedChars > 0) {
      this.selectionItem.text = selectedLines > 1 
        ? `${selectedLines} lines, ${selectedChars} chars selected`
        : `${selectedChars} chars selected`;
      this.selectionItem.visible = true;
    } else {
      this.selectionItem.visible = false;
    }
    this.notifyListeners();
  }

  /**
   * Update Git branch
   */
  updateGitBranch(branch: string): void {
    if (branch) {
      this.gitBranchItem.text = `$(git-branch) ${branch}`;
      this.gitBranchItem.tooltip = 'Switch Git Branch';
      this.gitBranchItem.command = 'git.checkout';
      this.gitBranchItem.visible = true;
    } else {
      this.gitBranchItem.visible = false;
    }
    this.notifyListeners();
  }

  /**
   * Update problems count
   */
  updateProblems(errors: number, warnings: number): void {
    if (errors > 0 || warnings > 0) {
      const parts: string[] = [];
      if (errors > 0) parts.push(`$(error) ${errors}`);
      if (warnings > 0) parts.push(`$(warning) ${warnings}`);
      
      this.problemsItem.text = parts.join(' ');
      this.problemsItem.tooltip = 'Show Problems';
      this.problemsItem.command = 'workbench.actions.view.problems';
      this.problemsItem.visible = true;
      
      if (errors > 0) {
        this.problemsItem.backgroundColor = '#f14c4c';
        this.problemsItem.color = '#ffffff';
      } else {
        this.problemsItem.backgroundColor = undefined;
        this.problemsItem.color = undefined;
      }
    } else {
      this.problemsItem.visible = false;
    }
    this.notifyListeners();
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): LanguageInfo[] {
    return [
      { id: 'plaintext', name: 'Plain Text', extensions: ['.txt'] },
      { id: 'typescript', name: 'TypeScript', extensions: ['.ts', '.tsx'] },
      { id: 'javascript', name: 'JavaScript', extensions: ['.js', '.jsx'] },
      { id: 'python', name: 'Python', extensions: ['.py'] },
      { id: 'go', name: 'Go', extensions: ['.go'] },
      { id: 'rust', name: 'Rust', extensions: ['.rs'] },
      { id: 'java', name: 'Java', extensions: ['.java'] },
      { id: 'csharp', name: 'C#', extensions: ['.cs'] },
      { id: 'cpp', name: 'C++', extensions: ['.cpp', '.cc', '.h', '.hpp'] },
      { id: 'c', name: 'C', extensions: ['.c', '.h'] },
      { id: 'html', name: 'HTML', extensions: ['.html', '.htm'] },
      { id: 'css', name: 'CSS', extensions: ['.css'] },
      { id: 'json', name: 'JSON', extensions: ['.json'] },
      { id: 'markdown', name: 'Markdown', extensions: ['.md'] },
      { id: 'yaml', name: 'YAML', extensions: ['.yaml', '.yml'] },
      { id: 'xml', name: 'XML', extensions: ['.xml'] },
      { id: 'sql', name: 'SQL', extensions: ['.sql'] },
      { id: 'shell', name: 'Shell Script', extensions: ['.sh', '.bash'] },
    ];
  }

  /**
   * Get available encodings
   */
  getAvailableEncodings(): EncodingInfo[] {
    return [
      { id: 'utf8', name: 'UTF-8' },
      { id: 'utf8bom', name: 'UTF-8 with BOM' },
      { id: 'utf16le', name: 'UTF-16 LE' },
      { id: 'utf16be', name: 'UTF-16 BE' },
      { id: 'windows1252', name: 'Windows 1252' },
      { id: 'iso88591', name: 'ISO 8859-1' },
      { id: 'ascii', name: 'ASCII' },
    ];
  }

  /**
   * Get available EOL options
   */
  getAvailableEOLs(): EOLInfo[] {
    return [
      { id: 'lf', name: 'LF', value: '\n' },
      { id: 'crlf', name: 'CRLF', value: '\r\n' },
    ];
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(fileName: string): LanguageInfo | null {
    const languages = this.getAvailableLanguages();
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    
    return languages.find(lang => lang.extensions.includes(ext)) || null;
  }

  /**
   * Listen to changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Create built-in item
   */
  private createBuiltInItem(id: string, text: string, alignment: StatusBarAlignment, priority: number): StatusBarItem {
    const item: StatusBarItem = {
      id,
      text,
      alignment,
      priority,
      visible: true,
    };

    this.items.set(id, item);
    return item;
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
let statusBarManagerInstance: StatusBarManager | null = null;

export function getStatusBarManager(): StatusBarManager {
  if (!statusBarManagerInstance) {
    statusBarManagerInstance = new StatusBarManager();
  }
  return statusBarManagerInstance;
}
