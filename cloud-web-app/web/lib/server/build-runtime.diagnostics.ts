import type { BuildDiagnostic } from './build-runtime.types';

export function parseEsbuildErrors(output: string, diagnostics: BuildDiagnostic[]): void {
  // esbuild error format: path/file.ts:line:column: error: message
  const errorRegex = /(.+):(\d+):(\d+):\s*(error|warning):\s*(.+)/g;
  let match;

  while ((match = errorRegex.exec(output)) !== null) {
    diagnostics.push({
      type: match[4] as 'error' | 'warning',
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      message: match[5],
    });
  }
}

export function parseTscErrors(output: string, diagnostics: BuildDiagnostic[]): void {
  // tsc error format: path/file.ts(line,column): error TSxxxx: message
  const errorRegex = /(.+)\((\d+),(\d+)\):\s*(error|warning)\s*(TS\d+):\s*(.+)/g;
  let match;

  while ((match = errorRegex.exec(output)) !== null) {
    diagnostics.push({
      type: match[4] as 'error' | 'warning',
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      code: match[5],
      message: match[6],
    });
  }
}

export function parseWebpackErrors(output: string, diagnostics: BuildDiagnostic[]): void {
  // Webpack has various error formats
  const errorRegex = /ERROR in (.+)\n\s*(.+)/g;
  const warningRegex = /WARNING in (.+)/g;

  let match;

  while ((match = errorRegex.exec(output)) !== null) {
    diagnostics.push({
      type: 'error',
      file: match[1],
      message: match[2],
    });
  }

  while ((match = warningRegex.exec(output)) !== null) {
    diagnostics.push({
      type: 'warning',
      message: match[1],
    });
  }
}

export function parseGoErrors(output: string, diagnostics: BuildDiagnostic[]): void {
  // Go error format: file.go:line:column: message
  const errorRegex = /(.+\.go):(\d+):(\d+):\s*(.+)/g;
  let match;

  while ((match = errorRegex.exec(output)) !== null) {
    diagnostics.push({
      type: 'error',
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      message: match[4],
    });
  }
}
