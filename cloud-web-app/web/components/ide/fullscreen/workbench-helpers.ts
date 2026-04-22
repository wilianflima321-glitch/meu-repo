/**
 * Workbench helpers — pure utility functions extracted from FullscreenIDE.tsx
 * to keep the god-component slim and make helpers independently testable.
 *
 * Safe-to-edit: no React, no side effects, 100% pure.
 */

export type WorkspaceTreeNode = {
  path?: string;
  type?: 'file' | 'directory';
  children?: WorkspaceTreeNode[];
};

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function resolveLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'js' || ext === 'jsx') return 'javascript';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  if (ext === 'css' || ext === 'scss') return 'css';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'py') return 'python';
  return 'plaintext';
}

export function normalizePath(input: string): string {
  if (!input) return '/';
  return input.startsWith('/') ? input : `/${input}`;
}

export function collaborationColorForUser(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(index);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 72%, 56%)`;
}

export function pickFirstFilePath(nodes: WorkspaceTreeNode[]): string | null {
  const preferred = ['tsx', 'ts', 'jsx', 'js', 'html', 'htm', 'md', 'json', 'css'];

  const allFiles: string[] = [];
  const walk = (list: WorkspaceTreeNode[]) => {
    for (const node of list) {
      if (!node) continue;
      if (node.type === 'file' && typeof node.path === 'string' && node.path.trim()) {
        allFiles.push(node.path);
      }
      if (node.type === 'directory' && Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  };
  walk(nodes);

  if (allFiles.length === 0) return null;
  const ranked = [...allFiles].sort((a, b) => {
    const extA = a.split('.').pop()?.toLowerCase() ?? '';
    const extB = b.split('.').pop()?.toLowerCase() ?? '';
    const idxA = preferred.indexOf(extA);
    const idxB = preferred.indexOf(extB);
    const scoreA = idxA >= 0 ? idxA : preferred.length + 1;
    const scoreB = idxB >= 0 ? idxB : preferred.length + 1;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.localeCompare(b);
  });
  return normalizePath(ranked[0]);
}
