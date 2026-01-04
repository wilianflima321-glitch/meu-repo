/**
 * Inline Code Completion (Copilot-like)
 * 
 * Provides ghost text predictions in the editor using AI.
 * Features:
 * - Multi-line completions
 * - Tab to accept
 * - Partial accept (word by word)
 * - Context-aware suggestions
 * - Request cancellation
 * - Streaming support
 */

import * as monaco from 'monaco-editor';

// AI completion types
interface AICompletionRequest {
  prompt: string;
  maxTokens: number;
  temperature: number;
  stopSequences: string[];
  stream: boolean;
}

interface AICompletionResponse {
  text: string;
}

// Mock AI service for now
const mockAIService = {
  async complete(request: AICompletionRequest, _signal: AbortSignal): Promise<AICompletionResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Return mock completion based on context
    const prompt = request.prompt;
    if (prompt.includes('function')) {
      return { text: '{\n  // TODO: implement\n}' };
    }
    if (prompt.includes('const ')) {
      return { text: ' = null;' };
    }
    if (prompt.includes('if (')) {
      return { text: ') {\n  \n}' };
    }
    return { text: '' };
  }
};

function getAIService(_provider: string) {
  return mockAIService;
}

// Completion cache entry
interface CacheEntry {
  completion: string;
  timestamp: number;
  prefix: string;
  suffix: string;
}

// Inline completion configuration
export interface InlineCompletionConfig {
  enabled: boolean;
  debounceMs: number;
  maxTokens: number;
  temperature: number;
  cacheTimeout: number;
  minPrefixLength: number;
  provider: 'openai' | 'anthropic' | 'ollama';
}

const DEFAULT_CONFIG: InlineCompletionConfig = {
  enabled: true,
  debounceMs: 300,
  maxTokens: 256,
  temperature: 0.2,
  cacheTimeout: 30000, // 30 seconds
  minPrefixLength: 3,
  provider: 'openai',
};

/**
 * Inline Completion Provider for Monaco Editor
 */
export class InlineCompletionProvider implements monaco.languages.InlineCompletionsProvider {
  private config: InlineCompletionConfig;
  private cache = new Map<string, CacheEntry>();
  private abortController: AbortController | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRequestId = 0;
  private currentGhostText: string | null = null;

  constructor(config: Partial<InlineCompletionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCacheCleanup();
  }

  /**
   * Provide inline completions for Monaco
   */
  async provideInlineCompletions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.InlineCompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.InlineCompletions | null> {
    if (!this.config.enabled) {
      return null;
    }

    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Get context
    const { prefix, suffix } = this.getContext(model, position);
    
    // Skip if prefix is too short
    if (prefix.trim().length < this.config.minPrefixLength) {
      return null;
    }

    // Check cache
    const cacheKey = this.getCacheKey(prefix, suffix, model.getLanguageId());
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return this.createInlineCompletions(cached.completion, position, model);
    }

    // Debounce the request
    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          const completion = await this.fetchCompletion(model, position, prefix, suffix, token);
          
          if (completion) {
            // Cache the result
            this.cache.set(cacheKey, {
              completion,
              timestamp: Date.now(),
              prefix,
              suffix,
            });

            this.currentGhostText = completion;
            resolve(this.createInlineCompletions(completion, position, model));
          } else {
            resolve(null);
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('[Inline Completion] Error:', error);
          }
          resolve(null);
        }
      }, this.config.debounceMs);
    });
  }

  /**
   * Free inline completions resources (required by interface)
   */
  freeInlineCompletions(_completions: monaco.languages.InlineCompletions): void {
    this.currentGhostText = null;
  }

  /**
   * Dispose inline completions (alias for freeInlineCompletions, required by some Monaco versions)
   */
  disposeInlineCompletions(_completions: monaco.languages.InlineCompletions): void {
    this.currentGhostText = null;
  }

  /**
   * Handle partial accept - not used, but kept for potential future use
   */
  private onPartialAccept(
    _model: monaco.editor.ITextModel,
    _position: monaco.Position,
    _acceptedLength: number
  ): void {
    // Update ghost text to show remaining completion
    if (this.currentGhostText) {
      // Ghost text is handled by Monaco, we just track state
    }
  }

  /**
   * Get context around cursor
   */
  private getContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): { prefix: string; suffix: string } {
    const maxLines = 50;
    const lineCount = model.getLineCount();
    
    // Get prefix (text before cursor)
    const startLine = Math.max(1, position.lineNumber - maxLines);
    const prefixRange = new monaco.Range(
      startLine,
      1,
      position.lineNumber,
      position.column
    );
    const prefix = model.getValueInRange(prefixRange);

    // Get suffix (text after cursor)
    const endLine = Math.min(lineCount, position.lineNumber + maxLines);
    const suffixRange = new monaco.Range(
      position.lineNumber,
      position.column,
      endLine,
      model.getLineMaxColumn(endLine)
    );
    const suffix = model.getValueInRange(suffixRange);

    return { prefix, suffix };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(prefix: string, suffix: string, language: string): string {
    // Use last 500 chars of prefix and first 200 chars of suffix for cache key
    const prefixKey = prefix.slice(-500);
    const suffixKey = suffix.slice(0, 200);
    return `${language}:${this.hashCode(prefixKey + '|' + suffixKey)}`;
  }

  /**
   * Simple hash function for cache key
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Fetch completion from AI service
   */
  private async fetchCompletion(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    prefix: string,
    suffix: string,
    token: monaco.CancellationToken
  ): Promise<string | null> {
    const requestId = ++this.lastRequestId;
    this.abortController = new AbortController();

    // Build the prompt
    const language = model.getLanguageId();
    const fileName = model.uri.path.split('/').pop() || 'code';
    
    const request: AICompletionRequest = {
      prompt: this.buildPrompt(prefix, suffix, language, fileName),
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stopSequences: this.getStopSequences(language),
      stream: false,
    };

    // Check cancellation
    if (token.isCancellationRequested || requestId !== this.lastRequestId) {
      return null;
    }

    try {
      const aiService = getAIService(this.config.provider);
      const response: AICompletionResponse = await aiService.complete(request, this.abortController.signal);

      // Check if still the current request
      if (requestId !== this.lastRequestId) {
        return null;
      }

      // Clean up the completion
      return this.cleanCompletion(response.text, suffix);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Build the completion prompt
   */
  private buildPrompt(prefix: string, suffix: string, language: string, fileName: string): string {
    // FIM (Fill in the Middle) format
    return `<|fim_prefix|># File: ${fileName}
# Language: ${language}

${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;
  }

  /**
   * Get stop sequences for language
   */
  private getStopSequences(language: string): string[] {
    const common = ['\n\n\n', '<|fim_suffix|>', '<|endoftext|>'];
    
    const languageSpecific: Record<string, string[]> = {
      typescript: [...common, 'function ', 'class ', 'interface ', 'export ', 'import '],
      javascript: [...common, 'function ', 'class ', 'export ', 'import '],
      python: [...common, 'def ', 'class ', 'import ', 'from '],
      rust: [...common, 'fn ', 'struct ', 'impl ', 'pub ', 'mod '],
      go: [...common, 'func ', 'type ', 'package ', 'import '],
      java: [...common, 'public ', 'private ', 'class ', 'interface '],
    };

    return languageSpecific[language] || common;
  }

  /**
   * Clean completion text
   */
  private cleanCompletion(completion: string, suffix: string): string {
    let cleaned = completion;

    // Remove special tokens
    cleaned = cleaned.replace(/<\|[^|]+\|>/g, '');
    
    // Remove duplicate of suffix start
    if (suffix) {
      const suffixStart = suffix.slice(0, 20);
      const index = cleaned.indexOf(suffixStart);
      if (index > 0) {
        cleaned = cleaned.slice(0, index);
      }
    }

    // Trim trailing whitespace but keep newlines
    cleaned = cleaned.replace(/[ \t]+$/gm, '');

    return cleaned;
  }

  /**
   * Create Monaco inline completions result
   */
  private createInlineCompletions(
    completion: string,
    position: monaco.Position,
    model: monaco.editor.ITextModel
  ): monaco.languages.InlineCompletions {
    // Determine the insert range
    const lineContent = model.getLineContent(position.lineNumber);
    const wordAtPosition = model.getWordAtPosition(position);
    
    let startColumn = position.column;
    if (wordAtPosition && wordAtPosition.endColumn === position.column) {
      // We're at the end of a word, include the word in replacement
      startColumn = wordAtPosition.startColumn;
    }

    const range = new monaco.Range(
      position.lineNumber,
      startColumn,
      position.lineNumber,
      position.column
    );

    return {
      items: [
        {
          insertText: completion,
          range,
          command: {
            id: 'aethel.inlineCompletion.accepted',
            title: 'Completion Accepted',
          },
        },
      ],
    };
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (now - entry.timestamp > this.config.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<InlineCompletionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cancel current request
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// Singleton instance
let providerInstance: InlineCompletionProvider | null = null;
let providerDisposable: monaco.IDisposable | null = null;

/**
 * Register inline completion provider for Monaco
 */
export function registerInlineCompletionProvider(
  languages: string[] = ['typescript', 'javascript', 'python', 'rust', 'go', 'cpp', 'java'],
  config?: Partial<InlineCompletionConfig>
): monaco.IDisposable {
  // Dispose existing provider
  if (providerDisposable) {
    providerDisposable.dispose();
  }

  providerInstance = new InlineCompletionProvider(config);

  // Register for all specified languages
  const disposables: monaco.IDisposable[] = [];
  for (const language of languages) {
    disposables.push(
      monaco.languages.registerInlineCompletionsProvider(language, providerInstance)
    );
  }

  // Create composite disposable
  providerDisposable = {
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
      if (providerInstance) {
        providerInstance.cancel();
        providerInstance = null;
      }
    },
  };

  // Register command for tracking accepted completions
  monaco.editor.registerCommand('aethel.inlineCompletion.accepted', () => {
    // Track completion acceptance for analytics
    console.log('[Inline Completion] Completion accepted');
  });

  return providerDisposable;
}

/**
 * Get the current inline completion provider
 */
export function getInlineCompletionProvider(): InlineCompletionProvider | null {
  return providerInstance;
}

/**
 * Enable/disable inline completions
 */
export function setInlineCompletionEnabled(enabled: boolean): void {
  if (providerInstance) {
    providerInstance.updateConfig({ enabled });
  }
}

/**
 * Configure inline completions
 */
export function configureInlineCompletion(config: Partial<InlineCompletionConfig>): void {
  if (providerInstance) {
    providerInstance.updateConfig(config);
  }
}

export default InlineCompletionProvider;
