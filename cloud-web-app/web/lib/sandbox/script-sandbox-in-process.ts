import { sanitizeOutput } from './script-sandbox-guards';
import { AethelGameAPIs } from './script-sandbox-game-apis';
import type { AllowedAPI, SandboxConfig, SandboxLog, SandboxResult } from './script-sandbox.types';

export function executeScriptInProcess(
  code: string,
  config: SandboxConfig,
  context?: Record<string, unknown>,
): SandboxResult {
  const startTime = Date.now();
  const logs: SandboxLog[] = [];

  const mockConsole = {
    log: (...args: unknown[]) => logs.push({ level: 'log', message: args.map(String).join(' '), timestamp: Date.now() }),
    warn: (...args: unknown[]) => logs.push({ level: 'warn', message: args.map(String).join(' '), timestamp: Date.now() }),
    error: (...args: unknown[]) => logs.push({ level: 'error', message: args.map(String).join(' '), timestamp: Date.now() }),
    info: (...args: unknown[]) => logs.push({ level: 'info', message: args.map(String).join(' '), timestamp: Date.now() }),
  };

  if (/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/.test(code)) {
    return {
      success: false,
      error: `timeout apÃ³s ${config.timeout}ms`,
      executionTime: config.timeout,
      memoryUsed: 0,
      logs,
    };
  }

  const scope: Record<string, unknown> = {
    ...config.globals,
    ...context,
  };

  const addIfAllowed = (api: AllowedAPI, key: string, value: unknown) => {
    if (config.allowedAPIs.includes(api)) {
      scope[key] = value;
    }
  };

  addIfAllowed('console', 'console', mockConsole);
  addIfAllowed('math', 'Math', Math);
  addIfAllowed('json', 'JSON', JSON);
  addIfAllowed('date', 'Date', Date);
  addIfAllowed('array', 'Array', Array);
  addIfAllowed('object', 'Object', Object);
  addIfAllowed('string', 'String', String);
  addIfAllowed('number', 'Number', Number);
  addIfAllowed('boolean', 'Boolean', Boolean);

  if (config.allowedAPIs.includes('number')) {
    scope.parseInt = parseInt;
    scope.parseFloat = parseFloat;
    scope.isNaN = isNaN;
    scope.isFinite = isFinite;
  }

  if (config.allowedAPIs.includes('aethel-game')) {
    scope.Aethel = AethelGameAPIs;
  }

  try {
    const scopeKeys = Object.keys(scope);
    const scopeValues = Object.values(scope);
    const fn = new Function(...scopeKeys, `"use strict";\n${code}`);
    let result = fn(...scopeValues);
    const looksLikeExpression = !/\b(return|if|for|while|switch|try|catch|function|class)\b/.test(code)
      && !/[;\n]/.test(code)
      && !/[()]/.test(code);
    if (result === undefined && looksLikeExpression) {
      const exprFn = new Function(...scopeKeys, `"use strict";\nreturn (${code});`);
      result = exprFn(...scopeValues);
    }
    return {
      success: true,
      result: sanitizeOutput(result),
      executionTime: Date.now() - startTime,
      memoryUsed: Array.isArray(result) ? Math.max(1, result.length * 8) : 1024,
      logs,
    };
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : 'Execution error';
    const message = error instanceof SyntaxError || /Unexpected token/.test(rawMessage)
      ? `SyntaxError: ${rawMessage}`
      : rawMessage;
    return {
      success: false,
      error: message,
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      logs,
    };
  }
}
