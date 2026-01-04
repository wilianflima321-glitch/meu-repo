/**
 * Debug Integration Tests
 * End-to-end tests for debugging features with DAP and AI
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getDebugIntegration, resetDebugIntegration } from '../../lib/integration';

describe('Debug Integration', () => {
  let debug: ReturnType<typeof getDebugIntegration>;

  beforeEach(() => {
    resetDebugIntegration();

    let sessionSeq = 0;

    globalThis.fetch = jest.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url ?? input);

      const okJson = (value: any) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => value,
      });

      // Start/stop adapter
      if (url.includes('/api/dap/start')) {

        sessionSeq += 1;
        return okJson({ sessionId: `sess-${sessionSeq}` });
      }
      if (url.includes('/api/dap/stop/')) {
        return okJson({});
      }

      // Generic request endpoint
      if (url.includes('/api/dap/request/')) {
        const bodyRaw = init?.body ? JSON.parse(init.body) : {};
        const command = bodyRaw?.command;

        let responseBody: any = {};
        if (command === 'stackTrace') {
          responseBody = {
            stackFrames: [
              { id: 1, name: 'main', source: { path: '/test/app.js' }, line: 10, column: 1 },
            ],
          };
        } else if (command === 'scopes') {
          responseBody = { scopes: [{ name: 'Locals', variablesReference: 1 }] };
        } else if (command === 'variables') {
          responseBody = { variables: [{ name: 'x', value: '1', type: 'number', variablesReference: 0 }] };
        } else if (command === 'evaluate') {
          responseBody = { result: '2', variablesReference: 0 };
        } else if (command === 'setBreakpoints') {
          const requested = bodyRaw?.arguments?.breakpoints ?? [];
          responseBody = { breakpoints: requested.map(() => ({ verified: true })) };
        }

        return okJson({ success: true, body: responseBody });
      }

      // Fallback: não deixa a suíte explodir por URLs inesperadas.
      return okJson({});
    }) as any;

    debug = getDebugIntegration();
  });

  afterEach(async () => {
    // Clean up any active sessions
    const sessions = debug.getSessions();
    for (const session of sessions) {
      try {
        await debug.stopSession(session.id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('Session Management', () => {
    it('should start debug session', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      
      expect(session).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.type).toBe('node');
      expect(session.status).toBe('running');
    });

    it('should stop debug session', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      await debug.stopSession(session.id);
      
      const sessions = debug.getSessions();
      expect(sessions).toHaveLength(0);
    });

    it('should get active sessions', async () => {
      const config1 = {
        type: 'node',
        request: 'launch' as const,
        name: 'Session 1',
        program: '/test/app1.js',
      };

      const config2 = {
        type: 'node',
        request: 'launch' as const,
        name: 'Session 2',
        program: '/test/app2.js',
      };

      await debug.startSession(config1);
      await debug.startSession(config2);

      const sessions = debug.getSessions();
      expect(sessions).toHaveLength(2);
    });
  });

  describe('Breakpoints', () => {
    it('should set breakpoints', async () => {
      const breakpoints = [
        {
          id: 'bp1',
          file: '/test/app.js',
          line: 10,
          verified: false,
        },
        {
          id: 'bp2',
          file: '/test/app.js',
          line: 20,
          condition: 'x > 5',
          verified: false,
        },
      ];

      const result = await debug.setBreakpoints('/test/app.js', breakpoints);
      
      expect(result).toHaveLength(2);
      expect(result[0].line).toBe(10);
      expect(result[1].condition).toBe('x > 5');
    });

    it('should get breakpoints', async () => {
      const breakpoints = [
        {
          id: 'bp1',
          file: '/test/app.js',
          line: 10,
          verified: false,
        },
      ];

      await debug.setBreakpoints('/test/app.js', breakpoints);
      
      const result = debug.getBreakpoints('/test/app.js');
      expect(result).toHaveLength(1);
      expect(result[0].line).toBe(10);
    });

    it('should get all breakpoints', async () => {
      await debug.setBreakpoints('/test/app1.js', [
        { id: 'bp1', file: '/test/app1.js', line: 10, verified: false },
      ]);

      await debug.setBreakpoints('/test/app2.js', [
        { id: 'bp2', file: '/test/app2.js', line: 20, verified: false },
      ]);

      const all = debug.getBreakpoints();
      expect(all).toHaveLength(2);
    });
  });

  describe('Execution Control', () => {
    it('should continue execution', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      
      // Simulate stopped state
      debug.onStopped(session.id, 1, 'breakpoint');
      
      await debug.continue(session.id);
      
      const updatedSession = debug.getSession(session.id);
      expect(updatedSession?.status).toBe('running');
    });

    it('should pause execution', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      
      // Set thread ID
      debug.onStopped(session.id, 1, 'breakpoint');
      debug.onContinued(session.id);
      
      await debug.pause(session.id);
      
      const updatedSession = debug.getSession(session.id);
      expect(updatedSession?.status).toBe('stopped');
    });

    it('should step over', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      await expect(debug.stepOver(session.id)).resolves.not.toThrow();
    });

    it('should step into', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      await expect(debug.stepInto(session.id)).resolves.not.toThrow();
    });

    it('should step out', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      await expect(debug.stepOut(session.id)).resolves.not.toThrow();
    });
  });

  describe('Stack and Variables', () => {
    it('should get stack trace', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      const stackTrace = await debug.getStackTrace(session.id);
      
      expect(stackTrace).toBeDefined();
      expect(Array.isArray(stackTrace)).toBe(true);
    });

    it('should get variables', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      const variables = await debug.getVariables(session.id, 0);
      
      expect(variables).toBeDefined();
      expect(Array.isArray(variables)).toBe(true);
    });

    it('should evaluate expression', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      const result = await debug.evaluate(session.id, '1 + 1');
      
      expect(result).toBeDefined();
    });
  });

  describe('AI Features', () => {
    it('should get AI analysis', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      try {
        const analysis = await debug.getAIAnalysis(session.id);
        
        expect(analysis).toBeDefined();
        expect(analysis.analysis).toBeDefined();
        expect(analysis.possibleCauses).toBeDefined();
        expect(analysis.suggestions).toBeDefined();
      } catch (error: any) {
        // AI may not be available or consent not given
        expect(error.message).toContain('consent');
      }
    });

    it('should get AI suggestions', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      try {
        const suggestions = await debug.getAISuggestions(session.id);
        
        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions)).toBe(true);
      } catch (error: any) {
        // AI may not be available or consent not given
        expect(error.message).toContain('consent');
      }
    });
  });

  describe('Event Handlers', () => {
    it('should handle stopped event', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      
      debug.onStopped(session.id, 1, 'breakpoint');
      
      const updatedSession = debug.getSession(session.id);
      expect(updatedSession?.status).toBe('stopped');
      expect(updatedSession?.threadId).toBe(1);
    });

    it('should handle continued event', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      debug.onStopped(session.id, 1, 'breakpoint');
      
      debug.onContinued(session.id);
      
      const updatedSession = debug.getSession(session.id);
      expect(updatedSession?.status).toBe('running');
    });

    it('should handle terminated event', async () => {
      const config = {
        type: 'node',
        request: 'launch' as const,
        name: 'Test Session',
        program: '/test/app.js',
      };

      const session = await debug.startSession(config);
      
      debug.onTerminated(session.id);
      
      const updatedSession = debug.getSession(session.id);
      expect(updatedSession?.status).toBe('terminated');
    });
  });
});
