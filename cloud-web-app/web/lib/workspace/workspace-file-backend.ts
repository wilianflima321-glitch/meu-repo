export interface WorkspaceFileOperationResponse {
  content: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  created?: string;
  readonly?: boolean;
  entries: Array<{ name: string; isDirectory: boolean; size: number; modified: string }>;
}

export async function performWorkspaceFileOperation(
  operation: string,
  _uri: string,
  data?: Record<string, unknown>,
): Promise<WorkspaceFileOperationResponse> {
  // Browser builds use the API-backed implementation later; this backend keeps
  // the workspace service deterministic when a filesystem bridge is absent.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        switch (operation) {
          case 'read':
            resolve({ content: '', isDirectory: false, size: 0, modified: new Date().toISOString(), entries: [] });
            break;
          case 'write':
            resolve({ content: (data?.content as string) || '', isDirectory: false, size: 0, modified: new Date().toISOString(), entries: [] });
            break;
          case 'delete':
          case 'mkdir':
          case 'rmdir':
          case 'rename':
            resolve({ content: '', isDirectory: false, size: 0, modified: new Date().toISOString(), entries: [] });
            break;
          case 'stat':
            resolve({
              content: '',
              isDirectory: false,
              size: 1024,
              modified: new Date().toISOString(),
              created: new Date().toISOString(),
              readonly: false,
              entries: [],
            });
            break;
          case 'readdir':
            resolve({ content: '', isDirectory: true, size: 0, modified: new Date().toISOString(), entries: [] });
            break;
          default:
            reject(new Error(`Unknown operation: ${operation}`));
        }
      } catch (error) {
        reject(error);
      }
    }, 10);
  });
}
