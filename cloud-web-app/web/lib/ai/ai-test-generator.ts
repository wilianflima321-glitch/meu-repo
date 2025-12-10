/**
 * AI Test Generator
 * Generates comprehensive tests using Chat Orchestrator
 */

import { TestItem, CoverageInfo } from '../test/test-adapter-base';

export interface TestGenerationOptions {
  framework: 'jest' | 'pytest' | 'go-test' | 'junit';
  includeEdgeCases?: boolean;
  includeErrorHandling?: boolean;
  includeIntegrationTests?: boolean;
  coverageTarget?: number;
  style?: 'unit' | 'integration' | 'e2e' | 'all';
}

export interface GeneratedTest {
  fileName: string;
  content: string;
  description: string;
  testCount: number;
  estimatedCoverage: number;
}

export class AITestGenerator {
  private chatOrchestratorUrl = '/api/chat/orchestrator';

  /**
   * Generate tests for a file
   */
  async generateTests(
    filePath: string,
    fileContent: string,
    language: string,
    options: TestGenerationOptions
  ): Promise<GeneratedTest> {
    try {
      const prompt = this.buildTestGenerationPrompt(
        filePath,
        fileContent,
        language,
        options
      );

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.5);

      return this.parseGeneratedTests(response, filePath, options.framework);
    } catch (error) {
      console.error('[AI Test Generator] Error generating tests:', error);
      throw error;
    }
  }

  /**
   * Generate tests to improve coverage
   */
  async generateCoverageTests(
    filePath: string,
    fileContent: string,
    coverage: CoverageInfo,
    options: TestGenerationOptions
  ): Promise<GeneratedTest> {
    try {
      const uncoveredLines = coverage.lines
        .filter(l => !l.covered)
        .map(l => l.line);

      const uncoveredBranches = coverage.branches
        .filter(b => !b.covered)
        .map(b => b.line);

      const prompt = this.buildCoverageTestPrompt(
        filePath,
        fileContent,
        uncoveredLines,
        uncoveredBranches,
        options
      );

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.4);

      return this.parseGeneratedTests(response, filePath, options.framework);
    } catch (error) {
      console.error('[AI Test Generator] Error generating coverage tests:', error);
      throw error;
    }
  }

  /**
   * Generate test for specific function
   */
  async generateFunctionTests(
    functionName: string,
    functionCode: string,
    language: string,
    options: TestGenerationOptions
  ): Promise<string> {
    try {
      const prompt = `Generate comprehensive tests for this ${language} function:\n\n` +
        `\`\`\`${language}\n${functionCode}\n\`\`\`\n\n` +
        `Requirements:\n` +
        `- Framework: ${options.framework}\n` +
        `- Include edge cases: ${options.includeEdgeCases !== false}\n` +
        `- Include error handling: ${options.includeErrorHandling !== false}\n` +
        `- Test style: ${options.style || 'unit'}\n\n` +
        `Generate complete, runnable tests with:\n` +
        `1. Normal cases\n` +
        `2. Edge cases (empty, null, boundary values)\n` +
        `3. Error cases\n` +
        `4. Assertions for all return values\n\n` +
        `Return only the test code, properly formatted.`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.4);

      return this.extractCodeFromResponse(response, language);
    } catch (error) {
      console.error('[AI Test Generator] Error generating function tests:', error);
      throw error;
    }
  }

  /**
   * Suggest missing tests
   */
  async suggestMissingTests(
    existingTests: TestItem[],
    sourceFile: string,
    sourceContent: string,
    language: string
  ): Promise<string[]> {
    try {
      const testNames = existingTests.map(t => t.label).join('\n');

      const prompt = `Analyze this ${language} source file and existing tests:\n\n` +
        `Source file:\n\`\`\`${language}\n${sourceContent}\n\`\`\`\n\n` +
        `Existing tests:\n${testNames}\n\n` +
        `Suggest additional tests that are missing. Consider:\n` +
        `- Uncovered functions/methods\n` +
        `- Edge cases not tested\n` +
        `- Error scenarios not covered\n` +
        `- Integration points\n\n` +
        `Return a list of test descriptions, one per line.`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.6);

      return this.parseTestSuggestions(response);
    } catch (error) {
      console.error('[AI Test Generator] Error suggesting tests:', error);
      return [];
    }
  }

  /**
   * Generate test data/fixtures
   */
  async generateTestData(
    dataType: string,
    schema: any,
    count: number = 10
  ): Promise<any[]> {
    try {
      const prompt = `Generate ${count} realistic test data samples for:\n\n` +
        `Type: ${dataType}\n` +
        `Schema: ${JSON.stringify(schema, null, 2)}\n\n` +
        `Requirements:\n` +
        `- Realistic values\n` +
        `- Diverse data (edge cases, normal cases)\n` +
        `- Valid according to schema\n\n` +
        `Return as JSON array.`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.7);

      return this.parseTestData(response);
    } catch (error) {
      console.error('[AI Test Generator] Error generating test data:', error);
      return [];
    }
  }

  /**
   * Analyze test quality
   */
  async analyzeTestQuality(
    testCode: string,
    language: string
  ): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }> {
    try {
      const prompt = `Analyze the quality of these ${language} tests:\n\n` +
        `\`\`\`${language}\n${testCode}\n\`\`\`\n\n` +
        `Evaluate:\n` +
        `1. Coverage (edge cases, error cases)\n` +
        `2. Assertions (clear, specific)\n` +
        `3. Test structure (arrange, act, assert)\n` +
        `4. Readability\n` +
        `5. Maintainability\n\n` +
        `Provide:\n` +
        `- Quality score (0-100)\n` +
        `- Strengths\n` +
        `- Weaknesses\n` +
        `- Improvement suggestions`;

      const response = await this.callChatOrchestrator(prompt, 'Coder', 0.3);

      return this.parseQualityAnalysis(response);
    } catch (error) {
      console.error('[AI Test Generator] Error analyzing test quality:', error);
      return {
        score: 0,
        strengths: [],
        weaknesses: [],
        suggestions: [],
      };
    }
  }

  /**
   * Build test generation prompt
   */
  private buildTestGenerationPrompt(
    filePath: string,
    fileContent: string,
    language: string,
    options: TestGenerationOptions
  ): string {
    let prompt = `Generate comprehensive ${options.framework} tests for this ${language} file:\n\n`;
    prompt += `File: ${filePath}\n\n`;
    prompt += `\`\`\`${language}\n${fileContent}\n\`\`\`\n\n`;
    prompt += `Requirements:\n`;
    prompt += `- Framework: ${options.framework}\n`;
    prompt += `- Test style: ${options.style || 'unit'}\n`;
    
    if (options.includeEdgeCases !== false) {
      prompt += `- Include edge cases (empty, null, boundary values)\n`;
    }
    
    if (options.includeErrorHandling !== false) {
      prompt += `- Include error handling tests\n`;
    }
    
    if (options.includeIntegrationTests) {
      prompt += `- Include integration tests\n`;
    }
    
    if (options.coverageTarget) {
      prompt += `- Target coverage: ${options.coverageTarget}%\n`;
    }

    prompt += `\nGenerate complete, runnable tests with:\n`;
    prompt += `1. Test suite structure\n`;
    prompt += `2. Setup/teardown if needed\n`;
    prompt += `3. Individual test cases\n`;
    prompt += `4. Clear assertions\n`;
    prompt += `5. Descriptive test names\n\n`;
    prompt += `Return only the test code, properly formatted.`;

    return prompt;
  }

  /**
   * Build coverage test prompt
   */
  private buildCoverageTestPrompt(
    filePath: string,
    fileContent: string,
    uncoveredLines: number[],
    uncoveredBranches: number[],
    options: TestGenerationOptions
  ): string {
    let prompt = `Generate tests to improve coverage for this file:\n\n`;
    prompt += `File: ${filePath}\n\n`;
    prompt += `\`\`\`\n${fileContent}\n\`\`\`\n\n`;
    prompt += `Uncovered lines: ${uncoveredLines.join(', ')}\n`;
    prompt += `Uncovered branches: ${uncoveredBranches.join(', ')}\n\n`;
    prompt += `Generate ${options.framework} tests that specifically cover these lines and branches.\n`;
    prompt += `Focus on:\n`;
    prompt += `1. Executing uncovered code paths\n`;
    prompt += `2. Testing all branch conditions\n`;
    prompt += `3. Edge cases that trigger uncovered code\n\n`;
    prompt += `Return only the test code.`;

    return prompt;
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
        maxTokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat Orchestrator error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  /**
   * Parse generated tests
   */
  private parseGeneratedTests(
    response: string,
    filePath: string,
    framework: string
  ): GeneratedTest {
    const code = this.extractCodeFromResponse(response, framework);
    const testCount = this.countTests(code, framework);

    return {
      fileName: this.getTestFileName(filePath, framework),
      content: code,
      description: `Generated ${testCount} tests for ${filePath}`,
      testCount,
      estimatedCoverage: Math.min(testCount * 10, 90),
    };
  }

  /**
   * Extract code from response
   */
  private extractCodeFromResponse(response: string, language: string): string {
    const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?\\n([\\s\\S]*?)\\n\`\`\``, 'g');
    const matches = [...response.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      return matches.map(m => m[1]).join('\n\n');
    }

    return response;
  }

  /**
   * Count tests in code
   */
  private countTests(code: string, framework: string): number {
    let pattern: RegExp;

    switch (framework) {
      case 'jest':
        pattern = /\b(test|it)\s*\(/g;
        break;
      case 'pytest':
        pattern = /\bdef\s+test_\w+/g;
        break;
      case 'go-test':
        pattern = /\bfunc\s+Test\w+/g;
        break;
      case 'junit':
        pattern = /@Test/g;
        break;
      default:
        pattern = /test/gi;
    }

    const matches = code.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Get test file name
   */
  private getTestFileName(filePath: string, framework: string): string {
    const baseName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'test';

    switch (framework) {
      case 'jest':
        return `${baseName}.test.ts`;
      case 'pytest':
        return `test_${baseName}.py`;
      case 'go-test':
        return `${baseName}_test.go`;
      case 'junit':
        return `${baseName}Test.java`;
      default:
        return `${baseName}.test`;
    }
  }

  /**
   * Parse test suggestions
   */
  private parseTestSuggestions(response: string): string[] {
    const lines = response.split('\n');
    const suggestions: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
        // Remove bullet points and numbering
        const cleaned = trimmed.replace(/^[-*\d.)\]]\s*/, '');
        if (cleaned) {
          suggestions.push(cleaned);
        }
      }
    }

    return suggestions;
  }

  /**
   * Parse test data
   */
  private parseTestData(response: string): any[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[AI Test Generator] Error parsing test data:', error);
    }
    return [];
  }

  /**
   * Parse quality analysis
   */
  private parseQualityAnalysis(response: string): {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } {
    const result = {
      score: 0,
      strengths: [] as string[],
      weaknesses: [] as string[],
      suggestions: [] as string[],
    };

    // Extract score
    const scoreMatch = response.match(/score[:\s]+(\d+)/i);
    if (scoreMatch) {
      result.score = parseInt(scoreMatch[1]);
    }

    // Extract sections
    const strengthsMatch = response.match(/strengths?[:\s]+([\s\S]*?)(?=weaknesses?|suggestions?|$)/i);
    if (strengthsMatch) {
      result.strengths = this.extractListItems(strengthsMatch[1]);
    }

    const weaknessesMatch = response.match(/weaknesses?[:\s]+([\s\S]*?)(?=suggestions?|$)/i);
    if (weaknessesMatch) {
      result.weaknesses = this.extractListItems(weaknessesMatch[1]);
    }

    const suggestionsMatch = response.match(/suggestions?[:\s]+([\s\S]*?)$/i);
    if (suggestionsMatch) {
      result.suggestions = this.extractListItems(suggestionsMatch[1]);
    }

    return result;
  }

  /**
   * Extract list items from text
   */
  private extractListItems(text: string): string[] {
    const lines = text.split('\n');
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.match(/^[-*\d.)\]]/)) {
        const cleaned = trimmed.replace(/^[-*\d.)\]]\s*/, '');
        if (cleaned) {
          items.push(cleaned);
        }
      }
    }

    return items;
  }
}

// Singleton instance
let aiTestGeneratorInstance: AITestGenerator | null = null;

export function getAITestGenerator(): AITestGenerator {
  if (!aiTestGeneratorInstance) {
    aiTestGeneratorInstance = new AITestGenerator();
  }
  return aiTestGeneratorInstance;
}
