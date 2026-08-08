/**
 * L.2 / L.9 — Forge commit/CI validation gate
 *
 * Blocks merge/apply/scaffold *success* when:
 *  - L.5 typecheck or lint fails
 *  - L.8 preview orchestration fails (when preview is in scope)
 *  - L.2 DevContainer template cannot resolve (scaffold path)
 *  - sandbox is unavailable for agent commit paths that require it
 *
 * Honest status only — never reports ok:true with failed checks (Zero-MVP).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  readDevContainerManifestFromDisk,
  resolveDevContainerTemplate,
  type SupportedDevContainerTemplate,
} from '@/lib/production/devcontainer-manifest'
import { runProjectL5Gate, gateCheckFailed } from '@/lib/production/project-l5-gate'
import type { L5VirtualFile } from '@/lib/production/project-l5-typecheck'
import type { PreviewOrchestrationResult } from '@/lib/production/preview-orchestrator'

const log = createComponentLogger('forge-commit-ci-gate')

export type ForgeCommitGateCheckId =
  | 'L2_DEVCONTAINER'
  | 'L5_TYPECHECK'
  | 'L5_LINT'
  | 'L8_PREVIEW'
  | 'SANDBOX_AVAILABLE'

export type ForgeCommitGateCheck = {
  id: ForgeCommitGateCheckId
  status: 'pass' | 'fail' | 'skip'
  message: string
}

export type ForgeCommitCiGateInput = {
  /** Patched / scaffolded files for L.5. Empty → L.5 skipped (not a free pass when requireL5). */
  files?: L5VirtualFile[]
  ambientFiles?: L5VirtualFile[]
  /** When true, missing files → L.5 FAIL (apply/commit must validate). */
  requireL5?: boolean
  /** L.8 result — when requirePreview, missing/failed preview blocks success. */
  preview?: PreviewOrchestrationResult | null
  requirePreview?: boolean
  /** L.2 template id for scaffold commit path. */
  templateId?: SupportedDevContainerTemplate
  requireDevContainer?: boolean
  /**
   * When set with requireDevContainer, also verifies `.aethel/devcontainer.json`
   * exists on disk and Zod-parses (L.2 on-disk authority).
   */
  projectRootPath?: string
  /** Agent sandbox readiness for commit paths that need Forge. */
  sandboxAvailable?: boolean
  requireSandbox?: boolean
}

export type ForgeCommitCiGateResult = {
  ok: boolean
  verdict: 'PASS' | 'FAIL'
  checks: ForgeCommitGateCheck[]
  blockedReasons: string[]
  compilerLog: string
  /** Always false — gate pass ≠ Universal IDE / merge marketing unlock. */
  marketingAllowed: false
}

function pushFail(
  checks: ForgeCommitGateCheck[],
  blocked: string[],
  id: ForgeCommitGateCheckId,
  message: string,
): void {
  checks.push({ id, status: 'fail', message })
  blocked.push(`${id}: ${message}`)
}

/**
 * Runs the commit/CI gate. Callers MUST treat `ok:false` as blocked merge/apply/scaffold.
 */
export async function runForgeCommitCiGate(
  input: ForgeCommitCiGateInput,
): Promise<ForgeCommitCiGateResult> {
  const checks: ForgeCommitGateCheck[] = []
  const blockedReasons: string[] = []
  let compilerLog = ''

  // L.2 — DevContainer template registry (+ optional on-disk authority)
  if (input.requireDevContainer || input.templateId) {
    if (!input.templateId) {
      pushFail(checks, blockedReasons, 'L2_DEVCONTAINER', 'DevContainer template id required but missing')
    } else {
      try {
        const template = resolveDevContainerTemplate(input.templateId)
        if (input.projectRootPath) {
          const onDisk = await readDevContainerManifestFromDisk(input.projectRootPath)
          if (!onDisk.ok) {
            pushFail(
              checks,
              blockedReasons,
              'L2_DEVCONTAINER',
              `Template ${template.id} resolved but on-disk ${onDisk.message}`,
            )
          } else {
            checks.push({
              id: 'L2_DEVCONTAINER',
              status: 'pass',
              message: `Template ${template.id} + on-disk .aethel/devcontainer.json (${onDisk.manifest.name})`,
            })
          }
        } else {
          checks.push({
            id: 'L2_DEVCONTAINER',
            status: 'pass',
            message: `Template ${template.id} resolved (${template.manifest.name})`,
          })
        }
      } catch (err) {
        pushFail(
          checks,
          blockedReasons,
          'L2_DEVCONTAINER',
          err instanceof Error ? err.message : String(err),
        )
      }
    }
  } else {
    checks.push({ id: 'L2_DEVCONTAINER', status: 'skip', message: 'DevContainer not in scope for this gate' })
  }

  // Sandbox availability (agent commit paths)
  if (input.requireSandbox) {
    if (input.sandboxAvailable === true) {
      checks.push({
        id: 'SANDBOX_AVAILABLE',
        status: 'pass',
        message: 'Forge sandbox available for commit/apply path',
      })
    } else {
      pushFail(
        checks,
        blockedReasons,
        'SANDBOX_AVAILABLE',
        'Forge sandbox unavailable — fail-closed (no host PTY commit path)',
      )
    }
  } else {
    checks.push({ id: 'SANDBOX_AVAILABLE', status: 'skip', message: 'Sandbox check not required' })
  }

  // L.5 — typecheck + lint
  const files = input.files ?? []
  if (input.requireL5 && files.length === 0) {
    pushFail(checks, blockedReasons, 'L5_TYPECHECK', 'L.5 required but no files provided for validation')
    checks.push({ id: 'L5_LINT', status: 'fail', message: 'Skipped — no files for L.5' })
    blockedReasons.push('L5_LINT: Skipped — no files for L.5')
  } else if (files.length === 0) {
    checks.push({ id: 'L5_TYPECHECK', status: 'skip', message: 'No TS files in gate scope' })
    checks.push({ id: 'L5_LINT', status: 'skip', message: 'No TS files in gate scope' })
  } else {
    const l5 = await runProjectL5Gate({
      files,
      ambientFiles: input.ambientFiles,
    })
    compilerLog = l5.compilerLog ?? ''

    if (l5.verdict === 'FAIL') {
      const lintFailed = gateCheckFailed(l5, 'L5_LINT')
      if (lintFailed) {
        checks.push({ id: 'L5_TYPECHECK', status: 'pass', message: 'Typecheck passed before lint fail' })
        pushFail(checks, blockedReasons, 'L5_LINT', compilerLog.slice(0, 400) || 'ESLint failed')
      } else {
        pushFail(
          checks,
          blockedReasons,
          'L5_TYPECHECK',
          compilerLog.slice(0, 400) || 'Project typecheck failed',
        )
        checks.push({ id: 'L5_LINT', status: 'skip', message: 'Lint not run after typecheck FAIL' })
      }
    } else {
      checks.push({ id: 'L5_TYPECHECK', status: 'pass', message: 'Project typecheck PASS' })
      checks.push({ id: 'L5_LINT', status: 'pass', message: 'Project lint PASS' })
    }
  }

  // L.8 — preview orchestration (scaffold / preview-scoped commits)
  if (input.requirePreview) {
    const preview = input.preview
    if (!preview) {
      pushFail(checks, blockedReasons, 'L8_PREVIEW', 'Preview result required but missing')
    } else if (!preview.ok) {
      pushFail(
        checks,
        blockedReasons,
        'L8_PREVIEW',
        preview.message || 'L.8 preview orchestration failed',
      )
    } else if (preview.strategy !== 'inline' && !preview.url) {
      pushFail(
        checks,
        blockedReasons,
        'L8_PREVIEW',
        'Preview claimed ok without a reachable URL (Zero-MVP)',
      )
    } else {
      checks.push({
        id: 'L8_PREVIEW',
        status: 'pass',
        message: `Preview ready (${preview.strategy}${preview.url ? `: ${preview.url}` : ''})`,
      })
    }
  } else {
    checks.push({ id: 'L8_PREVIEW', status: 'skip', message: 'Preview not in scope for this gate' })
  }

  const ok = blockedReasons.length === 0
  const result: ForgeCommitCiGateResult = {
    ok,
    verdict: ok ? 'PASS' : 'FAIL',
    checks,
    blockedReasons,
    compilerLog,
    marketingAllowed: false,
  }

  if (ok) {
    log.info('forge_commit_ci_gate_pass', { checks: checks.map((c) => c.id) })
  } else {
    log.warn('forge_commit_ci_gate_fail', { blockedReasons })
  }

  return result
}

/** True when any hard-fail check would block merge/apply success. */
export function forgeCommitGateBlocksSuccess(result: ForgeCommitCiGateResult): boolean {
  return !result.ok || result.verdict === 'FAIL' || result.checks.some((c) => c.status === 'fail')
}
