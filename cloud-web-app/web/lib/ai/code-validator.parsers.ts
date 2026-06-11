import type { ValidationError, ValidationResult } from './code-validator.contracts';

export type ESLintParseResult = {
  errors: ValidationError[];
  warnings: ValidationError[];
  autoFixable: ValidationError[];
};

export function createValidationSummary(
  errors: ValidationError[],
  warnings: ValidationError[],
): ValidationResult['summary'] {
  return {
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    lintErrors: errors.filter(error => error.type === 'lint').length,
    tsErrors: errors.filter(error => error.type === 'typescript').length,
    testFailures: errors.filter(error => error.type === 'test').length,
  };
}

export function parseESLintJsonResults(stdout: string, includeFixes = false): ESLintParseResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const autoFixable: ValidationError[] = [];

  const results = JSON.parse(stdout || '[]') as Array<{
    filePath: string;
    messages?: Array<{
      severity: number;
      message: string;
      line?: number;
      column?: number;
      ruleId?: string;
      fix?: unknown;
    }>;
  }>;

  for (const result of results) {
    for (const msg of result.messages || []) {
      const error: ValidationError = {
        type: 'lint',
        severity: msg.severity === 2 ? 'error' : 'warning',
        message: msg.message,
        file: result.filePath,
        line: msg.line,
        column: msg.column,
        rule: msg.ruleId,
        suggestion: includeFixes && msg.fix ? 'Auto-fixable' : undefined,
      };

      if (msg.severity === 2) {
        errors.push(error);
      } else {
        warnings.push(error);
      }

      if (includeFixes && msg.fix) {
        autoFixable.push(error);
      }
    }
  }

  return { errors, warnings, autoFixable };
}

export function parseTypeScriptDiagnostics(output: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const errorPattern = /(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)/g;
  let match: RegExpExecArray | null;

  while ((match = errorPattern.exec(output)) !== null) {
    errors.push({
      type: 'typescript',
      severity: match[4] as 'error' | 'warning',
      message: match[6],
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      rule: `TS${match[5]}`,
    });
  }

  return errors;
}
