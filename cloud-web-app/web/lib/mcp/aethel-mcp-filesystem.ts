import { prisma } from '@/lib/db';

const USE_REAL_FILESYSTEM =
  typeof process !== 'undefined' && process.env.USE_REAL_FILESYSTEM === 'true';

const WORKSPACE_ROOT =
  typeof process !== 'undefined' ? process.env.WORKSPACE_ROOT || process.cwd() : '/workspace';

export interface FileSystemAdapter {
  readFile(
    filePath: string,
    options?: { startLine?: number; endLine?: number }
  ): Promise<{ content: string; language?: string } | null>;
  writeFile(filePath: string, content: string): Promise<boolean>;
  deleteFile(filePath: string): Promise<boolean>;
  listDirectory(dirPath: string, recursive?: boolean): Promise<string[]>;
  exists(filePath: string): Promise<boolean>;
  mkdir(dirPath: string): Promise<boolean>;
}

function resolveSecurePath(basePath: string, relativePath: string): string | null {
  const path = typeof require !== 'undefined' ? require('path') : null;
  if (!path) return null;

  const resolved = path.resolve(basePath, relativePath);
  if (!resolved.startsWith(basePath)) return null;
  return resolved;
}

async function createRealFSAdapter(): Promise<FileSystemAdapter | null> {
  if (typeof require === 'undefined') return null;

  try {
    const fs = require('fs').promises;
    const path = require('path');

    return {
      async readFile(filePath, options) {
        const fullPath = resolveSecurePath(WORKSPACE_ROOT, filePath);
        if (!fullPath) return null;

        try {
          let content = await fs.readFile(fullPath, 'utf-8');

          if (options?.startLine || options?.endLine) {
            const lines = content.split('\n');
            const start = Math.max(0, (options.startLine || 1) - 1);
            const end = Math.min(lines.length, options.endLine || lines.length);
            content = lines.slice(start, end).join('\n');
          }

          const ext = path.extname(filePath).toLowerCase();
          const langMap: Record<string, string> = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.json': 'json',
            '.css': 'css',
            '.html': 'html',
            '.py': 'python',
            '.rs': 'rust',
            '.go': 'go',
            '.md': 'markdown',
            '.yaml': 'yaml',
            '.yml': 'yaml',
          };

          return { content, language: langMap[ext] };
        } catch {
          return null;
        }
      },

      async writeFile(filePath, content) {
        const fullPath = resolveSecurePath(WORKSPACE_ROOT, filePath);
        if (!fullPath) return false;

        try {
          const dir = path.dirname(fullPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
          return true;
        } catch {
          return false;
        }
      },

      async deleteFile(filePath) {
        const fullPath = resolveSecurePath(WORKSPACE_ROOT, filePath);
        if (!fullPath) return false;

        try {
          await fs.unlink(fullPath);
          return true;
        } catch {
          return false;
        }
      },

      async listDirectory(dirPath, recursive = false) {
        const fullPath = resolveSecurePath(WORKSPACE_ROOT, dirPath);
        if (!fullPath) return [];

        try {
          if (recursive) {
            const results: string[] = [];
            async function walk(dir: string, base: string) {
              const entries = await fs.readdir(dir, { withFileTypes: true });
              for (const entry of entries) {
                const rel = path.join(base, entry.name);
                results.push(rel);
                if (entry.isDirectory()) {
                  await walk(path.join(dir, entry.name), rel);
                }
              }
            }
            await walk(fullPath, dirPath);
            return results;
          }

          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          return entries.map((entry: any) => path.join(dirPath, entry.name + (entry.isDirectory() ? '/' : '')));
        } catch {
          return [];
        }
      },

      async exists(filePath) {
        const fullPath = resolveSecurePath(WORKSPACE_ROOT, filePath);
        if (!fullPath) return false;

        try {
          await fs.access(fullPath);
          return true;
        } catch {
          return false;
        }
      },

      async mkdir(dirPath) {
        const fullPath = resolveSecurePath(WORKSPACE_ROOT, dirPath);
        if (!fullPath) return false;

        try {
          await fs.mkdir(fullPath, { recursive: true });
          return true;
        } catch {
          return false;
        }
      },
    };
  } catch {
    return null;
  }
}

const prismaAdapter: FileSystemAdapter = {
  async readFile(filePath, options) {
    try {
      const file = await prisma.file.findFirst({
        where: { path: { contains: filePath } },
        select: { content: true, language: true },
      });

      if (!file) return null;

      let content = file.content || '';
      if (options?.startLine || options?.endLine) {
        const lines = content.split('\n');
        const start = Math.max(0, (options.startLine || 1) - 1);
        const end = Math.min(lines.length, options.endLine || lines.length);
        content = lines.slice(start, end).join('\n');
      }

      return { content, language: file.language || undefined };
    } catch {
      return null;
    }
  },

  async writeFile(filePath, content) {
    try {
      await prisma.file.upsert({
        where: { id: filePath },
        create: { path: filePath, content, projectId: 'default' },
        update: { content },
      });
      return true;
    } catch {
      return false;
    }
  },

  async deleteFile(filePath) {
    try {
      await prisma.file.deleteMany({ where: { path: filePath } });
      return true;
    } catch {
      return false;
    }
  },

  async listDirectory(dirPath, recursive = false) {
    try {
      const files = await prisma.file.findMany({
        where: { path: { startsWith: dirPath } },
        select: { path: true },
      });

      const items = files.map((file) => file.path);
      if (!recursive) {
        const depth = dirPath.split('/').filter(Boolean).length;
        return items.filter((item) => item.split('/').filter(Boolean).length === depth + 1);
      }
      return items;
    } catch {
      return [];
    }
  },

  async exists(filePath) {
    try {
      const file = await prisma.file.findFirst({ where: { path: filePath } });
      return !!file;
    } catch {
      return false;
    }
  },

  async mkdir() {
    return true;
  },
};

let fsAdapter: FileSystemAdapter = prismaAdapter;

if (USE_REAL_FILESYSTEM) {
  createRealFSAdapter().then((adapter) => {
    if (adapter) {
      fsAdapter = adapter;
      console.log('[MCP] Using real filesystem adapter');
    } else {
      console.log('[MCP] Falling back to Prisma adapter');
    }
  });
}

export function getFileSystemAdapter(): FileSystemAdapter {
  return fsAdapter;
}

export function setFileSystemMode(useRealFS: boolean): void {
  if (useRealFS) {
    createRealFSAdapter().then((adapter) => {
      if (adapter) fsAdapter = adapter;
    });
    return;
  }
  fsAdapter = prismaAdapter;
}
