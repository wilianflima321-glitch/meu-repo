/**
 * L.13 / L.C — multi-language LSP farm soak matrix (honesty probes).
 *
 * Proves desktop farm language matrix: typescript, rust, python.
 * Each language is either `resolvable` (binary on PATH / env / node_modules)
 * or `HELD` (LSP_BINARY_HELD) — never fabricates hover/diagnostics.
 *
 * Windows: when Python LS is not on PATH, set `AETHEL_LSP_PYTHON` to the
 * absolute path of `pyright-langserver` / `pylsp` (fail-closed if missing).
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('l13-multi-lang-soak')

/** Desktop farm languages required for L.C multi-lang matrix. */
export const L13_DESKTOP_MATRIX_LANGUAGES = ['typescript', 'rust', 'python'] as const

export type L13DesktopMatrixLanguage = (typeof L13_DESKTOP_MATRIX_LANGUAGES)[number]

export type L13LanguageProbeStatus = 'resolvable' | 'HELD'

export type L13LanguageProbe = {
  language: L13DesktopMatrixLanguage
  status: L13LanguageProbeStatus
  commandHint: string
  envOverrideKeys: string[]
  resolvedPath: string | null
  message: string
}

export type L13MultiLangSoakReport = {
  matrixLanguages: readonly L13DesktopMatrixLanguage[]
  probes: L13LanguageProbe[]
  /** true only when every matrix language has a resolvable binary. */
  allResolvable: boolean
  /** true when at least one language is HELD (honest — not a failure of the matrix ship). */
  anyHeld: boolean
  /** Marketing / Universal IDE claim still blocked until live L.C acceptance. */
  marketingAllowed: false
  message: string
}

const LANGUAGE_HINTS: Record<
  L13DesktopMatrixLanguage,
  { commands: string[]; envKeys: string[]; nodeModuleHints?: string[] }
> = {
  typescript: {
    commands: ['typescript-language-server'],
    envKeys: ['AETHEL_LSP_TYPESCRIPT', 'AETHEL_LSP_TSSERVER'],
    nodeModuleHints: [
      'node_modules/typescript-language-server/lib/cli.js',
      'node_modules/.bin/typescript-language-server',
    ],
  },
  rust: {
    commands: ['rust-analyzer'],
    envKeys: ['AETHEL_LSP_RUST_ANALYZER', 'AETHEL_LSP_RUST'],
  },
  python: {
    commands: ['pyright-langserver', 'basedpyright-langserver', 'pylsp'],
    envKeys: ['AETHEL_LSP_PYTHON', 'AETHEL_LSP_PYRIGHT'],
    nodeModuleHints: [
      'node_modules/pyright/langserver.index.js',
      'node_modules/basedpyright/langserver.index.js',
      'node_modules/.bin/pyright-langserver',
    ],
  },
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    const fs = await import('node:fs/promises')
    const st = await fs.stat(candidate)
    return st.isFile()
  } catch {
    return false
  }
}

async function whichOnPath(command: string): Promise<string | null> {
  try {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)
    const isWindows = process.platform === 'win32'
    const whichCmd = isWindows ? 'where' : 'which'
    const { stdout } = await execFileAsync(whichCmd, [command], { timeout: 5_000 })
    const first = String(stdout)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0)
    return first ?? null
  } catch {
    return null
  }
}

async function resolveEnvOverride(keys: string[]): Promise<
  | { ok: true; path: string; key: string }
  | { ok: false; held: true; key: string; path: string }
  | null
> {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (!value) continue
    if (await pathExists(value)) {
      return { ok: true, path: value, key }
    }
    return { ok: false, held: true, key, path: value }
  }
  return null
}

async function resolveNodeModuleHint(
  hints: string[] | undefined,
  cwd: string,
): Promise<string | null> {
  if (!hints?.length) return null
  const path = await import('node:path')
  let dir = cwd
  for (let i = 0; i < 8; i++) {
    for (const hint of hints) {
      const candidate = path.join(dir, hint)
      if (await pathExists(candidate)) return candidate
      if (process.platform === 'win32' && !hint.endsWith('.js')) {
        const cmd = `${candidate}.cmd`
        if (await pathExists(cmd)) return cmd
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * Probe a single farm language — fail-closed HELD when binary missing.
 * Never claims resolvable without a real file/PATH hit.
 */
export async function probeL13LanguageBinary(
  language: L13DesktopMatrixLanguage,
  options: { cwd?: string } = {},
): Promise<L13LanguageProbe> {
  const hint = LANGUAGE_HINTS[language]
  const commandHint = hint.commands[0] ?? language

  const envHit = await resolveEnvOverride(hint.envKeys)
  if (envHit) {
    if (envHit.ok) {
      return {
        language,
        status: 'resolvable',
        commandHint,
        envOverrideKeys: hint.envKeys,
        resolvedPath: envHit.path,
        message: `${language} resolvable via env ${envHit.key}`,
      }
    }
    return {
      language,
      status: 'HELD',
      commandHint,
      envOverrideKeys: hint.envKeys,
      resolvedPath: null,
      message: `LSP_BINARY_HELD: env ${envHit.key}=${envHit.path} is set but not an executable file`,
    }
  }

  for (const command of hint.commands) {
    const found = await whichOnPath(command)
    if (found) {
      return {
        language,
        status: 'resolvable',
        commandHint: command,
        envOverrideKeys: hint.envKeys,
        resolvedPath: found,
        message: `${command} resolvable on PATH — spawn allowed`,
      }
    }
  }

  const local = await resolveNodeModuleHint(hint.nodeModuleHints, options.cwd ?? process.cwd())
  if (local) {
    return {
      language,
      status: 'resolvable',
      commandHint,
      envOverrideKeys: hint.envKeys,
      resolvedPath: local,
      message: `${language} resolvable via local node_modules`,
    }
  }

  const envDoc =
    language === 'python'
      ? ' Install pyright-langserver/pylsp or set AETHEL_LSP_PYTHON to an absolute binary path.'
      : ` Install ${commandHint} or set ${hint.envKeys[0]}.`

  return {
    language,
    status: 'HELD',
    commandHint,
    envOverrideKeys: hint.envKeys,
    resolvedPath: null,
    message: `LSP_BINARY_HELD: ${commandHint} not found on PATH.${envDoc}`,
  }
}

/**
 * Run the L.13 / L.C multi-language soak matrix (probe only — no spawn/fake LSP).
 */
export async function runL13MultiLangSoak(
  options: { cwd?: string } = {},
): Promise<L13MultiLangSoakReport> {
  const probes: L13LanguageProbe[] = []
  for (const language of L13_DESKTOP_MATRIX_LANGUAGES) {
    const probe = await probeL13LanguageBinary(language, options)
    probes.push(probe)
    log.info('l13_multi_lang_probe', {
      language: probe.language,
      status: probe.status,
      resolvedPath: probe.resolvedPath,
    })
  }

  const allResolvable = probes.every((p) => p.status === 'resolvable')
  const anyHeld = probes.some((p) => p.status === 'HELD')
  const heldNames = probes.filter((p) => p.status === 'HELD').map((p) => p.language)

  return {
    matrixLanguages: L13_DESKTOP_MATRIX_LANGUAGES,
    probes,
    allResolvable,
    anyHeld,
    marketingAllowed: false,
    message: allResolvable
      ? 'L.13 multi-lang matrix: typescript + rust + python binaries resolvable. Live Monaco acceptance still required before marketing.'
      : `L.13 multi-lang matrix shipped; HELD (no fake LSP) for: ${heldNames.join(', ')}. Set AETHEL_LSP_PYTHON on Windows when Python LS is absent from PATH. Marketing blocked.`,
  }
}

/** Honesty surface for Progress / UI — never uplifts marketing. */
export function describeL13MultiLangSoakHonesty(report: L13MultiLangSoakReport): {
  matrixShipped: true
  liveAcceptance: 'partial' | 'held'
  marketingAllowed: false
  message: string
} {
  return {
    matrixShipped: true,
    liveAcceptance: report.allResolvable ? 'partial' : 'held',
    marketingAllowed: false,
    message: report.message,
  }
}
