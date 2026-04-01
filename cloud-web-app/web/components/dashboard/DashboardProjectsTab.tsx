import { DirectorNotePanel } from '../ai/DirectorNotePanel'
import { TimeMachineSlider } from '../collaboration/TimeMachineSlider'
import { PremiumEmptyProjects } from '../ui/PremiumEmptyState'

import type { Project } from './aethel-dashboard-model'

type DashboardProjectsTabProps = {
  projects: Project[]
  newProjectName: string
  newProjectType: Project['type']
  entryMission?: string | null
  onDeleteProject: (projectId: number) => void
  onCreateProject: () => void
  onProjectNameChange: (value: string) => void
  onProjectTypeChange: (value: Project['type']) => void
  onProjectVersionChange: (versionId: string) => void
  onApplyDirectorNote: (title: string) => void
  onOpenAiChat?: () => void
  onOpenIde?: () => void
}

export function DashboardProjectsTab({
  projects,
  newProjectName,
  newProjectType,
  entryMission,
  onDeleteProject,
  onCreateProject,
  onProjectNameChange,
  onProjectTypeChange,
  onProjectVersionChange,
  onApplyDirectorNote,
  onOpenAiChat,
  onOpenIde,
}: DashboardProjectsTabProps) {
  const projectTypeOptions = [
    {
      value: 'web',
      label: 'Aplicacao web',
      description: 'Melhor caminho atual para first value, preview e deploy.',
    },
    {
      value: 'code',
      label: 'Projeto de codigo',
      description: 'Fluxo mais livre para scripts, backend e automacoes.',
    },
    {
      value: 'unreal',
      label: 'Unreal Engine',
      description: 'Ainda mais experimental; trate como trilha de P&D.',
    },
  ] as const

  return (
    <div className="aethel-p-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Studio Projects</p>
          <h2 className="text-2xl font-bold">Projetos</h2>
          <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">Gerencie apps e research. Games e films seguem em roadmap.</p>
        </div>
        {projects.length > 0 && (
          <div className="w-96">
            <TimeMachineSlider versions={[]} onVersionChange={onProjectVersionChange} variant="compact" />
          </div>
        )}
      </div>

      <div className="mb-6 rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(8,47,73,0.16),rgba(15,23,42,0.72))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Build stage</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
              Organize o workspace antes de ir para a IDE.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {entryMission
                ? `Missao ativa: ${entryMission}`
                : 'Escolha um tipo de projeto, crie o workspace e use a IDE como proxima etapa natural do fluxo.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {onOpenAiChat ? (
              <button
                type="button"
                onClick={onOpenAiChat}
                className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]"
              >
                Voltar ao AI Chat
              </button>
            ) : null}
            {onOpenIde ? (
              <button
                type="button"
                onClick={onOpenIde}
                className="rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition hover:brightness-110"
              >
                Seguir para IDE
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] aethel-gap-6 mb-6">
          <div className="aethel-card aethel-p-0">
            <PremiumEmptyProjects onCreate={onCreateProject} />
          </div>
          <div className="aethel-card aethel-p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Novo projeto</p>
            <h3 className="text-lg font-semibold mb-4">Criar novo projeto</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(event) => onProjectNameChange(event.target.value)}
                placeholder="Nome do projeto"
                className="aethel-input w-full"
              />
              <div className="grid gap-3">
                {projectTypeOptions.map((option) => {
                  const selected = newProjectType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onProjectTypeChange(option.value)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        selected
                          ? 'border-sky-400/30 bg-[linear-gradient(135deg,rgba(79,70,229,0.24),rgba(14,165,233,0.14))]'
                          : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] hover:border-[var(--aethel-border-secondary)]'
                      }`}
                    >
                      <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">{option.label}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{option.description}</div>
                    </button>
                  )
                })}
              </div>
              <select
                value={newProjectType}
                onChange={(event) => onProjectTypeChange(event.target.value)}
                className="aethel-input w-full"
              >
                <option value="code">Projeto de codigo</option>
                <option value="unreal">Unreal Engine</option>
                <option value="web">Aplicacao web</option>
              </select>
              <button type="button" onClick={onCreateProject} className="aethel-button aethel-button-primary w-full">
                Criar projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-6">
          <DirectorNotePanel
            projectId={String(projects[0].id)}
            position="floating"
            onApplyFix={async (note) => onApplyDirectorNote(note.title)}
          />
        </div>
      )}

      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 aethel-gap-6 mb-6">
          {projects.map((project) => (
            <div key={project.id} className="aethel-card aethel-p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--aethel-text-primary)]">{project.name}</h3>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-0.5 text-xs text-[var(--aethel-text-secondary)]">
                  {project.type}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Ultima atualizacao recente</p>
              <p className="text-sm mb-4">
                Status:{' '}
                <span
                  className={`px-2.5 py-1 rounded-full text-xs ${
                    project.status === 'active'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                      : 'bg-[var(--aethel-surface-secondary)]/20 text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  {project.status}
                </span>
              </p>
              <button
                type="button"
                onClick={() => onDeleteProject(project.id)}
                className="aethel-button aethel-button-danger text-xs"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="aethel-card aethel-p-6 max-w-md">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Novo projeto</p>
          <h3 className="text-lg font-semibold mb-4">Criar novo projeto</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(event) => onProjectNameChange(event.target.value)}
                placeholder="Nome do projeto"
                className="aethel-input w-full"
              />
              <div className="grid gap-3">
                {projectTypeOptions.map((option) => {
                  const selected = newProjectType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onProjectTypeChange(option.value)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        selected
                          ? 'border-sky-400/30 bg-[linear-gradient(135deg,rgba(79,70,229,0.24),rgba(14,165,233,0.14))]'
                          : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] hover:border-[var(--aethel-border-secondary)]'
                      }`}
                    >
                      <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">{option.label}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{option.description}</div>
                    </button>
                  )
                })}
              </div>
              <select
                value={newProjectType}
                onChange={(event) => onProjectTypeChange(event.target.value)}
                className="aethel-input w-full"
              >
              <option value="code">Projeto de codigo</option>
              <option value="unreal">Unreal Engine</option>
              <option value="web">Aplicacao web</option>
            </select>
            <button type="button" onClick={onCreateProject} className="aethel-button aethel-button-primary w-full">
              Criar projeto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
