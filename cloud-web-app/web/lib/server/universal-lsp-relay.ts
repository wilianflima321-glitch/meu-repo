/**
 * L.13 — UniversalLspFarm (cloud relay core)
 *
 * Binding: `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` L.13 + module table
 * (`lib/server/universal-lsp-relay.ts` + Tauri `lsp_farm.rs`).
 *
 * This module is the **web/cloud farm registry + Monaco endpoint resolver**.
 * Long-lived language servers are acquired via `lsp-runtime` (stdio JSON-RPC).
 *
 * Honesty (Zero-MVP):
 * - Cloud HTTP relay path is real (`/api/lsp/*` + this registry).
 * - Tauri desktop sidecar (`apps/studio-local/src-tauri/src/lsp_farm.rs`) is **PARTIAL** —
 *   real binary discovery + spawn + initialize + continuous didChange + publishDiagnostics
 *   + hover/definition/completion IPC; fail-closed when binary missing (never fake LSP).
 * - Monaco desktop wire is **PARTIAL**; L.C multi-lang matrix (TS/Rust/Python) shipped;
 *   live soak HELD per language when binary missing (`AETHEL_LSP_PYTHON` on Windows).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  resolveUniversalLspEndpoint,
  type UniversalLspEndpoint,
} from '@/lib/lsp/universal-lsp-endpoint'
import { getOrCreateLspSession } from '@/lib/server/lsp-runtime'

const log = createComponentLogger('universal-lsp-relay')

export type { UniversalLspEndpoint }
export { resolveUniversalLspEndpoint }

/** Languages required by Forge L.C acceptance (TS + Rust + Python hover/definition). */
export const LSP_FARM_ACCEPTANCE_LANGUAGES = ['typescript', 'rust', 'python'] as const

export type LspFarmLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'cpp'
  | 'java'
  | 'csharp'

export type LspFarmLanguageStatus = {
  language: LspFarmLanguage
  /** Acceptance-critical (TS/Python). */
  acceptanceCritical: boolean
  commandHint: string
  /** true only when a local binary/entry can be resolved without claiming a live hover session. */
  binaryResolvable: boolean
  message: string
}

export type UniversalLspFarmHonesty = {
  cloudRelayCore: true
  /** `partial` = Tauri lsp_farm spawn+IPC shipped; never `live` until L.C soak. */
  tauriSidecarSpawn: 'partial'
  /** `partial` = Monaco hover/definition/didChange/diagnostics wired; L.C matrix shipped. */
  monacoDesktopHoverDefinition: 'partial'
  marketingAllowed: false
  message: string
}

const LANGUAGE_COMMAND_HINTS: Record<LspFarmLanguage, string> = {
  typescript: 'typescript-language-server --stdio',
  javascript: 'typescript-language-server --stdio',
  python: 'pyright-langserver --stdio (or pylsp / AETHEL_LSP_PYTHON)',
  rust: 'rust-analyzer',
  go: 'gopls serve',
  cpp: 'clangd --background-index',
  java: 'jdtls',
  csharp: 'OmniSharp -lsp',
}

/** PATH / env candidates probed for binaryResolvable (first hit wins). */
const LANGUAGE_PROBE_COMMANDS: Record<LspFarmLanguage, string[]> = {
  typescript: ['typescript-language-server'],
  javascript: ['typescript-language-server'],
  python: ['pyright-langserver', 'basedpyright-langserver', 'pylsp'],
  rust: ['rust-analyzer'],
  go: ['gopls'],
  cpp: ['clangd'],
  java: ['jdtls'],
  csharp: ['OmniSharp'],
}

const LANGUAGE_ENV_KEYS: Partial<Record<LspFarmLanguage, string[]>> = {
  typescript: ['AETHEL_LSP_TYPESCRIPT', 'AETHEL_LSP_TSSERVER'],
  python: ['AETHEL_LSP_PYTHON', 'AETHEL_LSP_PYRIGHT'],
  rust: ['AETHEL_LSP_RUST_ANALYZER', 'AETHEL_LSP_RUST'],
}

function normalizeFarmLanguage(language: string): LspFarmLanguage | null {
  const l = String(language || '').toLowerCase()
  if (l === 'typescript' || l === 'typescriptreact') return 'typescript'
  if (l === 'javascript' || l === 'javascriptreact') return 'javascript'
  if (l === 'python' || l === 'py') return 'python'
  if (l === 'rust' || l === 'rs') return 'rust'
  if (l === 'go' || l === 'golang') return 'go'
  if (l === 'c' || l === 'cpp' || l === 'c++') return 'cpp'
  if (l === 'java') return 'java'
  if (l === 'csharp' || l === 'c#' || l === 'cs') return 'csharp'
  return null
}

async function probeCommandOnPath(command: string): Promise<boolean> {
  try {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)
    const isWindows = process.platform === 'win32'
    const whichCmd = isWindows ? 'where' : 'which'
    await execFileAsync(whichCmd, [command], { timeout: 5_000 })
    return true
  } catch {
    return false
  }
}

async function probeEnvOverride(keys: string[] | undefined): Promise<'hit' | 'held' | null> {
  if (!keys?.length) return null
  const fs = await import('node:fs/promises')
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (!value) continue
    try {
      const st = await fs.stat(value)
      if (st.isFile()) return 'hit'
    } catch {
      return 'held'
    }
  }
  return null
}

export function describeUniversalLspFarmHonesty(): UniversalLspFarmHonesty {
  return {
    cloudRelayCore: true,
    tauriSidecarSpawn: 'partial',
    monacoDesktopHoverDefinition: 'partial',
    marketingAllowed: false,
    message:
      'L.13 cloud relay + Tauri lsp_farm Monaco wire are real (continuous didChange + publishDiagnostics markers + hover/definition/completion for typescript/javascript, rust, python; fail-closed without binary). L.C multi-lang matrix shipped; live soak HELD per missing binary (AETHEL_LSP_PYTHON on Windows). Marketing blocked.',
  }
}

/** List farm languages with binary probe (no spawn). */
export async function listLspFarmLanguageStatus(): Promise<LspFarmLanguageStatus[]> {
  const languages = Object.keys(LANGUAGE_COMMAND_HINTS) as LspFarmLanguage[]
  const out: LspFarmLanguageStatus[] = []

  for (const language of languages) {
    const hint = LANGUAGE_COMMAND_HINTS[language]
    const commands = LANGUAGE_PROBE_COMMANDS[language] ?? [hint.split(/\s+/)[0] || hint]
    const envKeys = LANGUAGE_ENV_KEYS[language]
    const envProbe = await probeEnvOverride(envKeys)
    let binaryResolvable = envProbe === 'hit'
    if (!binaryResolvable && envProbe !== 'held') {
      for (const command of commands) {
        if (await probeCommandOnPath(command)) {
          binaryResolvable = true
          break
        }
      }
    }
    const primary = commands[0] || hint
    out.push({
      language,
      acceptanceCritical:
        language === 'typescript' || language === 'python' || language === 'rust',
      commandHint: hint,
      binaryResolvable,
      message: binaryResolvable
        ? `${primary} resolvable (PATH or env override)`
        : envProbe === 'held'
          ? `LSP_BINARY_HELD: env override set but not an executable — fail-closed`
          : `${primary} not installed — farm will fail-closed on acquire${
              language === 'python' ? ' (set AETHEL_LSP_PYTHON)' : ''
            }`,
    })
  }

  return out
}

export type AcquireLspFarmSessionResult =
  | {
      ok: true
      language: LspFarmLanguage
      workspaceRoot: string
      sessionKey: string
    }
  | {
      ok: false
      code: 'UNSUPPORTED_LANGUAGE' | 'SERVER_UNAVAILABLE' | 'ACQUIRE_FAILED'
      message: string
    }

/**
 * Acquire (or reuse) a long-lived LSP session for the farm.
 * Fail-closed when language unsupported or language server binary missing.
 */
export async function acquireLspFarmSession(input: {
  userId: string
  language: string
  workspaceRoot: string
}): Promise<AcquireLspFarmSessionResult> {
  const language = normalizeFarmLanguage(input.language)
  if (!language) {
    return {
      ok: false,
      code: 'UNSUPPORTED_LANGUAGE',
      message: `Unsupported LSP farm language: ${input.language}`,
    }
  }

  try {
    const session = await getOrCreateLspSession({
      userId: input.userId,
      language,
      workspaceRoot: input.workspaceRoot,
    })
    log.info('lsp_farm_session_acquired', {
      language: session.language,
      key: session.key,
    })
    return {
      ok: true,
      language,
      workspaceRoot: session.workspaceRoot,
      sessionKey: session.key,
    }
  } catch (error) {
    const code = (error as { code?: string })?.code
    const message = error instanceof Error ? error.message : String(error)
    if (typeof code === 'string' && code.endsWith('_LANGUAGE_SERVER_NOT_INSTALLED')) {
      return { ok: false, code: 'SERVER_UNAVAILABLE', message }
    }
    if (code === 'UNSUPPORTED_LSP_LANGUAGE') {
      return { ok: false, code: 'UNSUPPORTED_LANGUAGE', message }
    }
    log.error('lsp_farm_acquire_failed', { language, message })
    return { ok: false, code: 'ACQUIRE_FAILED', message }
  }
}

/** Release a farm session by key (best-effort; missing key is ok). */
export function releaseLspFarmSession(sessionKey: string): { ok: true; released: boolean } {
  const g = globalThis as typeof globalThis & {
    __AETHEL_LSP_SESSIONS__?: Map<string, { stop: () => void }>
  }
  const sessions = g.__AETHEL_LSP_SESSIONS__
  const session = sessions?.get(sessionKey)
  if (!session) {
    return { ok: true, released: false }
  }
  try {
    session.stop()
  } catch {
    // ignore teardown races
  }
  return { ok: true, released: true }
}
