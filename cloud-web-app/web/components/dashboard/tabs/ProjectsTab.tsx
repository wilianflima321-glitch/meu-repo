'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  FolderKanban,
  Code,
  Globe,
  Gamepad2,
  Clock,
  Users,
  Star,
  Trash2,
  Edit,
  ExternalLink,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  Button,
  Input,
  Badge,
  EmptyProjects,
  Dropdown,
  type DropdownItem,
  Avatar,
  AvatarGroup,
  SkeletonCard,
} from '../../ui'

export interface Project {
  id: string
  name: string
  description?: string
  type: 'code' | 'web' | 'unreal' | 'api'
  status: 'active' | 'paused' | 'completed' | 'archived'
  lastOpened: string
  createdAt: string
  collaborators?: Array<{ name: string; avatar?: string }>
  starred?: boolean
}

interface ProjectsTabProps {
  projects?: Project[]
  loading?: boolean
  onCreateProject?: () => void
  onOpenProject?: (id: string) => void
  onEditProject?: (id: string) => void
  onDeleteProject?: (id: string) => void
  onToggleStar?: (id: string) => void
}

const typeIcons: Record<string, React.ReactNode> = {
  code: <Code className="w-5 h-5 text-[var(--aethel-primary-light)]" />,
  web: <Globe className="w-5 h-5 text-[var(--aethel-success)]" />,
  unreal: <Gamepad2 className="w-5 h-5 text-[var(--aethel-primary-light)]" />,
  api: <FolderKanban className="w-5 h-5 text-[var(--aethel-warning)]" />,
}

const typeLabels: Record<string, string> = {
  code: 'Codigo',
  web: 'Web App',
  unreal: 'Unreal',
  api: 'API',
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'default' | 'info' }> = {
  active: { label: 'Ativo', variant: 'success' },
  paused: { label: 'Pausado', variant: 'warning' },
  completed: { label: 'Concluido', variant: 'info' },
  archived: { label: 'Arquivado', variant: 'default' },
}

function ProjectCard({
  project,
  onOpen,
  onEdit,
  onDelete,
  onToggleStar,
}: {
  project: Project
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onToggleStar?: () => void
}) {
  const menuItems: DropdownItem[] = [
    { id: 'open', label: 'Abrir', icon: <ExternalLink className="w-4 h-4" />, onClick: onOpen },
    { id: 'edit', label: 'Editar', icon: <Edit className="w-4 h-4" />, onClick: onEdit },
    { id: 'div1', label: '', divider: true },
    { id: 'delete', label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, onClick: onDelete, danger: true },
  ]

  const status = statusConfig[project.status]

  return (
    <Card
      variant="elevated"
      padding="none"
      hoverable
      onClick={onOpen}
      className="group cursor-pointer"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--aethel-surface-tertiary)] flex items-center justify-center">
              {typeIcons[project.type]}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-info)] transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-[var(--aethel-text-tertiary)]">{typeLabels[project.type]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={project.starred ? `Remover ${project.name} dos favoritos` : `Adicionar ${project.name} aos favoritos`}
              onClick={onToggleStar}
              className={`p-1.5 rounded-lg transition-colors ${
                project.starred
                  ? 'text-[var(--aethel-warning)] hover:text-[var(--aethel-warning)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
            >
              <Star className={`w-4 h-4 ${project.starred ? 'fill-current' : ''}`} />
            </button>
            <Dropdown
              trigger={
                <button type="button" aria-label={`Abrir acoes do projeto ${project.name}`} className="p-1.5 rounded-lg text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              }
              items={menuItems}
              align="right"
            />
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-[var(--aethel-text-secondary)] mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)]">
          <div className="flex items-center gap-4">
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
            <span className="flex items-center gap-1.5 text-xs text-[var(--aethel-text-tertiary)]">
              <Clock className="w-3.5 h-3.5" />
              {project.lastOpened}
            </span>
          </div>

          {project.collaborators && project.collaborators.length > 0 && (
            <AvatarGroup
              avatars={project.collaborators}
              max={3}
              size="xs"
            />
          )}
        </div>
      </div>
    </Card>
  )
}

export function ProjectsTab({
  projects = [],
  loading = false,
  onCreateProject,
  onOpenProject,
  onEditProject,
  onDeleteProject,
  onToggleStar,
}: ProjectsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !filterType || project.type === filterType
    const matchesStatus = !filterStatus || project.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--aethel-text-primary)]">Projetos</h1>
          <p className="text-[var(--aethel-text-secondary)] mt-1">
            Gerencie seus projetos e colaboracoes
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={onCreateProject}>
          Novo Projeto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar projetos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value || null)}
            className="px-4 py-2.5 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded-lg text-[var(--aethel-text-primary)] text-sm focus:outline-none focus:border-[var(--aethel-info)]"
          >
            <option value="">Todos os tipos</option>
            <option value="code">Codigo</option>
            <option value="web">Web App</option>
            <option value="unreal">Unreal</option>
            <option value="api">API</option>
          </select>
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="px-4 py-2.5 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded-lg text-[var(--aethel-text-primary)] text-sm focus:outline-none focus:border-[var(--aethel-info)]"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="completed">Concluido</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card variant="default" padding="lg">
          {searchQuery || filterType || filterStatus ? (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-[var(--aethel-text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-2">
                Nenhum projeto encontrado
              </h3>
              <p className="text-[var(--aethel-text-secondary)] mb-4">
                Tente ajustar seus filtros de busca
              </p>
              <Button type="button"
                variant="secondary"
                onClick={() => {
                  setSearchQuery('')
                  setFilterType(null)
                  setFilterStatus(null)
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <EmptyProjects onCreate={onCreateProject || (() => {})} />
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => onOpenProject?.(project.id)}
              onEdit={() => onEditProject?.(project.id)}
              onDelete={() => onDeleteProject?.(project.id)}
              onToggleStar={() => onToggleStar?.(project.id)}
            />
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {filteredProjects.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--aethel-text-tertiary)] pt-4 border-t border-[var(--aethel-border-primary)]">
          <span>
            {filteredProjects.length} de {projects.length} projetos
          </span>
          <span>
            {projects.filter((p) => p.starred).length} favoritos
          </span>
        </div>
      )}
    </div>
  )
}

export default ProjectsTab

