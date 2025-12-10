/**
 * Java LSP Server Implementation
 * Uses Eclipse JDT Language Server
 */

import { LSPServerBase, LSPServerConfig } from '../lsp-server-base';

export class JavaLSPServer extends LSPServerBase {
  constructor(workspaceRoot: string) {
    const config: LSPServerConfig = {
      command: 'jdtls',
      args: [
        '-configuration', './config_linux',
        '-data', workspaceRoot,
      ],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        JAVA_HOME: process.env.JAVA_HOME || '/usr/lib/jvm/default-java',
      },
      initializationOptions: {
        bundles: [],
        workspaceFolders: [`file://${workspaceRoot}`],
        settings: {
          java: {
            home: process.env.JAVA_HOME || '/usr/lib/jvm/default-java',
            jdt: {
              ls: {
                vmargs: '-XX:+UseParallelGC -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -Dsun.zip.disableMemoryMapping=true -Xmx1G -Xms100m',
              },
            },
            errors: {
              incompleteClasspath: {
                severity: 'warning',
              },
            },
            configuration: {
              updateBuildConfiguration: 'interactive',
            },
            trace: {
              server: 'verbose',
            },
            import: {
              gradle: {
                enabled: true,
              },
              maven: {
                enabled: true,
              },
            },
            maven: {
              downloadSources: true,
            },
            referencesCodeLens: {
              enabled: true,
            },
            implementationsCodeLens: {
              enabled: true,
            },
            format: {
              enabled: true,
            },
          },
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
              triggerCharacters: ['.', '@', '#'],
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
                'source.generate',
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
                'java.edit.organizeImports',
                'java.project.import',
                'java.project.update',
                'java.navigate.openTypeHierarchy',
                'java.navigate.openCallHierarchy',
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
          },
          serverInfo: {
            name: 'Eclipse JDT Language Server',
            version: '1.26.0',
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
        label: 'System',
        kind: 7, // Class
        detail: 'java.lang.System',
        documentation: 'The System class contains several useful class fields and methods.',
        insertText: 'System',
      },
      {
        label: 'println',
        kind: 2, // Method
        detail: '(method) PrintStream.println(String x): void',
        documentation: 'Prints a String and then terminates the line.',
        insertText: 'println(${1:x});',
        insertTextFormat: 2,
      },
      {
        label: 'String',
        kind: 7,
        detail: 'java.lang.String',
        documentation: 'The String class represents character strings.',
        insertText: 'String',
      },
      {
        label: 'List',
        kind: 8, // Interface
        detail: 'java.util.List<E>',
        documentation: 'An ordered collection (also known as a sequence).',
        insertText: 'List',
      },
      {
        label: 'ArrayList',
        kind: 7,
        detail: 'java.util.ArrayList<E>',
        documentation: 'Resizable-array implementation of the List interface.',
        insertText: 'ArrayList',
      },
      {
        label: 'public',
        kind: 14, // Keyword
        detail: 'access modifier',
        documentation: 'Public access modifier',
        insertText: 'public ',
      },
      {
        label: 'class',
        kind: 14,
        detail: 'class declaration',
        documentation: 'Define a class',
        insertText: 'class ${1:ClassName} {\n    ${2:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'interface',
        kind: 14,
        detail: 'interface declaration',
        documentation: 'Define an interface',
        insertText: 'interface ${1:InterfaceName} {\n    ${2:// methods}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'for',
        kind: 14,
        detail: 'for loop',
        documentation: 'For loop statement',
        insertText: 'for (${1:int i = 0}; ${2:i < n}; ${3:i++}) {\n    ${4:// body}\n}',
        insertTextFormat: 2,
      },
      {
        label: 'if',
        kind: 14,
        detail: 'if statement',
        documentation: 'Conditional statement',
        insertText: 'if (${1:condition}) {\n    ${2:// body}\n}',
        insertTextFormat: 2,
      },
    ];
  }

  private getMockHover(params: any): any {
    return {
      contents: {
        language: 'java',
        value: 'public void println(String x)\n\nPrints a String and then terminates the line. This method behaves as though it invokes print(String) and then println().',
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
          command: 'java.edit.organizeImports',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Generate getters and setters',
        kind: 'source.generate',
        command: {
          title: 'Generate getters and setters',
          command: 'java.action.generateAccessors',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Extract to method',
        kind: 'refactor.extract.method',
        command: {
          title: 'Extract to method',
          command: 'java.action.extractMethod',
          arguments: [params.textDocument.uri],
        },
      },
      {
        title: 'Extract to variable',
        kind: 'refactor.extract.variable',
        command: {
          title: 'Extract to variable',
          command: 'java.action.extractVariable',
          arguments: [params.textDocument.uri],
        },
      },
    ];
  }

  /**
   * Java-specific features
   */
  async organizeImports(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'java.edit.organizeImports',
      arguments: [uri],
    });
  }

  async openTypeHierarchy(uri: string, position: any): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'java.navigate.openTypeHierarchy',
      arguments: [uri, position],
    });
  }

  async updateProject(uri: string): Promise<any> {
    return await this.sendRequest('workspace/executeCommand', {
      command: 'java.project.update',
      arguments: [uri],
    });
  }
}

export function createJavaLSPServer(workspaceRoot: string): JavaLSPServer {
  return new JavaLSPServer(workspaceRoot);
}
