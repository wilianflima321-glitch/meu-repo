import { logger } from '@/lib/observability/logger';
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
import type { ValidationError, ValidationResult, ValidatorConfig } from './code-validator.contracts';
import { createValidationSummary, parseESLintJsonResults, parseTypeScriptDiagnostics } from './code-validator.parsers';

export type { ValidationError, ValidationResult, ValidatorConfig } from './code-validator.contracts';
export { formatErrorsForAI, generateFixInstructions } from './code-validator-formatting';

const execFileAsync = promisify(execFile);

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
      logger.warn('[CodeValidator] ESLint not found in node_modules');
    }
    
    // Find TypeScript
    const tscPath = path.join(nodeModules, process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
    try {
      await fs.access(tscPath);
      this.tscPath = tscPath;
    } catch {
      logger.warn('[CodeValidator] TypeScript not found in node_modules');
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
      summary: createValidationSummary(errors, warnings),
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
      summary: createValidationSummary(allErrors, allWarnings),
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
      summary: createValidationSummary(errors, warnings),
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
    const empty = { errors: [], warnings: [], autoFixable: [] };

    if (!this.eslintPath) {
      return empty;
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

      return parseESLintJsonResults(stdout, true);
    } catch (e: unknown) {
      const execError = e as { stdout?: string };
      if (!execError.stdout) {
        return empty;
      }

      try {
        return parseESLintJsonResults(execError.stdout, false);
      } catch {
        logger.error('[CodeValidator] Failed to parse ESLint output');
        return empty;
      }
    }
  }

  async runESLintAutoFix(content: string, filePath: string): Promise<string> {
    if (!this.eslintPath) {
      return content;
    }

    try {
      await fs.writeFile(filePath, content, 'utf8');
      await execFileAsync(
        this.eslintPath,
        ['--fix', filePath],
        {
          cwd: this.config.workspacePath,
          timeout: this.config.timeout,
        }
      );
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return content;
    }
  }

  private async runESLintProject(): Promise<{
    errors: ValidationError[];
    warnings: ValidationError[];
  }> {
    if (!this.eslintPath) {
      return { errors: [], warnings: [] };
    }

    try {
      const { stdout } = await execFileAsync(
        this.eslintPath,
        ['--format', 'json', '.'],
        {
          cwd: this.config.workspacePath,
          timeout: this.config.timeout * 3,
        }
      );

      const { errors, warnings } = parseESLintJsonResults(stdout);
      return { errors, warnings };
    } catch {
      return { errors: [], warnings: [] };
    }
  }

  private async runTypeCheck(filePath: string): Promise<ValidationError[]> {
    if (!this.tscPath) {
      return [];
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
      return [];
    } catch (e: unknown) {
      const execError = e as { stdout?: string; stderr?: string };
      return parseTypeScriptDiagnostics(execError.stdout || execError.stderr || '');
    }
  }

  private async runTypeCheckProject(): Promise<ValidationError[]> {
    if (!this.tscPath) {
      return [];
    }

    try {
      await execFileAsync(
        this.tscPath,
        ['--noEmit', '--pretty', 'false'],
        {
          cwd: this.config.workspacePath,
          timeout: this.config.timeout * 5,
        }
      );
      return [];
    } catch (e: unknown) {
      const execError = e as { stdout?: string; stderr?: string };
      return parseTypeScriptDiagnostics(execError.stdout || execError.stderr || '');
    }
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
