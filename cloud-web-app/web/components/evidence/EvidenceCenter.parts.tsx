export type {
  AgentLedgerEntry,
  EvidenceGraphEntry,
  EvidenceMetric,
  EvidenceProjectSummary,
  ProductionBiblePlanSummary,
  ReleaseEvidencePackageManifest,
  ReleaseEvidencePackageManifestVerification,
  ReleaseEvidenceReadinessSnapshot,
  ReleaseReviewAction,
  ReleaseReviewState,
  ResearchNavigationMeshSnapshot,
} from './EvidenceCenter.types'
export {
  EvidenceCenterHero,
  EvidenceEmptyState,
  EvidenceErrorState,
  EvidenceLoadingRunboard,
  EvidenceReadinessSummary,
} from './EvidenceCenter.summary'
export { EvidenceReleaseReceiptsPanel } from './EvidenceCenter.release'
export { EvidenceResearchMeshPanel } from './EvidenceCenter.research'
export { EvidenceProjectReceiptsPanel } from './EvidenceCenter.project'
export {
  EvidenceGraphPanel,
  EvidenceTimelinePanel,
} from './EvidenceCenter.graph'

/*
Evidence Center split contract:
- Project receipts, blockers, review status, and next action in one protected view.
- Evidence unavailable.
- Review package, Request review, Record approval, Reject package, Export manifest, Integrity verified.
- data-evidence-source="release-evidence-readiness" and data-evidence-source="release-evidence-package-manifest".
- data-evidence-source="research-navigation-mesh".
- Project context, Recent activity, Receipts graph, Show review checks, held for review.
- Production plan preview, Open production plan details, <details, uxDisclosure, nextAction.
- productionBiblePlan.cinematicEvidence.state, productionBiblePlan.playtestSpine.state, productionBiblePlan.genrePack.coreLoop.
- productionBible.firstUserDecision, deepBible.evidenceModel.requiredEvidence.length, productionGraphs.slice.
*/
