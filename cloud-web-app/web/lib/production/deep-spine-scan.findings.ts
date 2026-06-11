import { ENGINE_LIB_TARGETS } from './deep-spine-scan.contracts'
import type {
  DeepSpineFinding,
  DeepSpineFindingCategory,
  DeepSpineScanBudget,
  DeepSpineScanManifest,
  DeepSpineScanMode,
  DeepSpineScanSurfaceSignal,
  DeepSpineWorkPacket,
} from './deep-spine-scan.contracts'
import type { RepositoryArtifactInput, RepositoryCartographyManifest, RepositorySurface } from './repository-cartography'
import { normalizePath, slugify, unique } from './deep-spine-scan.utils'

export function finding(input: Omit<DeepSpineFinding, 'id' | 'safeAutofix' | 'requiresHumanReview'> & { id?: string }): DeepSpineFinding {
  return {
    id: input.id ?? `finding-${slugify(`${input.category}-${input.path}-${input.recommendation}`)}`,
    severity: input.severity,
    category: input.category,
    path: normalizePath(input.path || 'project'),
    line: input.line,
    evidence: unique(input.evidence, 20),
    recommendation: input.recommendation,
    confidence: Math.max(0, Math.min(1, input.confidence)),
    safeAutofix: false,
    requiresHumanReview: input.severity === 'blocker' || input.severity === 'high' || input.category === 'external-provenance',
  }
}

export function sourceRefsFor(surfaces: RepositorySurface[]): string[] {
  return unique(
    surfaces.flatMap((surface) => [
      surface.path,
      surface.hash ? `hash:${surface.hash}` : '',
      surface.license ? `license:${surface.license}` : '',
      surface.sourceUrl ? `source:${surface.sourceUrl}` : '',
    ]),
    120
  )
}

export function signalFor(signals: DeepSpineScanSurfaceSignal[], path: string): DeepSpineScanSurfaceSignal | undefined {
  const normalized = normalizePath(path)
  return signals.find((signal) => normalizePath(signal.path) === normalized || normalized.endsWith(normalizePath(signal.path)))
}

export function buildFindings(input: {
  mode: DeepSpineScanMode
  budget: DeepSpineScanBudget
  selectedArtifacts: RepositoryArtifactInput[]
  allArtifacts: RepositoryArtifactInput[]
  cartography: RepositoryCartographyManifest
  surfaceSignals: DeepSpineScanSurfaceSignal[]
  heldBytes: number
  indexingBlockers: string[]
}): DeepSpineFinding[] {
  const findings: DeepSpineFinding[] = []
  const selectedBytes = input.selectedArtifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0)
  const allBytes = input.allArtifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0)

  if (input.selectedArtifacts.length < input.allArtifacts.length || selectedBytes < allBytes) {
    findings.push(
      finding({
        severity: 'high',
        category: 'runtime-budget',
        path: 'project',
        line: null,
        evidence: [`selected:${input.selectedArtifacts.length}`, `total:${input.allArtifacts.length}`, `budget:${input.budget.maxBytes}`],
        recommendation: 'Continue in worker/sidecar/cloud-indexer batches; never dump the full MB/GB project into model context.',
        confidence: 0.98,
      })
    )
  }

  if (input.heldBytes > 0) {
    findings.push(
      finding({
        severity: 'high',
        category: 'context-budget',
        path: 'project',
        line: null,
        evidence: [`held-bytes:${input.heldBytes}`, ...input.indexingBlockers.slice(0, 4)],
        recommendation: 'Resolve held shards with sidecar/cloud indexing or human review before apply/generation.',
        confidence: 0.95,
      })
    )
  }

  for (const surface of input.cartography.surfaces) {
    const signal = signalFor(input.surfaceSignals, surface.path)
    if (surface.sizeClass === 'huge' || surface.strategy === 'manual-review') {
      findings.push(
        finding({
          severity: 'medium',
          category: 'large-file',
          path: surface.path,
          line: null,
          evidence: [`size:${surface.sizeBytes}`, `strategy:${surface.strategy}`, ...surface.risks],
          recommendation: 'Keep this surface metadata/index-only until proxy, thumbnail, license, and budget evidence exist.',
          confidence: 0.9,
        })
      )
    }

    if (input.mode === 'external' || surface.sourceKind !== 'local-workspace') {
      const hasLicense = Boolean(surface.license) || signal?.hasLicenseEvidence === true
      const hasChecksum = Boolean(surface.hash) || signal?.hasChecksumEvidence === true
      if (!hasLicense || !hasChecksum || !surface.sourceUrl) {
        findings.push(
          finding({
            severity: 'high',
            category: 'external-provenance',
            path: surface.path,
            line: null,
            evidence: [
              `source-kind:${surface.sourceKind}`,
              hasLicense ? 'license:present' : 'license:missing',
              hasChecksum ? 'checksum:present' : 'checksum:missing',
              surface.sourceUrl ? 'source-url:present' : 'source-url:missing',
            ],
            recommendation: 'Hold adaptation until license, checksum, source URL, and explicit approval are recorded.',
            confidence: 0.97,
          })
        )
      }
    }

    if (signal?.lineCount && signal.lineCount >= 950) {
      findings.push(
        finding({
          severity: 'medium',
          category: 'god-file',
          path: surface.path,
          line: 1,
          evidence: [`line-count:${signal.lineCount}`],
          recommendation: 'Split this file before it crosses the god-file ratchet; keep orchestration thin and move sections behind adapters.',
          confidence: 0.88,
        })
      )
    }

    if (signal?.hardcodedCopyMatches && signal.hardcodedCopyMatches > 0) {
      findings.push(
        finding({
          severity: 'medium',
          category: 'i18n',
          path: surface.path,
          line: null,
          evidence: [`hardcoded-copy-matches:${signal.hardcodedCopyMatches}`],
          recommendation: 'Migrate visible Portuguese copy to locale keys and keep tests/docs allowlisted only.',
          confidence: 0.86,
        })
      )
    }

    const engineTarget = ENGINE_LIB_TARGETS.get(surface.basename)
    if (engineTarget && signal?.importerCount === 0) {
      findings.push(
        finding({
          severity: 'high',
          category: 'dead-code',
          path: surface.path,
          line: 1,
          evidence: [`importer-count:${signal.importerCount}`, `owner:${engineTarget.agent}`],
          recommendation: engineTarget.recommendation,
          confidence: 0.94,
        })
      )
    }

    if (/aaa-renderer-impl\.ts$/.test(surface.path) && !signal?.hasAaaRendererEvidence) {
      findings.push(
        finding({
          severity: 'high',
          category: 'rendering',
          path: surface.path,
          line: 1,
          evidence: ['audit-v17:aaa-render-impl-risk', 'renderer-evidence:missing'],
          recommendation: 'Add explicit renderer capability/frame evidence and final-render blockers before marketing AAA render claims.',
          confidence: 0.92,
        })
      )
    }
  }

  const hasWebGpuEvidence =
    input.surfaceSignals.some((signal) => signal.hasWebGpuReference) ||
    input.cartography.surfaces.some((surface) => /webgpu|webgpu-renderer/i.test(surface.path))
  if (input.mode === 'aaa' && !hasWebGpuEvidence) {
    findings.push(
      finding({
        severity: 'high',
        category: 'rendering',
        path: 'cloud-web-app/web/lib/render',
        line: null,
        evidence: ['mode:aaa', 'webgpu-reference:missing'],
        recommendation: 'Add a feature-flagged WebGPU renderer probe/fallback before claiming modern browser AAA rendering.',
        confidence: 0.9,
      })
    )
  }

  return findings
    .sort((left, right) => {
      const priority = { blocker: 0, high: 1, medium: 2, low: 3 }
      return priority[left.severity] - priority[right.severity] || left.path.localeCompare(right.path)
    })
    .slice(0, input.budget.maxFindings)
}

export function ownerAgentFor(category: DeepSpineFindingCategory): string {
  switch (category) {
    case 'rendering':
    case 'toolchain':
      return 'Performance Agent'
    case 'game-production':
    case 'dead-code':
      return 'Gameplay Engineer Agent'
    case 'external-provenance':
      return 'Legal Reviewer'
    case 'i18n':
      return 'Translator'
    case 'god-file':
      return 'Software Engineer Agent'
    default:
      return 'Producer Agent'
  }
}

export function buildWorkPackets(findings: DeepSpineFinding[]): DeepSpineWorkPacket[] {
  return findings
    .filter((item) => item.severity === 'blocker' || item.severity === 'high')
    .slice(0, 12)
    .map((item) => ({
      id: `work-${slugify(item.id)}`,
      title: item.recommendation,
      ownerAgent: ownerAgentFor(item.category),
      targetPaths: item.path === 'project' ? [] : [item.path],
      blockedUntil: [
        'Read receipts are recorded for every target surface.',
        'Scope lock is assigned before diff proposal.',
        'Rollback or artifact cleanup plan exists before apply.',
      ],
      evidenceRequired: unique(['deep-spine-scan manifest', ...item.evidence, 'validation result'], 12),
    }))
}

export function buildNextActions(findings: DeepSpineFinding[], workPackets: DeepSpineWorkPacket[]): string[] {
  if (findings.length === 0) {
    return ['No blockers found. Keep the scan manifest as evidence and run focused validation before apply.']
  }

  return unique(
    [
      ...workPackets.map((packet) => `${packet.ownerAgent}: ${packet.title}`),
      'Use diff-proposal only after read receipts, scope lock, tests, and rollback evidence exist.',
      'Re-run Deep Spine Scan after fixes to close stale work packets.',
    ],
    16
  )
}

export function buildBlockedActions(findings: DeepSpineFinding[]): string[] {
  const blocked = [
    'Do not auto-fix from scan output; generate scoped diffs only through the governed apply path.',
    'Do not download internet packages or models from this scan without license, checksum, source URL, and approval.',
    'Do not run MB/GB indexing, render, asset optimization, shader compile, or browser automation on the browser main thread.',
  ]

  if (findings.some((item) => item.category === 'external-provenance')) {
    blocked.push('External adaptation is held until provenance evidence is complete.')
  }
  if (findings.some((item) => item.category === 'runtime-budget' || item.category === 'context-budget')) {
    blocked.push('Apply/generation is held for over-budget or held shards until sidecar/cloud/human review resolves them.')
  }

  return blocked
}

export function buildHandoffPrompt(input: {
  manifest: DeepSpineScanManifest
  cartography: RepositoryCartographyManifest
}): string {
  const topFindings = input.manifest.findings
    .slice(0, 6)
    .map((item) => `${item.severity}:${item.category}:${item.path}`)
    .join(', ')

  return [
    `Deep Spine Scan ${input.manifest.scanId} inspected ${input.manifest.filesScanned} files / ${input.manifest.bytesScanned} bytes.`,
    `Use cartography ${input.cartography.id}, read receipts ${input.manifest.readReceipts.join(', ')}, and work packets before edits.`,
    topFindings ? `Top findings: ${topFindings}.` : 'No top findings.',
    'Never claim done until validation evidence and rollback/artifact cleanup are recorded.',
  ].join(' ')
}
