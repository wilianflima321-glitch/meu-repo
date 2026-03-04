'use client'

type FirstValueGuideProps = {
  firstProjectCreated: boolean
  firstAiSuccess: boolean
  firstIdeOpened: boolean
  onCreateProject: () => void
  onConfigureAI: () => void
  onOpenAIChat: () => void
  onOpenIdePreview: () => void
  onDismiss: () => void
}

export function FirstValueGuide({
  firstProjectCreated,
  firstAiSuccess,
  firstIdeOpened,
  onCreateProject,
  onConfigureAI,
  onOpenAIChat,
  onOpenIdePreview,
  onDismiss,
}: FirstValueGuideProps) {
  const totalSteps = 3
  const completedSteps = Number(firstProjectCreated) + Number(firstAiSuccess) + Number(firstIdeOpened)
  const completionRatio = Math.max(0, Math.min(1, completedSteps / totalSteps))
  const estimatedRemainingMinutes = Math.max(0, (totalSteps - completedSteps) * 1)

  return (
    <section className="aethel-m-4 aethel-p-4 aethel-rounded-lg border border-blue-500/30 bg-blue-500/10 md:aethel-m-6">
      <div className="aethel-flex aethel-flex-col md:aethel-flex md:aethel-flex-row md:aethel-items-center md:aethel-justify-between aethel-gap-3">
        <div>
          <h3 className="aethel-text-sm aethel-font-semibold aethel-text-blue-200">Primeiro valor em menos de 2 minutos</h3>
          <p className="aethel-text-xs aethel-text-slate-300 aethel-mt-1">
            Crie um projeto, configure o provider de IA e abra o live preview da IDE com contexto completo.
          </p>
          <div className="aethel-mt-2">
            <div className="h-1.5 w-full rounded-full bg-slate-800/70">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round(completionRatio * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-300">
              Progresso: {completedSteps}/{totalSteps} ({Math.round(completionRatio * 100)}%)
              {estimatedRemainingMinutes > 0 ? ` • ~${estimatedRemainingMinutes} min restantes` : ' • concluido'}
            </p>
          </div>
          <ul className="aethel-mt-2 aethel-space-y-1 text-[11px] text-slate-300">
            <li>{firstProjectCreated ? '[OK]' : '[ ]'} Primeiro projeto criado</li>
            <li>{firstAiSuccess ? '[OK]' : '[ ]'} Primeira resposta de IA recebida</li>
            <li>{firstIdeOpened ? '[OK]' : '[ ]'} IDE live preview aberta</li>
          </ul>
        </div>
        <div className="aethel-flex aethel-flex-col sm:aethel-flex sm:aethel-flex-row aethel-gap-2">
          <button type="button" onClick={onCreateProject} className="aethel-button aethel-button-primary aethel-text-xs">
            Criar projeto
          </button>
          <button type="button" onClick={onConfigureAI} className="aethel-button aethel-button-secondary aethel-text-xs">
            Configurar IA
          </button>
          <button type="button" onClick={onOpenAIChat} className="aethel-button aethel-button-secondary aethel-text-xs">
            Abrir Chat IA
          </button>
          <button type="button" onClick={onOpenIdePreview} className="aethel-button aethel-button-secondary aethel-text-xs">
            Abrir IDE + Preview
          </button>
          <button type="button" onClick={onDismiss} className="aethel-button aethel-button-ghost aethel-text-xs">
            Dispensar
          </button>
        </div>
      </div>
    </section>
  )
}
