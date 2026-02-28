import { DirectorNotePanel } from '../ai/DirectorNotePanel'
import { TimeMachineSlider } from '../collaboration/TimeMachineSlider'

import type { Project } from './aethel-dashboard-model'

type DashboardProjectsTabProps = {
  projects: Project[]
  newProjectName: string
  newProjectType: Project['type']
  onDeleteProject: (projectId: number) => void
  onCreateProject: () => void
  onProjectNameChange: (value: string) => void
  onProjectTypeChange: (value: Project['type']) => void
  onProjectVersionChange: (versionId: string) => void
  onApplyDirectorNote: (title: string) => void
}

export function DashboardProjectsTab({
  projects,
  newProjectName,
  newProjectType,
  onDeleteProject,
  onCreateProject,
  onProjectNameChange,
  onProjectTypeChange,
  onProjectVersionChange,
  onApplyDirectorNote,
}: DashboardProjectsTabProps) {
  return (
    <div className="aethel-p-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
        <h2 className="aethel-text-2xl aethel-font-bold">Projetos</h2>
        {projects.length > 0 && (
          <div className="aethel-w-96">
            <TimeMachineSlider versions={[]} onVersionChange={onProjectVersionChange} variant="compact" />
          </div>
        )}
      </div>

      {projects.length > 0 && (
        <div className="aethel-mb-6">
          <DirectorNotePanel
            projectId={String(projects[0].id)}
            position="floating"
            onApplyFix={async (note) => onApplyDirectorNote(note.title)}
          />
        </div>
      )}

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6 aethel-mb-6">
        {projects.map((project) => (
          <div key={project.id} className="aethel-card aethel-p-4">
            <h3 className="aethel-font-semibold aethel-mb-2">{project.name}</h3>
            <p className="aethel-text-sm aethel-text-slate-400 aethel-mb-2">Tipo: {project.type}</p>
            <p className="aethel-text-sm aethel-mb-4">
              Status:{' '}
              <span
                className={`aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs ${
                  project.status === 'active'
                    ? 'aethel-bg-green-500/20 aethel-text-green-400'
                    : 'aethel-bg-gray-500/20 aethel-text-gray-400'
                }`}
              >
                {project.status}
              </span>
            </p>
            <button
              type="button"
              onClick={() => onDeleteProject(project.id)}
              className="aethel-button aethel-button-danger aethel-text-xs"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="aethel-card aethel-p-6 aethel-max-w-md">
        <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Criar novo projeto</h3>
        <div className="aethel-space-y-4">
          <input
            type="text"
            value={newProjectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Nome do projeto"
            className="aethel-input aethel-w-full"
          />
          <select
            value={newProjectType}
            onChange={(event) => onProjectTypeChange(event.target.value)}
            className="aethel-input aethel-w-full"
          >
            <option value="code">Projeto de codigo</option>
            <option value="unreal">Unreal Engine</option>
            <option value="web">Aplicacao web</option>
          </select>
          <button type="button" onClick={onCreateProject} className="aethel-button aethel-button-primary aethel-w-full">
            Criar projeto
          </button>
        </div>
      </div>
    </div>
  )
}
