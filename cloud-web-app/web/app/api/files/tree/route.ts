import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * POST /api/files/tree - Get File Tree Structure
 * 
 * Returns a hierarchical file tree for the workspace explorer
 */

interface FileTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  expanded?: boolean;
  children?: FileTreeEntry[];
  size?: number;
  modified?: string;
}

const IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  '.vercel',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  'venv',
  '.venv',
  'env',
  '.env.local',
  '.DS_Store',
  'Thumbs.db',
  '*.pyc',
  '*.pyo',
  '.coverage',
  'coverage',
  '.nyc_output',
];

function isIgnored(name: string): boolean {
  return IGNORED_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(name);
    }
    return name === pattern;
  });
}

async function buildTree(
  dirPath: string,
  maxDepth: number = 5,
  currentDepth: number = 0
): Promise<FileTreeEntry[]> {
  if (currentDepth >= maxDepth) return [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result: FileTreeEntry[] = [];

    // Sort: directories first, then alphabetically
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (isIgnored(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const isDirectory = entry.isDirectory();

      const treeEntry: FileTreeEntry = {
        name: entry.name,
        path: fullPath,
        type: isDirectory ? 'directory' : 'file',
      };

      if (isDirectory) {
        treeEntry.expanded = false;
        // Only include children for first 2 levels by default
        if (currentDepth < 2) {
          treeEntry.children = await buildTree(fullPath, maxDepth, currentDepth + 1);
        } else {
          treeEntry.children = [];
        }
      } else {
        try {
          const stats = await fs.stat(fullPath);
          treeEntry.size = stats.size;
          treeEntry.modified = stats.mtime.toISOString();
        } catch {
          // Ignore stat errors
        }
      }

      result.push(treeEntry);
    }

    return result;
  } catch (error) {
    console.error(`[FileTree] Error reading ${dirPath}:`, error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    const body = await request.json();
    const { path: rootPath, maxDepth = 5 } = body;

    if (!rootPath) {
      return NextResponse.json(
        { error: 'path is required' },
        { status: 400 }
      );
    }

    const resolvedPath = resolveWorkspaceRoot(rootPath);

    // Check if path exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return NextResponse.json(
        { error: 'Path does not exist or is not accessible' },
        { status: 404 }
      );
    }

    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      );
    }

    // Build the tree
    const children = await buildTree(resolvedPath, maxDepth);

    const tree: FileTreeEntry = {
      name: path.basename(resolvedPath) || resolvedPath,
      path: resolvedPath,
      type: 'directory',
      expanded: true,
      children,
    };

    return NextResponse.json(tree);
  } catch (error) {
    console.error('File tree operation failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: 'Failed to build file tree', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
