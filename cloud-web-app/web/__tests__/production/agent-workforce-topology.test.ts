import { describe, expect, it } from 'vitest'

import { SUPPORTED_AGENT_TYPES } from '@/lib/agent-orchestrator'
import {
  buildAgentWorkforceTopology,
  evaluateAgentWorkforceTopologyReadiness,
  planAgentWorkforceForMission,
} from '@/lib/production/agent-workforce-topology'

describe('agent workforce topology', () => {
  it('covers every supported orchestrator role with squads and governance policies', () => {
    const topology = buildAgentWorkforceTopology()
    const report = evaluateAgentWorkforceTopologyReadiness(topology)

    expect(report.ready).toBe(true)
    expect(report.blockers).toEqual([])
    expect(report.roleCoverage.totalSupportedRoles).toBe(SUPPORTED_AGENT_TYPES.length)
    expect(report.roleCoverage.missingRoles).toEqual([])
    expect(topology.globalPolicies.join(' ')).toContain('Tool Bus')
    expect(topology.globalPolicies.join(' ')).toContain('read receipts')
    expect(topology.costPolicy.join(' ')).toContain('metadata-first')
    expect(topology.highRiskActions.join(' ')).toContain('investment')
  })

  it('routes AAA game creation through game, runtime, asset, QA, and release evidence instead of browser-only autonomy', () => {
    const plan = planAgentWorkforceForMission({
      mission: 'Create a God of War quality boss fight with combat, cinematic camera, assets, playtest and release gates',
      missionType: 'game-production',
      itemCount: 36,
      requiresWrites: true,
      requiresHeavyRuntime: true,
      requiresRelease: true,
      maxCostUsd: 8,
      planConcurrencyLimit: 16,
    })

    expect(plan.executionMode).toBe('review-only')
    expect(plan.centralCoordinator).toBe('game-designer')
    expect(plan.selectedSquads).toEqual(expect.arrayContaining(['game-production', 'film-audio-production', 'release-trust']))
    expect(plan.selectedAgents).toEqual(expect.arrayContaining(['gameplay-engineer', 'asset-pipeline', 'performance-engineer', 'qa', 'release-manager']))
    expect(plan.requiredEvidence.join(' ')).toContain('playtest replay')
    expect(plan.requiredEvidence.join(' ')).toContain('performance budget')
    expect(plan.blockers.join(' ')).toContain('Runtime Budget Gate')
    expect(plan.recommendedParallelWorkers).toBeLessThanOrEqual(12)
  })

  it('expands research by work packets while keeping budgeted map-reduce instead of always spawning a noisy 100-agent fleet', () => {
    const plan = planAgentWorkforceForMission({
      mission: 'Research competitors, papers, Hugging Face datasets and GitHub repositories like Manus wide research',
      missionType: 'research-development',
      itemCount: 144,
      maxCostUsd: 3,
      planConcurrencyLimit: 50,
    })

    expect(plan.executionMode).toBe('wide-research')
    expect(plan.selectedSquads).toEqual(expect.arrayContaining(['research-intelligence', 'command-core']))
    expect(plan.selectedAgents).toEqual(expect.arrayContaining(['researcher', 'fact-checker', 'huggingface-curator', 'github-cartographer', 'summarizer']))
    expect(plan.recommendedParallelWorkers).toBeGreaterThanOrEqual(6)
    expect(plan.recommendedParallelWorkers).toBeLessThanOrEqual(12)
    expect(plan.warnings.join(' ')).toContain('metadata-first')
  })

  it('keeps investment and account automation human-held even when browser tools are requested', () => {
    const plan = planAgentWorkforceForMission({
      mission: 'Use Chrome to invest in a stock account and submit the trade for the user',
      missionType: 'financial-investment',
      requiresBrowser: true,
      requiresExternalAccounts: true,
      itemCount: 4,
      maxCostUsd: 20,
      planConcurrencyLimit: 10,
    })

    expect(plan.executionMode).toBe('human-held')
    expect(plan.riskLevel).toBe('critical')
    expect(plan.centralCoordinator).toBe('security-auditor')
    expect(plan.selectedSquads).toEqual(expect.arrayContaining(['browser-operations', 'financial-account-safety']))
    expect(plan.selectedAgents).toEqual(expect.arrayContaining(['browser-operator', 'security-auditor', 'cost-governor', 'legal-reviewer']))
    expect(plan.requiredApprovals.join(' ')).toContain('signed human approval')
    expect(plan.blockers.join(' ')).toContain('cannot submit financial or account actions autonomously')
    expect(plan.recommendedParallelWorkers).toBeLessThanOrEqual(2)
  })

  it('routes app/platform work through software, security, performance, QA and release without requiring huge research mode', () => {
    const plan = planAgentWorkforceForMission({
      mission: 'Build a SaaS platform feature with API, dashboard, tests and deploy preview',
      missionType: 'app-platform',
      requiresWrites: true,
      requiresRelease: true,
      itemCount: 12,
      maxCostUsd: 6,
      planConcurrencyLimit: 8,
    })

    expect(plan.executionMode).toBe('review-only')
    expect(plan.selectedSquads).toEqual(expect.arrayContaining(['software-platform', 'release-trust']))
    expect(plan.selectedAgents).toEqual(expect.arrayContaining(['engineer', 'security-auditor', 'performance-engineer', 'qa', 'devops-operator']))
    expect(plan.requiredApprovals.join(' ')).toContain('release approval')
    expect(plan.blockers.join(' ')).toContain('Repository Cartography')
    expect(plan.recommendedParallelWorkers).toBeLessThanOrEqual(8)
  })
})
