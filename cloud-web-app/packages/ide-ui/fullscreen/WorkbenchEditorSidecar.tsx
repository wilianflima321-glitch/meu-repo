'use client';

import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro';
import { ErrorHighlighting } from '../ErrorHighlighting';
import { IntelliSense } from '../IntelliSense';
import OutlinePanel, { type DocumentSymbol } from '../../../web/components/outline/OutlinePanel';

function diagnosticsToErrors(
  diagnostics: MonacoDiagnostic[],
  filePath: string,
) {
  return diagnostics.map((diagnostic, index) => {
    const type: 'error' | 'warning' | 'info' =
      diagnostic.severity === 'error'
        ? 'error'
        : diagnostic.severity === 'warning'
          ? 'warning'
          : 'info';

    const severity: 'major' | 'minor' | 'suggestion' =
      diagnostic.severity === 'error'
        ? 'major'
        : diagnostic.severity === 'warning'
          ? 'minor'
          : 'suggestion';

    return {
      id: `${filePath}:${diagnostic.line}:${diagnostic.column}:${index}`,
      type,
      severity,
      message: diagnostic.message,
      code: diagnostic.code ? String(diagnostic.code) : '',
      line: diagnostic.line,
      column: diagnostic.column,
      file: filePath,
      documentation: diagnostic.source ? `Source: ${diagnostic.source}` : '',
      fixable: false,
    };
  });
}

type WorkbenchEditorSidecarProps = {
  showIntelliSense: boolean;
  showOutline: boolean;
  showDiagnostics: boolean;
  currentDiagnosticsFilePath: string;
  activeDiagnostics: MonacoDiagnostic[];
  outlineSymbols: DocumentSymbol[];
  activeFilePath: string;
  onJumpToOutlineSymbol: (symbol: DocumentSymbol) => void;
};

export default function WorkbenchEditorSidecar({
  showIntelliSense,
  showOutline,
  showDiagnostics,
  currentDiagnosticsFilePath,
  activeDiagnostics,
  outlineSymbols,
  activeFilePath,
  onJumpToOutlineSymbol,
}: WorkbenchEditorSidecarProps) {
  if (!showIntelliSense && !showOutline && !showDiagnostics) {
    return null;
  }

  return (
    <div className="w-80 border-l border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] flex flex-col">
      {showIntelliSense && (
        <div className="flex-1 min-h-0 border-b border-[var(--aethel-border-secondary)]">
          <IntelliSense />
        </div>
      )}
      {showOutline && (
        <div className="flex-1 min-h-0 border-b border-[var(--aethel-border-secondary)]">
          <OutlinePanel
            symbols={outlineSymbols}
            activeFilePath={activeFilePath}
            onSymbolClick={onJumpToOutlineSymbol}
          />
        </div>
      )}
      {showDiagnostics && currentDiagnosticsFilePath && (
        <div className="flex-1 min-h-0">
          <ErrorHighlighting
            errors={diagnosticsToErrors(activeDiagnostics, currentDiagnosticsFilePath)}
          />
        </div>
      )}
    </div>
  );
}
