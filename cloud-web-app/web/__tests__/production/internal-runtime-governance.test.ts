import { describe, expect, it } from 'vitest'

import {
  INTERNAL_RUNTIME_GOVERNANCE_DECISIONS,
  getInternalRuntimeGovernanceSummary,
  listInternalRuntimeGovernanceDecisions,
  validateInternalRuntimeGovernance,
} from '@/lib/production/internal-runtime-governance'

describe('internal runtime governance', () => {
  it('puts suspicious large internal modules behind an explicit owner and boundary', () => {
    expect(INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.map((item) => item.modulePath)).toEqual(
      expect.arrayContaining([
        'components/dashboard/useDashboardActions.ts',
        'lib/debug/profiler-system.tsx',
        'lib/debug/object-inspector.tsx',
        'hooks/useAethelGateway.ts',
        'lib/aaa-render-system.ts',
        'lib/plugins/plugin-system.tsx',
        'components/dashboard/SecurityDashboard.tsx',
        'lib/localization/localization-system.tsx',
        'lib/feature-flags.ts',
        'lib/sandbox/script-sandbox.ts',
        'components/debug/AdvancedDebug.tsx',
        'components/physics/DestructionEditor.tsx',
        'lib/production/agent-tool-bus.ts',
        'lib/ui/notification-system.tsx',
        'components/profiler/AdvancedProfiler.parts.tsx',
        'lib/hot-reload/hot-reload-server.ts',
        'components/project/ProjectPersistence.tsx',
        'components/extensions/ExtensionManager.tsx',
        'lib/input/input-manager-runtime/manager.ts',
        'lib/test/systems-integration.test.ts',
        'lib/debug/debug-adapter.ts',
        'components/search/GlobalSearch.tsx',
        'lib/debug/real-debug-adapter.ts',
        'lib/ai/advanced-ai-provider.ts',
        'lib/ai-content-generation.ts',
        'lib/monaco-lsp-bridge.ts',
        'lib/backup-system.ts',
        'lib/scene/scene-serializer-runtime/serializer.ts',
        'lib/engine/scene-graph.ts',
        'lib/localization-system.ts',
        'components/multiplayer/LobbyScreen.tsx',
        'lib/asset-pipeline.ts',
        'lib/decal-system.ts',
        'lib/blueprint-system.ts',
        'lib/ui/tooltip-system.tsx',
        'components/animation/AnimationBlueprintEditorPanels.tsx',
        'components/ai/SquadChat.tsx',
        'components/team/TeamInviteManager.parts.tsx',
        'components/ide/DebugPanel.tsx',
        'lib/git/git-service.ts',
        'components/ChatComponent.tsx',
      ])
    )
    expect(validateInternalRuntimeGovernance()).toEqual([])
  })

  it('keeps debug and privacy-sensitive modules out of broad product surfaces', () => {
    const privacySensitive = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.filter((item) => item.risks.includes('privacy-risk'))
    expect(privacySensitive.length).toBeGreaterThanOrEqual(8)
    expect(
      privacySensitive.every((item) =>
        ['admin-only', 'server-only', 'ide-only', 'user-action-required'].includes(item.boundary)
      )
    ).toBe(true)

    const debugModules = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.filter((item) => item.modulePath.includes('debug'))
    expect(debugModules.every((item) => ['admin-only', 'ide-only'].includes(item.boundary))).toBe(true)
  })

  it('prioritizes split or hold decisions over adding more hidden runtime code', () => {
    const summary = getInternalRuntimeGovernanceSummary()
    expect(summary.total).toBeGreaterThanOrEqual(30)
    expect(summary.held + summary.split).toBeGreaterThan(summary.total / 2)
    expect(summary.byBoundary['server-only']).toBeGreaterThanOrEqual(4)
    expect(summary.byBoundary['worker-held']).toBeGreaterThanOrEqual(4)
  })

  it('keeps agent and sandbox paths evidence-first', () => {
    const agentPaths = INTERNAL_RUNTIME_GOVERNANCE_DECISIONS.filter((item) =>
      item.risks.includes('agent-safety-risk')
    )
    expect(agentPaths.length).toBeGreaterThanOrEqual(5)
    expect(agentPaths.flatMap((item) => item.evidenceSignals)).toEqual(
      expect.arrayContaining(['approval-receipt', 'execution-receipt', 'cost-receipt'])
    )
  })

  it('can list decisions by outcome for future refactor waves', () => {
    expect(listInternalRuntimeGovernanceDecisions('hold').every((item) => item.decision === 'hold')).toBe(true)
    expect(listInternalRuntimeGovernanceDecisions('split').every((item) => item.decision === 'split')).toBe(true)
    expect(listInternalRuntimeGovernanceDecisions('wire').every((item) => item.decision === 'wire')).toBe(true)
  })
})
