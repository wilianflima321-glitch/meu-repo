/**
 * Tests for workbench-helpers extracted from FullscreenIDE.
 *
 * Covers:
 *  - resolveLanguage() maps common extensions to monaco languages.
 *  - normalizePath() always returns a leading slash.
 *  - collaborationColorForUser() is stable and returns a valid HSL string.
 *  - pickFirstFilePath() respects the preference ordering + alphabetical ties.
 *  - pickFirstFilePath() tolerates malformed nodes.
 *  - getAuthHeaders() reads `token` from localStorage when window exists.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveLanguage,
  normalizePath,
  collaborationColorForUser,
  pickFirstFilePath,
  getAuthHeaders,
  type WorkspaceTreeNode,
} from '../../components/ide/fullscreen/workbench-helpers';

describe('workbench-helpers', () => {
  describe('resolveLanguage', () => {
    it.each([
      ['main.ts', 'typescript'],
      ['App.tsx', 'typescript'],
      ['script.js', 'javascript'],
      ['view.jsx', 'javascript'],
      ['package.json', 'json'],
      ['README.md', 'markdown'],
      ['style.css', 'css'],
      ['theme.scss', 'css'],
      ['index.html', 'html'],
      ['index.htm', 'html'],
      ['run.py', 'python'],
      ['notes.txt', 'plaintext'],
      ['no-extension', 'plaintext'],
    ])('resolves %s → %s', (path, expected) => {
      expect(resolveLanguage(path)).toBe(expected);
    });

    it('is case-insensitive on the extension', () => {
      expect(resolveLanguage('Screen.TSX')).toBe('typescript');
      expect(resolveLanguage('data.JSON')).toBe('json');
    });
  });

  describe('normalizePath', () => {
    it('returns "/" for empty input', () => {
      expect(normalizePath('')).toBe('/');
    });

    it('leaves a leading-slash path unchanged', () => {
      expect(normalizePath('/src/App.tsx')).toBe('/src/App.tsx');
    });

    it('prepends "/" when missing', () => {
      expect(normalizePath('src/App.tsx')).toBe('/src/App.tsx');
    });
  });

  describe('collaborationColorForUser', () => {
    it('returns a valid HSL string', () => {
      const color = collaborationColorForUser('alice@aethel.dev');
      expect(color).toMatch(/^hsl\(\d+, 72%, 56%\)$/);
    });

    it('is deterministic for the same user id', () => {
      expect(collaborationColorForUser('u-1')).toBe(collaborationColorForUser('u-1'));
    });

    it('produces different hues for different ids (most of the time)', () => {
      const a = collaborationColorForUser('alice');
      const b = collaborationColorForUser('bob');
      // Not always different, but for these two values it is.
      expect(a).not.toBe(b);
    });

    it('handles empty string without crashing', () => {
      expect(collaborationColorForUser('')).toMatch(/^hsl\(0, 72%, 56%\)$/);
    });
  });

  describe('pickFirstFilePath', () => {
    it('returns null for an empty tree', () => {
      expect(pickFirstFilePath([])).toBeNull();
    });

    it('prefers tsx over lesser-preferred extensions (normalized to leading slash)', () => {
      const tree: WorkspaceTreeNode[] = [
        { type: 'file', path: 'notes.md' },
        { type: 'file', path: 'App.tsx' },
        { type: 'file', path: 'index.js' },
      ];
      expect(pickFirstFilePath(tree)).toBe('/App.tsx');
    });

    it('falls back to alphabetical order when extensions tie', () => {
      const tree: WorkspaceTreeNode[] = [
        { type: 'file', path: 'z.ts' },
        { type: 'file', path: 'a.ts' },
      ];
      expect(pickFirstFilePath(tree)).toBe('/a.ts');
    });

    it('walks into directories recursively', () => {
      const tree: WorkspaceTreeNode[] = [
        {
          type: 'directory',
          children: [
            { type: 'file', path: 'src/main.ts' },
          ],
        },
      ];
      expect(pickFirstFilePath(tree)).toBe('/src/main.ts');
    });

    it('ignores files with empty/whitespace paths', () => {
      const tree: WorkspaceTreeNode[] = [
        { type: 'file', path: '   ' },
        { type: 'file', path: 'App.tsx' },
      ];
      expect(pickFirstFilePath(tree)).toBe('/App.tsx');
    });

    it('tolerates malformed nodes (null / missing type)', () => {
      const tree: any = [null, { type: 'file' }, { type: 'file', path: 'ok.ts' }];
      expect(pickFirstFilePath(tree)).toBe('/ok.ts');
    });
  });

  describe('getAuthHeaders', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('returns an empty object when no token is stored', () => {
      expect(getAuthHeaders()).toEqual({});
    });

    it('returns a Bearer header when a token is present', () => {
      window.localStorage.setItem('token', 'abc123');
      expect(getAuthHeaders()).toEqual({ Authorization: 'Bearer abc123' });
    });
  });
});
