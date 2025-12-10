/**
 * TypeScript/JavaScript LSP Server Implementation
 * Uses typescript-language-server with tsserver
 */

import { LSPServerBase, LSPServerConfig } from '../lsp-server-base';

export class TypeScriptLSPServer extends LSPServerBase {
  constructor(workspaceRoot: string) {
    const config: LSPServerConfig = {
      command: 'typescript-language-server',
      args: ['--stdio'],
      cwd: workspaceRoot,
      env: {
        ...process.env,
      },
      initializationOptions: {
        preferences: {
          includeInlayParameterNameHints: 'all',
          includeInlayParameterNameHintsWhenArgumentMatchesName: true,
          includeInlayFunctionParameterTypeHints: true,
          includeInlayVariableTypeHints: true,
          includeInlayPropertyDeclarationTypeHints: true,
          includeInlayFunctionLikeReturnTypeHints: true,
          includeInlayEnumMemberValueHints: true,
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
              triggerCharacters: ['.', '"', "'", '/', '@', '<'],
              resolveProvider: true,
            },
            hoverProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ',', '<'],
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
                'source.organizeImports',
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
                '_typescript.organizeImports',
                '_typescript.applyWorkspaceEdit',
                '_typescript.applyCodeAction',
                '_typescript.applyRefactoring',
              ],
            },
            callHierarchyProvider: true,
            semanticTokensProvider: {
              legend: {
                tokenTypes: [
                  'namespace', 'class', 'enum', 'interface', 'struct',
                  'typeParameter', 'type', 'parameter', 'variable',
                  'property', 'enumMember', 'decorator', 'event',
                  'function', 'method', 'macro', 'label', 'comment',
                  'string', 'keyword', 'number', 'regexp', 'operator',
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
            name: 'typescript-language-server',
            version: '4.1.0',
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
        label: 'console',
        kind: 9, // Module
        detail: 'console: Console',
        documentation: 'The console module provides a simple debugging console.',
        insertText: 'console',
      },
      {
        label: 'log',
        kind: 2, // Method
        detail: '(method) Console.log(...data: any[]): void',
        documentation: 'Prints to stdout with newline.',
        insertText: 'log(${1:data})',
        insertTextFormat: 2,
      },
      {
        label: 'const',
        kind: 14, // Keyword
        detail: 'const declaration',
        documentation: 'Declares a constant variable',
        insertText: 'const ${1:name} = ${2:value};',
        insertTextFormat: 2,
      },
      {
        label: 'let',
        kind: 14,
        detail: 'let declaration',
        documentation: 'Declares a block-scoped variable',
        insertText: 'let ${1:name} = ${2:value};',
        insertTextFormat: 2,
      },
      {
        label: 'function',
        kind: 14,
        detail: 'function declaration',
        documentation: 'Declares a function',
        insertText: 'function ${1:name}(${2:params}) {\n    ${3:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'class',
        kind: 14,
        detail: 'class declaration',
        documentation: 'Declares a class',
        insertText: 'class ${1:ClassName} {\n    ${2:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'interface',
        kind: 14,
        detail: 'interface declaration',
        documentation: 'Declares an interface',
        insertText: 'interface ${1:InterfaceName} {\n    ${2:// properties}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'type',
        kind: 14,
        detail: 'type alias',
        documentation: 'Declares a type alias',
        insertText: 'type ${1:TypeName} = ${2:type};',
        insertTextFormat: 2,
      },
      {
        label: 'import',
        kind: 14,
        detail: 'import statement',
        documentation: 'Import modules',
        insertText: 'import { ${1:name} } from "${2:module}";',
        insertTextFormat: 2,
      },
      {
        label: 'export',
        kind: 14,
        detail: 'export statement',
        documentation: 'Export declarations',
        insertText: 'export ${1:declaration}',
        insertTextFormat: 2,
      },
    ];
  }

  private getMockHover(params: any): any {
    return {
      contents: {
        language: 'typescript',
        value: '(method) Console.log(...data: any[]): void\n\nPrints to stdout with newline. Multiple arguments can be passed, with the first used as the primary message and all additional used as substitution values.',
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
          command: '_typescript.organizeImports',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Add missing imports',
        kind: 'quickfix',
        command: {
          title: 'Add missing imports',
          command: '_typescript.applyCodeAction',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Extract to function',
        kind: 'refactor.extract.function',
        command: {
          title: 'Extract to function',
          command: '_typescript.applyRefactoring',
          arguments: [params.textDocument.uri, 'Extract to function'],
        },
      },
      {
        title: 'Extract to constant',
        kind: 'refactor.extract.constant',
        command: {
          title: 'Extract to constant',
          command: '_typescript.applyRefactoring',
          arguments: [params.textDocument.uri, 'Extract to constant'],
        },
      },
    ];
  }

  /**
   * TypeScript-specific features
   */
  async organizeImports(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: '_typescript.organizeImports',
      arguments: [uri],
    });
  }

  async getCallHierarchy(uri: string, position: any): Promise<any> {
    return await this.sendRequest('textDocument/prepareCallHierarchy', {
      textDocument: { uri },
      position,
    });
  }

  async getSemanticTokens(uri: string): Promise<any> {
    return await this.sendRequest('textDocument/semanticTokens/full', {
      textDocument: { uri },
    });
  }

  async getInlayHints(uri: string, range: any): Promise<any> {
    return await this.sendRequest('textDocument/inlayHint', {
      textDocument: { uri },
      range,
    });
  }
}

export function createTypeScriptLSPServer(workspaceRoot: string): TypeScriptLSPServer {
  return new TypeScriptLSPServer(workspaceRoot);
}
