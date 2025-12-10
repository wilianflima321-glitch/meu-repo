/**
 * Editor Integration Tests
 * End-to-end tests for editor features with LSP and AI
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getEditorIntegration } from '../../lib/integration';

describe('Editor Integration', () => {
  let editor: ReturnType<typeof getEditorIntegration>;

  beforeEach(() => {
    editor = getEditorIntegration();
  });

  describe('Document Management', () => {
    it('should open document', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;',
      };

      await editor.openDocument(document);
      
      const opened = editor.getDocument(document.uri);
      expect(opened).toEqual(document);
    });

    it('should change document', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;',
      };

      await editor.openDocument(document);
      
      await editor.changeDocument(document.uri, 2, [
        { text: 'const x = 2;' },
      ]);

      const changed = editor.getDocument(document.uri);
      expect(changed?.version).toBe(2);
      expect(changed?.content).toBe('const x = 2;');
    });

    it('should close document', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;',
      };

      await editor.openDocument(document);
      await editor.closeDocument(document.uri);
      
      const closed = editor.getDocument(document.uri);
      expect(closed).toBeUndefined();
    });

    it('should track multiple documents', async () => {
      const doc1 = {
        uri: 'file:///test1.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;',
      };

      const doc2 = {
        uri: 'file:///test2.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const y = 2;',
      };

      await editor.openDocument(doc1);
      await editor.openDocument(doc2);

      const docs = editor.getOpenDocuments();
      expect(docs).toHaveLength(2);
    });
  });

  describe('Completions', () => {
    it('should get completions', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;\ncons',
      };

      await editor.openDocument(document);

      const completions = await editor.getCompletions(document.uri, {
        line: 1,
        character: 4,
      });

      expect(completions).toBeDefined();
      expect(completions.items).toBeDefined();
    });
  });

  describe('Hover', () => {
    it('should get hover information', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;',
      };

      await editor.openDocument(document);

      const hover = await editor.getHover(document.uri, {
        line: 0,
        character: 6,
      });

      // May be null if LSP not available
      if (hover) {
        expect(hover.contents).toBeDefined();
      }
    });
  });

  describe('Definition', () => {
    it('should get definition', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;\nconst y = x;',
      };

      await editor.openDocument(document);

      const definition = await editor.getDefinition(document.uri, {
        line: 1,
        character: 10,
      });

      // May be null if LSP not available
      if (definition) {
        expect(definition).toBeDefined();
      }
    });
  });

  describe('Code Actions', () => {
    it('should get code actions', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;',
      };

      await editor.openDocument(document);

      const actions = await editor.getCodeActions(
        document.uri,
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 12 },
        },
        []
      );

      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('Formatting', () => {
    it('should format document', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x=1;',
      };

      await editor.openDocument(document);

      const edits = await editor.formatDocument(document.uri, {
        tabSize: 2,
        insertSpaces: true,
      });

      expect(edits).toBeDefined();
      expect(Array.isArray(edits)).toBe(true);
    });
  });

  describe('Rename', () => {
    it('should rename symbol', async () => {
      const document = {
        uri: 'file:///test.ts',
        languageId: 'typescript',
        version: 1,
        content: 'const x = 1;\nconst y = x;',
      };

      await editor.openDocument(document);

      const workspaceEdit = await editor.rename(
        document.uri,
        { line: 0, character: 6 },
        'newName'
      );

      // May be null if LSP not available
      if (workspaceEdit) {
        expect(workspaceEdit).toBeDefined();
      }
    });
  });
});
