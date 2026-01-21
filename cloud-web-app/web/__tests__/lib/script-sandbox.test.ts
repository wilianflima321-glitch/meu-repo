/**
 * Script Sandbox Tests
 * 
 * Testes de segurança e funcionalidade do sandbox de scripts.
 * CRÍTICO: Verifica isolamento de execução e prevenção de ataques.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ScriptSandbox,
  SandboxConfig,
  SandboxResult,
  validateScript,
  sanitizeOutput,
  DANGEROUS_PATTERNS,
} from '@/lib/sandbox/script-sandbox';

// Mock Web Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messageHandler: ((data: any) => void) | null = null;

  constructor(url: string | URL) {}

  postMessage(data: any) {
    if (this.messageHandler) {
      setTimeout(() => this.messageHandler!(data), 10);
    }
  }

  terminate() {}

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(message: string) {
    if (this.onerror) {
      const error = new ErrorEvent('error', { message });
      this.onerror(error);
    }
  }
}

(global as any).Worker = MockWorker;

describe('ScriptSandbox', () => {
  let sandbox: ScriptSandbox;

  beforeEach(() => {
    sandbox = new ScriptSandbox({
      timeout: 5000,
      memoryLimit: 50 * 1024 * 1024,
      allowedAPIs: ['console', 'math', 'json'],
      globals: {},
      mode: 'strict',
    });
  });

  afterEach(() => {
    sandbox.dispose();
  });

  describe('validateScript', () => {
    it('should reject scripts with eval', () => {
      const result = validateScript('eval("dangerous code")');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('eval');
    });

    it('should reject scripts with Function constructor', () => {
      const result = validateScript('new Function("return 1")');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Function');
    });

    it('should reject scripts accessing window', () => {
      const result = validateScript('window.location.href');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('window');
    });

    it('should reject scripts accessing document', () => {
      const result = validateScript('document.cookie');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('document');
    });

    it('should reject scripts with __proto__', () => {
      const result = validateScript('obj.__proto__.polluted = true');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('proto');
    });

    it('should reject scripts with fetch', () => {
      const result = validateScript('fetch("https://evil.com")');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('fetch');
    });

    it('should reject scripts with require', () => {
      const result = validateScript('require("fs")');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('require');
    });

    it('should reject scripts with import()', () => {
      const result = validateScript('import("./module")');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('import');
    });

    it('should reject scripts accessing localStorage', () => {
      const result = validateScript('localStorage.getItem("token")');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('localStorage');
    });

    it('should accept safe scripts', () => {
      const result = validateScript('const x = 1 + 2; console.log(x);');
      expect(result.valid).toBe(true);
    });

    it('should accept scripts using Math', () => {
      const result = validateScript('Math.sqrt(16)');
      expect(result.valid).toBe(true);
    });

    it('should accept scripts using JSON', () => {
      const result = validateScript('JSON.stringify({ a: 1 })');
      expect(result.valid).toBe(true);
    });

    it('should accept array operations', () => {
      const result = validateScript('[1,2,3].map(x => x * 2)');
      expect(result.valid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute simple arithmetic', async () => {
      // Mock worker response
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers && workers.length > 0) {
          workers[0].simulateMessage({
            type: 'result',
            payload: {
              success: true,
              result: 42,
              executionTime: 5,
              memoryUsed: 1024,
              logs: [],
            },
          });
        }
      }, 50);

      const result = await sandbox.execute('21 * 2');
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
    });

    it('should capture console.log output', async () => {
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateMessage({
            type: 'result',
            payload: {
              success: true,
              result: undefined,
              logs: [
                { level: 'log', message: 'Hello', timestamp: Date.now() },
              ],
            },
          });
        }
      }, 50);

      const result = await sandbox.execute('console.log("Hello")');
      
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].message).toBe('Hello');
    });

    it('should timeout on infinite loops', async () => {
      sandbox = new ScriptSandbox({
        timeout: 100,
        memoryLimit: 50 * 1024 * 1024,
        allowedAPIs: ['console'],
        globals: {},
        mode: 'strict',
      });

      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateMessage({
            type: 'timeout',
            payload: { error: 'Execution timed out after 100ms' },
          });
        }
      }, 150);

      const result = await sandbox.execute('while(true) {}');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should reject dangerous scripts before execution', async () => {
      const result = await sandbox.execute('eval("1+1")');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('eval');
    });

    it('should return execution time', async () => {
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateMessage({
            type: 'result',
            payload: {
              success: true,
              result: 1,
              executionTime: 15,
              memoryUsed: 2048,
              logs: [],
            },
          });
        }
      }, 50);

      const result = await sandbox.execute('1');
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should return memory usage', async () => {
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateMessage({
            type: 'result',
            payload: {
              success: true,
              result: [],
              executionTime: 10,
              memoryUsed: 1024 * 1024,
              logs: [],
            },
          });
        }
      }, 50);

      const result = await sandbox.execute('new Array(1000)');
      
      expect(result.memoryUsed).toBeGreaterThan(0);
    });
  });

  describe('Aethel Game APIs', () => {
    beforeEach(() => {
      sandbox = new ScriptSandbox({
        timeout: 5000,
        memoryLimit: 50 * 1024 * 1024,
        allowedAPIs: ['console', 'aethel-game'],
        globals: {
          player: { x: 0, y: 0, health: 100 },
        },
        mode: 'strict',
      });
    });

    it('should allow accessing injected globals', async () => {
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateMessage({
            type: 'result',
            payload: {
              success: true,
              result: 100,
              executionTime: 5,
              memoryUsed: 512,
              logs: [],
            },
          });
        }
      }, 50);

      const result = await sandbox.execute('player.health');
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(100);
    });

    it('should allow Aethel game API calls', async () => {
      const script = `
        Aethel.Entity.spawn('enemy', { x: 10, y: 20 });
        Aethel.Player.move(5, 0);
      `;

      const validationResult = validateScript(script);
      expect(validationResult.valid).toBe(true);
    });
  });

  describe('sanitizeOutput', () => {
    it('should sanitize circular references', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      
      const sanitized = sanitizeOutput(obj);
      
      expect(sanitized.self).toBe('[Circular]');
    });

    it('should truncate very long strings', () => {
      const longString = 'x'.repeat(100000);
      
      const sanitized = sanitizeOutput(longString);
      
      expect(sanitized.length).toBeLessThan(100000);
      expect(sanitized).toContain('[truncated]');
    });

    it('should sanitize functions', () => {
      const obj = {
        fn: () => 'secret',
        value: 42,
      };
      
      const sanitized = sanitizeOutput(obj);
      
      expect(sanitized.fn).toBe('[Function]');
      expect(sanitized.value).toBe(42);
    });

    it('should preserve arrays', () => {
      const arr = [1, 2, 3];
      
      const sanitized = sanitizeOutput(arr);
      
      expect(Array.isArray(sanitized)).toBe(true);
      expect(sanitized).toEqual([1, 2, 3]);
    });

    it('should sanitize undefined', () => {
      const sanitized = sanitizeOutput(undefined);
      expect(sanitized).toBeUndefined();
    });

    it('should sanitize null', () => {
      const sanitized = sanitizeOutput(null);
      expect(sanitized).toBeNull();
    });

    it('should sanitize nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };
      
      const sanitized = sanitizeOutput(obj);
      
      expect(sanitized.level1.level2.level3.value).toBe('deep');
    });

    it('should limit nesting depth', () => {
      let obj: any = { value: 'root' };
      for (let i = 0; i < 100; i++) {
        obj = { nested: obj };
      }
      
      const sanitized = sanitizeOutput(obj, { maxDepth: 10 });
      
      // Should not throw and should have limited depth
      expect(sanitized).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    describe('Prototype Pollution Prevention', () => {
      it('should block direct prototype access', async () => {
        const scripts = [
          '({}).__proto__.polluted = true',
          'Object.prototype.polluted = true',
          '([]).__proto__.polluted = true',
          'Array.prototype.polluted = true',
          'constructor.constructor("return 1")()',
        ];

        for (const script of scripts) {
          const result = validateScript(script);
          expect(result.valid).toBe(false);
        }
      });

      it('should block constructor access tricks', async () => {
        const scripts = [
          '"".constructor.constructor("alert(1)")()',
          '[].constructor.constructor("alert(1)")()',
          '({}).constructor.constructor("alert(1)")()',
        ];

        for (const script of scripts) {
          const result = validateScript(script);
          expect(result.valid).toBe(false);
        }
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize HTML in output', () => {
        const output = '<script>alert(1)</script>';
        const sanitized = sanitizeOutput(output);
        
        expect(sanitized).not.toContain('<script>');
      });

      it('should sanitize event handlers in output', () => {
        const output = '<img onerror="alert(1)">';
        const sanitized = sanitizeOutput(output);
        
        expect(sanitized).not.toContain('onerror');
      });
    });

    describe('Resource Exhaustion Prevention', () => {
      it('should limit output size', () => {
        const hugeArray = new Array(1000000).fill('x');
        const sanitized = sanitizeOutput(hugeArray, { maxSize: 1024 * 1024 });
        
        expect(JSON.stringify(sanitized).length).toBeLessThanOrEqual(1024 * 1024);
      });

      it('should limit array length in output', () => {
        const hugeArray = new Array(100000).fill(1);
        const sanitized = sanitizeOutput(hugeArray, { maxArrayLength: 1000 });
        
        expect(sanitized.length).toBeLessThanOrEqual(1001); // +1 for truncation marker
      });
    });

    describe('Information Disclosure Prevention', () => {
      it('should not expose environment variables', async () => {
        const result = validateScript('process.env.SECRET');
        expect(result.valid).toBe(false);
      });

      it('should not expose file system', async () => {
        const scripts = [
          'require("fs").readFileSync("/etc/passwd")',
          '__dirname',
          '__filename',
        ];

        for (const script of scripts) {
          const result = validateScript(script);
          expect(result.valid).toBe(false);
        }
      });

      it('should not expose network', async () => {
        const scripts = [
          'fetch("https://attacker.com")',
          'new XMLHttpRequest()',
          'new WebSocket("wss://attacker.com")',
        ];

        for (const script of scripts) {
          const result = validateScript(script);
          expect(result.valid).toBe(false);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', async () => {
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateMessage({
            type: 'error',
            payload: { error: 'SyntaxError: Unexpected token' },
          });
        }
      }, 50);

      const result = await sandbox.execute('function {');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Syntax');
    });

    it('should handle runtime errors gracefully', async () => {
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateMessage({
            type: 'error',
            payload: { error: 'ReferenceError: x is not defined' },
          });
        }
      }, 50);

      const result = await sandbox.execute('x.undefined.access');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle worker crash', async () => {
      setTimeout(() => {
        const workers = (sandbox as any).workers;
        if (workers?.[0]) {
          workers[0].simulateError('Worker crashed');
        }
      }, 50);

      const result = await sandbox.execute('some code');
      
      expect(result.success).toBe(false);
    });
  });

  describe('Dangerous Patterns Coverage', () => {
    it('should block all defined dangerous patterns', () => {
      const testCases = [
        { pattern: '__proto__', code: 'obj.__proto__' },
        { pattern: 'constructor', code: 'x.constructor[0]' },
        { pattern: 'prototype', code: 'Array.prototype[0]' },
        { pattern: 'eval', code: 'eval("code")' },
        { pattern: 'Function', code: 'new Function("x")' },
        { pattern: 'document', code: 'document.body' },
        { pattern: 'window', code: 'window.alert' },
        { pattern: 'globalThis', code: 'globalThis.x' },
        { pattern: 'self', code: 'self.postMessage' },
        { pattern: 'require', code: 'require("x")' },
        { pattern: 'import', code: 'import("x")' },
        { pattern: 'process', code: 'process.exit()' },
        { pattern: '__dirname', code: '__dirname' },
        { pattern: '__filename', code: '__filename' },
        { pattern: 'fetch', code: 'fetch(url)' },
        { pattern: 'XMLHttpRequest', code: 'new XMLHttpRequest()' },
        { pattern: 'WebSocket', code: 'new WebSocket(url)' },
        { pattern: 'localStorage', code: 'localStorage.x' },
      ];

      for (const { pattern, code } of testCases) {
        const result = validateScript(code);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('dispose', () => {
    it('should terminate all workers on dispose', () => {
      const terminateSpy = vi.fn();
      (sandbox as any).workers = [
        { terminate: terminateSpy },
        { terminate: terminateSpy },
      ];

      sandbox.dispose();

      expect(terminateSpy).toHaveBeenCalledTimes(2);
    });

    it('should reject new executions after dispose', async () => {
      sandbox.dispose();

      const result = await sandbox.execute('1 + 1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('disposed');
    });
  });
});
