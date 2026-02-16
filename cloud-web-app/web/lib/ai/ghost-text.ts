/**
 * Aethel AI Ghost Text - Inline Completions
 * 
 * Sistema de autocomplete com IA que mostra sugestões
 * inline (ghost text) enquanto o usuário digita.
 * Similar ao GitHub Copilot.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CompletionRequest {
  prefix: string;           // Code before cursor
  suffix: string;           // Code after cursor
  language: string;
  filePath?: string;
  cursorLine: number;
  cursorColumn: number;
  context?: CompletionContext;
}

export interface CompletionContext {
  imports?: string[];       // Imports in file
  symbols?: string[];       // Symbols in scope
  recentEdits?: string[];   // Recent changes
  openFiles?: string[];     // Other open files
  projectType?: string;     // e.g., 'next', 'react', 'node'
}

export interface CompletionResult {
  text: string;             // The completion text
  displayText?: string;     // What to show (may differ)
  range?: {                 // Range to replace
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  confidence: number;       // 0-1 confidence score
  source: 'ai' | 'snippet' | 'history';
  metadata?: {
    model?: string;
    latency?: number;
    tokens?: number;
  };
}

export interface GhostTextConfig {
  enabled: boolean;
  debounceMs: number;
  maxTokens: number;
  minPrefixLength: number;
  temperature: number;
  stopSequences: string[];
  model: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: GhostTextConfig = {
  enabled: true,
  debounceMs: 300,
  maxTokens: 150,
  minPrefixLength: 3,
  temperature: 0.1,
  stopSequences: ['\n\n', '```', '// ', '/* '],
  model: 'gpt-4',
};

// ============================================================================
// GHOST TEXT PROVIDER
// ============================================================================

export class GhostTextProvider {
  private config: GhostTextConfig;
  private cache: Map<string, CompletionResult[]> = new Map();
  private pendingRequest: AbortController | null = null;
  private lastRequestTime: number = 0;
  
  constructor(config: Partial<GhostTextConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Gera completions para o contexto atual
   */
  async getCompletions(request: CompletionRequest): Promise<CompletionResult[]> {
    // Check if enabled
    if (!this.config.enabled) return [];
    
    // Check minimum prefix length
    if (request.prefix.length < this.config.minPrefixLength) return [];
    
    // Check cache
    const cacheKey = this.getCacheKey(request);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Cancel pending request
    if (this.pendingRequest) {
      this.pendingRequest.abort();
    }
    
    // Create new abort controller
    this.pendingRequest = new AbortController();
    const startTime = Date.now();
    
    try {
      // Build prompt
      const prompt = this.buildPrompt(request);
      
      // Call AI through canonical server endpoint
      const response = await fetch('/api/ai/inline-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: this.pendingRequest.signal,
        body: JSON.stringify({
          prompt: `${this.getSystemPrompt(request.language)}\n\n${prompt}`,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        throw new Error(`GHOST_TEXT_API_ERROR: ${response.status} ${raw}`.trim());
      }

      const payload = await response.json().catch(() => null) as { suggestion?: string; text?: string } | null;
      const completionText = payload?.suggestion ?? payload?.text ?? '';
      
      const latency = Date.now() - startTime;
      
      // Parse response
      const completions = this.parseCompletions(completionText, request, latency);
      
      // Cache results
      this.cache.set(cacheKey, completions);
      
      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
      
      return completions;
      
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        return [];
      }
      console.error('Ghost text error:', error);
      return [];
    } finally {
      this.pendingRequest = null;
    }
  }
  
  /**
   * Cancela request pendente
   */
  cancel(): void {
    if (this.pendingRequest) {
      this.pendingRequest.abort();
      this.pendingRequest = null;
    }
  }
  
  /**
   * Limpa cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Atualiza configuração
   */
  updateConfig(config: Partial<GhostTextConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private getSystemPrompt(language: string): string {
    return `Você é um assistente de código inline. Complete o código do usuário de forma concisa e precisa.

REGRAS CRÍTICAS:
1. Retorne APENAS o código que completa a linha atual
2. NÃO inclua explicações ou comentários
3. NÃO repita código que já existe
4. Seja CONCISO - complete apenas o necessário
5. Siga o estilo e convenções do código existente
6. Para ${language}, siga as melhores práticas da linguagem
7. Se não souber o que completar, retorne string vazia

FORMATO: Retorne apenas o texto de completion, nada mais.`;
  }
  
  private buildPrompt(request: CompletionRequest): string {
    const lines: string[] = [];
    
    // Add context
    if (request.context?.imports?.length) {
      lines.push('// Imports disponíveis:');
      lines.push(request.context.imports.slice(0, 5).join('\n'));
      lines.push('');
    }
    
    if (request.context?.symbols?.length) {
      lines.push(`// Símbolos em escopo: ${request.context.symbols.slice(0, 10).join(', ')}`);
      lines.push('');
    }
    
    // Add file path context
    if (request.filePath) {
      lines.push(`// Arquivo: ${request.filePath}`);
    }
    
    // Add code context
    lines.push('// Código atual:');
    lines.push(request.prefix);
    lines.push('█'); // Cursor marker
    if (request.suffix.trim()) {
      lines.push(request.suffix);
    }
    
    lines.push('');
    lines.push('// Complete o código a partir do cursor (█). Retorne apenas a completion:');
    
    return lines.join('\n');
  }
  
  private parseCompletions(
    response: string,
    request: CompletionRequest,
    latency: number
  ): CompletionResult[] {
    // Clean response
    let text = response
      .replace(/```[\w]*\n?/g, '')
      .replace(/```$/g, '')
      .trim();
    
    // Remove any leading explanation
    if (text.includes(':')) {
      const colonIndex = text.indexOf(':');
      if (colonIndex < 50) {
        text = text.slice(colonIndex + 1).trim();
      }
    }
    
    // Empty response
    if (!text) return [];
    
    // Create completion result
    const completion: CompletionResult = {
      text,
      displayText: text.length > 100 ? text.slice(0, 100) + '...' : text,
      range: {
        start: { line: request.cursorLine, column: request.cursorColumn },
        end: { line: request.cursorLine, column: request.cursorColumn },
      },
      confidence: this.calculateConfidence(text, request),
      source: 'ai',
      metadata: {
        model: this.config.model,
        latency,
      },
    };
    
    return [completion];
  }
  
  private calculateConfidence(text: string, request: CompletionRequest): number {
    let confidence = 0.8;
    
    // Reduce confidence for very long completions
    if (text.length > 200) confidence -= 0.1;
    
    // Reduce confidence for multi-line completions
    if (text.includes('\n')) confidence -= 0.1;
    
    // Increase confidence if matches expected patterns
    if (request.language === 'typescript' || request.language === 'javascript') {
      // Check for common patterns
      if (text.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\(/)) confidence += 0.05; // Function call
      if (text.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\./)) confidence += 0.05; // Property access
      if (text.match(/^\s*[});\]]/)) confidence += 0.1; // Closing bracket
    }
    
    return Math.min(1, Math.max(0, confidence));
  }
  
  private getCacheKey(request: CompletionRequest): string {
    // Use last 100 chars of prefix + first 50 of suffix
    const prefix = request.prefix.slice(-100);
    const suffix = request.suffix.slice(0, 50);
    return `${request.language}:${prefix}:${suffix}`;
  }
}

// ============================================================================
// SNIPPET COMPLETIONS
// ============================================================================

interface Snippet {
  prefix: string;
  body: string | string[];
  description: string;
  scope?: string;
}

const BUILTIN_SNIPPETS: Record<string, Snippet[]> = {
  typescript: [
    {
      prefix: 'func',
      body: 'function ${1:name}(${2:params}): ${3:void} {\n\t${0}\n}',
      description: 'Function declaration',
    },
    {
      prefix: 'afunc',
      body: 'async function ${1:name}(${2:params}): Promise<${3:void}> {\n\t${0}\n}',
      description: 'Async function declaration',
    },
    {
      prefix: 'arrow',
      body: 'const ${1:name} = (${2:params}) => {\n\t${0}\n}',
      description: 'Arrow function',
    },
    {
      prefix: 'interface',
      body: 'interface ${1:Name} {\n\t${0}\n}',
      description: 'Interface declaration',
    },
    {
      prefix: 'type',
      body: 'type ${1:Name} = ${0}',
      description: 'Type alias',
    },
    {
      prefix: 'class',
      body: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t${0}\n\t}\n}',
      description: 'Class declaration',
    },
    {
      prefix: 'try',
      body: 'try {\n\t${1}\n} catch (error) {\n\t${0}\n}',
      description: 'Try-catch block',
    },
    {
      prefix: 'if',
      body: 'if (${1:condition}) {\n\t${0}\n}',
      description: 'If statement',
    },
    {
      prefix: 'ife',
      body: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${0}\n}',
      description: 'If-else statement',
    },
    {
      prefix: 'for',
      body: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${0}\n}',
      description: 'For loop',
    },
    {
      prefix: 'forof',
      body: 'for (const ${1:item} of ${2:array}) {\n\t${0}\n}',
      description: 'For-of loop',
    },
    {
      prefix: 'foreach',
      body: '${1:array}.forEach((${2:item}) => {\n\t${0}\n})',
      description: 'ForEach loop',
    },
    {
      prefix: 'map',
      body: '${1:array}.map((${2:item}) => ${0})',
      description: 'Array map',
    },
    {
      prefix: 'filter',
      body: '${1:array}.filter((${2:item}) => ${0})',
      description: 'Array filter',
    },
    {
      prefix: 'reduce',
      body: '${1:array}.reduce((${2:acc}, ${3:item}) => {\n\t${0}\n\treturn ${2:acc}\n}, ${4:initial})',
      description: 'Array reduce',
    },
    {
      prefix: 'usestate',
      body: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initial})',
      description: 'React useState hook',
      scope: 'typescriptreact',
    },
    {
      prefix: 'useeffect',
      body: 'useEffect(() => {\n\t${1}\n\treturn () => {\n\t\t${2}\n\t}\n}, [${3}])',
      description: 'React useEffect hook',
      scope: 'typescriptreact',
    },
    {
      prefix: 'usememo',
      body: 'const ${1:value} = useMemo(() => ${2}, [${3}])',
      description: 'React useMemo hook',
      scope: 'typescriptreact',
    },
    {
      prefix: 'usecallback',
      body: 'const ${1:callback} = useCallback((${2}) => {\n\t${3}\n}, [${4}])',
      description: 'React useCallback hook',
      scope: 'typescriptreact',
    },
    {
      prefix: 'rfc',
      body: "import React from 'react'\n\ninterface ${1:Name}Props {\n\t${2}\n}\n\nexport function ${1:Name}({ ${3} }: ${1:Name}Props) {\n\treturn (\n\t\t<div>\n\t\t\t${0}\n\t\t</div>\n\t)\n}",
      description: 'React functional component',
      scope: 'typescriptreact',
    },
  ],
  python: [
    {
      prefix: 'def',
      body: 'def ${1:name}(${2:params}):\n\t${0}',
      description: 'Function definition',
    },
    {
      prefix: 'adef',
      body: 'async def ${1:name}(${2:params}):\n\t${0}',
      description: 'Async function definition',
    },
    {
      prefix: 'class',
      body: 'class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${0}',
      description: 'Class definition',
    },
    {
      prefix: 'if',
      body: 'if ${1:condition}:\n\t${0}',
      description: 'If statement',
    },
    {
      prefix: 'ife',
      body: 'if ${1:condition}:\n\t${2}\nelse:\n\t${0}',
      description: 'If-else statement',
    },
    {
      prefix: 'for',
      body: 'for ${1:item} in ${2:iterable}:\n\t${0}',
      description: 'For loop',
    },
    {
      prefix: 'while',
      body: 'while ${1:condition}:\n\t${0}',
      description: 'While loop',
    },
    {
      prefix: 'try',
      body: 'try:\n\t${1}\nexcept ${2:Exception} as e:\n\t${0}',
      description: 'Try-except block',
    },
    {
      prefix: 'with',
      body: 'with ${1:context} as ${2:var}:\n\t${0}',
      description: 'With statement',
    },
    {
      prefix: 'lambda',
      body: 'lambda ${1:args}: ${0}',
      description: 'Lambda function',
    },
    {
      prefix: 'list',
      body: '[${1:expr} for ${2:item} in ${3:iterable}${4: if ${5:condition}}]',
      description: 'List comprehension',
    },
    {
      prefix: 'dict',
      body: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}',
      description: 'Dict comprehension',
    },
  ],
};

export class SnippetProvider {
  private snippets: Map<string, Snippet[]> = new Map();
  
  constructor() {
    // Load built-in snippets
    Object.entries(BUILTIN_SNIPPETS).forEach(([lang, snips]) => {
      this.snippets.set(lang, snips);
    });
  }
  
  /**
   * Busca snippets que correspondem ao prefixo
   */
  getSnippets(prefix: string, language: string): Snippet[] {
    const langSnippets = this.snippets.get(language) || [];
    const genericSnippets = this.snippets.get('generic') || [];
    
    return [...langSnippets, ...genericSnippets]
      .filter(s => s.prefix.startsWith(prefix.toLowerCase()));
  }
  
  /**
   * Adiciona snippet customizado
   */
  addSnippet(language: string, snippet: Snippet): void {
    if (!this.snippets.has(language)) {
      this.snippets.set(language, []);
    }
    this.snippets.get(language)!.push(snippet);
  }
  
  /**
   * Expande snippet body para texto final
   */
  expandSnippet(snippet: Snippet): string {
    const body = Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body;
    
    // Simple expansion - remove tab stops
    return body
      .replace(/\$\{(\d+)(?::([^}]*))?\}/g, '$2')
      .replace(/\$(\d+)/g, '');
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const ghostTextProvider = new GhostTextProvider();
export const snippetProvider = new SnippetProvider();

export default ghostTextProvider;
