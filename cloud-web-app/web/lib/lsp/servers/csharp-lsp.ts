/**
 * C# LSP Server Implementation
 * Uses OmniSharp
 */

import { LSPServerBase, LSPServerConfig } from '../lsp-server-base';

export class CSharpLSPServer extends LSPServerBase {
  constructor(workspaceRoot: string) {
    const config: LSPServerConfig = {
      command: 'omnisharp',
      args: ['-lsp', '-z'],
      cwd: workspaceRoot,
      env: {
        ...process.env,
      },
      initializationOptions: {
        FormattingOptions: {
          EnableEditorConfigSupport: true,
          OrganizeImports: true,
        },
        RoslynExtensionsOptions: {
          EnableAnalyzersSupport: true,
          EnableImportCompletion: true,
          EnableDecompilationSupport: true,
        },
        Sdk: {
          IncludePrereleases: true,
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
              triggerCharacters: ['.', ' '],
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
                'source.organizeImports',
                'source.fixAll',
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
                'omnisharp.runCodeAction',
                'omnisharp.fixAll',
                'omnisharp.organizeImports',
              ],
            },
            semanticTokensProvider: {
              legend: {
                tokenTypes: [
                  'namespace', 'class', 'enum', 'interface', 'struct',
                  'typeParameter', 'type', 'parameter', 'variable',
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
          },
          serverInfo: {
            name: 'OmniSharp',
            version: '1.39.8',
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
        label: 'Console',
        kind: 7, // Class
        detail: 'class System.Console',
        documentation: 'Represents the standard input, output, and error streams for console applications.',
        insertText: 'Console',
      },
      {
        label: 'WriteLine',
        kind: 2, // Method
        detail: '(method) Console.WriteLine(string value): void',
        documentation: 'Writes the specified string value, followed by the current line terminator, to the standard output stream.',
        insertText: 'WriteLine(${1:value});',
        insertTextFormat: 2,
      },
      {
        label: 'string',
        kind: 14, // Keyword
        detail: 'string type',
        documentation: 'Represents text as a sequence of UTF-16 code units.',
        insertText: 'string',
      },
      {
        label: 'List',
        kind: 7,
        detail: 'class System.Collections.Generic.List<T>',
        documentation: 'Represents a strongly typed list of objects that can be accessed by index.',
        insertText: 'List',
      },
      {
        label: 'var',
        kind: 14,
        detail: 'implicitly typed local variable',
        documentation: 'Declares an implicitly typed local variable.',
        insertText: 'var ${1:name} = ${2:value};',
        insertTextFormat: 2,
      },
      {
        label: 'class',
        kind: 14,
        detail: 'class declaration',
        documentation: 'Define a class',
        insertText: 'class ${1:ClassName}\n{\n    ${2:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'interface',
        kind: 14,
        detail: 'interface declaration',
        documentation: 'Define an interface',
        insertText: 'interface ${1:IInterfaceName}\n{\n    ${2:// members}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'public',
        kind: 14,
        detail: 'access modifier',
        documentation: 'Public access modifier',
        insertText: 'public ',
      },
      {
        label: 'async',
        kind: 14,
        detail: 'async modifier',
        documentation: 'Marks a method as asynchronous',
        insertText: 'async ',
      },
      {
        label: 'await',
        kind: 14,
        detail: 'await operator',
        documentation: 'Suspends evaluation of the enclosing async method until the asynchronous operation completes',
        insertText: 'await ',
      },
    ];
  }

  private getMockHover(params: any): any {
    return {
      contents: {
        language: 'csharp',
        value: 'public static void WriteLine(string value)\n\nWrites the specified string value, followed by the current line terminator, to the standard output stream.',
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
        title: 'Organize usings',
        kind: 'source.organizeImports',
        command: {
          title: 'Organize usings',
          command: 'omnisharp.organizeImports',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Fix all',
        kind: 'source.fixAll',
        command: {
          title: 'Fix all',
          command: 'omnisharp.fixAll',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Extract method',
        kind: 'refactor.extract.method',
        command: {
          title: 'Extract method',
          command: 'omnisharp.runCodeAction',
          arguments: [params.textDocument.uri, 'Extract method'],
        },
      },
      {
        title: 'Extract local',
        kind: 'refactor.extract.variable',
        command: {
          title: 'Extract local',
          command: 'omnisharp.runCodeAction',
          arguments: [params.textDocument.uri, 'Extract local'],
        },
      },
    ];
  }

  /**
   * C#-specific features
   */
  async organizeUsings(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'omnisharp.organizeImports',
      arguments: [uri],
    });
  }

  async fixAll(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'omnisharp.fixAll',
      arguments: [uri],
    });
  }
}

export function createCSharpLSPServer(workspaceRoot: string): CSharpLSPServer {
  return new CSharpLSPServer(workspaceRoot);
}
