/**
 * Rust LSP Server Implementation
 * Uses rust-analyzer
 */

import { LSPServerBase, LSPServerConfig } from '../lsp-server-base';

export class RustLSPServer extends LSPServerBase {
  constructor(workspaceRoot: string) {
    const config: LSPServerConfig = {
      command: 'rust-analyzer',
      args: [],
      cwd: workspaceRoot,
      env: {
        ...process.env,
      },
      initializationOptions: {
        cargo: {
          allFeatures: true,
          loadOutDirsFromCheck: true,
        },
        procMacro: {
          enable: true,
        },
        checkOnSave: {
          command: 'clippy',
        },
        inlayHints: {
          enable: true,
          chainingHints: true,
          parameterHints: true,
          typeHints: true,
        },
      },
    };

    super(config);
  }

  protected getMockResponse(method: string, params: any): any {
    switch (method) {
      case 'initialize':
        return {
          capabilities: {
            textDocumentSync: 2,
            completionProvider: {
              triggerCharacters: ['.', ':', ':'],
              resolveProvider: true,
            },
            hoverProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ','],
            },
            definitionProvider: true,
            typeDefinitionProvider: true,
            implementationProvider: true,
            referencesProvider: true,
            documentHighlightProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            codeActionProvider: {
              codeActionKinds: [
                'quickfix',
                'refactor',
                'refactor.extract',
                'refactor.inline',
                'refactor.rewrite',
              ],
            },
            codeLensProvider: {
              resolveProvider: true,
            },
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            renameProvider: {
              prepareProvider: true,
            },
            foldingRangeProvider: true,
            executeCommandProvider: {
              commands: [
                'rust-analyzer.runSingle',
                'rust-analyzer.debugSingle',
                'rust-analyzer.showReferences',
                'rust-analyzer.gotoLocation',
                'rust-analyzer.openDocs',
                'rust-analyzer.expandMacro',
              ],
            },
            callHierarchyProvider: true,
            semanticTokensProvider: {
              legend: {
                tokenTypes: [
                  'namespace', 'type', 'class', 'enum', 'interface',
                  'struct', 'typeParameter', 'parameter', 'variable',
                  'property', 'enumMember', 'event', 'function',
                  'method', 'macro', 'keyword', 'modifier', 'comment',
                  'string', 'number', 'regexp', 'operator',
                ],
                tokenModifiers: [
                  'declaration', 'definition', 'readonly', 'static',
                  'deprecated', 'abstract', 'async', 'modification',
                  'documentation', 'defaultLibrary', 'unsafe', 'mutable',
                ],
              },
              full: true,
              range: true,
            },
            inlayHintProvider: true,
          },
          serverInfo: {
            name: 'rust-analyzer',
            version: '0.3.1700',
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

      case 'textDocument/codeAction':
        return this.getMockCodeActions(params);

      default:
        return null;
    }
  }

  private getMockCompletions(params: any): any[] {
    return [
      {
        label: 'println!',
        kind: 3, // Function
        detail: 'macro println!($($arg:tt)*)',
        documentation: 'Prints to the standard output, with a newline.',
        insertText: 'println!("${1:text}");',
        insertTextFormat: 2,
      },
      {
        label: 'Vec',
        kind: 7, // Class
        detail: 'struct Vec<T>',
        documentation: 'A contiguous growable array type.',
        insertText: 'Vec',
      },
      {
        label: 'String',
        kind: 7,
        detail: 'struct String',
        documentation: 'A UTF-8 encoded, growable string.',
        insertText: 'String',
      },
      {
        label: 'Option',
        kind: 8, // Enum
        detail: 'enum Option<T>',
        documentation: 'The Option type. See the module level documentation for more.',
        insertText: 'Option',
      },
      {
        label: 'Result',
        kind: 8,
        detail: 'enum Result<T, E>',
        documentation: 'Result is a type that represents either success (Ok) or failure (Err).',
        insertText: 'Result',
      },
      {
        label: 'fn',
        kind: 14, // Keyword
        detail: 'function definition',
        documentation: 'Define a function',
        insertText: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n    ${4:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'struct',
        kind: 14,
        detail: 'struct definition',
        documentation: 'Define a struct',
        insertText: 'struct ${1:Name} {\n    ${2:// fields}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'impl',
        kind: 14,
        detail: 'implementation block',
        documentation: 'Implement methods for a type',
        insertText: 'impl ${1:Type} {\n    ${2:// methods}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'match',
        kind: 14,
        detail: 'match expression',
        documentation: 'Pattern matching',
        insertText: 'match ${1:value} {\n    ${2:pattern} => ${3:expression},\n}',
        insertTextFormat: 2,
      },
      {
        label: 'let',
        kind: 14,
        detail: 'variable binding',
        documentation: 'Bind a value to a variable',
        insertText: 'let ${1:name} = ${2:value};',
        insertTextFormat: 2,
      },
    ];
  }

  private getMockHover(params: any): any {
    return {
      contents: {
        language: 'rust',
        value: 'macro println!($($arg:tt)*)\n\nPrints to the standard output, with a newline.\n\nThis macro uses the same syntax as format!, but writes to the standard output instead.',
      },
      range: {
        start: { line: params.position.line, character: 0 },
        end: { line: params.position.line, character: 10 },
      },
    };
  }

  private getMockDefinition(params: any): any {
    return {
      uri: params.textDocument.uri,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      },
    };
  }

  private getMockReferences(params: any): any[] {
    return [
      {
        uri: params.textDocument.uri,
        range: {
          start: { line: 5, character: 4 },
          end: { line: 5, character: 14 },
        },
      },
      {
        uri: params.textDocument.uri,
        range: {
          start: { line: 10, character: 8 },
          end: { line: 10, character: 18 },
        },
      },
    ];
  }

  private getMockCodeActions(params: any): any[] {
    return [
      {
        title: 'Add #[derive(Debug)]',
        kind: 'quickfix',
        command: {
          title: 'Add #[derive(Debug)]',
          command: 'rust-analyzer.applySourceChange',
          arguments: [],
        },
      },
      {
        title: 'Extract into function',
        kind: 'refactor.extract.function',
        command: {
          title: 'Extract into function',
          command: 'rust-analyzer.applySourceChange',
          arguments: [],
        },
      },
      {
        title: 'Inline variable',
        kind: 'refactor.inline',
        command: {
          title: 'Inline variable',
          command: 'rust-analyzer.applySourceChange',
          arguments: [],
        },
      },
    ];
  }

  /**
   * Rust-specific features
   */
  async expandMacro(uri: string, position: any): Promise<string> {
    const result = await this.sendRequest('rust-analyzer/expandMacro', {
      textDocument: { uri },
      position,
    });
    return result?.expansion || '';
  }

  async openDocs(uri: string, position: any): Promise<string> {
    const result = await this.sendRequest('rust-analyzer/openDocs', {
      textDocument: { uri },
      position,
    });
    return result?.url || '';
  }
}

export function createRustLSPServer(workspaceRoot: string): RustLSPServer {
  return new RustLSPServer(workspaceRoot);
}
