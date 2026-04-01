'use client'

import { type ReactNode } from 'react'
import { FolderOpen, Search, Inbox, FileText, Users, Sparkles } from 'lucide-react'
import Button from './Button'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'compact' | 'large'
}

const defaultIcons: Record<string, ReactNode> = {
  folder: <FolderOpen className="h-12 w-12" />,
  search: <Search className="h-12 w-12" />,
  inbox: <Inbox className="h-12 w-12" />,
  file: <FileText className="h-12 w-12" />,
  users: <Users className="h-12 w-12" />,
  ai: <Sparkles className="h-12 w-12" />,
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
}: EmptyStateProps) {
  const sizeClasses = {
    compact: 'py-8 px-4',
    default: 'py-12 px-6',
    large: 'py-20 px-8',
  }

  const iconSizeClasses = {
    compact: 'h-10 w-10',
    default: 'h-12 w-12',
    large: 'h-16 w-16',
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeClasses[variant]}`}>
      <div className="mb-4 rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-4 text-[var(--aethel-text-tertiary)] shadow-lg shadow-black/20">
        {icon || <Inbox className={iconSizeClasses[variant]} />}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-[var(--aethel-text-tertiary)]">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button variant="primary" onClick={action.onClick} icon={action.icon}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen className="h-12 w-12" />}
      title="Nenhum projeto ainda"
      description="Crie seu primeiro projeto para comecar a desenvolver com IA."
      action={{
        label: 'Criar Projeto',
        onClick: onCreate,
        icon: <Sparkles className="h-4 w-4" />,
      }}
    />
  )
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title="Nenhum resultado encontrado"
      description={`Nao encontramos resultados para "${query}". Tente usar termos diferentes.`}
    />
  )
}

export function EmptyChat({ onStart }: { onStart: () => void }) {
  return (
    <EmptyState
      icon={<Sparkles className="h-12 w-12" />}
      title="Comece uma conversa"
      description="Pergunte qualquer coisa sobre codigo, arquitetura, ou peca para criar algo novo."
      action={{
        label: 'Iniciar Chat',
        onClick: onStart,
      }}
    />
  )
}

export function EmptyWorkflows({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="h-12 w-12" />}
      title="Nenhum workflow criado"
      description="Workflows ajudam a organizar tarefas complexas com multiplos agentes de IA."
      action={{
        label: 'Criar Workflow',
        onClick: onCreate,
      }}
    />
  )
}

export default EmptyState
