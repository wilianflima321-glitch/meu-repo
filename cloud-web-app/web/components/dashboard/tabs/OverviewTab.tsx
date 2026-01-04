'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  FolderKanban,
  MessageSquare,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Code,
  FileCode,
} from 'lucide-react'
import { Card, CardHeader, Badge, SkeletonCard, EmptyProjects, Button } from '../../ui'

interface OverviewStats {
  projects: number
  projectsChange: number
  chatSessions: number
  chatSessionsChange: number
  aiRequests: number
  aiRequestsChange: number
  timeSpent: string
}

interface RecentProject {
  id: string
  name: string
  type: string
  lastOpened: string
}

interface RecentActivity {
  id: string
  action: string
  target: string
  time: string
}

interface OverviewTabProps {
  stats?: OverviewStats
  recentProjects?: RecentProject[]
  recentActivity?: RecentActivity[]
  loading?: boolean
  onCreateProject?: () => void
  onOpenProject?: (id: string) => void
  onOpenChat?: () => void
}

function StatCard({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card variant="elevated" padding="md" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              ) : null}
              <span
                className={`text-sm ${
                  trend === 'up'
                    ? 'text-emerald-400'
                    : trend === 'down'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {change > 0 ? '+' : ''}{change}% vs mês passado
              </span>
            </div>
          )}
        </div>
        
        <div className="p-3 rounded-xl bg-slate-800/50">
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function OverviewTab({
  stats,
  recentProjects = [],
  recentActivity = [],
  loading = false,
  onCreateProject,
  onOpenProject,
  onOpenChat,
}: OverviewTabProps) {
  const defaultStats: OverviewStats = useMemo(
    () => ({
      projects: 0,
      projectsChange: 0,
      chatSessions: 0,
      chatSessionsChange: 0,
      aiRequests: 0,
      aiRequestsChange: 0,
      timeSpent: '0h',
    }),
    []
  )

  const currentStats = stats || defaultStats

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bem-vindo de volta!</h1>
          <p className="text-slate-400 mt-1">
            Aqui está um resumo da sua atividade recente.
          </p>
        </div>
        <Button icon={<Sparkles className="w-4 h-4" />} onClick={onOpenChat}>
          Nova Conversa AI
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Projetos Ativos"
          value={currentStats.projects}
          change={currentStats.projectsChange}
          icon={<FolderKanban className="w-6 h-6 text-indigo-400" />}
          trend={currentStats.projectsChange >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Sessões de Chat"
          value={currentStats.chatSessions}
          change={currentStats.chatSessionsChange}
          icon={<MessageSquare className="w-6 h-6 text-purple-400" />}
          trend={currentStats.chatSessionsChange >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Requests AI"
          value={currentStats.aiRequests}
          change={currentStats.aiRequestsChange}
          icon={<Zap className="w-6 h-6 text-amber-400" />}
          trend={currentStats.aiRequestsChange >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Tempo Codando"
          value={currentStats.timeSpent}
          icon={<Clock className="w-6 h-6 text-emerald-400" />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Projetos Recentes"
            description="Continue de onde parou"
            action={
              <Button variant="ghost" size="sm" onClick={onCreateProject}>
                Ver todos
              </Button>
            }
          />
          
          {recentProjects.length === 0 ? (
            <EmptyProjects onCreate={onCreateProject || (() => {})} />
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onOpenProject?.(project.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    {project.type === 'unreal' ? (
                      <Code className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <FileCode className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{project.name}</p>
                    <p className="text-sm text-slate-400">{project.lastOpened}</p>
                  </div>
                  <Badge variant="default" size="sm">
                    {project.type}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Atividade Recente"
            description="Seu histórico de ações"
          />
          
          {recentActivity.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma atividade ainda</p>
              <p className="text-sm text-slate-600 mt-1">
                Suas ações aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-slate-200">
                      <span className="font-medium">{activity.action}</span>{' '}
                      <span className="text-slate-400">{activity.target}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="gradient" padding="lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              Comece algo novo com IA
            </h3>
            <p className="text-slate-400">
              Use nossos agentes de IA para criar, refatorar ou debugar código.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onOpenChat}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat AI
            </Button>
            <Button onClick={onCreateProject}>
              <FolderKanban className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default OverviewTab
