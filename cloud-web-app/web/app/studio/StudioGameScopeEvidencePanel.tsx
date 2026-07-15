import type { GameScopePlan } from '@/lib/production/game-scope-orchestrator'

export function StudioGameScopeEvidencePanel({
  gameScopePlan,
  quietPanelClass,
}: {
  gameScopePlan: GameScopePlan
  quietPanelClass: string
}) {
  return (
    <div className={`mt-3 ${quietPanelClass} px-3 py-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--aethel-border-subtle)] pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-primary-light)]">
          Game scope: {gameScopePlan.label}
        </p>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          {gameScopePlan.releaseState}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">{gameScopePlan.uxDisclosure}</p>
      <p className="mt-2 text-[11px] font-semibold text-[var(--aethel-warning-light)]">{gameScopePlan.nextAction}</p>
      <details className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-3 py-2">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Review production receipts
        </summary>
        <div className="mt-3 grid gap-2 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
          <div className="grid gap-2 sm:grid-cols-3">
            <p>
              <span className="block text-[10px] uppercase tracking-[0.15em]">Camera / input</span>
              <span className="text-[var(--aethel-text-primary)]">{gameScopePlan.genrePack.cameraModel} / {gameScopePlan.genrePack.inputModel}</span>
            </p>
            <p>
              <span className="block text-[10px] uppercase tracking-[0.15em]">Plan</span>
              <span className="text-[var(--aethel-text-primary)]">{gameScopePlan.productionBible.pillars.slice(0, 2).join(', ')}</span>
            </p>
            <p>
              <span className="block text-[10px] uppercase tracking-[0.15em]">Review</span>
              <span className="text-[var(--aethel-text-primary)]">{gameScopePlan.cinematicEvidence.state} / {gameScopePlan.playtestSpine.state}</span>
            </p>
          </div>
          <p>Production plan: {gameScopePlan.productionBible.pillars.slice(0, 4).join(', ')}. Decision: {gameScopePlan.productionBible.firstUserDecision}</p>
          <p>Scene plan: {gameScopePlan.productionBible.deepBible.scenes.length} scene beats, {gameScopePlan.productionBible.deepBible.characters.length} character notes, {gameScopePlan.productionBible.deepBible.evidenceModel.requiredEvidence.length} checks.</p>
          <p>Cinematics: {gameScopePlan.cinematicEvidence.state}; {gameScopePlan.cinematicEvidence.lanes.length} lane(s). {gameScopePlan.cinematicEvidence.copy.draftWarning}.</p>
          <p>Playtest: {gameScopePlan.playtestSpine.state}; telemetry: {gameScopePlan.playtestSpine.telemetry.slice(0, 3).join(', ')}.</p>
          <div className="flex flex-wrap gap-1.5">
            {gameScopePlan.creativeArtifacts.slice(0, 5).map((artifact) => (
              <span key={artifact} className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                {artifact}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {gameScopePlan.playtestSpine.scenarios.slice(0, 3).map((scenario) => (
              <span key={scenario.id} className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_24%,transparent)] px-2 py-1 text-[10px] text-[var(--aethel-warning-light)]">
                {scenario.title}
              </span>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
}
