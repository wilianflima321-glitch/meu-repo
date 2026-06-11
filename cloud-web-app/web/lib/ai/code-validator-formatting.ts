import type { ValidationError, ValidationResult } from './code-validator.contracts';

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
