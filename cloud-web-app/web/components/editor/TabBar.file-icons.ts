import { FileCode, FileJson, FileText, type LucideIcon } from 'lucide-react'

const FILE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  '.ts': { icon: FileCode, color: 'var(--aethel-file-icon-ts)' },
  '.tsx': { icon: FileCode, color: 'var(--aethel-file-icon-ts)' },
  '.js': { icon: FileCode, color: 'var(--aethel-file-icon-js)' },
  '.jsx': { icon: FileCode, color: 'var(--aethel-file-icon-jsx)' },
  '.json': { icon: FileJson, color: 'var(--aethel-file-icon-json)' },
  '.md': { icon: FileText, color: 'var(--aethel-file-icon-md)' },
  '.css': { icon: FileCode, color: 'var(--aethel-file-icon-css)' },
  '.scss': { icon: FileCode, color: 'var(--aethel-file-icon-scss)' },
  '.html': { icon: FileCode, color: 'var(--aethel-file-icon-html)' },
  '.py': { icon: FileCode, color: 'var(--aethel-file-icon-py)' },
  '.rs': { icon: FileCode, color: 'var(--aethel-file-icon-rs)' },
  '.go': { icon: FileCode, color: 'var(--aethel-file-icon-go)' },
};

export function getFileIcon(path: string): { icon: LucideIcon; color: string } {
  const ext = path.match(/\.[^.]+$/)?.[0] || '';
  return FILE_ICONS[ext] || { icon: FileText, color: 'var(--aethel-text-muted)' };
}

// ============================================================================
// Tab Provider
// ============================================================================
