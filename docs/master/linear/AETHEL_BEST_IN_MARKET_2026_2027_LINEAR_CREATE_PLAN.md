# AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PLAN
Status: DRY_RUN_READY
Generated: 2026-05-04T17:02:13.519Z

## Project
Aethel Best-In-Market 2026-2027

## Execution Safety
- This report was generated without mutating Linear.
- Remote creation requires `--execute` plus Linear credentials.
- Label creation requires both `--execute` and `--create-labels`.
- Project association requires `LINEAR_PROJECT_ID`; otherwise issues can still be created at team level.

## Required Environment
- `LINEAR_API_KEY` or `LINEAR_ACCESS_TOKEN`
- `LINEAR_TEAM_ID` or `LINEAR_TEAM_KEY`
- optional `LINEAR_PROJECT_ID`

## Planned Operations
- label | benchmark | benchmark
- label | studio-home | studio-home
- label | agent-fleet | agent-fleet
- label | repository-cartography | repository-cartography
- label | game-film | game-film
- label | viewport | viewport
- label | browser-operator | browser-operator
- label | enterprise | enterprise
- label | performance | performance
- label | mobile | mobile
- label | design-system | design-system
- epic-issue | BIM-EPIC-00 | Benchmark V14 Canonical Audit | priority=P0
- child-issue | BIM-001 | Maintain V14 benchmark gate as a release blocker | parent=BIM-EPIC-00 | priority=P0
- child-issue | BIM-002 | Refresh benchmark source snapshots before major market claims | parent=BIM-EPIC-00 | priority=P1
- epic-issue | BIM-EPIC-01 | Agent Fleet + Repository Cartography | priority=P0
- child-issue | BIM-010 | Expose Repository Cartography map in Studio and IDE context | parent=BIM-EPIC-01 | priority=P0
- child-issue | BIM-011 | Add isolated Agent Fleet sessions with scope and ownership | parent=BIM-EPIC-01 | priority=P0
- child-issue | BIM-012 | Add anti-duplication and anti-invention guardrails from cartography | parent=BIM-EPIC-01 | priority=P0
- child-issue | BIM-013 | Support external source mirrors for very large repos and asset packs | parent=BIM-EPIC-01 | priority=P1
- child-issue | BIM-014 | Create agent handoff packets for long-running work | parent=BIM-EPIC-01 | priority=P1
- epic-issue | BIM-EPIC-02 | Studio Home Mission-First Experience | priority=P0
- child-issue | BIM-020 | Refine Studio Home around one dominant mission card | parent=BIM-EPIC-02 | priority=P0
- child-issue | BIM-021 | Add compact Project Brain and Mission Ledger modules to Studio Home | parent=BIM-EPIC-02 | priority=P0
- child-issue | BIM-022 | Add device/runtime policy card for cloud/local/NPU/GPU routing | parent=BIM-EPIC-02 | priority=P1
- child-issue | BIM-023 | Define Mobile Companion approval-only MVP | parent=BIM-EPIC-02 | priority=P1
- epic-issue | BIM-EPIC-03 | Game/Film Viewport Authority | priority=P1
- child-issue | BIM-030 | Promote viewport layout for game/film missions | parent=BIM-EPIC-03 | priority=P1
- child-issue | BIM-031 | Add Asset Graph provenance and approval surface | parent=BIM-EPIC-03 | priority=P1
- child-issue | BIM-032 | Add Scene/World Graph review surface | parent=BIM-EPIC-03 | priority=P1
- child-issue | BIM-033 | Add Gameplay Graph validation packets | parent=BIM-EPIC-03 | priority=P1
- child-issue | BIM-034 | Add Shot/Film Graph validation packets | parent=BIM-EPIC-03 | priority=P2
- epic-issue | BIM-EPIC-04 | Design Canvas + Figma MCP Parity | priority=P1
- child-issue | BIM-040 | Define design reference attachment model for missions | parent=BIM-EPIC-04 | priority=P1
- child-issue | BIM-041 | Create Figma MCP mapping contract for components and tokens | parent=BIM-EPIC-04 | priority=P1
- child-issue | BIM-042 | Add design-canvas not-now boundaries | parent=BIM-EPIC-04 | priority=P2
- epic-issue | BIM-EPIC-05 | Browser Operator Manus-Style Approvals | priority=P1
- child-issue | BIM-050 | Add Browser Operator permission manifest per mission | parent=BIM-EPIC-05 | priority=P1
- child-issue | BIM-051 | Add Browser Operator replay and evidence ledger | parent=BIM-EPIC-05 | priority=P1
- child-issue | BIM-052 | Add pause and takeover semantics to operator UX | parent=BIM-EPIC-05 | priority=P1
- epic-issue | BIM-EPIC-06 | Realtime Collaboration + Versioning | priority=P1
- child-issue | BIM-060 | Expose remote cursors and file presence in IDE | parent=BIM-EPIC-06 | priority=P1
- child-issue | BIM-061 | Add agent worktree/diff review model | parent=BIM-EPIC-06 | priority=P1
- child-issue | BIM-062 | Tie merge/rollback actions to Mission Ledger | parent=BIM-EPIC-06 | priority=P1
- epic-issue | BIM-EPIC-07 | Adobe-Style Creative Media Pipeline | priority=P2
- child-issue | BIM-070 | Add creative variant review model | parent=BIM-EPIC-07 | priority=P2
- child-issue | BIM-071 | Define render queue MVP for film/game previews | parent=BIM-EPIC-07 | priority=P2
- child-issue | BIM-072 | Add media rights/provenance gate | parent=BIM-EPIC-07 | priority=P2
- epic-issue | BIM-EPIC-08 | Enterprise Trust/Billing Readiness | priority=P2
- child-issue | BIM-080 | Create procurement-ready trust packet index | parent=BIM-EPIC-08 | priority=P2
- child-issue | BIM-081 | Expose mission-level cost and margin evidence | parent=BIM-EPIC-08 | priority=P2
- child-issue | BIM-082 | Add factual certification/claim registry | parent=BIM-EPIC-08 | priority=P2
- epic-issue | BIM-EPIC-09 | Performance, Monorepo, Local Runtime Scale | priority=P2
- child-issue | BIM-090 | Add runtime lane policy for UI, AI, build, render, browser, and indexing jobs | parent=BIM-EPIC-09 | priority=P2
- child-issue | BIM-091 | Add device capability profile for GPU/NPU/CPU/RAM and cloud fallback | parent=BIM-EPIC-09 | priority=P2
- child-issue | BIM-092 | Add GB-scale repository fixture and performance validation plan | parent=BIM-EPIC-09 | priority=P2
- child-issue | BIM-093 | Create cache and crash-recovery policy for Studio Local | parent=BIM-EPIC-09 | priority=P2
