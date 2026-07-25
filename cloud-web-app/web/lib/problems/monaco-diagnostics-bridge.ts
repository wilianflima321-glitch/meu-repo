/**
 * Bridges Monaco editor diagnostics into the ProblemsManager authority.
 * Used by IDE Diagnostics dock — not a cosmetic chat wrapper.
 */

import type { Diagnostic as MonacoDiagnostic } from '@/components/editor/MonacoEditorPro.types'
import {
  getProblemsManager,
  type Diagnostic as ProblemDiagnostic,
} from '@/lib/problems/problems-manager'

export function mapMonacoDiagnosticsToProblems(
  uri: string,
  diagnostics: MonacoDiagnostic[],
): ProblemDiagnostic[] {
  return diagnostics.map((d) => ({
    uri,
    range: {
      start: { line: Math.max(0, d.line - 1), character: Math.max(0, d.column - 1) },
      end: {
        line: Math.max(0, (d.endLine ?? d.line) - 1),
        character: Math.max(0, (d.endColumn ?? d.column) - 1),
      },
    },
    severity: d.severity,
    message: d.message,
    source: d.source,
    code: d.code,
  }))
}

/** Publish Monaco markers for a file path into the singleton Problems authority. */
export function publishMonacoDiagnosticsToProblems(
  filePath: string | undefined,
  diagnostics: MonacoDiagnostic[],
): void {
  const uri = (filePath && filePath.trim()) || 'untitled'
  const manager = getProblemsManager()
  if (diagnostics.length === 0) {
    manager.clearProblems(uri)
    return
  }
  manager.addProblems(uri, mapMonacoDiagnosticsToProblems(uri, diagnostics))
}
