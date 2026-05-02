import type { LSPParams, Position } from '../lsp-server-base';

type MockDocumentParams = {
  textDocument?: { uri?: string };
  position?: Position;
};

export function getMockDocumentParams(params: LSPParams): { textDocument: { uri: string }; position: Position } {
  const mockParams = params as MockDocumentParams;
  return {
    textDocument: { uri: mockParams.textDocument?.uri || '' },
    position: mockParams.position || { line: 0, character: 0 },
  };
}
