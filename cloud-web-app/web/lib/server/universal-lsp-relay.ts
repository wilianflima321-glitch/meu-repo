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
 * - Tauri desktop sidecar first-light (`apps/studio-local/src-tauri/src/lsp_farm.rs`)
 *   is **PARTIAL** — real binary discovery + process spawn + stdio initialize IPC probe;
 *   fail-closed when binary missing (never fake diagnostics).
 * - Monaco desktop hover/definition acceptance remains **OPEN** (multi-week).
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

/** Languages required by Forge L.C acceptance (TS + Python hover/definition). */
export const LSP_FARM_ACCEPTANCE_LANGUAGES = ['typescript', 'python'] as const

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
  /** `partial` = Tauri lsp_farm first-light shipped; never `live` until Monaco acceptance. */
  tauriSidecarSpawn: 'partial'
  monacoDesktopHoverDefinition: 'open'
  marketingAllowed: false
  message: string
}

const LANGUAGE_COMMAND_HINTS: Record<LspFarmLanguage, string> = {
  typescript: 'typescript-language-server --stdio',
  javascript: 'typescript-language-server --stdio',
  python: 'pyright-langserver --stdio',
  rust: 'rust-analyzer',
  go: 'gopls serve',
  cpp: 'clangd --background-index',
  java: 'jdtls',
  csharp: 'OmniSharp -lsp',
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

export function describeUniversalLspFarmHonesty(): UniversalLspFarmHonesty {
  return {
    cloudRelayCore: true,
    tauriSidecarSpawn: 'partial',
    monacoDesktopHoverDefinition: 'open',
    marketingAllowed: false,
    message:
      'L.13 cloud relay + Tauri lsp_farm first-light (spawn/IPC probe) are real; Monaco desktop hover/definition acceptance remains OPEN; marketing blocked.',
  }
}

/** List farm languages with binary probe (no spawn). */
export async function listLspFarmLanguageStatus(): Promise<LspFarmLanguageStatus[]> {
  const languages = Object.keys(LANGUAGE_COMMAND_HINTS) as LspFarmLanguage[]
  const out: LspFarmLanguageStatus[] = []

  for (const language of languages) {
    const hint = LANGUAGE_COMMAND_HINTS[language]
    const command = hint.split(/\s+/)[0] || hint
    const binaryResolvable = await probeCommandOnPath(command)
    out.push({
      language,
      acceptanceCritical: language === 'typescript' || language === 'python',
      commandHint: hint,
      binaryResolvable,
      message: binaryResolvable
        ? `${command} resolvable on PATH`
        : `${command} not installed — farm will fail-closed on acquire`,
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
