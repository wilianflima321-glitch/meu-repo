export type InternalRuntimeDecision = 'wire' | 'monitor' | 'split' | 'hold'
export type InternalRuntimeBoundary =
  | 'admin-only'
  | 'ide-only'
  | 'server-only'
  | 'worker-held'
  | 'summary-only'
  | 'test-only'
  | 'user-action-required'

export type InternalRuntimeRisk =
  | 'agent-safety-risk'
  | 'bundle-risk'
  | 'creative-gap'
  | 'debug-surface-risk'
  | 'developer-experience-risk'
  | 'parallel-runtime'
  | 'privacy-risk'
  | 'state-drift'

export interface InternalRuntimeGovernanceDecision {
  modulePath: string
  decision: InternalRuntimeDecision
  ownerSurface: string
  boundary: InternalRuntimeBoundary
  reason: string
  risks: InternalRuntimeRisk[]
  evidenceSignals: string[]
  nextAction: string
}

export const INTERNAL_RUNTIME_GOVERNANCE_DECISIONS: InternalRuntimeGovernanceDecision[] = [
  {
    modulePath: 'components/dashboard/useDashboardActions.ts',
    decision: 'split',
    ownerSurface: '/dashboard',
    boundary: 'user-action-required',
    reason: 'Dashboard actions are product-critical, but the hook is too broad to keep growing as one action bag.',
    risks: ['state-drift', 'bundle-risk'],
    evidenceSignals: ['action-owner', 'mission-ledger-write', 'toast-receipt'],
    nextAction: 'Split project, mission, billing, and navigation actions before adding more dashboard flows.',
  },
  {
    modulePath: 'lib/debug/profiler-system.tsx',
    decision: 'hold',
    ownerSurface: '/admin/platform',
    boundary: 'admin-only',
    reason: 'Profiler runtime is powerful and sensitive; it should be admin/dev evidence, not user-facing product chrome.',
    risks: ['debug-surface-risk', 'privacy-risk'],
    evidenceSignals: ['profile-session-id', 'redacted-sample', 'admin-owner'],
    nextAction: 'Expose only redacted profile summaries through admin diagnostics and keep raw capture gated.',
  },
  {
    modulePath: 'lib/debug/object-inspector.tsx',
    decision: 'hold',
    ownerSurface: '/admin/platform',
    boundary: 'admin-only',
    reason: 'Object inspection can leak internal state if rendered in product screenshots or public surfaces.',
    risks: ['debug-surface-risk', 'privacy-risk'],
    evidenceSignals: ['redaction-policy', 'object-scope', 'admin-session'],
    nextAction: 'Keep object inspection in debug/admin tools with screenshot masking and explicit scope labels.',
  },
  {
    modulePath: 'hooks/useAethelGateway.ts',
    decision: 'split',
    ownerSurface: 'gateway-client',
    boundary: 'summary-only',
    reason: 'Gateway access is broad and should be split by auth, billing, project, and runtime domains.',
    risks: ['parallel-runtime', 'state-drift'],
    evidenceSignals: ['gateway-domain', 'rate-limit-key', 'request-receipt'],
    nextAction: 'Create narrow gateway hooks per product domain and keep shared request policy centralized.',
  },
  {
    modulePath: 'lib/aaa-render-system.ts',
    decision: 'hold',
    ownerSurface: '/studio/level',
    boundary: 'summary-only',
    reason: 'The render kernel remains strategic, but direct imports should wait for a viewport backend adapter and trace evidence.',
    risks: ['bundle-risk', 'parallel-runtime'],
    evidenceSignals: ['render-backend', 'frame-trace', 'quality-lane'],
    nextAction: 'Keep as render-spine summary until WebGPU/Studio Local/Cloud Stream traces can select an execution lane.',
  },
  {
    modulePath: 'lib/plugins/plugin-system.tsx',
    decision: 'split',
    ownerSurface: '/settings/integrations',
    boundary: 'user-action-required',
    reason: 'Plugin runtime should not become a hidden marketplace execution surface without install review and permissions.',
    risks: ['agent-safety-risk', 'bundle-risk'],
    evidenceSignals: ['plugin-permission', 'install-review', 'rollback-plan'],
    nextAction: 'Split registry, permissions, sandbox, UI, and installation review before enabling plugin execution.',
  },
  {
    modulePath: 'lib/admin/admin-consolidation.ts',
    decision: 'wire',
    ownerSurface: '/admin/trust',
    boundary: 'admin-only',
    reason: 'Security data belongs in the consolidated Trust admin console, not the everyday dashboard first fold.',
    risks: ['privacy-risk', 'bundle-risk'],
    evidenceSignals: ['masked-user-data', 'risk-owner', 'audit-log-link'],
    nextAction: 'Move heavy security widgets behind Trust tabs and show only compact risk status on user dashboards.',
  },
  {
    modulePath: 'lib/localization/localization-system.tsx',
    decision: 'monitor',
    ownerSurface: 'i18n-runtime',
    boundary: 'summary-only',
    reason: 'Localization has overlapping legacy and canonical paths; it needs one authority to prevent PT/EN drift.',
    risks: ['parallel-runtime', 'developer-experience-risk'],
    evidenceSignals: ['locale-source', 'missing-key-count', 'language-drift-report'],
    nextAction: 'Keep canonical next-i18n dictionaries as source of truth and retire compatibility runtime after migration.',
  },
  {
    modulePath: 'lib/feature-flags.ts',
    decision: 'split',
    ownerSurface: '/admin/product',
    boundary: 'server-only',
    reason: 'Feature flags control rollout safety and should avoid broad client-side condition sprawl.',
    risks: ['state-drift', 'privacy-risk'],
    evidenceSignals: ['flag-owner', 'rollout-scope', 'kill-switch'],
    nextAction: 'Split flag definitions, evaluation, audit trail, and UI controls before adding more flags.',
  },
  {
    modulePath: 'lib/sandbox/script-sandbox.ts',
    decision: 'hold',
    ownerSurface: 'agent-sandbox',
    boundary: 'worker-held',
    reason: 'Script sandboxing is high-risk and must stay isolated from browser UI and unreviewed agent flows.',
    risks: ['agent-safety-risk', 'parallel-runtime'],
    evidenceSignals: ['sandbox-policy', 'execution-receipt', 'egress-deny'],
    nextAction: 'Keep execution worker-held with explicit policy, timeout, filesystem, and network receipts.',
  },
  {
    modulePath: 'components/physics/DestructionEditor.tsx',
    decision: 'hold',
    ownerSurface: '/studio/level',
    boundary: 'worker-held',
    reason: 'Destruction editing is expensive and should be trace-gated before users can claim playable physics quality.',
    risks: ['bundle-risk', 'creative-gap'],
    evidenceSignals: ['fracture-budget', 'physics-replay', 'rollback-plan'],
    nextAction: 'Expose destruction readiness and keep fracture/simulation jobs in worker or Studio Local.',
  },
  {
    modulePath: 'lib/production/agent-tool-bus.ts',
    decision: 'split',
    ownerSurface: 'agent-runtime',
    boundary: 'server-only',
    reason: 'The agent tool bus is central to safety; it needs smaller policy, execution, receipt, and registry boundaries.',
    risks: ['agent-safety-risk', 'parallel-runtime'],
    evidenceSignals: ['tool-scope-lock', 'approval-receipt', 'cost-receipt'],
    nextAction: 'Split registry, dispatcher, high-risk approvals, read receipts, and cost receipts before adding tools.',
  },
  {
    modulePath: 'lib/ui/notification-system.tsx',
    decision: 'monitor',
    ownerSurface: 'core-ui-providers',
    boundary: 'summary-only',
    reason: 'Notifications must stay unified through the root provider to avoid duplicate toasts and inconsistent product tone.',
    risks: ['state-drift', 'developer-experience-risk'],
    evidenceSignals: ['toast-provider', 'dedupe-key', 'user-visible-result'],
    nextAction: 'Route new notifications through CoreUiProviders and keep direct local providers blocked.',
  },
  {
    modulePath: 'lib/hot-reload/hot-reload-server.ts',
    decision: 'hold',
    ownerSurface: 'dev-runtime',
    boundary: 'server-only',
    reason: 'Hot reload belongs to development/runtime infrastructure and must not leak into production bundles.',
    risks: ['parallel-runtime', 'developer-experience-risk'],
    evidenceSignals: ['dev-only-env', 'reload-session', 'watch-scope'],
    nextAction: 'Keep server-only and split watcher, invalidation, and transport before adding IDE features.',
  },
  {
    modulePath: 'components/dashboard/useDashboardStoragePersistence.ts',
    decision: 'monitor',
    ownerSurface: '/dashboard',
    boundary: 'user-action-required',
    reason: 'Dashboard storage persistence is the active lightweight project/session persistence path; the old standalone ProjectPersistence panel was retired to avoid parallel save UX.',
    risks: ['state-drift', 'privacy-risk'],
    evidenceSignals: ['session-history', 'project-scope', 'local-storage-guard'],
    nextAction: 'Keep persistence receipts close to the dashboard action that changed state before adding heavier save/load flows.',
  },
  {
    modulePath: 'lib/input/input-manager-runtime/manager.ts',
    decision: 'hold',
    ownerSurface: '/studio/level',
    boundary: 'summary-only',
    reason: 'Input mapping is core game feel and accessibility; it needs evidence before becoming a default runtime dependency.',
    risks: ['state-drift', 'creative-gap'],
    evidenceSignals: ['input-map', 'accessibility-toggle', 'device-test'],
    nextAction: 'Expose input readiness and keep device-specific runtime loading behind Studio/game surfaces.',
  },
  {
    modulePath: 'lib/test/systems-integration.test.ts',
    decision: 'hold',
    ownerSurface: 'test-suite',
    boundary: 'test-only',
    reason: 'Large integration tests are useful, but should stay out of runtime analysis and production bundle paths.',
    risks: ['developer-experience-risk', 'bundle-risk'],
    evidenceSignals: ['test-only-path', 'coverage-target', 'runtime-exclusion'],
    nextAction: 'Split by subsystem and keep tests outside runtime import graphs.',
  },
  {
    modulePath: 'lib/debug/debug-adapter.ts',
    decision: 'hold',
    ownerSurface: 'ide-debugger',
    boundary: 'ide-only',
    reason: 'Debug adapters should be IDE-owned and must not become a general app event bus.',
    risks: ['debug-surface-risk', 'parallel-runtime'],
    evidenceSignals: ['debug-session-id', 'ide-scope', 'adapter-protocol'],
    nextAction: 'Split protocol, breakpoint, variables, and transport before adding debugger features.',
  },
  {
    modulePath: 'lib/debug/real-debug-adapter.ts',
    decision: 'hold',
    ownerSurface: 'ide-debugger',
    boundary: 'ide-only',
    reason: 'Real debugging needs strict IDE scope, session receipts, and protocol boundaries before broad usage.',
    risks: ['debug-surface-risk', 'privacy-risk'],
    evidenceSignals: ['adapter-session', 'protocol-scope', 'redacted-variables'],
    nextAction: 'Keep IDE-only and add redaction plus session receipts before exposing to agents.',
  },
  {
    modulePath: 'lib/ai-content-generation.ts',
    decision: 'hold',
    ownerSurface: 'generation-runtime',
    boundary: 'server-only',
    reason: 'Content generation should stay server-governed with cost, policy, and provenance receipts.',
    risks: ['agent-safety-risk', 'privacy-risk'],
    evidenceSignals: ['generation-id', 'policy-check', 'cost-receipt'],
    nextAction: 'Route through provider policy and persist generation receipts before user-facing claims.',
  },
  {
    modulePath: 'lib/monaco-lsp-bridge.ts',
    decision: 'hold',
    ownerSurface: '/ide',
    boundary: 'ide-only',
    reason: 'Monaco/LSP should remain isolated to IDE routes so editor dependencies do not leak into dashboard/public bundles.',
    risks: ['bundle-risk', 'developer-experience-risk'],
    evidenceSignals: ['ide-route-only', 'language-server-status', 'diagnostics-count'],
    nextAction: 'Keep dynamic IDE-only loading and split language client, diagnostics, and model sync.',
  },
  {
    modulePath: 'lib/backup-system.ts',
    decision: 'hold',
    ownerSurface: '/settings',
    boundary: 'server-only',
    reason: 'Backup and restore touch user data and must be explicit, reversible, and evidence-backed.',
    risks: ['privacy-risk', 'state-drift'],
    evidenceSignals: ['backup-id', 'restore-point', 'retention-policy'],
    nextAction: 'Expose backup status in settings only after retention, encryption, and restore receipts are explicit.',
  },
  {
    modulePath: 'lib/scene/scene-serializer-runtime/serializer.ts',
    decision: 'split',
    ownerSurface: '/studio/level',
    boundary: 'worker-held',
    reason: 'Scene serialization can become a hidden source of corruption unless schema, migration, and rollback are explicit.',
    risks: ['state-drift', 'creative-gap'],
    evidenceSignals: ['schema-version', 'migration-plan', 'rollback-snapshot'],
    nextAction: 'Split read, write, migration, validation, and diff generation before more scene formats are added.',
  },
  {
    modulePath: 'lib/engine/scene-graph.ts',
    decision: 'split',
    ownerSurface: '/studio/level',
    boundary: 'summary-only',
    reason: 'Scene graph is core engine state and should not compete with serializer, editor state, or runtime graph models.',
    risks: ['parallel-runtime', 'state-drift'],
    evidenceSignals: ['node-count', 'graph-version', 'scene-diff'],
    nextAction: 'Define one scene graph authority and split traversal, mutation, serialization, and editor selection.',
  },
  {
    modulePath: 'lib/localization-system.ts',
    decision: 'monitor',
    ownerSurface: 'i18n-runtime',
    boundary: 'summary-only',
    reason: 'The alternate localization system should not compete with canonical locale dictionaries.',
    risks: ['parallel-runtime', 'developer-experience-risk'],
    evidenceSignals: ['canonical-locale-source', 'legacy-read-count', 'missing-key-report'],
    nextAction: 'Mark as compatibility-only and remove after remaining callers move to canonical i18n.',
  },
  {
    modulePath: 'lib/networking/multiplayer-runtime/lobby-manager.ts',
    decision: 'hold',
    ownerSurface: '/studio/level',
    boundary: 'user-action-required',
    reason: 'Multiplayer readiness belongs to the runtime lobby manager and capability evidence; the unused LobbyScreen prototype was retired to avoid implying production matchmaking.',
    risks: ['privacy-risk', 'parallel-runtime'],
    evidenceSignals: ['server-capability', 'room-policy', 'abuse-control'],
    nextAction: 'Expose multiplayer only through governed readiness states with latency, auth, moderation, and rollback evidence.',
  },
  {
    modulePath: 'lib/asset-pipeline.ts',
    decision: 'monitor',
    ownerSurface: 'asset-runtime',
    boundary: 'worker-held',
    reason: 'Legacy asset pipeline should converge with provenance-ledger and Studio Local jobs instead of growing separately.',
    risks: ['parallel-runtime', 'creative-gap'],
    evidenceSignals: ['asset-provenance', 'license-check', 'optimization-report'],
    nextAction: 'Route new asset work through the canonical quality orchestrator and retire duplicate pipeline pieces.',
  },
  {
    modulePath: 'lib/decal-system.ts',
    decision: 'hold',
    ownerSurface: '/studio/level',
    boundary: 'summary-only',
    reason: 'Decals are useful for visual quality but need material, projection, and performance evidence before scene application.',
    risks: ['bundle-risk', 'creative-gap'],
    evidenceSignals: ['decal-count', 'material-license', 'frame-trace'],
    nextAction: 'Expose decal readiness in Material/Scene Studio and keep placement behind render evidence.',
  },
  {
    modulePath: 'lib/blueprint-system.ts',
    decision: 'split',
    ownerSurface: '/studio/level',
    boundary: 'summary-only',
    reason: 'Blueprint-style logic is strategic but must not become a second hidden gameplay runtime next to ECS and behavior trees.',
    risks: ['parallel-runtime', 'creative-gap'],
    evidenceSignals: ['graph-owner', 'node-count', 'playtest-receipt'],
    nextAction: 'Split graph schema, execution, validation, and editor preview before enabling agent-authored blueprints.',
  },
  {
    modulePath: 'lib/ui/tooltip-system.tsx',
    decision: 'monitor',
    ownerSurface: 'core-ui-providers',
    boundary: 'summary-only',
    reason: 'Tooltip behavior should stay unified through the design system instead of creating another local UI runtime.',
    risks: ['developer-experience-risk', 'bundle-risk'],
    evidenceSignals: ['provider-owner', 'a11y-label', 'delay-policy'],
    nextAction: 'Route new tooltip use through canonical UI primitives and split provider logic from examples.',
  },
  {
    modulePath: 'components/animation/AnimationBlueprintEditorPanels.tsx',
    decision: 'split',
    ownerSurface: '/studio/animation',
    boundary: 'user-action-required',
    reason: 'Animation blueprint panels are high-value but too dense to keep growing as one UI surface.',
    risks: ['bundle-risk', 'creative-gap'],
    evidenceSignals: ['panel-owner', 'motion-review', 'playtest-link'],
    nextAction: 'Split graph, inspector, timeline, state machine, and review panels before adding animation features.',
  },
  {
    modulePath: 'components/agents/AgentsWindow.tsx',
    decision: 'monitor',
    ownerSurface: 'agent-workforce-chat',
    boundary: 'user-action-required',
    reason: 'Agents Window is the canonical workforce surface; legacy squad chat was retired so lanes, receipts, and handoffs stay in one governed place.',
    risks: ['agent-safety-risk', 'state-drift'],
    evidenceSignals: ['agent-lane', 'handoff-receipt', 'cost-receipt'],
    nextAction: 'Keep roster, tool receipts, approvals, and chat handoff inside the canonical Agents Window before adding new multi-agent surfaces.',
  },
  {
    modulePath: 'app/settings/page.tsx',
    decision: 'monitor',
    ownerSurface: '/settings',
    boundary: 'user-action-required',
    reason: 'Settings is the active owner for account/team-adjacent controls; the unused TeamInviteManager prototype was retired until invite review is wired into a governed settings section.',
    risks: ['privacy-risk', 'state-drift'],
    evidenceSignals: ['settings-section', 'role-scope', 'audit-log-link'],
    nextAction: 'Add team invites only inside the settings command center with role review, audit receipt, and PII masking.',
  },
  {
    modulePath: 'components/ide/DebugPanel.tsx',
    decision: 'hold',
    ownerSurface: '/ide',
    boundary: 'ide-only',
    reason: 'Debug panel data can expose code, variables, and process state; it belongs only in explicit IDE debug mode.',
    risks: ['debug-surface-risk', 'privacy-risk'],
    evidenceSignals: ['debug-mode', 'redacted-variable', 'session-receipt'],
    nextAction: 'Keep IDE-only and split breakpoints, variables, call stack, and attach controls.',
  },
  {
    modulePath: 'lib/git/git-service.ts',
    decision: 'hold',
    ownerSurface: 'git-runtime',
    boundary: 'server-only',
    reason: 'Git operations are destructive and identity-sensitive, so they need server-side scope, receipts, and rollback evidence.',
    risks: ['privacy-risk', 'agent-safety-risk'],
    evidenceSignals: ['repo-scope', 'branch-receipt', 'rollback-plan'],
    nextAction: 'Split status, diff, commit, push, and remote operations behind high-risk approvals.',
  },
  {
    modulePath: 'components/ide/AIChatPanelPro.tsx',
    decision: 'monitor',
    ownerSurface: '/ide',
    boundary: 'ide-only',
    reason: 'AIChatPanelPro is the canonical chat surface; legacy standalone chat was retired so agent work, receipts, cost, and context stay inside the IDE sidecar.',
    risks: ['parallel-runtime', 'developer-experience-risk'],
    evidenceSignals: ['mode-selector', 'cost-receipt', 'context-pack'],
    nextAction: 'Keep new chat features inside AIChatPanelPro or AgentsWindow instead of reintroducing standalone chat shells.',
  },
]

export function listInternalRuntimeGovernanceDecisions(
  decision?: InternalRuntimeDecision
): InternalRuntimeGovernanceDecision[] {
  return decision
    ? INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.filter((item) => item.decision === decision)
    : [...INTERNAL_RUNTIME_GOVERNANCE_DECISIONS]
}

export function validateInternalRuntimeGovernance(
  decisions: InternalRuntimeGovernanceDecision[] = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS
): string[] {
  const failures: string[] = []
  const seen = new Set<string>()

  for (const item of decisions) {
    if (seen.has(item.modulePath)) failures.push(`${item.modulePath}: duplicate governance decision`)
    seen.add(item.modulePath)
    if (!item.ownerSurface) failures.push(`${item.modulePath}: missing owner surface`)
    if (!item.boundary) failures.push(`${item.modulePath}: missing runtime boundary`)
    if (item.evidenceSignals.length < 2) failures.push(`${item.modulePath}: needs evidence signals`)
    if (item.risks.includes('privacy-risk') && item.boundary !== 'admin-only' && item.boundary !== 'server-only' && item.boundary !== 'ide-only' && item.boundary !== 'user-action-required') {
      failures.push(`${item.modulePath}: privacy-risk needs admin/server/ide/user-action boundary`)
    }
    if (item.risks.includes('bundle-risk') && item.boundary === 'summary-only' && item.decision === 'wire') {
      failures.push(`${item.modulePath}: bundle-risk wire decision cannot be summary-only without a route boundary`)
    }
  }

  return failures
}

export function getInternalRuntimeGovernanceSummary() {
  const byBoundary = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.reduce<Record<InternalRuntimeBoundary, number>>((acc, item) => {
    acc[item.boundary] = (acc[item.boundary] ?? 0) + 1
    return acc
  }, {} as Record<InternalRuntimeBoundary, number>)
  const held = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.filter((item) => item.decision === 'hold').length
  const split = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.filter((item) => item.decision === 'split').length
  const privacySensitive = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.filter((item) => item.risks.includes('privacy-risk')).length

  return {
    total: INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.length,
    held,
    split,
    privacySensitive,
    byBoundary,
  }
}
