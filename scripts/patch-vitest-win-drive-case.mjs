#!/usr/bin/env node
/**
 * patch-vitest-win-drive-case.mjs
 *
 * Self-healing, version-guarded patch for the Vitest 4 Windows drive-letter
 * ESM module-identity bug (pre-existing environment debt, unrelated to Aethel
 * source code).
 *
 * ROOT CAUSE (proven empirically):
 *   Node keys the ESM module cache by the exact resolved URL STRING. On Windows,
 *   the worker-boot static imports of `@vitest/runner` resolve through the
 *   worker entry's parent URL (uppercase `file:///E:/...` when the CLI entry
 *   path carries an uppercase drive), while vitest's patched externalize path
 *   was producing lowercase `file:///e:/...` URLs. The result is TWO module
 *   instances of the same physical `chunk-artifact.js`: the worker binds
 *   module-level `runner` in one instance, but the test file's `describe`
 *   executes `initSuite` in the other instance where `runner` is undefined →
 *   `Vitest failed to find the runner` / `Cannot read properties of undefined
 *   (reading 'config')`.
 *
 * FIX:
 *   Canonicalize the drive letter of every `file://` URL vitest mints for
 *   module loading to the UPPERCASE form (the convention `pathe`/Vite's
 *   normalizePath already uses for every other minted URL, so this unifies all
 *   dialects into ONE module instance):
 *     1. VitestModuleEvaluator.runExternalModule (default vite-module-runner path)
 *        -> node_modules/vitest/dist/module-evaluator.js
 *     2. NativeModuleRunner.import (experimental.viteModuleRunner:false path)
 *        -> node_modules/vitest/dist/chunks/nativeModuleRunner.BIakptoF.js
 *   The transform is idempotent, Windows-only (guarded by `isWindows` in the
 *   injected code / drive-letter regex), and inert on POSIX. Version-guarded:
 *   the script only applies when the pristine target lines are present; if a
 *   future vitest version changes those lines, the script warns loudly instead
 *   of corrupting the package.
 *
 * Usage:
 *   node scripts/patch-vitest-win-drive-case.mjs [repoRoot] [--strict]
 *   Default repoRoot = this file's parent's parent. --strict exits 1 on a
 *   version mismatch (for CI drift detection); the default postinstall run is
 *   non-strict and exits 0 so installs never break.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const repoRoot = args.find((a) => a && !a.startsWith('-')) ?? path.resolve(__dirname, '..');

const TARGETS = [
  {
    name: 'module-evaluator.js (default vite-module-runner path)',
    file: path.join(repoRoot, 'node_modules', 'vitest', 'dist', 'module-evaluator.js'),
    alreadyApplied: (content) => content.includes('match[1].toUpperCase()'),
    apply: (content) => {
      // Self-heal: an older run of this script left a LOWERCASE normalization
      // (the opposite direction of the current canonical fix). Flip it in
      // place before the pristine-line guard, so stale machines migrate.
      if (content.includes('match[1].toLowerCase()')) {
        content = content.replaceAll('match[1].toLowerCase()', 'match[1].toUpperCase()');
        return content;
      }
      const pristineCall = '\t\tconst file = this.convertIdToImportUrl(id);';
      const normalizedCall = '\t\tconst file = this.normalizeExternalUrl(this.convertIdToImportUrl(id));';
      if (!content.includes(pristineCall)) return null; // version mismatch
      content = content.replace(pristineCall, normalizedCall);

      const methodBlock = [
        '\t// Windows ESM module-identity unification. Node keys the ESM module cache by the',
        '\t// exact resolved URL string. The worker boot resolves @vitest/runner with an',
        '\t// uppercase drive URL (file:///E:/...), while this externalize path can mint a',
        '\t// lowercase variant (file:///e:/...). Without normalization the same physical',
        '\t// file is loaded as two distinct module instances, so the module-level `runner`',
        '\t// bound by the worker is invisible to the instance executing the test file\'s',
        '\t// `describe`. Uppercasing the drive letter (idempotent, matching pathe/Vite\'s',
        '\t// own convention) unifies both dialects into one module instance.',
        '\tnormalizeExternalUrl(id) {',
        '\t\tif (!isWindows || !id.startsWith("file:///")) return id;',
        '\t\tconst match = /^file:\\/\\/\\/([A-Za-z]):/.exec(id);',
        '\t\tif (!match) return id;',
        '\t\treturn `file:///${match[1].toUpperCase()}:${id.slice(match[0].length)}`;',
        '\t}',
      ].join('\n');
      const anchor = '\tasync runExternalModule(id) {';
      if (!content.includes(anchor)) return null; // version mismatch
      content = content.replace(anchor, `${methodBlock}\n${anchor}`);
      return content;
    },
  },
  {
    name: 'nativeModuleRunner.BIakptoF.js (experimental.viteModuleRunner:false path)',
    file: path.join(repoRoot, 'node_modules', 'vitest', 'dist', 'chunks', 'nativeModuleRunner.BIakptoF.js'),
    alreadyApplied: (content) => content.includes('drive.toUpperCase()'),
    apply: (content) => {
      // Self-heal the old lowercase variant before the pristine-line guard.
      if (content.includes('drive.toLowerCase()')) {
        return content.replaceAll('drive.toLowerCase()', 'drive.toUpperCase()');
      }
      const pristineLine = '\t\tconst url = pathToFileURL(path + queryParams).toString();';
      if (!content.includes(pristineLine)) return null; // version mismatch
      const replacement = [
        '\t\t// Windows ESM module-identity unification: the worker boot resolves',
        '\t\t// @vitest/runner with an uppercase drive URL (file:///E:/...), while this',
        '\t\t// minting can produce a lowercase variant (file:///e:/...). Node keys the',
        '\t\t// ESM cache by the exact URL string, so the mismatch loads the same physical',
        '\t\t// file as two module instances and the worker-bound `runner` is invisible to',
        '\t\t// the test file\'s `describe`. Uppercase the drive letter (idempotent, the',
        '\t\t// pathe/Vite convention) to unify both dialects into one instance.',
        '\t\tconst url = pathToFileURL(path + queryParams).toString().replace(/^file:\\/\\/\\/([A-Za-z]):/, (_, drive) => `file:///${drive.toUpperCase()}:`);',
      ].join('\n');
      return content.replace(pristineLine, replacement);
    },
  },
];

let mismatches = 0;
for (const target of TARGETS) {
  if (!fs.existsSync(target.file)) {
    console.warn(`[patch-vitest-win-drive-case] SKIP (file not found): ${target.file}`);
    continue;
  }
  const original = fs.readFileSync(target.file, 'utf8');
  if (target.alreadyApplied(original)) {
    console.log(`[patch-vitest-win-drive-case] OK (already patched): ${target.name}`);
    continue;
  }
  const patched = target.apply(original);
  if (patched === null) {
    mismatches += 1;
    console.warn(
      `[patch-vitest-win-drive-case] VERSION MISMATCH — pristine markers not found in ${target.name}; ` +
        'review whether this vitest version still needs the Windows drive-letter normalization. ' +
        'Not applying any patch to avoid corrupting the package.'
    );
    continue;
  }
  fs.writeFileSync(target.file, patched, 'utf8');
  console.log(`[patch-vitest-win-drive-case] PATCHED: ${target.name}`);
}

if (mismatches > 0 && strict) {
  console.error(`[patch-vitest-win-drive-case] ${mismatches} target(s) failed version-guard (--strict).`);
  process.exit(1);
}
process.exit(0);
