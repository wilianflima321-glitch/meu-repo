import * as fs from 'fs/promises';
import * as path from 'path';
import type { BuildArtifact } from './build-runtime.types';

export async function collectArtifacts(dir: string, artifacts: BuildArtifact[]): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        artifacts.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
          type: inferArtifactType(entry.name),
        });
      } else if (entry.isDirectory()) {
        await collectArtifacts(fullPath, artifacts);
      }
    }
  } catch {
    // Directory does not exist yet.
  }
}

function inferArtifactType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  if (['.exe', ''].includes(ext)) return 'executable';
  if (['.js', '.mjs', '.cjs'].includes(ext)) return 'javascript';
  if (['.css'].includes(ext)) return 'stylesheet';
  if (['.html'].includes(ext)) return 'html';
  if (['.map'].includes(ext)) return 'sourcemap';
  if (['.wasm'].includes(ext)) return 'webassembly';
  if (['.dll', '.so', '.dylib'].includes(ext)) return 'library';

  return 'other';
}
