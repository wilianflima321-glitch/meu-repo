// @aethel-heavy-async-boundary Motion-heavy surface; lazy-load outside its owning product region.
'use client';

/**
 * Games & Films Module - Alpha Honest
 *
 * Governed creation and management surface for games and films.
 * Status: Alpha (functional, basic settings)
 * Pattern: governed Studio surface with honest release readiness
 */
import React, { useState } from 'react'
import { motion, AnimatePresence, StaggerContainer } from '@/lib/ui/motion'
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
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useStudioState } from '@/lib/studio-state'
import { telemetry } from '@/lib/telemetry'

const fadeInUpMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.24, ease: 'easeOut' },
} as const

/**
 * Project types (Games/Films)
 */
interface GameProject {
  id: string
  name: string
  type: 'game'
  engine: 'unity' | 'unreal' | 'godot' | 'custom'
  status: 'draft' | 'development' | 'testing' | 'review-ready'
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
  status: 'draft' | 'production' | 'post-production' | 'review-ready'
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
 * Main component
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
      name: 'New Game',
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
      message: 'New game project created',
      duration: 3000,
    })

    telemetry.trackFeatureUsage('game_created', { engine: 'custom' })
    setShowCreateDialog(false)
  }

  const handleCreateFilm = () => {
    const newFilm: FilmProject = {
      id: `film_${Date.now()}`,
      name: 'New Film',
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
      message: 'New film project created',
      duration: 3000,
    })

    telemetry.trackFeatureUsage('film_created', { format: '3d' })
    setShowCreateDialog(false)
  }

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter((p) => p.id !== id))
    addNotification({
      type: 'success',
      message: 'Project deleted',
      duration: 2000,
    })
  }

  const handleMarkReviewReady = (project: Project) => {
    const updated = projects.map((p) =>
      p.id === project.id ? { ...p, status: 'review-ready' as const } : p
    )
    setProjects(updated)
    addNotification({
      type: 'success',
      message: `${project.type === 'game' ? 'Game' : 'Film'} marked ready for human release review.`,
      duration: 3000,
    })

    telemetry.trackFeatureUsage('project_review_ready', {
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
          <h1 className="text-3xl font-bold text-[var(--aethel-text-primary)]">Games & Films</h1>
          <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">
            Create and manage your game and film projects
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
          <Plus size={18} />
          New Project
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--aethel-border-primary)]">
        <button type="button"
          onClick={() => setActiveTab('games')}
          className={`px-4 py-3 font-medium text-sm transition-all ${
            activeTab === 'games'
              ? 'text-[var(--aethel-info-light)] border-b-2 border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
              : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Gamepad2 size={16} />
            Games ({games.length})
          </div>
        </button>
        <button type="button"
          onClick={() => setActiveTab('films')}
          className={`px-4 py-3 font-medium text-sm transition-all ${
            activeTab === 'films'
              ? 'text-[var(--aethel-info-light)] border-b-2 border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
              : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Film size={16} />
            Films ({films.length})
          </div>
        </button>
      </div>

      {/* Projects Grid */}
      <AnimatePresence mode="wait">
        {activeTab === 'games' ? (
          <GamesGrid games={games} onDelete={handleDeleteProject} onPublish={handleMarkReviewReady} />
        ) : (
          <FilmsGrid films={films} onDelete={handleDeleteProject} onPublish={handleMarkReviewReady} />
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
 * Games grid
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
        {...fadeInUpMotion}
        className="text-center py-12 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
      >
        <Gamepad2 size={48} className="mx-auto mb-4 text-[var(--aethel-text-secondary)]" />
        <p className="text-[var(--aethel-text-secondary)]">No games created yet</p>
        <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">Click &quot;New Project&quot; to start</p>
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
 * Films grid
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
        {...fadeInUpMotion}
        className="text-center py-12 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
      >
        <Film size={48} className="mx-auto mb-4 text-[var(--aethel-text-secondary)]" />
        <p className="text-[var(--aethel-text-secondary)]">No films created yet</p>
        <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">Click &quot;New Project&quot; to start</p>
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
 * Game card
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
    <Card hoverable padding="none" className="p-4 space-y-4">
      {/* Thumbnail */}
      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)]">
        <Gamepad2 size={48} className="text-[var(--aethel-text-secondary)]" />
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold text-[var(--aethel-text-primary)]">{game.name}</h3>
        <p className="text-xs text-[var(--aethel-text-secondary)] mt-1">Engine: {game.engine}</p>
      </div>

      {/* Status */}
      <div className="flex gap-2">
        <Badge variant={game.status === 'review-ready' ? 'success' : 'info'}>
          {game.status}
        </Badge>
        <Badge variant="default">v{game.version}</Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-[var(--aethel-border-primary)]">
        <button type="button"
          onClick={() => onPublish(game)}
          disabled={game.status === 'review-ready'}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)] text-xs font-medium hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          <Play size={14} />
          Mark ready
        </button>
        <button type="button"
          onClick={() => onDelete(game.id)}
          aria-label={`Delete game ${game.name}`}
          className="px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)] text-xs font-medium hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  )
}

/**
 * Film card
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
    <Card hoverable padding="none" className="p-4 space-y-4">
      {/* Thumbnail */}
      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)]">
        <Film size={48} className="text-[var(--aethel-text-secondary)]" />
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold text-[var(--aethel-text-primary)]">{film.name}</h3>
        <p className="text-xs text-[var(--aethel-text-secondary)] mt-1">Format: {film.format.toUpperCase()}</p>
      </div>

      {/* Status */}
      <div className="flex gap-2">
        <Badge variant={film.status === 'review-ready' ? 'success' : 'info'}>
          {film.status}
        </Badge>
        <Badge variant="default">{film.resolution}</Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-[var(--aethel-border-primary)]">
        <button type="button"
          onClick={() => onPublish(film)}
          disabled={film.status === 'review-ready'}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-accent)_20%,transparent)] text-[var(--aethel-accent-light)] text-xs font-medium hover:bg-[color-mix(in_srgb,var(--aethel-accent)_30%,transparent)] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          <Play size={14} />
          Mark ready
        </button>
        <button type="button"
          onClick={() => onDelete(film.id)}
          aria-label={`Delete film ${film.name}`}
          className="px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)] text-xs font-medium hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  )
}

/**
 * Creation dialog
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
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <Card padding="none" className="w-full max-w-md p-6 space-y-4">
              <h2 className="text-xl font-bold text-[var(--aethel-text-primary)]">New Project</h2>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={onCreateGame}
                  className="w-full justify-center"
                >
                  <Gamepad2 size={18} />
                  Create Game
                </Button>

                <Button
                  variant="secondary"
                  onClick={onCreateFilm}
                  className="w-full justify-center"
                >
                  <Film size={18} />
                  Create Film
                </Button>
              </div>

              <button type="button"
                onClick={onClose}
                className="w-full px-4 py-2 rounded-lg text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                Cancel
              </button>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
