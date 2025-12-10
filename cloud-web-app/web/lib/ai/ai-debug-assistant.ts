/**
 * AI Debug Assistant
 * Provides intelligent debugging assistance using Chat Orchestrator
 */

import { DAPAdapterBase, StackFrame, Variable, Scope } from '../dap/dap-adapter-base';

export interface DebugAnalysis {
  summary: string;
  potentialIssues: string[];
  suggestedBreakpoints: Array<{ file: string; line: number; reason: string }>;
  suggestedWatches: string[];
  nextSteps: string[];
  confidence: number;
}

export interface VariableExplanation {
  variable: string;
  explanation: string;
  expectedValue?: string;
  actualValue: string;
  isProblem: boolean;
}

export class AIDebugAssistant {
  private chatOrchestratorUrl = '/api/chat/orchestrator';

  /**
   * Analyze stopped debug state
   * Provides intelligent insights when breakpoint is hit
   */
  async analyzeStoppedState(
    adapter: DAPAdapterBase,
    threadId: number,
    reason: string
  ): Promise<DebugAnalysis> {
    try {
      // 1. Gather debug context
      const stackTrace = await adapter.stackTrace(threadId);
      const topFrame = stackTrace[0];
      
      if (!topFrame) {
        return this.getEmptyAnalysis();
      }

      const scopes = await adapter.scopes(topFrame.id);
      const variables = await this.getAllVariables(adapter, scopes);

      // 2. Build context for AI
      const context = this.buildDebugContext(stackTrace, variables, reason);

      // 3. Get AI analysis
      const analysis = await this.getAIAnalysis(context);

      return analysis;
    } catch (error) {
      console.error('[AI Debug Assistant] Error analyzing stopped state:', error);
      return this.getEmptyAnalysis();
    }
  }

  /**
   * Explain variable value
   * Provides natural language explanation of complex variables
   */
  async explainVariable(
    variable: Variable,
    context?: string
  ): Promise<VariableExplanation> {
    try {
      const prompt = `Explain this variable in a debugging context:\n\n` +
        `Name: ${variable.name}\n` +
        `Type: ${variable.type || 'unknown'}\n` +
        `Value: ${variable.value}\n` +
        (context ? `\nContext: ${context}` : '') +
        `\n\nProvide:\n` +
        `1. What this variable represents\n` +
        `2. If the value looks correct or suspicious\n` +
        `3. What to check if it seems wrong`;

      const response = await this.callChatOrchestrator(prompt, 'Coder');

      return this.parseVariableExplanation(variable, response);
    } catch (error) {
      console.error('[AI Debug Assistant] Error explaining variable:', error);
      return {
        variable: variable.name,
        explanation: 'Unable to generate explanation',
        actualValue: variable.value,
        isProblem: false,
      };
    }
  }

  /**
   * Suggest breakpoints
   * AI suggests strategic breakpoint locations
   */
  async suggestBreakpoints(
    fileContent: string,
    language: string,
    currentIssue?: string
  ): Promise<Array<{ line: number; reason: string }>> {
    try {
      const prompt = `Analyze this ${language} code and suggest strategic breakpoint locations:\n\n` +
        `${fileContent}\n\n` +
        (currentIssue ? `Current issue: ${currentIssue}\n\n` : '') +
        `Suggest breakpoints that would help debug:\n` +
        `- Error handling paths\n` +
        `- State changes\n` +
        `- Critical logic\n` +
        `- Potential problem areas\n\n` +
        `Format: Line X: Reason`;

      const response = await this.callChatOrchestrator(prompt, 'Coder');

      return this.parseBreakpointSuggestions(response);
    } catch (error) {
      console.error('[AI Debug Assistant] Error suggesting breakpoints:', error);
      return [];
    }
  }

  /**
   * Suggest watch expressions
   * AI suggests useful expressions to watch
   */
  async suggestWatchExpressions(
    variables: Variable[],
    context?: string
  ): Promise<string[]> {
    try {
      const variableList = variables
        .map(v => `${v.name}: ${v.type || 'unknown'} = ${v.value}`)
        .join('\n');

      const prompt = `Given these variables in a debug session:\n\n` +
        `${variableList}\n\n` +
        (context ? `Context: ${context}\n\n` : '') +
        `Suggest useful watch expressions to track:\n` +
        `- Derived values\n` +
        `- Conditions to monitor\n` +
        `- Relationships between variables\n\n` +
        `Provide expressions that would help understand the program state.`;

      const response = await this.callChatOrchestrator(prompt, 'Coder');

      return this.parseWatchExpressions(response);
    } catch (error) {
      console.error('[AI Debug Assistant] Error suggesting watch expressions:', error);
      return [];
    }
  }

  /**
   * Analyze exception
   * Provides insights when exception occurs
   */
  async analyzeException(
    exceptionType: string,
    exceptionMessage: string,
    stackTrace: StackFrame[]
  ): Promise<DebugAnalysis> {
    try {
      const stackStr = stackTrace
        .map(f => `  at ${f.name} (${f.source?.path}:${f.line})`)
        .join('\n');

      const prompt = `Analyze this exception:\n\n` +
        `Type: ${exceptionType}\n` +
        `Message: ${exceptionMessage}\n\n` +
        `Stack trace:\n${stackStr}\n\n` +
        `Provide:\n` +
        `1. What likely caused this exception\n` +
        `2. Common reasons for this error\n` +
        `3. How to fix it\n` +
        `4. What to check in the debugger`;

      const response = await this.callChatOrchestrator(prompt, 'Coder');

      return this.parseExceptionAnalysis(response);
    } catch (error) {
      console.error('[AI Debug Assistant] Error analyzing exception:', error);
      return this.getEmptyAnalysis();
    }
  }

  /**
   * Compare expected vs actual
   * Helps identify discrepancies
   */
  async compareValues(
    variableName: string,
    expectedValue: string,
    actualValue: string,
    context?: string
  ): Promise<string> {
    try {
      const prompt = `Compare expected vs actual value:\n\n` +
        `Variable: ${variableName}\n` +
        `Expected: ${expectedValue}\n` +
        `Actual: ${actualValue}\n` +
        (context ? `\nContext: ${context}` : '') +
        `\n\nExplain:\n` +
        `1. Why they differ\n` +
        `2. Which is correct\n` +
        `3. What might have caused the discrepancy`;

      const response = await this.callChatOrchestrator(prompt, 'Coder');

      return response;
    } catch (error) {
      console.error('[AI Debug Assistant] Error comparing values:', error);
      return 'Unable to compare values';
    }
  }

  /**
   * Call Chat Orchestrator
   */
  private async callChatOrchestrator(
    prompt: string,
    agent: string = 'Coder',
    temperature: number = 0.4
  ): Promise<string> {
    const response = await fetch(this.chatOrchestratorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent,
        prompt,
        temperature,
        maxTokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat Orchestrator error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  /**
   * Build debug context for AI
   */
  private buildDebugContext(
    stackTrace: StackFrame[],
    variables: Variable[],
    reason: string
  ): string {
    let context = `Debug session stopped. Reason: ${reason}\n\n`;

    context += `Stack trace:\n`;
    stackTrace.slice(0, 5).forEach((frame, i) => {
      context += `  ${i}. ${frame.name} at ${frame.source?.path || 'unknown'}:${frame.line}\n`;
    });

    context += `\nVariables:\n`;
    variables.slice(0, 10).forEach(v => {
      context += `  ${v.name}: ${v.type || 'unknown'} = ${v.value}\n`;
    });

    return context;
  }

  /**
   * Get AI analysis
   */
  private async getAIAnalysis(context: string): Promise<DebugAnalysis> {
    const prompt = `${context}\n\n` +
      `Analyze this debug state and provide:\n` +
      `1. Summary of current state\n` +
      `2. Potential issues you notice\n` +
      `3. Suggested breakpoints to set\n` +
      `4. Expressions to watch\n` +
      `5. Next debugging steps\n\n` +
      `Be specific and actionable.`;

    const response = await this.callChatOrchestrator(prompt, 'Coder');

    return this.parseDebugAnalysis(response);
  }

  /**
   * Get all variables from scopes
   */
  private async getAllVariables(
    adapter: DAPAdapterBase,
    scopes: Scope[]
  ): Promise<Variable[]> {
    const allVariables: Variable[] = [];

    for (const scope of scopes) {
      if (scope.expensive) continue; // Skip expensive scopes
      
      try {
        const variables = await adapter.variables(scope.variablesReference);
        allVariables.push(...variables);
      } catch (error) {
        console.error('[AI Debug Assistant] Error getting variables:', error);
      }
    }

    return allVariables;
  }

  /**
   * Parse debug analysis from AI response
   */
  private parseDebugAnalysis(response: string): DebugAnalysis {
    const analysis: DebugAnalysis = {
      summary: '',
      potentialIssues: [],
      suggestedBreakpoints: [],
      suggestedWatches: [],
      nextSteps: [],
      confidence: 0.7,
    };

    const lines = response.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().includes('summary')) {
        currentSection = 'summary';
      } else if (trimmed.toLowerCase().includes('issue')) {
        currentSection = 'issues';
      } else if (trimmed.toLowerCase().includes('breakpoint')) {
        currentSection = 'breakpoints';
      } else if (trimmed.toLowerCase().includes('watch')) {
        currentSection = 'watches';
      } else if (trimmed.toLowerCase().includes('next') || trimmed.toLowerCase().includes('step')) {
        currentSection = 'steps';
      } else if (trimmed && !trimmed.match(/^\d+\./)) {
        if (currentSection === 'summary') {
          analysis.summary += trimmed + ' ';
        }
      } else if (trimmed.match(/^[-*]\s/)) {
        const content = trimmed.replace(/^[-*]\s/, '');
        if (currentSection === 'issues') {
          analysis.potentialIssues.push(content);
        } else if (currentSection === 'steps') {
          analysis.nextSteps.push(content);
        }
      }
    }

    return analysis;
  }

  /**
   * Parse variable explanation
   */
  private parseVariableExplanation(
    variable: Variable,
    response: string
  ): VariableExplanation {
    const isProblem = response.toLowerCase().includes('suspicious') ||
                     response.toLowerCase().includes('wrong') ||
                     response.toLowerCase().includes('incorrect');

    return {
      variable: variable.name,
      explanation: response,
      actualValue: variable.value,
      isProblem,
    };
  }

  /**
   * Parse breakpoint suggestions
   */
  private parseBreakpointSuggestions(
    response: string
  ): Array<{ line: number; reason: string }> {
    const suggestions: Array<{ line: number; reason: string }> = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(/Line\s+(\d+):\s*(.+)/i);
      if (match) {
        suggestions.push({
          line: parseInt(match[1]),
          reason: match[2].trim(),
        });
      }
    }

    return suggestions;
  }

  /**
   * Parse watch expressions
   */
  private parseWatchExpressions(response: string): string[] {
    const expressions: string[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*]\s/)) {
        const expr = trimmed.replace(/^[-*]\s/, '').trim();
        if (expr && !expr.includes(':')) {
          expressions.push(expr);
        }
      } else if (trimmed.match(/^`[^`]+`/)) {
        const expr = trimmed.match(/`([^`]+)`/)?.[1];
        if (expr) {
          expressions.push(expr);
        }
      }
    }

    return expressions;
  }

  /**
   * Parse exception analysis
   */
  private parseExceptionAnalysis(response: string): DebugAnalysis {
    return {
      summary: response,
      potentialIssues: [],
      suggestedBreakpoints: [],
      suggestedWatches: [],
      nextSteps: [],
      confidence: 0.8,
    };
  }

  /**
   * Get empty analysis
   */
  private getEmptyAnalysis(): DebugAnalysis {
    return {
      summary: 'Unable to analyze debug state',
      potentialIssues: [],
      suggestedBreakpoints: [],
      suggestedWatches: [],
      nextSteps: [],
      confidence: 0,
    };
  }
}

// Singleton instance
let aiDebugAssistantInstance: AIDebugAssistant | null = null;

export function getAIDebugAssistant(): AIDebugAssistant {
  if (!aiDebugAssistantInstance) {
    aiDebugAssistantInstance = new AIDebugAssistant();
  }
  return aiDebugAssistantInstance;
}
