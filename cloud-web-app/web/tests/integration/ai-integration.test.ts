/**
 * AI Integration Tests
 * End-to-end tests for AI features
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getAIApiClient } from '../../lib/api/index';

describe('AI Integration', () => {
  let aiClient: ReturnType<typeof getAIApiClient>;

  beforeEach(() => {
    // Esses testes rodam via Jest (sem servidor Next rodando). Portanto,
    // mockamos fetch para simular respostas das rotas /api/ai/*.
    globalThis.fetch = jest.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : String(input?.url ?? input);

      const json = async () => {
        if (url.includes('/completions')) {
          return {
            completions: [
              { text: 'x', confidence: 0.9, documentation: 'test' },
              { text: 'y', confidence: 0.7 },
            ],
          };
        }
        if (url.includes('/hover')) {
          return { content: 'hover', examples: ['ex1', 'ex2'], relatedSymbols: ['a', 'b'] };
        }
        if (url.includes('/code-actions')) {
          return { actions: [{ title: 'Fix', kind: 'quickfix' }] };
        }
        if (url.includes('/debug/analyze')) {
          return { analysis: 'analysis', possibleCauses: ['cause'], suggestions: ['suggestion'] };
        }
        if (url.includes('/tests/generate')) {
          return { tests: 'describe("x", () => {})', coverage: { lines: 90, branches: 80, functions: 85 } };
        }
        if (url.includes('/git/commit-message')) {
          return { message: 'feat: test', alternatives: ['chore: test'] };
        }
        if (url.includes('/git/review')) {
          return { comments: [{ line: 1, severity: 'info', message: 'ok' }], summary: 'summary', score: 8 };
        }
        if (url.includes('/git/resolve-conflict')) {
          return { resolution: 'resolved', explanation: 'explanation', confidence: 0.9 };
        }
        if (url.includes('/model/info')) {
          return { name: 'test-model' };
        }
        if (url.includes('/usage/stats')) {
          return { requests: 1 };
        }
        return {};
      };

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json,
      } as any;
    }) as any;

    aiClient = getAIApiClient();
    // Grant consent for tests
    aiClient.setConsent(true);
  });

  describe('Consent Management', () => {
    it('should set consent', () => {
      aiClient.setConsent(true);
      expect(aiClient.getConsent()).toBe(true);

      aiClient.setConsent(false);
      expect(aiClient.getConsent()).toBe(false);
    });

    it('should throw error without consent', async () => {
      aiClient.setConsent(false);

      await expect(
        aiClient.getCompletions({
          language: 'typescript',
          code: 'const x = ',
          position: { line: 0, character: 10 },
        })
      ).rejects.toThrow('consent');
    });
  });

  describe('Completions', () => {
    it('should get AI completions', async () => {
      const response = await aiClient.getCompletions({
        language: 'typescript',
        code: 'const x = ',
        position: { line: 0, character: 10 },
      });

      expect(response).toBeDefined();
      expect(response.completions).toBeDefined();
      expect(Array.isArray(response.completions)).toBe(true);
    });

    it('should include confidence scores', async () => {
      const response = await aiClient.getCompletions({
        language: 'typescript',
        code: 'const x = ',
        position: { line: 0, character: 10 },
      });

      if (response.completions.length > 0) {
        expect(response.completions[0].confidence).toBeDefined();
        expect(typeof response.completions[0].confidence).toBe('number');
      }
    });
  });

  describe('Hover', () => {
    it('should get AI hover information', async () => {
      const response = await aiClient.getHover({
        language: 'typescript',
        code: 'const x = 1;',
        position: { line: 0, character: 6 },
        symbol: 'x',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should include examples', async () => {
      const response = await aiClient.getHover({
        language: 'typescript',
        code: 'const x = 1;',
        position: { line: 0, character: 6 },
        symbol: 'x',
      });

      if (response.examples) {
        expect(Array.isArray(response.examples)).toBe(true);
      }
    });
  });

  describe('Code Actions', () => {
    it('should get AI code actions', async () => {
      const response = await aiClient.getCodeActions({
        language: 'typescript',
        code: 'const x = 1;',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 12 },
        },
      });

      expect(response).toBeDefined();
      expect(response.actions).toBeDefined();
      expect(Array.isArray(response.actions)).toBe(true);
    });
  });

  describe('Debug Analysis', () => {
    it('should analyze debug state', async () => {
      const response = await aiClient.analyzeDebugState({
        language: 'typescript',
        stackTrace: 'Error at line 10\n  at function foo',
        variables: { x: 1, y: 2 },
      });

      expect(response).toBeDefined();
      expect(response.analysis).toBeDefined();
      expect(response.possibleCauses).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });
  });

  describe('Test Generation', () => {
    it('should generate tests', async () => {
      const response = await aiClient.generateTests({
        language: 'typescript',
        code: 'function add(a: number, b: number) { return a + b; }',
        functionName: 'add',
        testFramework: 'jest',
      });

      expect(response).toBeDefined();
      expect(response.tests).toBeDefined();
      expect(response.coverage).toBeDefined();
    });

    it('should include coverage metrics', async () => {
      const response = await aiClient.generateTests({
        language: 'typescript',
        code: 'function add(a: number, b: number) { return a + b; }',
      });

      expect(response.coverage.lines).toBeDefined();
      expect(response.coverage.branches).toBeDefined();
      expect(response.coverage.functions).toBeDefined();
    });
  });

  describe('Git Features', () => {
    it('should generate commit message', async () => {
      const response = await aiClient.generateCommitMessage({
        diff: '+const x = 1;\n-const x = 2;',
      });

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should review code', async () => {
      const response = await aiClient.reviewCode({
        diff: '+const x = 1;',
        language: 'typescript',
      });

      expect(response).toBeDefined();
      expect(response.comments).toBeDefined();
      expect(response.summary).toBeDefined();
      expect(response.score).toBeDefined();
    });

    it('should resolve conflicts', async () => {
      const response = await aiClient.resolveConflict({
        baseContent: 'const x = 0;',
        currentContent: 'const x = 1;',
        incomingContent: 'const x = 2;',
        filePath: '/test/file.ts',
      });

      expect(response).toBeDefined();
      expect(response.resolution).toBeDefined();
      expect(response.explanation).toBeDefined();
      expect(response.confidence).toBeDefined();
    });
  });

  describe('Model Info', () => {
    it('should get model information', async () => {
      const info = await aiClient.getModelInfo();

      expect(info).toBeDefined();
    });
  });

  describe('Usage Stats', () => {
    it('should get usage statistics', async () => {
      const stats = await aiClient.getUsageStats();

      expect(stats).toBeDefined();
    });
  });
});
