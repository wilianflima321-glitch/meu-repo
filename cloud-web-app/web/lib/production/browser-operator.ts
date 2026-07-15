/**
 * AI-v1-f / J.8 — BrowserOperator CORE
 * Evidence-backed web research: governed allowlisted fetch/snapshot →
 * browser-operator-safety → CreativeBridge CostGuard → evidence ledger → Nexus.
 *
 * Honesty: this is NOT unrestricted host browser automation.
 * Full Chromium CDP / Playwright cloud farm remains [HELD].
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import {
  evaluateBrowserOperatorPolicy,
  type BrowserOperatorPolicyDecision,
} from '@/lib/production/browser-operator-safety'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import {
  clearBrowserOperatorRunsForTests,
  recordBrowserOperatorStep,
  type BrowserOperatorRun,
} from '@/lib/server/browser-operator-recorder'

const log = createComponentLogger('browser-operator')

/** Full Chromium CDP / Playwright farm — not shipped as live product path. */
export const BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS = 'HELD' as const
/** Alias for UI receipt badge */
export const BROWSER_CDP_FARM_SHIP_STATUS = BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS

export const BROWSER_OPERATOR_HONESTY = {
  productLabel: 'BrowserOperator · governed research',
  noHostAutomation:
    'Unrestricted host browser automation is forbidden — sandbox/allowlist only.',
  cdpFarmHeld:
    'Full Chromium CDP / Playwright cloud+Tauri farm remains [HELD] — not production.',
  governedFetchOk:
    'Shipped CORE path: allowlisted fetch + text/DOM snapshot → evidence ledger.',
  costGuardRequired: 'CostGuard reserve/settle required per research session (Trava I).',
} as const

/** Default public-docs allowlist for research CORE (override per session). */
export const DEFAULT_BROWSER_RESEARCH_ALLOWLIST = [
  'docs.cursor.com',
  'platform.openai.com',
  'ai.google.dev',
  'developer.mozilla.org',
  'docs.unity3d.com',
  'docs.unrealengine.com',
  'github.com',
  'raw.githubusercontent.com',
  'wikipedia.org',
  'en.wikipedia.org',
] as const

export type BrowserOperatorBlockReason =
  | 'policy_blocked'
  | 'domain_not_allowlisted'
  | 'host_automation_forbidden'
  | 'cdp_farm_held'
  | 'cost_guard'
  | 'empty_artifact'
  | 'provider_down'
  | 'invalid_input'

export interface BrowserSnapshotPage {
  url: string
  title: string
  text: string
  domSnapshot?: string
  screenshotUrl?: string
}

export type BrowserSnapshotFetcher = (url: string) => Promise<BrowserSnapshotPage>

export interface BrowserEvidenceItem {
  url: string
  title: string
  snippet: string
  contentHash: string
  domSnapshotHash?: string
  policyStatus: BrowserOperatorPolicyDecision['status']
  evidenceRefs: string[]
}

export interface BrowserOperatorSessionArtifact {
  sessionId: string
  runId: string
  query: string
  timelineHash: string
  pages: BrowserEvidenceItem[]
  executionLane: 'governed-fetch'
  cdpFarmStatus: typeof BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS
}

export interface BrowserOperatorResearchSuccess {
  success: true
  session: BrowserOperatorSessionArtifact
  run: BrowserOperatorRun
  artifactId: string
  evidenceReceiptId: string
  honesty: typeof BROWSER_OPERATOR_HONESTY
  ledger: TaskEvidenceLedger
  bridge?: { success: boolean; blockedReason?: string }
}

export interface BrowserOperatorResearchDenied {
  success: false
  blockedReason: BrowserOperatorBlockReason
  message: string
  honesty: typeof BROWSER_OPERATOR_HONESTY
  ledger: TaskEvidenceLedger
  bridge?: { success: boolean; blockedReason?: string }
}

export type BrowserOperatorResearchResult =
  | BrowserOperatorResearchSuccess
  | BrowserOperatorResearchDenied

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function domainMatches(hostname: string, domains: string[]): boolean {
  return domains.some((domain) => {
    const normalized = domain.toLowerCase().replace(/^\*\./, '')
    return hostname === normalized || hostname.endsWith(`.${normalized}`)
  })
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function evaluateBrowserOperatorShipClaim(input: {
  claimUnrestrictedHostAutomation?: boolean
  claimFullCdpFarmLive?: boolean
}): { allowed: boolean; reason?: BrowserOperatorBlockReason; message: string } {
  if (input.claimUnrestrictedHostAutomation) {
    return {
      allowed: false,
      reason: 'host_automation_forbidden',
      message: BROWSER_OPERATOR_HONESTY.noHostAutomation,
    }
  }
  if (input.claimFullCdpFarmLive) {
    return {
      allowed: false,
      reason: 'cdp_farm_held',
      message: BROWSER_OPERATOR_HONESTY.cdpFarmHeld,
    }
  }
  return { allowed: true, message: BROWSER_OPERATOR_HONESTY.governedFetchOk }
}

export async function governedFetchSnapshot(input: {
  url: string
  intent?: string
  allowedDomains?: string[]
  deniedDomains?: string[]
  fetcher: BrowserSnapshotFetcher
  hasHumanApproval?: boolean
  approvalToken?: string | null
}): Promise<{
  ok: boolean
  page?: BrowserSnapshotPage
  decision: BrowserOperatorPolicyDecision
  blockers: string[]
}> {
  const allowed = input.allowedDomains?.length
    ? input.allowedDomains
    : [...DEFAULT_BROWSER_RESEARCH_ALLOWLIST]
  const hostname = hostnameOf(input.url)
  const blockers: string[] = []

  if (!hostname) {
    blockers.push('Invalid research URL.')
  } else if (!domainMatches(hostname, allowed)) {
    blockers.push(`Domain outside research allowlist: ${hostname}`)
  }

  const preDecision = evaluateBrowserOperatorPolicy({
    targetUrl: input.url,
    intendedAction: input.intent ?? 'read-only research fetch',
    allowedDomains: allowed,
    deniedDomains: input.deniedDomains,
    hasReplayCapture: true,
    hasScreenshotCapture: false,
    hasDomSnapshot: false,
    hasPauseControl: true,
    hasHumanApproval: input.hasHumanApproval,
    approvalToken: input.approvalToken,
  })

  if (preDecision.status === 'blocked' || blockers.length > 0) {
    return {
      ok: false,
      decision: preDecision,
      blockers: Array.from(new Set([...blockers, ...preDecision.blockers])),
    }
  }

  const page = await input.fetcher(input.url)
  const hasDom = Boolean(page.domSnapshot)
  const hasShot = Boolean(page.screenshotUrl)

  const decision = evaluateBrowserOperatorPolicy({
    targetUrl: input.url,
    intendedAction: input.intent ?? 'read-only research fetch',
    pageText: page.text,
    allowedDomains: allowed,
    deniedDomains: input.deniedDomains,
    hasReplayCapture: true,
    hasScreenshotCapture: hasShot,
    hasDomSnapshot: hasDom,
    hasPauseControl: true,
    hasHumanApproval: input.hasHumanApproval ?? true,
    approvalToken: input.approvalToken ?? 'research-read-only',
  })

  const softBlockers = decision.blockers.filter(
    (b) => !b.includes('Screenshot evidence is required.') || !hasDom,
  )

  if (
    decision.status === 'blocked' ||
    softBlockers.some((b) => b.includes('denied') || b.includes('injection'))
  ) {
    return { ok: false, page, decision, blockers: softBlockers }
  }

  return { ok: true, page, decision, blockers: softBlockers }
}

export function createFixtureBrowserFetcher(
  fixtures: Record<string, BrowserSnapshotPage>,
): BrowserSnapshotFetcher {
  return async (url: string) => {
    const hit = fixtures[url]
    if (!hit) {
      throw new Error(`No fixture for URL: ${url}`)
    }
    return hit
  }
}

export async function runBrowserOperatorResearch(input: {
  projectId: string
  userId: string
  query: string
  targetUrls: string[]
  actorId?: string
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  estimatedTokenWeight?: number
  allowedDomains?: string[]
  deniedDomains?: string[]
  fetcher: BrowserSnapshotFetcher
  adapter: CostGuardLedgerAdapter
  claimFullCdpFarmLive?: boolean
  claimUnrestrictedHostAutomation?: boolean
}): Promise<BrowserOperatorResearchResult> {
  let ledger = createTaskEvidenceLedger({
    taskId: `bor-${randomUUID().slice(0, 8)}`,
    projectId: input.projectId,
    mission: `J.8 BrowserOperator research: ${input.query.slice(0, 80)}`,
    ownerAgent: 'BrowserOperator',
  })

  const claim = evaluateBrowserOperatorShipClaim({
    claimFullCdpFarmLive: input.claimFullCdpFarmLive,
    claimUnrestrictedHostAutomation: input.claimUnrestrictedHostAutomation,
  })
  if (!claim.allowed) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'BrowserOperator claim rejected',
      summary: claim.message,
      refs: [`claim:${claim.reason}`],
      actor: 'BrowserOperator',
    })
    return {
      success: false,
      blockedReason: claim.reason!,
      message: claim.message,
      honesty: BROWSER_OPERATOR_HONESTY,
      ledger,
    }
  }

  if (!input.targetUrls.length || !input.query.trim()) {
    return {
      success: false,
      blockedReason: 'invalid_input',
      message: 'query and at least one targetUrl are required',
      honesty: BROWSER_OPERATOR_HONESTY,
      ledger,
    }
  }

  const pages: BrowserEvidenceItem[] = []
  let run: BrowserOperatorRun | null = null

  for (const url of input.targetUrls) {
    try {
      const snap = await governedFetchSnapshot({
        url,
        intent: `research: ${input.query}`,
        allowedDomains: input.allowedDomains,
        deniedDomains: input.deniedDomains,
        fetcher: input.fetcher,
        hasHumanApproval: true,
        approvalToken: 'research-read-only',
      })

      if (!snap.ok || !snap.page) {
        ledger = appendTaskEvidence(ledger, {
          kind: 'validation',
          title: 'Governed fetch blocked',
          summary: snap.blockers.join('; ') || 'policy blocked',
          refs: [`url:${url}`, `policy:${snap.decision.status}`],
          actor: 'BrowserOperator',
        })
        if (pages.length === 0) {
          return {
            success: false,
            blockedReason: snap.blockers.some((b) => b.includes('allowlist'))
              ? 'domain_not_allowlisted'
              : 'policy_blocked',
            message: snap.blockers[0] ?? 'Browser Operator policy blocked fetch',
            honesty: BROWSER_OPERATOR_HONESTY,
            ledger,
          }
        }
        continue
      }

      const contentHash = digest(snap.page.text).slice(0, 32)
      const domSnapshotHash = snap.page.domSnapshot
        ? digest(snap.page.domSnapshot).slice(0, 32)
        : undefined

      run = recordBrowserOperatorStep({
        runId: run?.runId,
        projectId: input.projectId,
        actorId: input.actorId ?? input.userId,
        mission: input.query,
        tool: 'governed-fetch',
        targetUrl: url,
        intent: `research: ${input.query}`,
        pageText: snap.page.text,
        screenshotUrl: snap.page.screenshotUrl,
        domSnapshot: snap.page.domSnapshot ?? snap.page.text,
        allowedDomains: input.allowedDomains ?? [...DEFAULT_BROWSER_RESEARCH_ALLOWLIST],
        deniedDomains: input.deniedDomains,
        hasHumanApproval: true,
        approvalToken: 'research-read-only',
        params: {
          executionLane: 'governed-fetch',
          cdpFarm: BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
        },
      })

      const lastStep = run.steps[run.steps.length - 1]
      pages.push({
        url,
        title: snap.page.title,
        snippet: snap.page.text.slice(0, 280),
        contentHash,
        domSnapshotHash,
        policyStatus: lastStep?.decision.status ?? snap.decision.status,
        evidenceRefs: lastStep?.evidenceRefs ?? [],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'provider_down'
      ledger = appendTaskEvidence(ledger, {
        kind: 'validation',
        title: 'Fetch failed',
        summary: message,
        refs: [`url:${url}`],
        actor: 'BrowserOperator',
      })
      if (pages.length === 0) {
        return {
          success: false,
          blockedReason: 'provider_down',
          message,
          honesty: BROWSER_OPERATOR_HONESTY,
          ledger,
        }
      }
    }
  }

  if (!pages.length || !run) {
    return {
      success: false,
      blockedReason: 'empty_artifact',
      message: 'No evidence pages produced',
      honesty: BROWSER_OPERATOR_HONESTY,
      ledger,
    }
  }

  const sessionId = `bos_${randomUUID().slice(0, 12)}`
  const session: BrowserOperatorSessionArtifact = {
    sessionId,
    runId: run.runId,
    query: input.query,
    timelineHash: run.timelineHash,
    pages,
    executionLane: 'governed-fetch',
    cdpFarmStatus: BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
  }

  const weight = input.estimatedTokenWeight ?? 800
  const { result: bridge, ledger: bridgeLedger } = await dispatchCreativeArtifact({
    request: {
      domain: 'web-research',
      prompt: input.query,
      projectId: input.projectId,
      userId: input.userId,
      evidenceKind: 'browser-operator-session',
      costGuard: {
        estimatedTokenWeight: weight,
        byokProfileId: input.byokProfileId,
        usageBucketId: input.usageBucketId,
        planId: input.planId ?? 'pro',
      },
      requiresFusionWrite: false,
    },
    adapter: input.adapter,
    ledger,
    provider: async () => ({
      artifactId: session.sessionId,
      provider: 'browser-operator-governed-fetch',
      costUsd: 0,
      actualTokenWeight: weight,
      empty: false,
      previewUrl: pages[0]?.url,
    }),
  })

  ledger = bridgeLedger

  if (!bridge.success) {
    return {
      success: false,
      blockedReason:
        bridge.blockedReason === 'empty_artifact'
          ? 'empty_artifact'
          : bridge.blockedReason === 'provider_down'
            ? 'provider_down'
            : 'cost_guard',
      message: `CreativeBridge blocked BrowserOperator: ${bridge.blockedReason ?? 'unknown'}`,
      honesty: BROWSER_OPERATOR_HONESTY,
      ledger,
      bridge: { success: false, blockedReason: bridge.blockedReason },
    }
  }

  ledger = appendTaskEvidence(ledger, {
    kind: 'browser-replay',
    title: 'BrowserOperator session evidence',
    summary: `${pages.length} page(s); lane=governed-fetch; cdpFarm=${BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS}`,
    refs: [
      `session:${session.sessionId}`,
      `run:${run.runId}`,
      `timeline:${run.timelineHash}`,
      ...pages.flatMap((p) => [`url:${p.url}`, `hash:${p.contentHash}`]),
      'browser-replay:governed-fetch',
      'source-citation:session',
    ],
    actor: 'BrowserOperator',
  })
  ledger = appendTaskEvidence(ledger, {
    kind: 'source',
    title: 'Research sources captured',
    summary: pages.map((p) => p.title).join('; ').slice(0, 240),
    refs: pages.map((p) => `source:${p.url}`),
    actor: 'BrowserOperator',
  })
  ledger = appendTaskEvidence(ledger, {
    kind: 'validation',
    title: 'CDP farm honesty',
    summary: BROWSER_OPERATOR_HONESTY.cdpFarmHeld,
    refs: [`cdp-farm:${BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS}`],
    actor: 'BrowserOperator',
  })

  log.info('browser_operator_ok', {
    sessionId: session.sessionId,
    runId: run.runId,
    pages: pages.length,
  })

  return {
    success: true,
    session,
    run,
    artifactId: session.sessionId,
    evidenceReceiptId: bridge.evidenceReceiptId,
    honesty: BROWSER_OPERATOR_HONESTY,
    ledger,
    bridge: { success: true },
  }
}

export function __resetBrowserOperatorForTests() {
  clearBrowserOperatorRunsForTests()
}
