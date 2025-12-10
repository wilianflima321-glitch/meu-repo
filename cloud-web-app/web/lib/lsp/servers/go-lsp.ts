/**
 * Go LSP Server Implementation
 * Uses gopls (Go language server)
 */

import { LSPServerBase, LSPServerConfig } from '../lsp-server-base';

export class GoLSPServer extends LSPServerBase {
  constructor(workspaceRoot: string) {
    const config: LSPServerConfig = {
      command: 'gopls',
      args: ['serve'],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        GO111MODULE: 'on',
      },
      initializationOptions: {
        usePlaceholders: true,
        completionDocumentation: true,
        deepCompletion: true,
        matcher: 'fuzzy',
        staticcheck: true,
        analyses: {
          unusedparams: true,
          shadow: true,
        },
        codelenses: {
          generate: true,
          test: true,
          tidy: true,
          upgrade_dependency: true,
          vendor: true,
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
              triggerCharacters: ['.'],
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
                'source.organizeImports',
              ],
            },
            codeLensProvider: {
              resolveProvider: true,
            },
            documentFormattingProvider: true,
            documentRangeFormattingProvider: false,
            renameProvider: {
              prepareProvider: true,
            },
            foldingRangeProvider: true,
            executeCommandProvider: {
              commands: [
                'gopls.generate',
                'gopls.test',
                'gopls.tidy',
                'gopls.upgrade_dependency',
                'gopls.vendor',
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
                  'documentation', 'defaultLibrary',
                ],
              },
              full: true,
              range: true,
            },
            inlayHintProvider: true,
          },
          serverInfo: {
            name: 'gopls',
            version: '0.14.0',
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
        label: 'fmt',
        kind: 9, // Module
        detail: 'package fmt',
        documentation: 'Package fmt implements formatted I/O.',
        insertText: 'fmt',
      },
      {
        label: 'Println',
        kind: 3, // Function
        detail: 'func Println(a ...interface{}) (n int, err error)',
        documentation: 'Println formats using the default formats for its operands and writes to standard output.',
        insertText: 'Println(${1:a})',
        insertTextFormat: 2,
      },
      {
        label: 'func',
        kind: 14, // Keyword
        detail: 'function declaration',
        documentation: 'Declares a function',
        insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n    ${4:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'type',
        kind: 14,
        detail: 'type declaration',
        documentation: 'Declares a type',
        insertText: 'type ${1:Name} ${2:type}',
        insertTextFormat: 2,
      },
      {
        label: 'struct',
        kind: 14,
        detail: 'struct declaration',
        documentation: 'Declares a struct',
        insertText: 'struct {\n    ${1:// fields}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'interface',
        kind: 14,
        detail: 'interface declaration',
        documentation: 'Declares an interface',
        insertText: 'interface {\n    ${1:// methods}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'if',
        kind: 14,
        detail: 'if statement',
        documentation: 'Conditional statement',
        insertText: 'if ${1:condition} {\n    ${2:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'for',
        kind: 14,
        detail: 'for loop',
        documentation: 'Loop statement',
        insertText: 'for ${1:i} := ${2:0}; ${1:i} < ${3:n}; ${1:i}++ {\n    ${4:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'range',
        kind: 14,
        detail: 'range loop',
        documentation: 'Range over slice/map',
        insertText: 'for ${1:i}, ${2:v} := range ${3:slice} {\n    ${4:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'defer',
        kind: 14,
        detail: 'defer statement',
        documentation: 'Defer function execution',
        insertText: 'defer ${1:function}()',
        insertTextFormat: 2,
      },
    ];
  }

  private getMockHover(params: any): any {
    return {
      contents: {
        language: 'go',
        value: 'func Println(a ...interface{}) (n int, err error)\n\nPrintln formats using the default formats for its operands and writes to standard output. Spaces are always added between operands and a newline is appended.',
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
        title: 'Organize imports',
        kind: 'source.organizeImports',
        command: {
          title: 'Organize imports',
          command: 'gopls.organize_imports',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Run go mod tidy',
        kind: 'source.tidy',
        command: {
          title: 'Run go mod tidy',
          command: 'gopls.tidy',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Generate code',
        kind: 'source.generate',
        command: {
          title: 'Generate code',
          command: 'gopls.generate',
          arguments: [params.textDocument.uri],
        },
      },
    ];
  }

  /**
   * Go-specific features
   */
  async organizeImports(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'gopls.organize_imports',
      arguments: [uri],
    });
  }

  async runGoModTidy(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'gopls.tidy',
      arguments: [uri],
    });
  }

  async generateCode(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'gopls.generate',
      arguments: [uri],
    });
  }

  async getCallHierarchy(uri: string, position: any): Promise<any> {
    return await this.sendRequest('textDocument/prepareCallHierarchy', {
      textDocument: { uri },
      position,
    });
  }

  async getInlayHints(uri: string, range: any): Promise<any> {
    return await this.sendRequest('textDocument/inlayHint', {
      textDocument: { uri },
      range,
    });
  }
}

export function createGoLSPServer(workspaceRoot: string): GoLSPServer {
  return new GoLSPServer(workspaceRoot);
}
