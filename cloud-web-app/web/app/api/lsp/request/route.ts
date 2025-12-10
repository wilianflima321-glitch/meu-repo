import { NextRequest, NextResponse } from 'next/server';

interface LSPRequest {
  language: string;
  method: string;
  params: any;
  id: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: LSPRequest = await request.json();
    const { language, method, params, id } = body;

    if (!language || !method) {
      return NextResponse.json(
        { error: 'Language and method are required' },
        { status: 400 }
      );
    }

    console.log(`LSP Request [${language}]: ${method}`);

    // Mock LSP responses for demonstration
    // In production, this would communicate with actual language servers
    const result = await handleLSPRequest(language, method, params);

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result
    });
  } catch (error) {
    console.error('LSP request failed:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

async function handleLSPRequest(language: string, method: string, params: any): Promise<any> {
  // Mock responses based on method
  switch (method) {
    case 'initialize':
      return {
        capabilities: {
          textDocumentSync: 1,
          completionProvider: {
            resolveProvider: true,
            triggerCharacters: ['.', ':', '<']
          },
          hoverProvider: true,
          signatureHelpProvider: {
            triggerCharacters: ['(', ',']
          },
          definitionProvider: true,
          referencesProvider: true,
          documentHighlightProvider: true,
          documentSymbolProvider: true,
          workspaceSymbolProvider: true,
          codeActionProvider: true,
          codeLensProvider: {
            resolveProvider: true
          },
          documentFormattingProvider: true,
          documentRangeFormattingProvider: true,
          renameProvider: {
            prepareProvider: true
          },
          foldingRangeProvider: true,
          executeCommandProvider: {
            commands: ['editor.action.organizeImports']
          },
          workspace: {
            workspaceFolders: {
              supported: true,
              changeNotifications: true
            }
          }
        },
        serverInfo: {
          name: `${language}-language-server`,
          version: '1.0.0'
        }
      };

    case 'textDocument/completion':
      return getMockCompletions(language, params);

    case 'textDocument/hover':
      return getMockHover(language, params);

    case 'textDocument/signatureHelp':
      return getMockSignatureHelp(language, params);

    case 'textDocument/definition':
      return getMockDefinition(language, params);

    case 'textDocument/references':
      return getMockReferences(language, params);

    case 'textDocument/codeAction':
      return getMockCodeActions(language, params);

    case 'textDocument/formatting':
      return [];

    case 'shutdown':
      return null;

    default:
      console.warn(`Unhandled LSP method: ${method}`);
      return null;
  }
}

function getMockCompletions(language: string, params: any) {
  const commonCompletions = [
    {
      label: 'function',
      kind: 3,
      detail: 'Function declaration',
      insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
      documentation: 'Create a new function'
    },
    {
      label: 'class',
      kind: 7,
      detail: 'Class declaration',
      insertText: 'class ${1:ClassName} {\n\t$0\n}',
      documentation: 'Create a new class'
    },
    {
      label: 'if',
      kind: 14,
      detail: 'If statement',
      insertText: 'if (${1:condition}) {\n\t$0\n}',
      documentation: 'Conditional statement'
    },
    {
      label: 'for',
      kind: 14,
      detail: 'For loop',
      insertText: 'for (${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}',
      documentation: 'For loop'
    }
  ];

  const languageSpecific: Record<string, any[]> = {
    python: [
      {
        label: 'def',
        kind: 3,
        detail: 'Function definition',
        insertText: 'def ${1:function_name}(${2:params}):\n\t$0',
        documentation: 'Define a new function'
      },
      {
        label: 'class',
        kind: 7,
        detail: 'Class definition',
        insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t$0',
        documentation: 'Define a new class'
      },
      {
        label: 'import',
        kind: 9,
        detail: 'Import statement',
        insertText: 'import ${1:module}',
        documentation: 'Import a module'
      }
    ],
    typescript: [
      {
        label: 'interface',
        kind: 8,
        detail: 'Interface declaration',
        insertText: 'interface ${1:InterfaceName} {\n\t$0\n}',
        documentation: 'Define a new interface'
      },
      {
        label: 'type',
        kind: 8,
        detail: 'Type alias',
        insertText: 'type ${1:TypeName} = $0',
        documentation: 'Define a type alias'
      }
    ],
    go: [
      {
        label: 'func',
        kind: 3,
        detail: 'Function declaration',
        insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n\t$0\n}',
        documentation: 'Define a new function'
      },
      {
        label: 'struct',
        kind: 7,
        detail: 'Struct declaration',
        insertText: 'type ${1:StructName} struct {\n\t$0\n}',
        documentation: 'Define a new struct'
      }
    ],
    rust: [
      {
        label: 'fn',
        kind: 3,
        detail: 'Function declaration',
        insertText: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t$0\n}',
        documentation: 'Define a new function'
      },
      {
        label: 'struct',
        kind: 7,
        detail: 'Struct declaration',
        insertText: 'struct ${1:StructName} {\n\t$0\n}',
        documentation: 'Define a new struct'
      }
    ]
  };

  const items = [...commonCompletions, ...(languageSpecific[language] || [])];

  return {
    isIncomplete: false,
    items
  };
}

function getMockHover(language: string, params: any) {
  return {
    contents: {
      kind: 'markdown',
      value: `**${language} Symbol**\n\nType information and documentation would appear here.`
    },
    range: {
      start: params.position,
      end: { line: params.position.line, character: params.position.character + 10 }
    }
  };
}

function getMockSignatureHelp(language: string, params: any) {
  return {
    signatures: [
      {
        label: 'function(param1: string, param2: number): void',
        documentation: 'Function documentation',
        parameters: [
          {
            label: 'param1: string',
            documentation: 'First parameter'
          },
          {
            label: 'param2: number',
            documentation: 'Second parameter'
          }
        ]
      }
    ],
    activeSignature: 0,
    activeParameter: 0
  };
}

function getMockDefinition(language: string, params: any) {
  return {
    uri: params.textDocument.uri,
    range: {
      start: { line: 10, character: 0 },
      end: { line: 10, character: 20 }
    }
  };
}

function getMockReferences(language: string, params: any) {
  return [
    {
      uri: params.textDocument.uri,
      range: {
        start: { line: 5, character: 10 },
        end: { line: 5, character: 20 }
      }
    },
    {
      uri: params.textDocument.uri,
      range: {
        start: { line: 15, character: 5 },
        end: { line: 15, character: 15 }
      }
    }
  ];
}

function getMockCodeActions(language: string, params: any) {
  return [
    {
      title: 'Organize imports',
      kind: 'source.organizeImports',
      command: {
        title: 'Organize imports',
        command: 'editor.action.organizeImports',
        arguments: [params.textDocument.uri]
      }
    },
    {
      title: 'Fix all auto-fixable problems',
      kind: 'source.fixAll',
      edit: {
        changes: {}
      }
    }
  ];
}
