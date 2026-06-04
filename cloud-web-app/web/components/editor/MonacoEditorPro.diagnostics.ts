import type * as monacoEditor from 'monaco-editor';
import type { Diagnostic } from './MonacoEditorPro.types';

export function mapMonacoMarkersToDiagnostics(markers: monacoEditor.editor.IMarker[]): Diagnostic[] {
  return markers.map((marker) => ({
    line: marker.startLineNumber,
    column: marker.startColumn,
    endLine: marker.endLineNumber,
    endColumn: marker.endColumn,
    message: marker.message,
    severity:
      marker.severity === 8
        ? 'error'
        : marker.severity === 4
          ? 'warning'
          : marker.severity === 2
            ? 'info'
            : 'hint',
    source: marker.source,
    code: typeof marker.code === 'string' || typeof marker.code === 'number'
      ? marker.code
      : undefined,
  }));
}
