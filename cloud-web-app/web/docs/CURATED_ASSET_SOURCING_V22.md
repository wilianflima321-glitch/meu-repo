# Curated Asset Sourcing V22

Generated assets are useful for speed, but they are not automatically production assets.

## Rule

Every game asset must pass through a sourcing decision before an agent can call it demo-ready, marketplace-ready, or final.

## Acquisition Lanes

- `ai-draft`: fast blockout, ideation, silhouette exploration. Draft assets are not final.
- `curated-library`: CC0 or verified commercial library assets with source manifest and provenance.
- `premium-marketplace`: paid marketplace assets with license review, rollback, and human approval.
- `first-party-production`: human-made or first-party commissioned source assets.
- `studio-local-kitbash`: verified sources merged and optimized through Studio Local sidecars.
- `cloud-render-source`: expensive final-review sources for cinematic or client demos when Cloud Stream is configured.

## Required Evidence

- Art direction board and style lock.
- License/provenance receipt.
- Source asset manifest with hash or asset ID.
- PBR, LOD, collision, and performance evidence for playable builds.
- Human art-direction approval before premium or public claims.

## Product Behavior

The AI Quality Orchestrator now returns an `assetSourcingPlan` alongside the quality upgrade plan. The viewport inspector shows the chosen source lane and search plan, but execution remains a separate governed action.

No final claim is allowed from raw text-to-3D output. If sourcing evidence is missing, the state stays `held`; if license or budget is blocked, the state becomes `blocked`; if evidence exists, the next state is `needs-review`, not `ready`.
