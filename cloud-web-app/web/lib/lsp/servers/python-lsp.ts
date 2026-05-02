/**
 * Python LSP Server Implementation
 * Uses pylsp (Python Language Server Protocol)
 */

import {
  CodeAction,
  CompletionItem,
  Hover,
  Location,
  LSPParams,
  LSPServerBase,
  LSPServerConfig,
  TextEdit,
} from '../lsp-server-base';
import { getMockDocumentParams } from './lsp-mock-utils';

export class PythonLSPServer extends LSPServerBase {
  constructor(workspaceRoot: string) {
    const config: LSPServerConfig = {
      command: 'pylsp',
      language: 'python',
      args: [],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
      initializationOptions: {
        pylsp: {
          plugins: {
            pycodestyle: { enabled: true },
            pyflakes: { enabled: true },
            pylint: { enabled: false },
            autopep8: { enabled: true },
            yapf: { enabled: false },
            black: { enabled: false },
            rope_completion: { enabled: true },
            jedi_completion: { enabled: true },
            jedi_hover: { enabled: true },
            jedi_references: { enabled: true },
            jedi_signature_help: { enabled: true },
            jedi_symbols: { enabled: true },
          },
        },
      },
    };

    super(config);
  }

  /**
   * Get mock response for Python LSP
   * This will be replaced with real server communication
   */
  protected getMockResponse(method: string, params: LSPParams): unknown {
    switch (method) {
      case 'initialize':
        return {
          capabilities: {
            textDocumentSync: 2, // Incremental
            completionProvider: {
              triggerCharacters: ['.', '['],
              resolveProvider: true,
            },
            hoverProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ','],
            },
            definitionProvider: true,
            referencesProvider: true,
            documentHighlightProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            codeActionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            renameProvider: true,
            executeCommandProvider: {
              commands: [
                'pylsp.format',
                'pylsp.organize_imports',
              ],
            },
          },
          serverInfo: {
            name: 'pylsp',
            version: '1.9.0',
          },
        };

      case 'textDocument/completion':
        return this.getMockCompletions(params);

      case 'textDocument/hover':
        return this.getMockHover(params);

      case 'textDocument/definition':
        return this.getMockDefinition(params);

      case 'textDocument/references':
        return this.getMockReferences(params);

      case 'textDocument/formatting':
        return this.getMockFormatting(params);

      case 'textDocument/codeAction':
        return this.getMockCodeActions(params);

      default:
        return null;
    }
  }

  private getMockCompletions(_params: LSPParams): CompletionItem[] {
    // Mock Python completions
    return [
      {
        label: 'print',
        kind: 3, // Function
        detail: 'print(*values, sep=" ", end="\\n", file=sys.stdout, flush=False)',
        documentation: 'Print values to a stream, or to sys.stdout by default.',
        insertText: 'print(${1:value})',
        insertTextFormat: 2, // Snippet
      },
      {
        label: 'len',
        kind: 3,
        detail: 'len(obj)',
        documentation: 'Return the length of an object.',
        insertText: 'len(${1:obj})',
        insertTextFormat: 2,
      },
      {
        label: 'range',
        kind: 3,
        detail: 'range(stop) or range(start, stop[, step])',
        documentation: 'Return an object that produces a sequence of integers.',
        insertText: 'range(${1:stop})',
        insertTextFormat: 2,
      },
      {
        label: 'str',
        kind: 7, // Class
        detail: 'class str(object)',
        documentation: 'String class',
        insertText: 'str',
      },
      {
        label: 'list',
        kind: 7,
        detail: 'class list(object)',
        documentation: 'List class',
        insertText: 'list',
      },
      {
        label: 'dict',
        kind: 7,
        detail: 'class dict(object)',
        documentation: 'Dictionary class',
        insertText: 'dict',
      },
      {
        label: 'import',
        kind: 14, // Keyword
        detail: 'import statement',
        documentation: 'Import modules',
        insertText: 'import ${1:module}',
        insertTextFormat: 2,
      },
      {
        label: 'def',
        kind: 14,
        detail: 'function definition',
        documentation: 'Define a function',
        insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}',
        insertTextFormat: 2,
      },
      {
        label: 'class',
        kind: 14,
        detail: 'class definition',
        documentation: 'Define a class',
        insertText: 'class ${1:ClassName}:\n    ${2:pass}',
        insertTextFormat: 2,
      },
      {
        label: 'if',
        kind: 14,
        detail: 'if statement',
        documentation: 'Conditional statement',
        insertText: 'if ${1:condition}:\n    ${2:pass}',
        insertTextFormat: 2,
      },
    ];
  }

  private getMockHover(params: LSPParams): Hover {
    const { position } = getMockDocumentParams(params);

    return {
      contents: {
        language: 'python',
        value: 'def print(*values, sep=" ", end="\\n", file=sys.stdout, flush=False)\n\nPrint values to a stream, or to sys.stdout by default.',
      },
      range: {
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: 10 },
      },
    };
  }

  private getMockDefinition(params: LSPParams): Location {
    const { textDocument } = getMockDocumentParams(params);

    return {
      uri: textDocument.uri,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      },
    };
  }

  private getMockReferences(params: LSPParams): Location[] {
    const { textDocument } = getMockDocumentParams(params);

    return [
      {
        uri: textDocument.uri,
        range: {
          start: { line: 5, character: 4 },
          end: { line: 5, character: 14 },
        },
      },
      {
        uri: textDocument.uri,
        range: {
          start: { line: 10, character: 8 },
          end: { line: 10, character: 18 },
        },
      },
    ];
  }

  private getMockFormatting(_params: LSPParams): TextEdit[] {
    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 100, character: 0 },
        },
        newText: '# Formatted Python code\n',
      },
    ];
  }

  private getMockCodeActions(params: LSPParams): CodeAction[] {
    const { textDocument } = getMockDocumentParams(params);

    return [
      {
        title: 'Organize imports',
        kind: 'source.organizeImports',
        command: {
          title: 'Organize imports',
          command: 'pylsp.organize_imports',
          arguments: [textDocument.uri],
        },
      },
      {
        title: 'Format document',
        kind: 'source.formatDocument',
        command: {
          title: 'Format document',
          command: 'pylsp.format',
          arguments: [textDocument.uri],
        },
      },
    ];
  }

  /**
   * Python-specific features
   */
  async organizeImports(uri: string): Promise<unknown> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'pylsp.organize_imports',
      arguments: [uri],
    });
  }

  async formatDocument(uri: string): Promise<unknown> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'pylsp.format',
      arguments: [uri],
    });
  }
}

/**
 * Factory function to create Python LSP server
 */
export function createPythonLSPServer(workspaceRoot: string): PythonLSPServer {
  return new PythonLSPServer(workspaceRoot);
}
