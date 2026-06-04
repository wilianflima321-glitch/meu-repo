import { FileCode, FileJson, FileText, type LucideIcon } from 'lucide-react'

const FILE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  '.ts': { icon: FileCode, color: 'rgb(49, 120, 198)' },
  '.tsx': { icon: FileCode, color: 'rgb(49, 120, 198)' },
  '.js': { icon: FileCode, color: 'rgb(247, 223, 30)' },
  '.jsx': { icon: FileCode, color: 'rgb(97, 218, 251)' },
  '.json': { icon: FileJson, color: 'rgb(203, 203, 65)' },
  '.md': { icon: FileText, color: 'rgb(81, 154, 186)' },
  '.css': { icon: FileCode, color: 'rgb(86, 61, 124)' },
  '.scss': { icon: FileCode, color: 'rgb(204, 102, 153)' },
  '.html': { icon: FileCode, color: 'rgb(227, 76, 38)' },
  '.py': { icon: FileCode, color: 'rgb(53, 114, 165)' },
  '.rs': { icon: FileCode, color: 'rgb(222, 165, 132)' },
  '.go': { icon: FileCode, color: 'rgb(0, 173, 216)' },
};

export function getFileIcon(path: string): { icon: LucideIcon; color: string } {
  const ext = path.match(/\.[^.]+$/)?.[0] || '';
  return FILE_ICONS[ext] || { icon: FileText, color: 'var(--aethel-text-muted)' };
}

// ============================================================================
// Tab Provider
// ============================================================================
