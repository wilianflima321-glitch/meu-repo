/**
 * L.9 — Interactive FullStackScaffold client (browser).
 * Custody: create project → POST /api/scaffold → require ok + L.2 persist + commit gate.
 * Zero-MVP: never reports success without API ok and on-disk / gate evidence.
 */

'use client'

import {
  isSupportedDevContainerTemplate,
  type SupportedDevContainerTemplate,
} from '@/lib/production/devcontainer-template-catalog'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('forge-scaffold-client')

export type ForgeScaffoldPreviewStrategy = 'inline' | 'local-dev-server' | 'e2b'

export type ForgeScaffoldGateCheck = {
  id: string
  status: 'pass' | 'fail' | 'skip'
  message: string
}

export type ForgeScaffoldCommitGate = {
  ok: boolean
  verdict?: 'PASS' | 'FAIL'
  checks?: ForgeScaffoldGateCheck[]
  blockedReasons?: string[]
  marketingAllowed?: false
}

export type ForgeScaffoldUxResult =
  | {
      ok: true
      projectId: string
      templateId: SupportedDevContainerTemplate
      openUrl: string
      previewUrl?: string
      commitGate?: ForgeScaffoldCommitGate
      devContainerPersistOk: true
      /** Always false — scaffold success ≠ Universal IDE marketing unlock. */
      marketingAllowed: false
    }
  | {
      ok: false
      error: string
      code:
        | 'INVALID_TEMPLATE'
        | 'AUTH_REQUIRED'
        | 'PROJECT_CREATE_FAILED'
        | 'SCAFFOLD_FAILED'
        | 'GATE_BLOCKED'
        | 'EVIDENCE_MISSING'
        | 'NETWORK'
      projectId?: string
      templateId?: SupportedDevContainerTemplate
      commitGate?: ForgeScaffoldCommitGate
      blockedReasons?: string[]
      /** Present when project row was created but scaffold/gates failed — not a success. */
      orphanProjectCreated?: boolean
    }

function buildOpenUrl(projectId: string, previewUrl?: string): string {
  const params = new URLSearchParams({ projectId })
  if (previewUrl) params.set('previewUrl', previewUrl)
  return `/ide?${params.toString()}`
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = await response.json()
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function asCommitGate(value: unknown): ForgeScaffoldCommitGate | undefined {
  if (!value || typeof value !== 'object') return undefined
  const gate = value as ForgeScaffoldCommitGate
  if (typeof gate.ok !== 'boolean') return undefined
  return gate
}

/**
 * Create a cloud project (when needed) then run L.9 FullStackScaffoldEngine via /api/scaffold.
 * Fail-closed on any non-ok response or missing L.2 persist / commit-gate evidence.
 */
export async function runInteractiveForgeScaffold(input: {
  name: string
  templateId: string
  preferredStrategy?: ForgeScaffoldPreviewStrategy
  /** When set, skip POST /api/projects and scaffold into this project. */
  existingProjectId?: string
  headers?: Record<string, string>
}): Promise<ForgeScaffoldUxResult> {
  const name = input.name.trim()
  if (!name) {
    return { ok: false, error: 'Project name is required.', code: 'PROJECT_CREATE_FAILED' }
  }

  if (!isSupportedDevContainerTemplate(input.templateId)) {
    return {
      ok: false,
      error: `Unsupported DevContainer template: ${input.templateId}`,
      code: 'INVALID_TEMPLATE',
    }
  }

  const templateId = input.templateId
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(input.headers || {}),
  }

  let projectId = input.existingProjectId?.trim() || ''
  let orphanProjectCreated = false

  try {
    if (!projectId) {
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, template: templateId }),
      })
      const createPayload = await readJson(createRes)

      if (createRes.status === 401) {
        return { ok: false, error: 'Sign in required to scaffold a project.', code: 'AUTH_REQUIRED' }
      }

      if (!createRes.ok) {
        const message =
          typeof createPayload.message === 'string'
            ? createPayload.message
            : typeof createPayload.error === 'string'
              ? createPayload.error
              : `Project create failed (${createRes.status})`
        log.warn('forge_scaffold_project_create_failed', { status: createRes.status, message })
        return { ok: false, error: message, code: 'PROJECT_CREATE_FAILED' }
      }

      const createdId = typeof createPayload.id === 'string' ? createPayload.id : undefined
      if (!createdId) {
        return {
          ok: false,
          error: 'Project create returned no id (fail-closed).',
          code: 'PROJECT_CREATE_FAILED',
        }
      }
      projectId = createdId
      orphanProjectCreated = true
    }

    const scaffoldRes = await fetch('/api/scaffold', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        projectId,
        templateId,
        preferredStrategy: input.preferredStrategy,
      }),
    })
    const scaffoldPayload = await readJson(scaffoldRes)
    const commitGate = asCommitGate(scaffoldPayload.commitGate)
    const persist = scaffoldPayload.devContainerPersist as { ok?: boolean } | undefined
    const preview = scaffoldPayload.preview as { ok?: boolean; url?: string } | undefined
    const blockedReasons = Array.isArray(commitGate?.blockedReasons)
      ? commitGate!.blockedReasons!.filter((r): r is string => typeof r === 'string')
      : Array.isArray(scaffoldPayload.blockedReasons)
        ? (scaffoldPayload.blockedReasons as unknown[]).filter((r): r is string => typeof r === 'string')
        : undefined

    if (scaffoldRes.status === 401) {
      return {
        ok: false,
        error: 'Sign in required to run FullStackScaffold.',
        code: 'AUTH_REQUIRED',
        projectId,
        templateId,
        orphanProjectCreated,
      }
    }

    if (!scaffoldRes.ok || scaffoldPayload.ok !== true) {
      const message =
        typeof scaffoldPayload.error === 'string'
          ? scaffoldPayload.error
          : typeof scaffoldPayload.message === 'string'
            ? scaffoldPayload.message
            : `Scaffold failed (${scaffoldRes.status})`
      const gateBlocked = commitGate?.ok === false || (blockedReasons && blockedReasons.length > 0)
      log.warn('forge_scaffold_api_failed', {
        status: scaffoldRes.status,
        message,
        gateBlocked,
        projectId,
        templateId,
      })
      return {
        ok: false,
        error: message,
        code: gateBlocked ? 'GATE_BLOCKED' : 'SCAFFOLD_FAILED',
        projectId,
        templateId,
        commitGate,
        blockedReasons,
        orphanProjectCreated,
      }
    }

    // Evidence requirements — Zero-MVP: no success without L.2 persist + commit gate pass.
    if (persist?.ok !== true) {
      return {
        ok: false,
        error: 'L.2 DevContainer on-disk persist evidence missing (fail-closed).',
        code: 'EVIDENCE_MISSING',
        projectId,
        templateId,
        commitGate,
        orphanProjectCreated,
      }
    }

    if (commitGate && commitGate.ok !== true) {
      return {
        ok: false,
        error: commitGate.blockedReasons?.[0] || 'L.9 commit/CI gate blocked scaffold success.',
        code: 'GATE_BLOCKED',
        projectId,
        templateId,
        commitGate,
        blockedReasons: commitGate.blockedReasons,
        orphanProjectCreated,
      }
    }

    const previewUrl = typeof preview?.url === 'string' && preview.url.trim() ? preview.url.trim() : undefined
    const openUrl = buildOpenUrl(projectId, previewUrl)

    log.info('forge_scaffold_ux_ok', { projectId, templateId, hasPreview: Boolean(previewUrl) })

    return {
      ok: true,
      projectId,
      templateId,
      openUrl,
      previewUrl,
      commitGate,
      devContainerPersistOk: true,
      marketingAllowed: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('forge_scaffold_ux_network', { error: message })
    return {
      ok: false,
      error: `Network error during scaffold: ${message}`,
      code: 'NETWORK',
      projectId: projectId || undefined,
      templateId,
      orphanProjectCreated: orphanProjectCreated || undefined,
    }
  }
}
