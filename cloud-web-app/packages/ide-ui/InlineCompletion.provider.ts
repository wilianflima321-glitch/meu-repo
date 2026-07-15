import { logger } from '../../web/lib/observability/logger'
import { DEFAULT_OPENROUTER_MODEL_ID } from '../../web/lib/ai/openrouter-models'
import type { CompletionSuggestion } from './InlineCompletion.types'

// ============= Ghost Text Provider =============

export class GhostTextProvider {
  private abortController: AbortController | null = null
  private cache: Map<string, CompletionSuggestion[]> = new Map()

  async getSuggestion(
    content: string,
    position: { line: number; column: number },
    language: string,
    filePath: string,
    model: string = DEFAULT_OPENROUTER_MODEL_ID
  ): Promise<CompletionSuggestion | null> {
    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()

    // Get context around cursor
    const lines = content.split('\n')
    const currentLine = lines[position.line] || ''
    const prefix = currentLine.substring(0, position.column)
    const suffix = currentLine.substring(position.column)

    // Get surrounding context (5 lines before and after)
    const contextBefore = lines.slice(Math.max(0, position.line - 5), position.line).join('\n')
    const contextAfter = lines.slice(position.line + 1, position.line + 6).join('\n')

    // Build prompt
    const prompt = this.buildPrompt(contextBefore, prefix, suffix, contextAfter, language)

    // Check cache
    const cacheKey = `${filePath}:${position.line}:${position.column}:${prefix}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.length > 0) {
      return cached[0]
    }

    try {
      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          maxTokens: 150,
          temperature: 0.2,
          stop: ['\n\n', '```', '// ---'],
        }),
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error('Completion request failed')
      }

      const data = await response.json()
      const completionText = data.suggestion?.trim()

      if (!completionText) {
        return null
      }

      const suggestion: CompletionSuggestion = {
        id: crypto.randomUUID(),
        text: completionText,
        displayText: this.truncateForDisplay(completionText),
        insertText: completionText,
        range: {
          startLine: position.line,
          startColumn: position.column,
          endLine: position.line,
          endColumn: position.column,
        },
        source: 'ai',
        confidence: data.confidence || 0.8,
        model,
      }

      // Cache the result
      this.cache.set(cacheKey, [suggestion])

      return suggestion
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null
      }
      logger.error('Ghost text error:', error)
      return null
    }
  }

  private buildPrompt(
    contextBefore: string,
    prefix: string,
    suffix: string,
    contextAfter: string,
    language: string
  ): string {
    return `Complete the code at the cursor position. Return ONLY the completion, no explanation.

Language: ${language}

Context before:
\`\`\`${language}
${contextBefore}
\`\`\`

Current line (cursor at |):
${prefix}|${suffix}

Context after:
\`\`\`${language}
${contextAfter}
\`\`\`

Completion (continue from cursor):`
  }

  private truncateForDisplay(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  clearCache() {
    this.cache.clear()
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}
