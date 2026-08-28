/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

/**
 * Locate the REAL `@prisma/client` package directory by walking up from
 * `startDir`. In a hoisted monorepo the package is typically at the repo-root
 * `node_modules` — NOT inside the workspace's own `node_modules`. We must not
 * create a local shadow directory there: an `@prisma/client` dir without
 * `package.json`/`index.js` shadows the real package and breaks
 * `import { PrismaClient } from '@prisma/client'` (Vite/Node resolution error).
 */
function resolvePrismaClientPackageDir(startDir) {
  let dir = startDir;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', '@prisma', 'client');
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The generated client lives as `.prisma` next to `@prisma` inside the same
 * `node_modules` level (e.g. `<repo>/node_modules/.prisma`), which is exactly
 * what the published `@prisma/client` expects via `require('.prisma/client')`.
 * Prefer that sibling so the Prisma tree stays self-contained; fall back to a
 * walk-up scan (covers non-hoisted installs where the generated client lives
 * at the workspace level).
 */
function resolveGeneratedPrismaDir(pkgDir, startDir) {
  const sibling = path.join(path.dirname(path.dirname(pkgDir)), '.prisma');
  if (fs.existsSync(path.join(sibling, 'client', 'index.js'))) return sibling;

  let dir = startDir;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', '.prisma');
    if (fs.existsSync(path.join(candidate, 'client', 'index.js'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Remove any incomplete `@prisma/client` shadow directory (a dir without
 * `package.json`) that older buggy versions of this script created in the
 * workspace's own `node_modules`.
 */
function removeIncompleteShadow(cwd, pkgDir) {
  const shadow = path.join(cwd, 'node_modules', '@prisma', 'client');
  if (shadow === pkgDir) return;
  if (fs.existsSync(shadow) && !fs.existsSync(path.join(shadow, 'package.json'))) {
    fs.rmSync(shadow, { recursive: true, force: true });
    console.log('[fix-prisma-client] Removido shadow incompleto:', shadow);
  }
}

function ensurePrismaClientLink() {
  const cwd = process.cwd();

  const pkgDir = resolvePrismaClientPackageDir(cwd);
  if (!pkgDir) {
    console.warn('[fix-prisma-client] @prisma/client não encontrado; rode `npm install` primeiro.');
    return;
  }

  removeIncompleteShadow(cwd, pkgDir);

  const generatedDir = resolveGeneratedPrismaDir(pkgDir, cwd);
  if (!generatedDir) {
    console.warn('[fix-prisma-client] node_modules/.prisma não existe; rode `prisma generate` primeiro.');
    return;
  }

  const linkPath = path.join(pkgDir, '.prisma');
  if (fs.existsSync(linkPath)) {
    return;
  }

  try {
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(generatedDir, linkPath, type);
    console.log('[fix-prisma-client] Criado link:', linkPath, '->', generatedDir);
    return;
  } catch (e) {
    console.warn('[fix-prisma-client] Falhou symlink/junction, fallback para cópia. Motivo:', e && e.message ? e.message : e);
  }

  try {
    fs.cpSync(generatedDir, linkPath, { recursive: true });
    console.log('[fix-prisma-client] Copiado:', generatedDir, '->', linkPath);
  } catch (e) {
    console.error('[fix-prisma-client] Falhou copiar .prisma. Motivo:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
}

ensurePrismaClientLink();
