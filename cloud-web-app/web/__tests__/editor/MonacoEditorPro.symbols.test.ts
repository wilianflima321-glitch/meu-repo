import { describe, expect, it } from 'vitest';

import {
  mapTypeScriptNavigationKind,
  mapTypeScriptNavigationTree,
} from '@/components/editor/MonacoEditorPro.symbols';

function createModel(source: string) {
  return {
    getValueLength: () => source.length,
    getPositionAt(offset: number) {
      const clamped = Math.max(0, Math.min(offset, source.length));
      const slice = source.slice(0, clamped);
      const lines = slice.split('\n');
      return {
        lineNumber: lines.length,
        column: (lines.at(-1)?.length ?? 0) + 1,
      };
    },
  };
}

describe('MonacoEditorPro.symbols', () => {
  it('maps common TypeScript navigation kinds to stable outline kinds', () => {
    expect(mapTypeScriptNavigationKind('class')).toBe('class');
    expect(mapTypeScriptNavigationKind('member function')).toBe('method');
    expect(mapTypeScriptNavigationKind('type alias')).toBe('typeParameter');
    expect(mapTypeScriptNavigationKind('const')).toBe('constant');
    expect(mapTypeScriptNavigationKind('unknown-kind')).toBe('variable');
  });

  it('builds nested document symbols with selection ranges from navigation trees', () => {
    const source = [
      'class Engine {',
      '  run() {',
      '    return true;',
      '  }',
      '}',
    ].join('\n');
    const model = createModel(source) as any;

    const symbols = mapTypeScriptNavigationTree(model, [
      {
        text: 'Engine',
        kind: 'class',
        spans: [{ start: 0, length: source.length }],
        nameSpan: [{ start: 6, length: 6 } as any][0],
        childItems: [
          {
            text: 'run',
            kind: 'member function',
            spans: [{ start: source.indexOf('run'), length: 23 }],
            nameSpan: { start: source.indexOf('run'), length: 3 },
          },
        ],
      },
    ]);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]?.name).toBe('Engine');
    expect(symbols[0]?.kind).toBe('class');
    expect(symbols[0]?.selectionRange.startLine).toBe(1);
    expect(symbols[0]?.children?.[0]?.name).toBe('run');
    expect(symbols[0]?.children?.[0]?.kind).toBe('method');
    expect(symbols[0]?.children?.[0]?.range.startLine).toBe(2);
  });
});
