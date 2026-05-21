import type { PlayableGameGenre } from '@/lib/production/game-scope-orchestrator'
import { getGameGenrePack, type GameGenrePack } from '@/lib/production/game-genre-packs'

export type PlaytestReadinessState = 'held' | 'blocked' | 'needs-review'

export interface PlaytestScenarioContract {
  id: string
  title: string
  ownerAgent: string
  botPath: string
  requiredEvidence: string[]
  passCriteria: string[]
  failureSignals: string[]
}

export interface PlaytestSpinePlan {
  id: string
  genre: PlayableGameGenre
  label: string
  state: PlaytestReadinessState
  scenarios: PlaytestScenarioContract[]
  requiredEvidence: string[]
  missingEvidence: string[]
  telemetry: string[]
  nextAction: string
  humanReviewRequired: true
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function scenarioContract(pack: GameGenrePack, scenario: string, index: number): PlaytestScenarioContract {
  return {
    id: `${pack.genre}:playtest:${slug(scenario) || index + 1}`,
    title: scenario,
    ownerAgent: index % 2 === 0 ? 'QA Playtest Agent' : 'Performance QA Agent',
    botPath: `${pack.genre}/${slug(scenario) || `scenario-${index + 1}`}`,
    requiredEvidence: [
      `${scenario} replay`,
      `${scenario} telemetry`,
      `${scenario} bug ledger`,
      'human feel review',
    ],
    passCriteria: [
      'Player intent is readable without designer narration.',
      'Input, camera, and feedback match the genre pack.',
      'No blocker, softlock, or fake completion signal is present.',
      'Frame pacing and runtime budget stay within the declared target.',
    ],
    failureSignals: [
      'No replay evidence.',
      'No performance trace.',
      'Contradicts the production bible.',
      'Requires unsupported runtime capability.',
    ],
  }
}

export function buildGamePlaytestSpinePlan(input: {
  genre: PlayableGameGenre
  customGenreLabel?: string
  evidenceRefs?: string[]
}): PlaytestSpinePlan {
  const pack = getGameGenrePack(input.genre, input.customGenreLabel)
  const scenarios = pack.playtestScenarios.map((scenario, index) => scenarioContract(pack, scenario, index))
  const requiredEvidence = Array.from(new Set(scenarios.flatMap((scenario) => scenario.requiredEvidence)))
  const evidence = new Set(input.evidenceRefs ?? [])
  const missingEvidence = requiredEvidence.filter((item) => !evidence.has(item))
  const state: PlaytestReadinessState = missingEvidence.length > 0 ? 'held' : 'needs-review'

  return {
    id: `${pack.genre}:playtest-spine:v1`,
    genre: pack.genre,
    label: `${pack.label} playtest spine`,
    state,
    scenarios,
    requiredEvidence,
    missingEvidence,
    telemetry: [
      ...pack.performanceBudgets,
      'input latency',
      'frame pacing',
      'bug count',
      'completion/fail rate',
      'human fun/feel score',
    ],
    nextAction:
      state === 'held'
        ? 'Run the first bot playtest, capture replay and telemetry, then request human feel review.'
        : 'Request human review with replay, telemetry, bug ledger, and performance trace.',
    humanReviewRequired: true,
  }
}
