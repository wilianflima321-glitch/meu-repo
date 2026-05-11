import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
} from '@/lib/production/agentic-production-state'
import { mergeAgenticProductionState } from '@/lib/production/agentic-production-state'
import type { ViewportAssetImportBatch, ViewportAssetImportRecord } from '@/lib/viewport/viewport-asset-import'
import { formatViewportAssetSize } from '@/lib/viewport/viewport-asset-import'

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function upsertProductionGraphNode(
  state: AgenticProductionState,
  key: ProductionGraphKey,
  node: ProductionGraphNode,
): ProductionGraphNode[] {
  const existing = state.graphs[key]
  const withoutNode = existing.filter((candidate) => candidate.id !== node.id)
  return [node, ...withoutNode].slice(0, 40)
}

function assetStatus(asset: ViewportAssetImportRecord): ProductionGraphNode['status'] {
  if (asset.metadata.licenseStatus === 'blocked') return 'blocked'
  if (asset.metadata.licenseStatus === 'approved' && asset.metadata.qualityGate === 'preview-ready') return 'ready'
  return 'needs-review'
}

function assetBlockers(asset: ViewportAssetImportRecord): string[] {
  const blockers: string[] = []
  if (asset.metadata.licenseStatus === 'blocked') blockers.push('Asset license is blocked')
  if (asset.metadata.licenseStatus === 'needs-review') blockers.push('License/provenance review required before release')
  if (asset.metadata.qualityGate === 'raw-intake') blockers.push('Asset quality gate is raw intake; generate preview/proxy before final release')
  return blockers
}

function summarizeAssets(batch: ViewportAssetImportBatch): string {
  const totalBytes = batch.assets.reduce((sum, asset) => sum + asset.metadata.sizeBytes, 0)
  return `${batch.assets.length} viewport asset${batch.assets.length === 1 ? '' : 's'} staged (${formatViewportAssetSize(totalBytes)})`
}

export function buildMissionLedgerEntryFromViewportAssetImport(
  batch: ViewportAssetImportBatch,
  now = new Date().toISOString(),
): MissionLedgerEntry {
  const blocked = batch.assets.some((asset) => assetStatus(asset) === 'blocked')
  const ready = batch.assets.every((asset) => assetStatus(asset) === 'ready')
  return {
    id: `asset-import-${batch.id}`,
    phase: 'Asset intake',
    ownerAgent: 'Asset Librarian Agent',
    state: blocked ? 'blocked' : ready ? 'complete' : 'needs-approval',
    summary: summarizeAssets(batch),
    acceptance: [
      'Asset metadata captured',
      'Origin and evidence reference attached',
      'License/provenance reviewed before release',
      'Scene usage connected to Scene/World Graph',
    ],
    evidenceRefs: unique([`asset-import:${batch.id}`, ...batch.evidenceRefs]),
    rollbackPlan: `Remove imported viewport assets from scene graph and revert Asset Graph entries for ${batch.id}.`,
    nextAction: blocked
      ? 'Replace blocked assets before release'
      : ready
        ? 'Use assets in scene, playtest, or render queue'
        : 'Review asset licenses and generate preview/proxy evidence',
    estimatedCostUsd: 0,
    updatedAt: now,
  }
}

export function mergeViewportAssetImportIntoProductionState(
  current: AgenticProductionState,
  batch: ViewportAssetImportBatch,
  now = new Date().toISOString(),
): AgenticProductionState {
  const assetNodes = batch.assets.map((asset): ProductionGraphNode => ({
    id: `asset-${asset.objectId}`,
    label: `${asset.objectName} - ${asset.metadata.format.toUpperCase()} - ${formatViewportAssetSize(asset.metadata.sizeBytes)}`,
    status: assetStatus(asset),
    ownerAgent: 'Asset Librarian Agent',
    evidenceRefs: unique([asset.metadata.evidenceRef, `asset-import:${batch.id}`]),
    blockers: assetBlockers(asset),
    updatedAt: now,
  }))

  const sceneNode: ProductionGraphNode = {
    id: `asset-scene-${batch.id}`,
    label: `Scene intake for ${batch.assets.map((asset) => asset.objectName).join(', ')}`,
    status: assetNodes.some((node) => node.status === 'blocked') ? 'blocked' : 'needs-review',
    ownerAgent: 'Technical Artist Agent',
    evidenceRefs: unique([`asset-import:${batch.id}`, ...batch.evidenceRefs]),
    blockers: assetNodes.flatMap((node) => node.blockers),
    updatedAt: now,
  }

  const evidenceNode: ProductionGraphNode = {
    id: `asset-evidence-${batch.id}`,
    label: `Evidence for ${summarizeAssets(batch)}`,
    status: batch.evidenceRefs.length > 0 ? 'needs-review' : 'missing',
    ownerAgent: 'QA Agent',
    evidenceRefs: unique([`asset-import:${batch.id}`, ...batch.evidenceRefs]),
    blockers: ['Attach thumbnail/proxy render and license source before final release'],
    updatedAt: now,
  }

  const validationNode: ProductionGraphNode = {
    id: `asset-validation-${batch.id}`,
    label: `Validation for ${summarizeAssets(batch)}`,
    status: assetNodes.some((node) => node.status === 'blocked') ? 'blocked' : 'needs-review',
    ownerAgent: 'QA Agent',
    evidenceRefs: unique([`asset-import:${batch.id}`, ...batch.evidenceRefs]),
    blockers: unique(assetNodes.flatMap((node) => node.blockers)),
    updatedAt: now,
  }

  return mergeAgenticProductionState(
    current,
    {
      brain: {
        risks: unique([
          ...current.brain.risks,
          ...batch.assets
            .filter((asset) => asset.metadata.licenseStatus !== 'approved')
            .map((asset) => `Asset provenance pending: ${asset.objectName}`),
        ]),
      },
      ledger: [buildMissionLedgerEntryFromViewportAssetImport(batch, now), ...current.ledger].slice(0, 50),
      graphs: {
        assetGraph: assetNodes.reduce(
          (nodes, node) => {
            const withoutNode = nodes.filter((candidate) => candidate.id !== node.id)
            return [node, ...withoutNode]
          },
          current.graphs.assetGraph,
        ).slice(0, 40),
        sceneWorldGraph: upsertProductionGraphNode(current, 'sceneWorldGraph', sceneNode),
        evidenceGraph: upsertProductionGraphNode(current, 'evidenceGraph', evidenceNode),
        validationGraph: upsertProductionGraphNode(current, 'validationGraph', validationNode),
      },
    },
    now,
  )
}
