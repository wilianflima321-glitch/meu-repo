/**
 * Games & Films Module - Alpha Honest
 * 
 * Módulo de criação e gerenciamento de Games e Films
 * Status: Alpha (Funcional, Configurações Básicas)
 * Padrão: L5 Design, Real Integration
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gamepad2,
  Film,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  Eye,
  Download,
  Share2,
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  StaggerContainer,
  AnimatedBadge,
  eliteAnimations,
} from '@/components/ui/GlassmorphismUI'
import { useStudioState } from '@/lib/studio-state'
import { telemetry } from '@/lib/telemetry'

/**
 * Tipos de Projeto (Games/Films)
 */
interface GameProject {
  id: string
  name: string
  type: 'game'
  engine: 'unity' | 'unreal' | 'godot' | 'custom'
  status: 'draft' | 'development' | 'testing' | 'published'
  thumbnail?: string
  createdAt: string
  updatedAt: string
  version: string
  players?: number
  rating?: number
}

interface FilmProject {
  id: string
  name: string
  type: 'film'
  format: '2d' | '3d' | 'vr' | 'interactive'
  status: 'draft' | 'production' | 'post-production' | 'published'
  thumbnail?: string
  createdAt: string
  updatedAt: string
  duration?: number
  resolution: '1080p' | '4k' | '8k'
  views?: number
  rating?: number
}

type Project = GameProject | FilmProject

/**
 * Componente Principal
 */
export function GamesAndFilmsModule() {
  const { state, addNotification } = useStudioState()
  const [activeTab, setActiveTab] = useState<'games' | 'films'>('games')
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const handleCreateGame = () => {
    const newGame: GameProject = {
      id: `game_${Date.now()}`,
      name: 'Novo Jogo',
      type: 'game',
      engine: 'custom',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '0.1.0',
    }

    setProjects([...projects, newGame])
    addNotification({
      type: 'success',
      message: 'Novo projeto de jogo criado',
      duration: 3000,
    })

    telemetry.trackFeatureUsage('game_created', { engine: 'custom' })
    setShowCreateDialog(false)
  }

  const handleCreateFilm = () => {
    const newFilm: FilmProject = {
      id: `film_${Date.now()}`,
      name: 'Novo Filme',
      type: 'film',
      format: '3d',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolution: '4k',
    }

    setProjects([...projects, newFilm])
    addNotification({
      type: 'success',
      message: 'Novo projeto de filme criado',
      duration: 3000,
    })

    telemetry.trackFeatureUsage('film_created', { format: '3d' })
    setShowCreateDialog(false)
  }

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter((p) => p.id !== id))
    addNotification({
      type: 'success',
      message: 'Projeto deletado',
      duration: 2000,
    })
  }

  const handlePublish = (project: Project) => {
    const updated = projects.map((p) =>
      p.id === project.id ? { ...p, status: 'published' as const } : p
    )
    setProjects(updated)
    addNotification({
      type: 'success',
      message: `${project.type === 'game' ? 'Jogo' : 'Filme'} publicado com sucesso!`,
      duration: 3000,
    })

    telemetry.trackFeatureUsage('project_published', {
      type: project.type,
      projectId: project.id,
    })
  }

  const games = projects.filter((p) => p.type === 'game') as GameProject[]
  const films = projects.filter((p) => p.type === 'film') as FilmProject[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Games & Films</h1>
          <p className="text-sm text-white/60 mt-1">
            Crie e gerencie seus projetos de jogos e filmes
          </p>
        </div>
        <GlassButton variant="primary" onClick={() => setShowCreateDialog(true)}>
          <Plus size={18} />
          Novo Projeto
        </GlassButton>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-3 font-medium text-sm transition-all ${
            activeTab === 'games'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <Gamepad2 size={16} />
            Jogos ({games.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('films')}
          className={`px-4 py-3 font-medium text-sm transition-all ${
            activeTab === 'films'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <Film size={16} />
            Filmes ({films.length})
          </div>
        </button>
      </div>

      {/* Projects Grid */}
      <AnimatePresence mode="wait">
        {activeTab === 'games' ? (
          <GamesGrid games={games} onDelete={handleDeleteProject} onPublish={handlePublish} />
        ) : (
          <FilmsGrid films={films} onDelete={handleDeleteProject} onPublish={handlePublish} />
        )}
      </AnimatePresence>

      {/* Create Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateGame={handleCreateGame}
        onCreateFilm={handleCreateFilm}
      />
    </div>
  )
}

/**
 * Grid de Jogos
 */
function GamesGrid({
  games,
  onDelete,
  onPublish,
}: {
  games: GameProject[]
  onDelete: (id: string) => void
  onPublish: (project: GameProject) => void
}) {
  if (games.length === 0) {
    return (
      <motion.div
        {...eliteAnimations.fadeInUp}
        className="text-center py-12 rounded-lg border border-white/10 bg-white/5"
      >
        <Gamepad2 size={48} className="mx-auto mb-4 text-white/40" />
        <p className="text-white/60">Nenhum jogo criado ainda</p>
        <p className="text-sm text-white/40 mt-1">Clique em "Novo Projeto" para começar</p>
      </motion.div>
    )
  }

  return (
    <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onDelete={onDelete}
          onPublish={onPublish}
        />
      ))}
    </StaggerContainer>
  )
}

/**
 * Grid de Filmes
 */
function FilmsGrid({
  films,
  onDelete,
  onPublish,
}: {
  films: FilmProject[]
  onDelete: (id: string) => void
  onPublish: (project: FilmProject) => void
}) {
  if (films.length === 0) {
    return (
      <motion.div
        {...eliteAnimations.fadeInUp}
        className="text-center py-12 rounded-lg border border-white/10 bg-white/5"
      >
        <Film size={48} className="mx-auto mb-4 text-white/40" />
        <p className="text-white/60">Nenhum filme criado ainda</p>
        <p className="text-sm text-white/40 mt-1">Clique em "Novo Projeto" para começar</p>
      </motion.div>
    )
  }

  return (
    <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {films.map((film) => (
        <FilmCard
          key={film.id}
          film={film}
          onDelete={onDelete}
          onPublish={onPublish}
        />
      ))}
    </StaggerContainer>
  )
}

/**
 * Card de Jogo
 */
function GameCard({
  game,
  onDelete,
  onPublish,
}: {
  game: GameProject
  onDelete: (id: string) => void
  onPublish: (project: GameProject) => void
}) {
  return (
    <GlassCard hover glow animated className="p-4 space-y-4">
      {/* Thumbnail */}
      <div className="w-full h-32 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        <Gamepad2 size={48} className="text-white/40" />
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold text-white">{game.name}</h3>
        <p className="text-xs text-white/60 mt-1">Engine: {game.engine}</p>
      </div>

      {/* Status */}
      <div className="flex gap-2">
        <AnimatedBadge variant={game.status === 'published' ? 'success' : 'info'}>
          {game.status}
        </AnimatedBadge>
        <AnimatedBadge variant="default">v{game.version}</AnimatedBadge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-white/10">
        <button
          onClick={() => onPublish(game)}
          disabled={game.status === 'published'}
          className="flex-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          <Play size={14} />
          Publicar
        </button>
        <button
          onClick={() => onDelete(game.id)}
          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </GlassCard>
  )
}

/**
 * Card de Filme
 */
function FilmCard({
  film,
  onDelete,
  onPublish,
}: {
  film: FilmProject
  onDelete: (id: string) => void
  onPublish: (project: FilmProject) => void
}) {
  return (
    <GlassCard hover glow animated className="p-4 space-y-4">
      {/* Thumbnail */}
      <div className="w-full h-32 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
        <Film size={48} className="text-white/40" />
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold text-white">{film.name}</h3>
        <p className="text-xs text-white/60 mt-1">Formato: {film.format.toUpperCase()}</p>
      </div>

      {/* Status */}
      <div className="flex gap-2">
        <AnimatedBadge variant={film.status === 'published' ? 'success' : 'info'}>
          {film.status}
        </AnimatedBadge>
        <AnimatedBadge variant="default">{film.resolution}</AnimatedBadge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-white/10">
        <button
          onClick={() => onPublish(film)}
          disabled={film.status === 'published'}
          className="flex-1 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          <Play size={14} />
          Publicar
        </button>
        <button
          onClick={() => onDelete(film.id)}
          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </GlassCard>
  )
}

/**
 * Dialog de Criação
 */
function CreateProjectDialog({
  open,
  onClose,
  onCreateGame,
  onCreateFilm,
}: {
  open: boolean
  onClose: () => void
  onCreateGame: () => void
  onCreateFilm: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <GlassCard className="w-full max-w-md p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Novo Projeto</h2>

              <div className="space-y-3">
                <GlassButton
                  variant="primary"
                  onClick={onCreateGame}
                  className="w-full justify-center"
                >
                  <Gamepad2 size={18} />
                  Criar Jogo
                </GlassButton>

                <GlassButton
                  variant="secondary"
                  onClick={onCreateFilm}
                  className="w-full justify-center"
                >
                  <Film size={18} />
                  Criar Filme
                </GlassButton>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 rounded-lg text-white/60 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
