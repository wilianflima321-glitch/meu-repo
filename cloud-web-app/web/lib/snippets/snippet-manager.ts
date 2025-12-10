/**
 * Snippet Manager
 * Manages code snippets for different languages
 */

export interface Snippet {
  id: string;
  prefix: string;
  body: string | string[];
  description?: string;
  scope?: string;
}

export interface SnippetVariable {
  name: string;
  value: string;
}

export interface SnippetContext {
  fileName: string;
  filePath: string;
  lineNumber: number;
  selectedText: string;
  clipboardText: string;
  currentDate: Date;
}

export class SnippetManager {
  private snippets: Map<string, Map<string, Snippet>> = new Map();
  private readonly STORAGE_KEY = 'user-snippets';

  constructor() {
    this.loadBuiltInSnippets();
    this.loadUserSnippets();
  }

  /**
   * Get snippets for language
   */
  getSnippets(language: string): Snippet[] {
    const languageSnippets = this.snippets.get(language);
    if (!languageSnippets) return [];
    return Array.from(languageSnippets.values());
  }

  /**
   * Get snippet by prefix
   */
  getSnippet(language: string, prefix: string): Snippet | undefined {
    const languageSnippets = this.snippets.get(language);
    if (!languageSnippets) return undefined;
    
    for (const snippet of languageSnippets.values()) {
      if (snippet.prefix === prefix) {
        return snippet;
      }
    }
    
    return undefined;
  }

  /**
   * Add snippet
   */
  addSnippet(language: string, snippet: Snippet): void {
    if (!this.snippets.has(language)) {
      this.snippets.set(language, new Map());
    }
    
    this.snippets.get(language)!.set(snippet.id, snippet);
    this.saveUserSnippets();
    console.log(`[Snippet Manager] Added snippet: ${snippet.id} for ${language}`);
  }

  /**
   * Remove snippet
   */
  removeSnippet(language: string, id: string): void {
    const languageSnippets = this.snippets.get(language);
    if (!languageSnippets) return;
    
    languageSnippets.delete(id);
    this.saveUserSnippets();
    console.log(`[Snippet Manager] Removed snippet: ${id} from ${language}`);
  }

  /**
   * Update snippet
   */
  updateSnippet(language: string, id: string, updates: Partial<Snippet>): void {
    const languageSnippets = this.snippets.get(language);
    if (!languageSnippets) return;
    
    const snippet = languageSnippets.get(id);
    if (!snippet) return;
    
    Object.assign(snippet, updates);
    this.saveUserSnippets();
    console.log(`[Snippet Manager] Updated snippet: ${id}`);
  }

  /**
   * Resolve snippet with variables
   */
  resolveSnippet(snippet: Snippet, context: SnippetContext): string {
    const body = Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body;
    
    // Built-in variables
    const variables: Record<string, string> = {
      TM_SELECTED_TEXT: context.selectedText,
      TM_CURRENT_LINE: context.lineNumber.toString(),
      TM_CURRENT_WORD: this.getCurrentWord(context.selectedText),
      TM_LINE_INDEX: (context.lineNumber - 1).toString(),
      TM_LINE_NUMBER: context.lineNumber.toString(),
      TM_FILENAME: context.fileName,
      TM_FILENAME_BASE: this.getFileNameBase(context.fileName),
      TM_DIRECTORY: this.getDirectory(context.filePath),
      TM_FILEPATH: context.filePath,
      CLIPBOARD: context.clipboardText,
      CURRENT_YEAR: context.currentDate.getFullYear().toString(),
      CURRENT_YEAR_SHORT: context.currentDate.getFullYear().toString().slice(-2),
      CURRENT_MONTH: (context.currentDate.getMonth() + 1).toString().padStart(2, '0'),
      CURRENT_MONTH_NAME: this.getMonthName(context.currentDate.getMonth()),
      CURRENT_MONTH_NAME_SHORT: this.getMonthName(context.currentDate.getMonth()).slice(0, 3),
      CURRENT_DATE: context.currentDate.getDate().toString().padStart(2, '0'),
      CURRENT_DAY_NAME: this.getDayName(context.currentDate.getDay()),
      CURRENT_DAY_NAME_SHORT: this.getDayName(context.currentDate.getDay()).slice(0, 3),
      CURRENT_HOUR: context.currentDate.getHours().toString().padStart(2, '0'),
      CURRENT_MINUTE: context.currentDate.getMinutes().toString().padStart(2, '0'),
      CURRENT_SECOND: context.currentDate.getSeconds().toString().padStart(2, '0'),
      BLOCK_COMMENT_START: this.getBlockCommentStart(context.fileName),
      BLOCK_COMMENT_END: this.getBlockCommentEnd(context.fileName),
      LINE_COMMENT: this.getLineComment(context.fileName),
    };

    let resolved = body;

    // Replace variables
    for (const [name, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\$${name}|\\$\\{${name}\\}`, 'g');
      resolved = resolved.replace(regex, value);
    }

    // Handle tab stops and placeholders
    resolved = this.resolveTabStops(resolved);

    return resolved;
  }

  /**
   * Resolve tab stops
   */
  private resolveTabStops(text: string): string {
    // Replace $0 (final cursor position) with empty string for now
    text = text.replace(/\$0/g, '');
    
    // Replace $1, $2, etc. with empty strings
    text = text.replace(/\$\d+/g, '');
    
    // Replace ${1:placeholder} with placeholder text
    text = text.replace(/\$\{(\d+):([^}]+)\}/g, '$2');
    
    // Replace ${1|choice1,choice2|} with first choice
    text = text.replace(/\$\{\d+\|([^|]+)\|[^}]*\}/g, '$1');
    
    return text;
  }

  /**
   * Get current word from selection
   */
  private getCurrentWord(text: string): string {
    const match = text.match(/\w+/);
    return match ? match[0] : '';
  }

  /**
   * Get file name without extension
   */
  private getFileNameBase(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  }

  /**
   * Get directory from path
   */
  private getDirectory(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash > 0 ? path.substring(0, lastSlash) : '';
  }

  /**
   * Get month name
   */
  private getMonthName(month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  }

  /**
   * Get day name
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }

  /**
   * Get block comment start
   */
  private getBlockCommentStart(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const commentMap: Record<string, string> = {
      'js': '/*', 'ts': '/*', 'jsx': '/*', 'tsx': '/*',
      'css': '/*', 'scss': '/*', 'less': '/*',
      'java': '/*', 'c': '/*', 'cpp': '/*', 'cs': '/*',
      'go': '/*', 'rs': '/*',
      'html': '<!--', 'xml': '<!--',
      'py': '"""',
    };
    return commentMap[ext || ''] || '/*';
  }

  /**
   * Get block comment end
   */
  private getBlockCommentEnd(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const commentMap: Record<string, string> = {
      'js': '*/', 'ts': '*/', 'jsx': '*/', 'tsx': '*/',
      'css': '*/', 'scss': '*/', 'less': '*/',
      'java': '*/', 'c': '*/', 'cpp': '*/', 'cs': '*/',
      'go': '*/', 'rs': '*/',
      'html': '-->', 'xml': '-->',
      'py': '"""',
    };
    return commentMap[ext || ''] || '*/';
  }

  /**
   * Get line comment
   */
  private getLineComment(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const commentMap: Record<string, string> = {
      'js': '//', 'ts': '//', 'jsx': '//', 'tsx': '//',
      'java': '//', 'c': '//', 'cpp': '//', 'cs': '//',
      'go': '//', 'rs': '//',
      'py': '#',
      'sh': '#', 'bash': '#',
      'rb': '#',
    };
    return commentMap[ext || ''] || '//';
  }

  /**
   * Load built-in snippets
   */
  private loadBuiltInSnippets(): void {
    // TypeScript/JavaScript snippets
    this.addBuiltInSnippets('typescript', [
      {
        id: 'log',
        prefix: 'log',
        body: 'console.log($1);',
        description: 'Log to console',
      },
      {
        id: 'function',
        prefix: 'func',
        body: [
          'function ${1:name}(${2:params}) {',
          '\t$0',
          '}',
        ],
        description: 'Function declaration',
      },
      {
        id: 'arrow-function',
        prefix: 'af',
        body: 'const ${1:name} = (${2:params}) => {',
        description: 'Arrow function',
      },
      {
        id: 'class',
        prefix: 'class',
        body: [
          'class ${1:ClassName} {',
          '\tconstructor(${2:params}) {',
          '\t\t$0',
          '\t}',
          '}',
        ],
        description: 'Class declaration',
      },
      {
        id: 'if',
        prefix: 'if',
        body: [
          'if (${1:condition}) {',
          '\t$0',
          '}',
        ],
        description: 'If statement',
      },
      {
        id: 'for',
        prefix: 'for',
        body: [
          'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {',
          '\t$0',
          '}',
        ],
        description: 'For loop',
      },
      {
        id: 'foreach',
        prefix: 'foreach',
        body: [
          '${1:array}.forEach(${2:item} => {',
          '\t$0',
          '});',
        ],
        description: 'ForEach loop',
      },
      {
        id: 'try-catch',
        prefix: 'try',
        body: [
          'try {',
          '\t$0',
          '} catch (error) {',
          '\tconsole.error(error);',
          '}',
        ],
        description: 'Try-catch block',
      },
    ]);

    // Python snippets
    this.addBuiltInSnippets('python', [
      {
        id: 'def',
        prefix: 'def',
        body: [
          'def ${1:function_name}(${2:params}):',
          '\t$0',
        ],
        description: 'Function definition',
      },
      {
        id: 'class',
        prefix: 'class',
        body: [
          'class ${1:ClassName}:',
          '\tdef __init__(self, ${2:params}):',
          '\t\t$0',
        ],
        description: 'Class definition',
      },
      {
        id: 'if',
        prefix: 'if',
        body: [
          'if ${1:condition}:',
          '\t$0',
        ],
        description: 'If statement',
      },
      {
        id: 'for',
        prefix: 'for',
        body: [
          'for ${1:item} in ${2:iterable}:',
          '\t$0',
        ],
        description: 'For loop',
      },
      {
        id: 'while',
        prefix: 'while',
        body: [
          'while ${1:condition}:',
          '\t$0',
        ],
        description: 'While loop',
      },
      {
        id: 'try',
        prefix: 'try',
        body: [
          'try:',
          '\t$0',
          'except Exception as e:',
          '\tprint(e)',
        ],
        description: 'Try-except block',
      },
    ]);

    // Go snippets
    this.addBuiltInSnippets('go', [
      {
        id: 'func',
        prefix: 'func',
        body: [
          'func ${1:name}(${2:params}) ${3:returnType} {',
          '\t$0',
          '}',
        ],
        description: 'Function declaration',
      },
      {
        id: 'method',
        prefix: 'meth',
        body: [
          'func (${1:receiver} ${2:Type}) ${3:name}(${4:params}) ${5:returnType} {',
          '\t$0',
          '}',
        ],
        description: 'Method declaration',
      },
      {
        id: 'if-err',
        prefix: 'iferr',
        body: [
          'if err != nil {',
          '\t$0',
          '}',
        ],
        description: 'If error check',
      },
      {
        id: 'struct',
        prefix: 'struct',
        body: [
          'type ${1:Name} struct {',
          '\t$0',
          '}',
        ],
        description: 'Struct declaration',
      },
    ]);

    console.log('[Snippet Manager] Loaded built-in snippets');
  }

  /**
   * Add built-in snippets for language
   */
  private addBuiltInSnippets(language: string, snippets: Snippet[]): void {
    if (!this.snippets.has(language)) {
      this.snippets.set(language, new Map());
    }
    
    const languageSnippets = this.snippets.get(language)!;
    for (const snippet of snippets) {
      languageSnippets.set(snippet.id, snippet);
    }
  }

  /**
   * Load user snippets from storage
   */
  private loadUserSnippets(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const userSnippets = JSON.parse(stored);
        for (const [language, snippets] of Object.entries(userSnippets)) {
          if (!this.snippets.has(language)) {
            this.snippets.set(language, new Map());
          }
          const languageSnippets = this.snippets.get(language)!;
          for (const snippet of snippets as Snippet[]) {
            languageSnippets.set(snippet.id, snippet);
          }
        }
        console.log('[Snippet Manager] Loaded user snippets');
      }
    } catch (error) {
      console.error('[Snippet Manager] Failed to load user snippets:', error);
    }
  }

  /**
   * Save user snippets to storage
   */
  private saveUserSnippets(): void {
    try {
      const userSnippets: Record<string, Snippet[]> = {};
      
      for (const [language, snippets] of this.snippets) {
        // Only save user-created snippets (not built-in)
        const userLangSnippets = Array.from(snippets.values()).filter(
          s => s.id.startsWith('user-')
        );
        if (userLangSnippets.length > 0) {
          userSnippets[language] = userLangSnippets;
        }
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userSnippets));
    } catch (error) {
      console.error('[Snippet Manager] Failed to save user snippets:', error);
    }
  }

  /**
   * Export snippets
   */
  exportSnippets(language?: string): string {
    if (language) {
      const snippets = this.getSnippets(language);
      return JSON.stringify({ [language]: snippets }, null, 2);
    } else {
      const allSnippets: Record<string, Snippet[]> = {};
      for (const [lang, snippets] of this.snippets) {
        allSnippets[lang] = Array.from(snippets.values());
      }
      return JSON.stringify(allSnippets, null, 2);
    }
  }

  /**
   * Import snippets
   */
  importSnippets(json: string): void {
    try {
      const imported = JSON.parse(json);
      
      for (const [language, snippets] of Object.entries(imported)) {
        for (const snippet of snippets as Snippet[]) {
          this.addSnippet(language, snippet);
        }
      }
      
      console.log('[Snippet Manager] Imported snippets');
    } catch (error) {
      console.error('[Snippet Manager] Failed to import snippets:', error);
      throw error;
    }
  }
}

// Singleton instance
let snippetManagerInstance: SnippetManager | null = null;

export function getSnippetManager(): SnippetManager {
  if (!snippetManagerInstance) {
    snippetManagerInstance = new SnippetManager();
  }
  return snippetManagerInstance;
}
