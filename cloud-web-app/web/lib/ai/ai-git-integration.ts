/**
 * AI Git Integration
 * AI-powered git operations using Chat Orchestrator
 */

import { GitDiff, GitCommit } from '../git/git-client';

export interface CommitMessageSuggestion {
  message: string;
  type: string;
  scope?: string;
  breaking: boolean;
  confidence: number;
}

export interface MergeConflictResolution {
  resolvedCode: string;
  explanation: string;
  confidence: number;
  strategy: 'current' | 'incoming' | 'both' | 'custom';
}

export interface CodeReviewComment {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  suggestion?: string;
}

export class AIGitIntegration {
  private chatOrchestratorUrl = '/api/chat/orchestrator';

  /**
   * Generate commit message from diff
   */
  async generateCommitMessage(diff: GitDiff[]): Promise<CommitMessageSuggestion[]> {
    try {
      const diffText = this.formatDiff(diff);

      const prompt = `Analyze these git changes and generate commit messages:\n\n` +
        `${diffText}\n\n` +
        `Generate 3 commit message suggestions following Conventional Commits format:\n` +
        `- type(scope): description\n` +
        `- Types: feat, fix, docs, style, refactor, test, chore\n` +
        `- Be specific and concise\n` +
        `- Indicate if breaking change\n\n` +
        `Return as JSON array: [{"message": "...", "type": "...", "scope": "...", "breaking": false}]`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.3);

      return this.parseCommitSuggestions(response);
    } catch (error) {
      console.error('[AI Git] Error generating commit message:', error);
      return [];
    }
  }

  /**
   * Suggest commit scope
   */
  async suggestCommitScope(diff: GitDiff[]): Promise<string[]> {
    try {
      const files = diff.map(d => d.path).join('\n');

      const prompt = `Based on these changed files:\n${files}\n\n` +
        `Suggest appropriate commit scopes (e.g., api, ui, auth, database).\n` +
        `Return as comma-separated list.`;

      const response = await this.callChatOrchestrator(prompt, 'Architect', 0.4);

      return response.split(',').map(s => s.trim()).filter(s => s);
    } catch (error) {
      console.error('[AI Git] Error suggesting scope:', error);
      return [];
    }
  }

  /**
   * Resolve merge conflict
   */
  async resolveMergeConflict(
    current: string,
    incoming: string,
    base?: string,
    filePath?: string
  ): Promise<MergeConflictResolution> {
    try {
      let prompt = `Resolve this merge conflict:\n\n`;
      prompt += `Current (HEAD):\n\`\`\`\n${current}\n\`\`\`\n\n`;
      prompt += `Incoming:\n\`\`\`\n${incoming}\n\`\`\`\n\n`;
      
      if (base) {
        prompt += `Base:\n\`\`\`\n${base}\n\`\`\`\n\n`;
      }
      
      if (filePath) {
        prompt += `File: ${filePath}\n\n`;
      }

      prompt += `Provide:\n`;
      prompt += `1. Best resolution considering both changes\n`;
      prompt += `2. Explanation of resolution strategy\n`;
      prompt += `3. Confidence level (0-100)\n\n`;
      prompt += `Return resolved code in a code block.`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.4);

      return this.parseConflictResolution(response);
    } catch (error) {
      console.error('[AI Git] Error resolving conflict:', error);
      return {
        resolvedCode: current,
        explanation: 'Failed to resolve conflict',
        confidence: 0,
        strategy: 'current',
      };
    }
  }

  /**
   * Review code changes
   */
  async reviewChanges(diff: GitDiff[]): Promise<CodeReviewComment[]> {
    try {
      const diffText = this.formatDiff(diff);

      const prompt = `Review these code changes:\n\n${diffText}\n\n` +
        `Check for:\n` +
        `1. Code quality issues\n` +
        `2. Best practices violations\n` +
        `3. Potential bugs\n` +
        `4. Performance concerns\n` +
        `5. Security issues\n` +
        `6. Missing tests\n\n` +
        `For each issue, provide:\n` +
        `- File and line number\n` +
        `- Severity (info/warning/error)\n` +
        `- Category\n` +
        `- Description\n` +
        `- Suggestion for improvement\n\n` +
        `Return as JSON array.`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.5);

      return this.parseReviewComments(response);
    } catch (error) {
      console.error('[AI Git] Error reviewing changes:', error);
      return [];
    }
  }

  /**
   * Suggest PR title and description
   */
  async generatePRDescription(
    commits: GitCommit[],
    diff: GitDiff[]
  ): Promise<{ title: string; description: string }> {
    try {
      const commitMessages = commits.map(c => c.message).join('\n');
      const diffText = this.formatDiff(diff);

      const prompt = `Generate a pull request title and description:\n\n` +
        `Commits:\n${commitMessages}\n\n` +
        `Changes:\n${diffText}\n\n` +
        `Generate:\n` +
        `1. Concise PR title (50 chars max)\n` +
        `2. Detailed description with:\n` +
        `   - What changed\n` +
        `   - Why it changed\n` +
        `   - Impact\n` +
        `   - Testing done\n\n` +
        `Format:\n` +
        `TITLE: ...\n` +
        `DESCRIPTION:\n...`;

      const response = await this.callChatOrchestrator(prompt, 'Architect', 0.4);

      return this.parsePRDescription(response);
    } catch (error) {
      console.error('[AI Git] Error generating PR description:', error);
      return {
        title: 'Update',
        description: 'Changes made',
      };
    }
  }

  /**
   * Analyze commit history
   */
  async analyzeCommitHistory(commits: GitCommit[]): Promise<{
    patterns: string[];
    suggestions: string[];
    quality: number;
  }> {
    try {
      const commitMessages = commits.map(c => `${c.hash.substring(0, 7)}: ${c.message}`).join('\n');

      const prompt = `Analyze these commit messages:\n\n${commitMessages}\n\n` +
        `Provide:\n` +
        `1. Patterns observed (good and bad)\n` +
        `2. Suggestions for improvement\n` +
        `3. Overall quality score (0-100)\n\n` +
        `Consider:\n` +
        `- Conventional commits format\n` +
        `- Message clarity\n` +
        `- Commit granularity\n` +
        `- Consistency`;

      const response = await this.callChatOrchestrator(prompt, 'Architect', 0.5);

      return this.parseHistoryAnalysis(response);
    } catch (error) {
      console.error('[AI Git] Error analyzing history:', error);
      return {
        patterns: [],
        suggestions: [],
        quality: 0,
      };
    }
  }

  /**
   * Suggest branch name
   */
  async suggestBranchName(description: string): Promise<string[]> {
    try {
      const prompt = `Suggest git branch names for:\n"${description}"\n\n` +
        `Follow conventions:\n` +
        `- feature/description\n` +
        `- fix/description\n` +
        `- refactor/description\n` +
        `- Use kebab-case\n` +
        `- Be concise but descriptive\n\n` +
        `Provide 3 suggestions, one per line.`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.6);

      return response.split('\n').map(s => s.trim()).filter(s => s).slice(0, 3);
    } catch (error) {
      console.error('[AI Git] Error suggesting branch name:', error);
      return [];
    }
  }

  /**
   * Explain commit
   */
  async explainCommit(commit: GitCommit, diff: GitDiff[]): Promise<string> {
    try {
      const diffText = this.formatDiff(diff);

      const prompt = `Explain this commit in simple terms:\n\n` +
        `Message: ${commit.message}\n` +
        `Author: ${commit.author}\n` +
        `Date: ${commit.date}\n\n` +
        `Changes:\n${diffText}\n\n` +
        `Provide a clear explanation of:\n` +
        `1. What was changed\n` +
        `2. Why it was changed\n` +
        `3. Impact of the change`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.4);

      return response;
    } catch (error) {
      console.error('[AI Git] Error explaining commit:', error);
      return 'Unable to explain commit';
    }
  }

  /**
   * Format diff for AI
   */
  private formatDiff(diff: GitDiff[]): string {
    return diff.map(d => {
      let text = `File: ${d.path}\n`;
      text += `Status: ${d.status}\n`;
      if (d.additions) text += `+${d.additions} `;
      if (d.deletions) text += `-${d.deletions}`;
      text += '\n';
      if (d.patch) {
        text += d.patch.substring(0, 500); // Limit patch size
      }
      return text;
    }).join('\n\n');
  }

  /**
   * Call Chat Orchestrator
   */
  private async callChatOrchestrator(
    prompt: string,
    agent: string = 'Coder',
    temperature: number = 0.5
  ): Promise<string> {
    const response = await fetch(this.chatOrchestratorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent,
        prompt,
        temperature,
        maxTokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat Orchestrator error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  /**
   * Parse commit suggestions
   */
  private parseCommitSuggestions(response: string): CommitMessageSuggestion[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return suggestions.map((s: any) => ({
          message: s.message || '',
          type: s.type || 'chore',
          scope: s.scope,
          breaking: s.breaking || false,
          confidence: 0.8,
        }));
      }
    } catch (error) {
      console.error('[AI Git] Error parsing commit suggestions:', error);
    }

    // Fallback: extract from text
    const lines = response.split('\n').filter(l => l.trim());
    return lines.slice(0, 3).map(line => ({
      message: line.replace(/^[-*\d.)\]]\s*/, ''),
      type: this.extractType(line),
      breaking: line.toLowerCase().includes('breaking'),
      confidence: 0.6,
    }));
  }

  /**
   * Extract type from message
   */
  private extractType(message: string): string {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
    for (const type of types) {
      if (message.toLowerCase().includes(type)) {
        return type;
      }
    }
    return 'chore';
  }

  /**
   * Parse conflict resolution
   */
  private parseConflictResolution(response: string): MergeConflictResolution {
    const codeMatch = response.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
    const resolvedCode = codeMatch ? codeMatch[1] : response;

    const confidenceMatch = response.match(/confidence[:\s]+(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 70;

    return {
      resolvedCode,
      explanation: response,
      confidence,
      strategy: 'custom',
    };
  }

  /**
   * Parse review comments
   */
  private parseReviewComments(response: string): CodeReviewComment[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[AI Git] Error parsing review comments:', error);
    }
    return [];
  }

  /**
   * Parse PR description
   */
  private parsePRDescription(response: string): { title: string; description: string } {
    const titleMatch = response.match(/TITLE[:\s]+(.+)/i);
    const descMatch = response.match(/DESCRIPTION[:\s]+([\s\S]+)/i);

    return {
      title: titleMatch ? titleMatch[1].trim() : 'Update',
      description: descMatch ? descMatch[1].trim() : response,
    };
  }

  /**
   * Parse history analysis
   */
  private parseHistoryAnalysis(response: string): {
    patterns: string[];
    suggestions: string[];
    quality: number;
  } {
    const patterns: string[] = [];
    const suggestions: string[] = [];
    let quality = 0;

    const patternsMatch = response.match(/patterns?[:\s]+([\s\S]*?)(?=suggestions?|quality|$)/i);
    if (patternsMatch) {
      patterns.push(...this.extractListItems(patternsMatch[1]));
    }

    const suggestionsMatch = response.match(/suggestions?[:\s]+([\s\S]*?)(?=quality|$)/i);
    if (suggestionsMatch) {
      suggestions.push(...this.extractListItems(suggestionsMatch[1]));
    }

    const qualityMatch = response.match(/quality[:\s]+(\d+)/i);
    if (qualityMatch) {
      quality = parseInt(qualityMatch[1]);
    }

    return { patterns, suggestions, quality };
  }

  /**
   * Extract list items
   */
  private extractListItems(text: string): string[] {
    return text.split('\n')
      .map(l => l.trim())
      .filter(l => l && l.match(/^[-*\d.)\]]/))
      .map(l => l.replace(/^[-*\d.)\]]\s*/, ''));
  }
}

// Singleton instance
let aiGitIntegrationInstance: AIGitIntegration | null = null;

export function getAIGitIntegration(): AIGitIntegration {
  if (!aiGitIntegrationInstance) {
    aiGitIntegrationInstance = new AIGitIntegration();
  }
  return aiGitIntegrationInstance;
}
