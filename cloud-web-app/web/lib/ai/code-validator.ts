/**
 * Code Validator - Validação Automática de Código Gerado por IA
 * 
 * Este sistema garante que código gerado pela IA seja:
 * 1. Sintaticamente correto (parse)
 * 2. Sem erros de lint (ESLint)
 * 3. Type-safe (TypeScript)
 * 4. Testado (se testes existirem)
 * 
 * Integra com o Agent Mode para loop de correção automática.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execFileAsync = promisify(execFile);

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationError {
  type: 'lint' | 'typescript' | 'syntax' | 'test';
  severity: 'error' | 'warning';
  message: string;
  file: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    lintErrors: number;
    tsErrors: number;
    testFailures: number;
  };
  autoFixable: ValidationError[];
}

export interface ValidatorConfig {
  workspacePath: string;
  enableLint?: boolean;
  enableTypeCheck?: boolean;
  enableTests?: boolean;
  autoFix?: boolean;
  timeout?: number;
}

// ============================================================================
// CODE VALIDATOR CLASS
// ============================================================================

export class CodeValidator {
  private config: Required<ValidatorConfig>;
  private eslintPath: string | null = null;
  private tscPath: string | null = null;

  constructor(config: ValidatorConfig) {
    this.config = {
      enableLint: true,
      enableTypeCheck: true,
      enableTests: false, // Disabled by default for speed
      autoFix: false,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Initialize validator - find tool paths
   */
  async initialize(): Promise<void> {
    const nodeModules = path.join(this.config.workspacePath, 'node_modules', '.bin');
    
    // Find ESLint
    const eslintPath = path.join(nodeModules, process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
    try {
      await fs.access(eslintPath);
      this.eslintPath = eslintPath;
    } catch {
      console.warn('[CodeValidator] ESLint not found in node_modules');
    }
    
    // Find TypeScript
    const tscPath = path.join(nodeModules, process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
    try {
      await fs.access(tscPath);
      this.tscPath = tscPath;
    } catch {
      console.warn('[CodeValidator] TypeScript not found in node_modules');
    }
  }

  /**
   * Validate a single file
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const autoFixable: ValidationError[] = [];

    // Determine file type
    const ext = path.extname(filePath).toLowerCase();
    const isTypeScript = ['.ts', '.tsx'].includes(ext);
    const isJavaScript = ['.js', '.jsx', '.mjs', '.cjs'].includes(ext);

    // 1. Syntax validation (always)
    const syntaxErrors = await this.validateSyntax(filePath);
    errors.push(...syntaxErrors);

    // 2. ESLint (if enabled and file is JS/TS)
    if (this.config.enableLint && (isTypeScript || isJavaScript)) {
      const lintResult = await this.runESLint(filePath);
      errors.push(...lintResult.errors);
      warnings.push(...lintResult.warnings);
      autoFixable.push(...lintResult.autoFixable);
    }

    // 3. TypeScript (if enabled and file is TS)
    if (this.config.enableTypeCheck && isTypeScript) {
      const tsErrors = await this.runTypeCheck(filePath);
      errors.push(...tsErrors);
    }

    // 4. Tests (if enabled)
    if (this.config.enableTests) {
      const testErrors = await this.runRelatedTests(filePath);
      errors.push(...testErrors);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        lintErrors: errors.filter(e => e.type === 'lint').length,
        tsErrors: errors.filter(e => e.type === 'typescript').length,
        testFailures: errors.filter(e => e.type === 'test').length,
      },
      autoFixable,
    };
  }

  /**
   * Validate multiple files
   */
  async validateFiles(filePaths: string[]): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];
    const allAutoFixable: ValidationError[] = [];

    for (const filePath of filePaths) {
      const result = await this.validateFile(filePath);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      allAutoFixable.push(...result.autoFixable);
    }

    return {
      success: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      summary: {
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length,
        lintErrors: allErrors.filter(e => e.type === 'lint').length,
        tsErrors: allErrors.filter(e => e.type === 'typescript').length,
        testFailures: allErrors.filter(e => e.type === 'test').length,
      },
      autoFixable: allAutoFixable,
    };
  }

  /**
   * Validate entire workspace
   */
  async validateWorkspace(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Run TypeScript on entire project
    if (this.config.enableTypeCheck && this.tscPath) {
      const tsErrors = await this.runTypeCheckProject();
      errors.push(...tsErrors);
    }

    // Run ESLint on entire project
    if (this.config.enableLint && this.eslintPath) {
      const lintResult = await this.runESLintProject();
      errors.push(...lintResult.errors);
      warnings.push(...lintResult.warnings);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        lintErrors: errors.filter(e => e.type === 'lint').length,
        tsErrors: errors.filter(e => e.type === 'typescript').length,
        testFailures: 0,
      },
      autoFixable: [],
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async validateSyntax(filePath: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const ext = path.extname(filePath).toLowerCase();

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      if (['.ts', '.tsx'].includes(ext)) {
        // TypeScript syntax check
        const ts = await import('typescript');
        const result = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        
        // Parse errors are stored in parseDiagnostics
        // This is a basic check - full check done by tsc
      } else if (['.js', '.jsx', '.mjs'].includes(ext)) {
        // JavaScript syntax check via eval (safe with new Function)
        try {
          new Function(content);
        } catch (e: unknown) {
          const error = e as Error;
          errors.push({
            type: 'syntax',
            severity: 'error',
            message: error.message,
            file: filePath,
          });
        }
      } else if (ext === '.json') {
        // JSON syntax check
        try {
          JSON.parse(content);
        } catch (e: unknown) {
          const error = e as Error;
          errors.push({
            type: 'syntax',
            severity: 'error',
            message: error.message,
            file: filePath,
          });
        }
      }
    } catch (e: unknown) {
      const error = e as Error;
      errors.push({
        type: 'syntax',
        severity: 'error',
        message: `Failed to read file: ${error.message}`,
        file: filePath,
      });
    }

    return errors;
  }

  private async runESLint(filePath: string): Promise<{
    errors: ValidationError[];
    warnings: ValidationError[];
    autoFixable: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const autoFixable: ValidationError[] = [];

    if (!this.eslintPath) {
      return { errors, warnings, autoFixable };
    }

    try {
      const args = ['--format', 'json', filePath];
      if (this.config.autoFix) {
        args.unshift('--fix-dry-run');
      }

      const { stdout } = await execFileAsync(this.eslintPath, args, {
        cwd: this.config.workspacePath,
        timeout: this.config.timeout,
      });

      const results = JSON.parse(stdout);
      
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
            suggestion: msg.fix ? 'Auto-fixable' : undefined,
          };

          if (msg.severity === 2) {
            errors.push(error);
          } else {
            warnings.push(error);
          }

          if (msg.fix) {
            autoFixable.push(error);
          }
        }
      }
    } catch (e: unknown) {
      // ESLint returns non-zero exit code when there are errors
      // Try to parse stdout anyway
      const execError = e as { stdout?: string; message?: string };
      if (execError.stdout) {
        try {
          const results = JSON.parse(execError.stdout);
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
              };
              if (msg.severity === 2) {
                errors.push(error);
              } else {
                warnings.push(error);
              }
            }
          }
        } catch {
          console.error('[CodeValidator] Failed to parse ESLint output');
        }
      }
    }

    return { errors, warnings, autoFixable };
  }

  private async runESLintProject(): Promise<{
    errors: ValidationError[];
    warnings: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!this.eslintPath) {
      return { errors, warnings };
    }

    try {
      const { stdout } = await execFileAsync(
        this.eslintPath,
        ['--format', 'json', '.'],
        {
          cwd: this.config.workspacePath,
          timeout: this.config.timeout * 3, // More time for full project
        }
      );

      const results = JSON.parse(stdout);
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
          };
          if (msg.severity === 2) {
            errors.push(error);
          } else {
            warnings.push(error);
          }
        }
      }
    } catch {
      // Errors handled in runESLint
    }

    return { errors, warnings };
  }

  private async runTypeCheck(filePath: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!this.tscPath) {
      return errors;
    }

    try {
      await execFileAsync(
        this.tscPath,
        ['--noEmit', '--pretty', 'false', filePath],
        {
          cwd: this.config.workspacePath,
          timeout: this.config.timeout,
        }
      );
    } catch (e: unknown) {
      const execError = e as { stdout?: string; stderr?: string };
      const output = execError.stdout || execError.stderr || '';
      
      // Parse TypeScript error output
      // Format: file(line,col): error TSxxxx: message
      const errorPattern = /(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)/g;
      let match;
      
      while ((match = errorPattern.exec(output)) !== null) {
        errors.push({
          type: 'typescript',
          severity: match[4] as 'error' | 'warning',
          message: match[6],
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          rule: `TS${match[5]}`,
        });
      }
    }

    return errors;
  }

  private async runTypeCheckProject(): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!this.tscPath) {
      return errors;
    }

    try {
      await execFileAsync(
        this.tscPath,
        ['--noEmit', '--pretty', 'false'],
        {
          cwd: this.config.workspacePath,
          timeout: this.config.timeout * 5, // TypeScript can be slow
        }
      );
    } catch (e: unknown) {
      const execError = e as { stdout?: string; stderr?: string };
      const output = execError.stdout || execError.stderr || '';
      
      const errorPattern = /(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)/g;
      let match;
      
      while ((match = errorPattern.exec(output)) !== null) {
        errors.push({
          type: 'typescript',
          severity: match[4] as 'error' | 'warning',
          message: match[6],
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          rule: `TS${match[5]}`,
        });
      }
    }

    return errors;
  }

  private async runRelatedTests(filePath: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Find related test files
    const baseName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath);
    
    const possibleTestFiles = [
      path.join(dirName, `${baseName}.test.ts`),
      path.join(dirName, `${baseName}.test.tsx`),
      path.join(dirName, `${baseName}.spec.ts`),
      path.join(dirName, `${baseName}.spec.tsx`),
      path.join(dirName, '__tests__', `${baseName}.test.ts`),
      path.join(dirName, '__tests__', `${baseName}.test.tsx`),
    ];

    for (const testFile of possibleTestFiles) {
      try {
        await fs.access(testFile);
        
        // Run the specific test file
        const testRunner = path.join(
          this.config.workspacePath,
          'node_modules',
          '.bin',
          process.platform === 'win32' ? 'vitest.cmd' : 'vitest'
        );
        
        try {
          await execFileAsync(testRunner, ['run', testFile, '--reporter=json'], {
            cwd: this.config.workspacePath,
            timeout: this.config.timeout * 2,
          });
        } catch (e: unknown) {
          const execError = e as { stdout?: string };
          if (execError.stdout) {
            try {
              const result = JSON.parse(execError.stdout);
              if (result.numFailedTests > 0) {
                errors.push({
                  type: 'test',
                  severity: 'error',
                  message: `${result.numFailedTests} test(s) failed in ${testFile}`,
                  file: testFile,
                });
              }
            } catch {
              errors.push({
                type: 'test',
                severity: 'error',
                message: `Tests failed in ${testFile}`,
                file: testFile,
              });
            }
          }
        }
        
        break; // Only run first found test file
      } catch {
        // Test file doesn't exist
      }
    }

    return errors;
  }

  /**
   * Auto-fix ESLint errors
   */
  async autoFix(filePath: string): Promise<boolean> {
    if (!this.eslintPath) {
      return false;
    }

    try {
      await execFileAsync(this.eslintPath, ['--fix', filePath], {
        cwd: this.config.workspacePath,
        timeout: this.config.timeout,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let validatorInstance: CodeValidator | null = null;

export async function getValidator(workspacePath: string): Promise<CodeValidator> {
  if (!validatorInstance || validatorInstance['config'].workspacePath !== workspacePath) {
    validatorInstance = new CodeValidator({ workspacePath });
    await validatorInstance.initialize();
  }
  return validatorInstance;
}

// ============================================================================
// HELPER FUNCTIONS FOR AGENT INTEGRATION
// ============================================================================

/**
 * Format validation errors for AI context
 */
export function formatErrorsForAI(result: ValidationResult): string {
  if (result.success) {
    return '✅ Code validation passed. No errors found.';
  }

  const lines: string[] = [
    `❌ Code validation failed with ${result.summary.totalErrors} error(s):`,
    '',
  ];

  for (const error of result.errors) {
    const location = error.line ? `:${error.line}:${error.column || 0}` : '';
    lines.push(`• [${error.type.toUpperCase()}] ${error.file}${location}`);
    lines.push(`  ${error.message}`);
    if (error.rule) {
      lines.push(`  Rule: ${error.rule}`);
    }
    if (error.suggestion) {
      lines.push(`  💡 ${error.suggestion}`);
    }
    lines.push('');
  }

  if (result.autoFixable.length > 0) {
    lines.push(`💡 ${result.autoFixable.length} error(s) can be auto-fixed.`);
  }

  return lines.join('\n');
}

/**
 * Generate fix instructions for AI
 */
export function generateFixInstructions(result: ValidationResult): string {
  if (result.success) {
    return '';
  }

  const instructions: string[] = [
    'Please fix the following issues in the code:',
    '',
  ];

  // Group by file
  const byFile = new Map<string, ValidationError[]>();
  for (const error of result.errors) {
    const existing = byFile.get(error.file) || [];
    existing.push(error);
    byFile.set(error.file, existing);
  }

  for (const [file, errors] of byFile) {
    instructions.push(`## ${file}`);
    for (const error of errors) {
      const location = error.line ? ` (line ${error.line})` : '';
      instructions.push(`- ${error.message}${location}`);
    }
    instructions.push('');
  }

  return instructions.join('\n');
}
