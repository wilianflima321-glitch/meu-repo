/**
 * AI-Enhanced LSP
 * Integrates Chat Orchestrator with LSP for intelligent code assistance
 */

import { LSPServerBase, Position, CompletionItem, Hover, Location, Range } from '../lsp/lsp-server-base';
import { getLSPManager } from '../lsp/lsp-manager';

export interface AICompletionContext {
  fileContent: string;
  cursorPosition: Position;
  surroundingCode: string;
  projectContext?: string;
}

export interface AICodeAction {
  title: string;
  kind: string;
  edit?: any;
  command?: any;
  isAIGenerated: boolean;
  confidence: number;
}

export class AIEnhancedLSP {
  private lspManager = getLSPManager();
  private chatOrchestratorUrl = '/api/chat/orchestrator';

  /**
   * Get AI-enhanced completions
   * Combines LSP completions with AI suggestions
   */
  async getCompletions(
    language: string,
    uri: string,
    position: Position,
    context?: AICompletionContext
  ): Promise<CompletionItem[]> {
    try {
      // 1. Get LSP completions
      const lspServer = await this.lspManager.getClient(language);
      const lspCompletions = lspServer 
        ? await lspServer.completion(uri, position)
        : [];

      // 2. Get AI suggestions
      const aiSuggestions = await this.getAICompletions(
        language,
        uri,
        position,
        context
      );

      // 3. Merge and rank
      return this.mergeCompletions(lspCompletions, aiSuggestions);
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error getting completions:', error);
      // Fallback to LSP only
      const lspServer = await this.lspManager.getClient(language);
      return lspServer ? await lspServer.completion(uri, position) : [];
    }
  }

  /**
   * Get AI-enhanced hover information
   * Adds natural language explanations to LSP hover
   */
  async getHover(
    language: string,
    uri: string,
    position: Position
  ): Promise<Hover | null> {
    try {
      // 1. Get LSP hover
      const lspServer = await this.lspManager.getClient(language);
      const lspHover = lspServer 
        ? await lspServer.hover(uri, position)
        : null;

      if (!lspHover) {
        return null;
      }

      // 2. Get AI explanation
      const aiExplanation = await this.getAIExplanation(
        language,
        lspHover.contents
      );

      // 3. Combine
      return {
        contents: this.combineHoverContents(lspHover.contents, aiExplanation),
        range: lspHover.range,
      };
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error getting hover:', error);
      const lspServer = await this.lspManager.getClient(language);
      return lspServer ? await lspServer.hover(uri, position) : null;
    }
  }

  /**
   * Get AI-enhanced code actions
   * Adds intelligent refactoring suggestions
   */
  async getCodeActions(
    language: string,
    uri: string,
    range: Range,
    context: any
  ): Promise<AICodeAction[]> {
    try {
      // 1. Get LSP code actions
      const lspServer = await this.lspManager.getClient(language);
      const lspActions = lspServer 
        ? await lspServer.codeAction(uri, range, context)
        : [];

      // 2. Get AI suggestions
      const code = await this.getCodeInRange(uri, range);
      const aiActions = await this.getAICodeActions(language, code, context);

      // 3. Combine
      return [
        ...lspActions.map(a => ({ ...a, isAIGenerated: false, confidence: 1.0 })),
        ...aiActions,
      ];
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error getting code actions:', error);
      const lspServer = await this.lspManager.getClient(language);
      const lspActions = lspServer 
        ? await lspServer.codeAction(uri, range, context)
        : [];
      return lspActions.map(a => ({ ...a, isAIGenerated: false, confidence: 1.0 }));
    }
  }

  /**
   * Get AI completions via Chat Orchestrator
   */
  private async getAICompletions(
    language: string,
    uri: string,
    position: Position,
    context?: AICompletionContext
  ): Promise<CompletionItem[]> {
    try {
      const prompt = this.buildCompletionPrompt(language, position, context);
      
      const response = await fetch(this.chatOrchestratorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'Coder',
          prompt,
          temperature: 0.3,
          maxTokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat Orchestrator error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseAICompletions(data.response);
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error getting AI completions:', error);
      return [];
    }
  }

  /**
   * Get AI explanation via Chat Orchestrator
   */
  private async getAIExplanation(
    language: string,
    code: string | any
  ): Promise<string> {
    try {
      const codeStr = typeof code === 'string' ? code : JSON.stringify(code);
      
      const response = await fetch(this.chatOrchestratorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'Coder',
          prompt: `Explain this ${language} code in simple terms:\n\n${codeStr}\n\nProvide a clear, concise explanation for a developer.`,
          temperature: 0.5,
          maxTokens: 300,
        }),
      });

      if (!response.ok) {
        return '';
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error getting AI explanation:', error);
      return '';
    }
  }

  /**
   * Get AI code actions via Chat Orchestrator
   */
  private async getAICodeActions(
    language: string,
    code: string,
    context: any
  ): Promise<AICodeAction[]> {
    try {
      const response = await fetch(this.chatOrchestratorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'Coder',
          prompt: `Analyze this ${language} code and suggest refactorings:\n\n${code}\n\nConsider:\n- Performance optimizations\n- Readability improvements\n- Best practices\n- Code smells\n\nProvide specific, actionable suggestions.`,
          temperature: 0.4,
          maxTokens: 800,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return this.parseAICodeActions(data.response);
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error getting AI code actions:', error);
      return [];
    }
  }

  /**
   * Build completion prompt
   */
  private buildCompletionPrompt(
    language: string,
    position: Position,
    context?: AICompletionContext
  ): string {
    let prompt = `Language: ${language}\nPosition: Line ${position.line}, Column ${position.character}\n\n`;

    if (context) {
      if (context.surroundingCode) {
        prompt += `Surrounding code:\n${context.surroundingCode}\n\n`;
      }
      if (context.projectContext) {
        prompt += `Project context:\n${context.projectContext}\n\n`;
      }
    }

    prompt += `Suggest intelligent code completions for this position. Consider:\n`;
    prompt += `- Context and intent\n`;
    prompt += `- Common patterns in this language\n`;
    prompt += `- Best practices\n\n`;
    prompt += `Provide completions in JSON format: [{ "label": "...", "detail": "...", "insertText": "..." }]`;

    return prompt;
  }

  /**
   * Parse AI completions from response
   */
  private parseAICompletions(response: string): CompletionItem[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const completions = JSON.parse(jsonMatch[0]);
      return completions.map((c: any) => ({
        label: c.label || '',
        kind: 1, // Text
        detail: c.detail || 'AI Suggestion',
        documentation: c.documentation || '',
        insertText: c.insertText || c.label,
        sortText: `z_ai_${c.label}`, // Sort AI suggestions after LSP
      }));
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error parsing AI completions:', error);
      return [];
    }
  }

  /**
   * Parse AI code actions from response
   */
  private parseAICodeActions(response: string): AICodeAction[] {
    try {
      // Parse suggestions from response
      const suggestions: AICodeAction[] = [];
      const lines = response.split('\n');

      let currentAction: Partial<AICodeAction> | null = null;

      for (const line of lines) {
        if (line.match(/^\d+\./)) {
          // New suggestion
          if (currentAction && currentAction.title) {
            suggestions.push({
              title: currentAction.title,
              kind: currentAction.kind || 'refactor',
              isAIGenerated: true,
              confidence: 0.8,
            });
          }
          currentAction = {
            title: line.replace(/^\d+\.\s*/, '').trim(),
          };
        } else if (currentAction && line.trim()) {
          // Add to current suggestion
          currentAction.title += ' ' + line.trim();
        }
      }

      // Add last action
      if (currentAction && currentAction.title) {
        suggestions.push({
          title: currentAction.title,
          kind: currentAction.kind || 'refactor',
          isAIGenerated: true,
          confidence: 0.8,
        });
      }

      return suggestions;
    } catch (error) {
      console.error('[AI-Enhanced LSP] Error parsing AI code actions:', error);
      return [];
    }
  }

  /**
   * Merge LSP and AI completions
   */
  private mergeCompletions(
    lspCompletions: CompletionItem[],
    aiCompletions: CompletionItem[]
  ): CompletionItem[] {
    // Remove duplicates (prefer LSP)
    const lspLabels = new Set(lspCompletions.map(c => c.label));
    const uniqueAI = aiCompletions.filter(c => !lspLabels.has(c.label));

    return [...lspCompletions, ...uniqueAI];
  }

  /**
   * Combine hover contents
   */
  private combineHoverContents(
    lspContents: string | any,
    aiExplanation: string
  ): string {
    const lspStr = typeof lspContents === 'string' 
      ? lspContents 
      : JSON.stringify(lspContents);

    if (!aiExplanation) {
      return lspStr;
    }

    return `${lspStr}\n\n---\n\n**AI Explanation:**\n\n${aiExplanation}`;
  }

  /**
   * Get code in range (mock implementation)
   */
  private async getCodeInRange(uri: string, range: Range): Promise<string> {
    // TODO: Implement actual file reading
    return `// Code at ${uri} lines ${range.start.line}-${range.end.line}`;
  }
}

// Singleton instance
let aiEnhancedLSPInstance: AIEnhancedLSP | null = null;

export function getAIEnhancedLSP(): AIEnhancedLSP {
  if (!aiEnhancedLSPInstance) {
    aiEnhancedLSPInstance = new AIEnhancedLSP();
  }
  return aiEnhancedLSPInstance;
}
