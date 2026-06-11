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
