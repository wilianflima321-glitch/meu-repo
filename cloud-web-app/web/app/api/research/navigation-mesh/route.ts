import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildResearchNavigationMesh,
  type AgentNavigationMissionKind,
} from '@/lib/production/research-navigation-mesh'

const logger = createComponentLogger('api.research.navigation-mesh')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MISSION_KINDS = new Set<AgentNavigationMissionKind>([
  'advanced-research',
  'app-prototyping',
  'account-operations',
  'commerce',
  'devops',
  'content-capture',
])

function isEnabled(name: string): boolean {
  return process.env[name] === '1' || process.env[name] === 'true'
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function coerceMissionKind(value: string | null): AgentNavigationMissionKind | undefined {
  if (!value) return undefined
  return MISSION_KINDS.has(value as AgentNavigationMissionKind) ? (value as AgentNavigationMissionKind) : undefined
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const search = request.nextUrl.searchParams
    const mesh = buildResearchNavigationMesh({
      missionKind: coerceMissionKind(search.get('missionKind')),
      targetUrl: search.get('targetUrl') ?? undefined,
      intendedAction: search.get('intendedAction') ?? undefined,
      hasHeadlessBrowserWorker: isEnabled('AETHEL_HEADLESS_BROWSER_WORKER_ENABLED'),
      hasCloudBrowser: isEnabled('AETHEL_CLOUD_BROWSER_ENABLED') || hasEnv('AETHEL_CLOUD_BROWSER_URL'),
      hasChromeExtension: isEnabled('AETHEL_CHROME_EXTENSION_ENABLED'),
      hasChromeDevTools: hasEnv('AETHEL_CHROME_CDP_URL'),
      hasComputerUseSandbox: hasEnv('AETHEL_COMPUTER_USE_SANDBOX_URL'),
      hasMobileCompanion: isEnabled('AETHEL_MOBILE_COMPANION_ENABLED'),
      hasReplayCapture: isEnabled('BROWSER_OPERATOR_REPLAY_ENABLED'),
      hasScreenshotCapture: isEnabled('BROWSER_OPERATOR_SCREENSHOT_CAPTURE_ENABLED'),
      hasDomSnapshot: isEnabled('BROWSER_OPERATOR_DOM_SNAPSHOT_ENABLED'),
      hasPauseControl: isEnabled('BROWSER_OPERATOR_PAUSE_CONTROL_ENABLED'),
      hasHumanTakeover: isEnabled('BROWSER_OPERATOR_HUMAN_TAKEOVER_ENABLED'),
      hasCredentialVault: isEnabled('AETHEL_CREDENTIAL_VAULT_ENABLED'),
      hasNetworkIsolation: isEnabled('AETHEL_BROWSER_NETWORK_ISOLATION_ENABLED'),
    })

    logger.info('research_navigation_mesh.snapshot', {
      userId: user.userId,
      missionKind: mesh.missionKind,
      capabilityStatus: mesh.capabilityStatus,
      recommendedLane: mesh.recommendedLane,
    })

    return NextResponse.json(mesh, {
      headers: {
        'x-aethel-capability': mesh.capability,
        'x-aethel-capability-status': mesh.capabilityStatus,
      },
    })
  } catch (error) {
    logger.error('research_navigation_mesh.failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
