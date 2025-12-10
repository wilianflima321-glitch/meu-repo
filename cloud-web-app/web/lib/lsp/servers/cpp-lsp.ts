/**
 * C++ LSP Server Implementation
 * Uses clangd
 */

import { LSPServerBase, LSPServerConfig } from '../lsp-server-base';

export class CppLSPServer extends LSPServerBase {
  constructor(workspaceRoot: string) {
    const config: LSPServerConfig = {
      command: 'clangd',
      args: [
        '--background-index',
        '--clang-tidy',
        '--completion-style=detailed',
        '--header-insertion=iwyu',
        '--pch-storage=memory',
      ],
      cwd: workspaceRoot,
      env: {
        ...process.env,
      },
      initializationOptions: {
        clangdFileStatus: true,
        fallbackFlags: ['-std=c++17'],
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
              triggerCharacters: ['.', '->', ':'],
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
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            renameProvider: {
              prepareProvider: true,
            },
            foldingRangeProvider: true,
            callHierarchyProvider: true,
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
            inlayHintProvider: true,
          },
          serverInfo: {
            name: 'clangd',
            version: '16.0.0',
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
        label: 'std::cout',
        kind: 6, // Variable
        detail: 'std::ostream',
        documentation: 'Standard output stream',
        insertText: 'std::cout',
      },
      {
        label: 'std::endl',
        kind: 6,
        detail: 'std::ostream& (*)(std::ostream&)',
        documentation: 'Insert newline and flush',
        insertText: 'std::endl',
      },
      {
        label: 'std::vector',
        kind: 7, // Class
        detail: 'template<typename T> class std::vector',
        documentation: 'Sequence container representing array that can change in size',
        insertText: 'std::vector',
      },
      {
        label: 'std::string',
        kind: 7,
        detail: 'class std::string',
        documentation: 'String class',
        insertText: 'std::string',
      },
      {
        label: 'std::unique_ptr',
        kind: 7,
        detail: 'template<typename T> class std::unique_ptr',
        documentation: 'Smart pointer with unique object ownership',
        insertText: 'std::unique_ptr',
      },
      {
        label: 'class',
        kind: 14, // Keyword
        detail: 'class definition',
        documentation: 'Define a class',
        insertText: 'class ${1:ClassName} {\npublic:\n    ${2:// public members}\nprivate:\n    ${3:// private members}\n};',
        insertTextFormat: 2,
      },
      {
        label: 'struct',
        kind: 14,
        detail: 'struct definition',
        documentation: 'Define a struct',
        insertText: 'struct ${1:StructName} {\n    ${2:// members}\n};',
        insertTextFormat: 2,
      },
      {
        label: 'template',
        kind: 14,
        detail: 'template declaration',
        documentation: 'Define a template',
        insertText: 'template<typename ${1:T}>\n${2:declaration}',
        insertTextFormat: 2,
      },
      {
        label: 'namespace',
        kind: 14,
        detail: 'namespace definition',
        documentation: 'Define a namespace',
        insertText: 'namespace ${1:name} {\n    ${2:// content}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'auto',
        kind: 14,
        detail: 'auto type',
        documentation: 'Automatic type deduction',
        insertText: 'auto ',
      },
    ];
  }

  private getMockHover(params: any): any {
    return {
      contents: {
        language: 'cpp',
        value: 'std::ostream& std::cout\n\nStandard output stream object. This is an instance of ostream class that represents the standard output stream oriented to narrow characters (of type char).',
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
        title: 'Add #include',
        kind: 'quickfix',
        command: {
          title: 'Add #include',
          command: 'clangd.applyFix',
          arguments: [],
        },
      },
      {
        title: 'Extract to function',
        kind: 'refactor.extract.function',
        command: {
          title: 'Extract to function',
          command: 'clangd.applyTweak',
          arguments: ['ExtractFunction'],
        },
      },
      {
        title: 'Extract to variable',
        kind: 'refactor.extract.variable',
        command: {
          title: 'Extract to variable',
          command: 'clangd.applyTweak',
          arguments: ['ExtractVariable'],
        },
      },
      {
        title: 'Expand auto',
        kind: 'refactor.rewrite',
        command: {
          title: 'Expand auto',
          command: 'clangd.applyTweak',
          arguments: ['ExpandAutoType'],
        },
      },
    ];
  }

  /**
   * C++-specific features
   */
  async switchSourceHeader(uri: string): Promise<string> {
    const result = await this.sendRequest('textDocument/switchSourceHeader', {
      uri,
    });
    return result || '';
  }

  async symbolInfo(uri: string, position: any): Promise<any> {
    return await this.sendRequest('textDocument/symbolInfo', {
      textDocument: { uri },
      position,
    });
  }
}

export function createCppLSPServer(workspaceRoot: string): CppLSPServer {
  return new CppLSPServer(workspaceRoot);
}
