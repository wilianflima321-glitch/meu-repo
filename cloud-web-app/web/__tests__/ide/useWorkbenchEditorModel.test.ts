import { describe, expect, it } from 'vitest';

import { resolveOutlineSymbols } from '@aethel/ide-ui/fullscreen/useWorkbenchEditorModel';

describe('resolveOutlineSymbols', () => {
  const file = {
    path: 'src/app/example.tsx',
    content: 'export function fallbackOutline() {}\n',
    language: 'typescript',
  };

  it('prefers authoritative symbols when they match the active file path', () => {
    const symbols = resolveOutlineSymbols({
      file,
      documentSymbols: {
        path: file.path,
        authoritative: true,
        symbols: [
          {
            name: 'AuthoritativeComponent',
            kind: 'function',
            range: { startLine: 4, startColumn: 1, endLine: 10, endColumn: 1 },
            selectionRange: { startLine: 4, startColumn: 17, endLine: 4, endColumn: 38 },
          },
        ],
      },
    });

    expect(symbols).toHaveLength(1);
    expect(symbols[0]?.name).toBe('AuthoritativeComponent');
  });

  it('falls back to parsed symbols when the document symbol payload is stale', () => {
    const symbols = resolveOutlineSymbols({
      file,
      documentSymbols: {
        path: 'src/app/other.tsx',
        authoritative: true,
        symbols: [],
      },
    });

    expect(symbols.map((symbol) => symbol.name)).toContain('fallbackOutline');
  });

  it('falls back to parsed symbols when the document symbol payload is not authoritative', () => {
    const symbols = resolveOutlineSymbols({
      file,
      documentSymbols: {
        path: file.path,
        authoritative: false,
        symbols: [],
      },
    });

    expect(symbols.map((symbol) => symbol.name)).toContain('fallbackOutline');
  });
});
