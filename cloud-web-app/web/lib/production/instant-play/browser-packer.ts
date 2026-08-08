/**
 * Instant Play — browser-packer stage.
 *
 * Bundles packages/engine/runtime-main.ts + generated game-scripts/registry into
 * a browser-loadable ESM using the monorepo's existing esbuild (via vite/vitest
 * hoist). Packing runs in a clean Node child process so jsdom/broken
 * TextEncoder environments (Vitest default) cannot poison esbuild.
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile, readFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import type { GeneratedSourceFile } from '@/lib/production/visual-script-transpile-stage'
import {
  GAME_SCRIPTS_REGISTRY_PATH,
  type GameScriptsRegistryEmitResult,
} from '@/lib/production/instant-play/game-scripts-registry'
import { INSTANT_PLAY_BUNDLE_FILENAME } from '@/lib/production/instant-play/html-emitter'

const execFileAsync = promisify(execFile)

export const INSTANT_PLAY_BUNDLE_PATH = INSTANT_PLAY_BUNDLE_FILENAME

export interface BrowserPackerInput {
  projectId: string
  registry: GameScriptsRegistryEmitResult
  scriptFiles: GeneratedSourceFile[]
  /** Override engine root (tests). Default: cloud-web-app/packages/engine */
  engineRoot?: string
}

export type BrowserPackerResult =
  | {
      ok: true
      path: string
      content: string
      contentType: 'text/javascript; charset=utf-8'
      byteLength: number
      bundler: 'esbuild'
    }
  | {
      ok: false
      reason: string
      heldStage: 'browser-packer'
    }

const ENTRY_FILENAME = 'instant-play-entry.ts'
const RUNNER_FILENAME = 'run-esbuild-pack.mjs'

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function resolveEngineRoot(override?: string): Promise<string> {
  if (override) return path.resolve(override)
  const candidates = [
    path.resolve(process.cwd(), '../packages/engine'),
    path.resolve(process.cwd(), 'packages/engine'),
    path.resolve(process.cwd(), '../../packages/engine'),
    path.resolve(process.cwd(), 'cloud-web-app/packages/engine'),
  ]
  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, 'runtime-main.ts'))) {
      return candidate
    }
  }
  return candidates[0]
}

function resolveEsbuildCliJs(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '../../node_modules/esbuild/lib/main.js'),
    path.resolve(process.cwd(), 'node_modules/esbuild/lib/main.js'),
    path.resolve(process.cwd(), '../../../node_modules/esbuild/lib/main.js'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function buildEntrySource(): string {
  return [
    "import { bootAethelRuntime } from './runtime-main.ts';",
    `import { buildGeneratedGameManifest, INSTANT_PLAY_PROJECT_ID } from './${GAME_SCRIPTS_REGISTRY_PATH.replace(/\.ts$/, '')}';`,
    '',
    'function mountInstantPlay() {',
    "  const mount = document.getElementById('aethel-root');",
    '  if (!mount) {',
    "    throw new Error('Instant Play mount #aethel-root missing');",
    '  }',
    '  const manifest = buildGeneratedGameManifest();',
    '  return bootAethelRuntime({',
    '    manifest,',
    "    mountElementId: 'aethel-root',",
    '    projectId: INSTANT_PLAY_PROJECT_ID,',
    '  });',
    '}',
    '',
    "if (typeof document !== 'undefined') {",
    "  if (document.readyState === 'loading') {",
    "    document.addEventListener('DOMContentLoaded', () => { mountInstantPlay(); }, { once: true });",
    '  } else {',
    '    mountInstantPlay();',
    '  }',
    '}',
    '',
    'export { bootAethelRuntime, buildGeneratedGameManifest, mountInstantPlay };',
    '',
  ].join('\n')
}

function buildLoggerStub(): string {
  return [
    'export const logger = {',
    '  error: (...args) => { if (typeof console !== "undefined") console.error(...args); },',
    '  warn: (...args) => { if (typeof console !== "undefined") console.warn(...args); },',
    '  info: (...args) => { if (typeof console !== "undefined") console.info(...args); },',
    '  debug: (...args) => { if (typeof console !== "undefined") console.debug(...args); },',
    '};',
    'export default logger;',
    '',
  ].join('\n')
}

function buildRunnerSource(input: {
  esbuildMain: string
  workDir: string
  entryFile: string
  outFile: string
  gameScriptPath: string
  replicationPath: string
  billingPath: string
  loggerStubPath: string
  nodePaths: string[]
}): string {
  return `import { createRequire } from 'node:module';
const require = createRequire(${JSON.stringify(input.esbuildMain)});
const esbuild = require(${JSON.stringify(input.esbuildMain)});
const loggerStubPath = ${JSON.stringify(input.loggerStubPath)};
const result = await esbuild.build({
  absWorkingDir: ${JSON.stringify(input.workDir)},
  entryPoints: [${JSON.stringify(input.entryFile)}],
  outfile: ${JSON.stringify(input.outFile)},
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  write: true,
  logLevel: 'silent',
  alias: {
    '@aethel/engine/runtime/GameScript': ${JSON.stringify(input.gameScriptPath)},
    '@aethel-engine/network/replication-client': ${JSON.stringify(input.replicationPath)},
    '@aethel-engine/billing/runtime-billing-client': ${JSON.stringify(input.billingPath)},
  },
  plugins: [{
    name: 'aethel-stub-web-logger',
    setup(build) {
      build.onResolve({ filter: /observability[/\\\\]logger/ }, () => ({ path: loggerStubPath }));
    },
  }],
  nodePaths: ${JSON.stringify(input.nodePaths)},
});
if (result.errors?.length) {
  console.error(JSON.stringify({ ok: false, errors: result.errors.map((e) => e.text) }));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
`
}

/**
 * Pack runtime-main + registry + transpiled scripts into browser ESM.
 */
export async function packInstantPlayBrowserBundle(
  input: BrowserPackerInput,
): Promise<BrowserPackerResult> {
  const esbuildMain = resolveEsbuildCliJs()
  if (!esbuildMain) {
    return {
      ok: false,
      reason:
        'browser-packer held — esbuild not found in monorepo node_modules (expected via vite/vitest hoist)',
      heldStage: 'browser-packer',
    }
  }

  const engineRoot = await resolveEngineRoot(input.engineRoot)
  if (!(await pathExists(path.join(engineRoot, 'runtime-main.ts')))) {
    return {
      ok: false,
      reason: `browser-packer held — runtime-main.ts not found under ${engineRoot}`,
      heldStage: 'browser-packer',
    }
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'aethel-instant-play-'))

  try {
    await mkdir(path.join(workDir, 'generated', 'scripts'), { recursive: true })
    await mkdir(path.join(workDir, 'stubs'), { recursive: true })

    const runtimeMainSource = await readFile(path.join(engineRoot, 'runtime-main.ts'), 'utf8')
    const rewrittenRuntime = runtimeMainSource
      .replace(
        /from '\.\/network\/replication-client'/g,
        "from '@aethel-engine/network/replication-client'",
      )
      .replace(
        /from '\.\/billing\/runtime-billing-client'/g,
        "from '@aethel-engine/billing/runtime-billing-client'",
      )
    await writeFile(path.join(workDir, 'runtime-main.ts'), rewrittenRuntime, 'utf8')
    await writeFile(path.join(workDir, GAME_SCRIPTS_REGISTRY_PATH), input.registry.content, 'utf8')

    for (const file of input.scriptFiles) {
      const dest = path.join(workDir, file.path)
      await mkdir(path.dirname(dest), { recursive: true })
      await writeFile(dest, file.content, 'utf8')
    }

    const loggerStubPath = path.join(workDir, 'stubs', 'browser-logger-stub.ts')
    const entryFile = path.join(workDir, ENTRY_FILENAME)
    const outFile = path.join(workDir, INSTANT_PLAY_BUNDLE_FILENAME)
    await writeFile(entryFile, buildEntrySource(), 'utf8')
    await writeFile(loggerStubPath, buildLoggerStub(), 'utf8')

    const runnerPath = path.join(workDir, RUNNER_FILENAME)
    await writeFile(
      runnerPath,
      buildRunnerSource({
        esbuildMain,
        workDir,
        entryFile,
        outFile,
        gameScriptPath: path.join(engineRoot, 'runtime', 'GameScript.ts'),
        replicationPath: path.join(engineRoot, 'network', 'replication-client.ts'),
        billingPath: path.join(engineRoot, 'billing', 'runtime-billing-client.ts'),
        loggerStubPath,
        nodePaths: [
          path.resolve(engineRoot, '../../../node_modules'),
          path.resolve(engineRoot, '../../node_modules'),
          path.resolve(process.cwd(), 'node_modules'),
          path.resolve(process.cwd(), '../../node_modules'),
        ],
      }),
      'utf8',
    )

    try {
      await execFileAsync(process.execPath, [runnerPath], {
        cwd: workDir,
        timeout: 60_000,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, NODE_OPTIONS: '' },
      })
    } catch (error) {
      const err = error as { stderr?: string; stdout?: string; message?: string }
      const detail = [err.stderr, err.stdout, err.message].filter(Boolean).join(' | ').slice(0, 800)
      return {
        ok: false,
        reason: `browser-packer held — esbuild child failed: ${detail || 'unknown'}`,
        heldStage: 'browser-packer',
      }
    }

    const content = await readFile(outFile, 'utf8')
    if (!content.trim()) {
      return {
        ok: false,
        reason: 'browser-packer held — empty bundle forbidden (Zero-MVP)',
        heldStage: 'browser-packer',
      }
    }
    if (!content.includes('bootAethelRuntime') && !content.includes('mountInstantPlay')) {
      return {
        ok: false,
        reason: 'browser-packer held — packed JS missing bootAethelRuntime export/call',
        heldStage: 'browser-packer',
      }
    }

    return {
      ok: true,
      path: INSTANT_PLAY_BUNDLE_PATH,
      content,
      contentType: 'text/javascript; charset=utf-8',
      byteLength: Buffer.byteLength(content, 'utf8'),
      bundler: 'esbuild',
    }
  } catch (error) {
    return {
      ok: false,
      reason: `browser-packer held — ${error instanceof Error ? error.message : String(error)}`,
      heldStage: 'browser-packer',
    }
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
