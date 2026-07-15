'use client'

import EngineModuleAdapterCockpit from '@/components/studio/EngineModuleAdapterCockpit'
import {
  EvidenceGraphPanel,
  EvidenceProjectReceiptsPanel,
  EvidenceReadinessSummary,
  EvidenceReleaseReceiptsPanel,
  EvidenceResearchMeshPanel,
  EvidenceTimelinePanel,
  type AgentLedgerEntry,
  type EvidenceGraphEntry,
  type EvidenceMetric,
  type ProductionBiblePlanSummary,
  type ReleaseEvidencePackageManifest,
  type ReleaseEvidencePackageManifestVerification,
  type ReleaseEvidenceReadinessSnapshot,
  type ReleaseReviewAction,
  type ReleaseReviewState,
  type ResearchNavigationMeshSnapshot,
} from './EvidenceCenter.parts'

type EvidenceCenterReadySurfaceProps = {
  readinessStats: EvidenceMetric[]
  releaseReadiness: ReleaseEvidenceReadinessSnapshot | null
  releaseManifest: ReleaseEvidencePackageManifest | null
  releaseManifestVerification: ReleaseEvidencePackageManifestVerification | null
  releaseReviewState: ReleaseReviewState
  releaseReviewMessage: string | null
  releaseDecisionNote: string
  onDecisionNoteChange: (note: string) => void
  onSubmitReviewAction: (action: ReleaseReviewAction) => void
  onExportManifest: () => void
  navigationMesh: ResearchNavigationMeshSnapshot | null
  projectName: string
  objective: string
  isReady: boolean
  creativeStyle: string
  creativeTone: string
  preferredTarget: string
  fallbackTarget: string
  maxConcurrentHeavyJobs: number
  productionBiblePlan: ProductionBiblePlanSummary | null
  nextAction: string
  needsHumanApproval: boolean
  graphEntries: EvidenceGraphEntry[]
  recentLedger: AgentLedgerEntry[]
}

export function EvidenceCenterReadySurface({
  readinessStats,
  releaseReadiness,
  releaseManifest,
  releaseManifestVerification,
  releaseReviewState,
  releaseReviewMessage,
  releaseDecisionNote,
  onDecisionNoteChange,
  onSubmitReviewAction,
  onExportManifest,
  navigationMesh,
  projectName,
  objective,
  isReady,
  creativeStyle,
  creativeTone,
  preferredTarget,
  fallbackTarget,
  maxConcurrentHeavyJobs,
  productionBiblePlan,
  nextAction,
  needsHumanApproval,
  graphEntries,
  recentLedger,
}: EvidenceCenterReadySurfaceProps) {
  return (
    <div className="mt-6 space-y-6" data-evidence-center-surface="compact">
      <EvidenceReadinessSummary stats={readinessStats} />

      {releaseReadiness ? (
        <EvidenceReleaseReceiptsPanel
          releaseReadiness={releaseReadiness}
          releaseManifest={releaseManifest}
          releaseManifestVerification={releaseManifestVerification}
          releaseReviewState={releaseReviewState}
          releaseReviewMessage={releaseReviewMessage}
          releaseDecisionNote={releaseDecisionNote}
          onDecisionNoteChange={onDecisionNoteChange}
          onSubmitReviewAction={onSubmitReviewAction}
          onExportManifest={onExportManifest}
        />
      ) : null}

      <EngineModuleAdapterCockpit compact />

      {navigationMesh ? (
        <EvidenceResearchMeshPanel navigationMesh={navigationMesh} />
      ) : null}

      <EvidenceProjectReceiptsPanel
        projectName={projectName}
        objective={objective}
        isReady={isReady}
        creativeStyle={creativeStyle}
        creativeTone={creativeTone}
        preferredTarget={preferredTarget}
        fallbackTarget={fallbackTarget}
        maxConcurrentHeavyJobs={maxConcurrentHeavyJobs}
        productionBiblePlan={productionBiblePlan}
        nextAction={nextAction}
        needsHumanApproval={needsHumanApproval}
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <EvidenceGraphPanel graphEntries={graphEntries} />
        <EvidenceTimelinePanel recentLedger={recentLedger} />
      </section>
    </div>
  )
}
