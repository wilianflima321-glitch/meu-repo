// @aethel-heavy-async-boundary IDE/Monaco LSP configuration; never import from route shells.
export const DEFAULT_LSP_WS_URL = 'ws://localhost:3001/lsp';
export const DEFAULT_LSP_ROOT_URI = 'file:///workspace';
export const DEFAULT_LSP_WORKSPACE_FOLDERS = [{ uri: DEFAULT_LSP_ROOT_URI, name: 'workspace' }];
export const LSP_REQUEST_TIMEOUT_MS = 10_000;

export const SUPPORTED_LSP_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'cpp',
  'c',
  'java',
] as const;

export const LSP_CLIENT_CAPABILITIES = {
  textDocument: {
    synchronization: {
      dynamicRegistration: true,
      willSave: true,
      willSaveWaitUntil: true,
      didSave: true,
    },
    completion: {
      dynamicRegistration: true,
      completionItem: {
        snippetSupport: true,
        commitCharactersSupport: true,
        documentationFormat: ['markdown', 'plaintext'],
        deprecatedSupport: true,
        preselectSupport: true,
        insertReplaceSupport: true,
      },
      contextSupport: true,
    },
    hover: {
      dynamicRegistration: true,
      contentFormat: ['markdown', 'plaintext'],
    },
    signatureHelp: {
      dynamicRegistration: true,
      signatureInformation: {
        documentationFormat: ['markdown', 'plaintext'],
        parameterInformation: { labelOffsetSupport: true },
      },
    },
    definition: { dynamicRegistration: true },
    references: { dynamicRegistration: true },
    documentHighlight: { dynamicRegistration: true },
    documentSymbol: { dynamicRegistration: true },
    codeAction: { dynamicRegistration: true },
    codeLens: { dynamicRegistration: true },
    formatting: { dynamicRegistration: true },
    rangeFormatting: { dynamicRegistration: true },
    rename: { dynamicRegistration: true, prepareSupport: true },
    publishDiagnostics: { relatedInformation: true },
  },
  workspace: {
    applyEdit: true,
    workspaceEdit: { documentChanges: true },
    didChangeConfiguration: { dynamicRegistration: true },
    workspaceFolders: true,
    symbol: { dynamicRegistration: true },
  },
};
