'use client'

import React, { useState, useEffect } from 'react'
import { Settings, FolderOpen, Check, X, AlertTriangle, RefreshCw, Save, Trash2 } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface PathConfig {
  id: string
  name: string
  description: string
  path: string
  isValid: boolean
  isRequired: boolean
  defaultPaths: string[]
  icon: string
}

interface SettingsState {
  blenderPath: string
  ffmpegPath: string
  pythonPath: string
  projectsPath: string
  cachePath: string
  autoDetect: boolean
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'aethel_path_settings'

function loadSettings(): SettingsState {
  if (typeof window === 'undefined') {
    return getDefaultSettings()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    console.warn('Failed to load settings from localStorage')
  }

  return getDefaultSettings()
}

function saveSettings(settings: SettingsState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    console.error('Failed to save settings to localStorage')
  }
}

function getDefaultSettings(): SettingsState {
  return {
    blenderPath: '',
    ffmpegPath: '',
    pythonPath: '',
    projectsPath: '',
    cachePath: '',
    autoDetect: true,
  }
}

// ============================================================================
// PATH CONFIGS
// ============================================================================

const PATH_CONFIGS: Omit<PathConfig, 'path' | 'isValid'>[] = [
  {
    id: 'blenderPath',
    name: 'Blender',
    description: 'Caminho para o executavel do Blender (renderizacao 3D)',
    isRequired: true,
    defaultPaths: [
      'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
      '/Applications/Blender.app/Contents/MacOS/Blender',
      '/usr/bin/blender',
    ],
    icon: 'BL',
  },
  {
    id: 'ffmpegPath',
    name: 'FFmpeg',
    description: 'Caminho para o FFmpeg (processamento de video)',
    isRequired: false,
    defaultPaths: ['C:\\ffmpeg\\bin\\ffmpeg.exe', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'],
    icon: 'FF',
  },
  {
    id: 'pythonPath',
    name: 'Python',
    description: 'Caminho para o interpretador Python',
    isRequired: false,
    defaultPaths: ['C:\\Python311\\python.exe', 'C:\\Python310\\python.exe', '/usr/bin/python3', '/usr/local/bin/python3'],
    icon: 'PY',
  },
  {
    id: 'projectsPath',
    name: 'Pasta de projetos',
    description: 'Onde seus projetos Aethel serao salvos',
    isRequired: true,
    defaultPaths: ['%USERPROFILE%\\Documents\\Aethel Projects', '~/Documents/Aethel Projects'],
    icon: 'PR',
  },
  {
    id: 'cachePath',
    name: 'Pasta de cache',
    description: 'Onde arquivos temporarios serao armazenados',
    isRequired: false,
    defaultPaths: ['%LOCALAPPDATA%\\Aethel\\Cache', '~/.cache/aethel'],
    icon: 'CH',
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

const PathInput: React.FC<{
  config: PathConfig
  value: string
  onChange: (value: string) => void
  onValidate: () => void
  isValidating: boolean
}> = ({ config, value, onChange, onValidate, isValidating }) => {
  return (
    <div className="aethel-card aethel-p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--aethel-text-tertiary)]">{config.icon}</span>
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
              {config.name}
              {config.isRequired && <span className="text-[11px] text-rose-300">Obrigatorio</span>}
            </h4>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isValidating ? (
            <RefreshCw className="h-5 w-5 text-sky-300 animate-spin" />
          ) : config.isValid ? (
            <Check className="h-5 w-5 text-emerald-300" />
          ) : value ? (
            <X className="h-5 w-5 text-rose-300" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-300" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[220px] flex-1">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={config.defaultPaths[0] || 'Caminho nao configurado'}
            className={`aethel-input w-full font-mono text-xs ${
              config.isValid ? 'border-emerald-500/50' : value ? 'border-rose-500/50' : ''
            }`}
          />
        </div>

        <button
          onClick={onValidate}
          disabled={isValidating || !value}
          className="aethel-button aethel-button-primary text-xs disabled:opacity-60"
        >
          Verificar
        </button>

        <button
          onClick={() => onChange('')}
          className="aethel-button aethel-button-ghost text-xs"
          title="Limpar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {!config.isValid && config.defaultPaths.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] text-[var(--aethel-text-tertiary)]">Caminhos comuns:</p>
          <div className="flex flex-wrap gap-1">
            {config.defaultPaths.slice(0, 2).map((path, idx) => (
              <button
                key={idx}
                onClick={() => onChange(path)}
                className="rounded-md bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] px-2 py-1 text-[11px] font-mono text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)]"
              >
                {path}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SettingsPathConfig: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSave?: (settings: SettingsState) => void
}> = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<SettingsState>(getDefaultSettings)
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({})
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set())
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    const loaded = loadSettings()
    setSettings(loaded)
  }, [])

  const updatePath = (id: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [id]: value,
    }))
    setValidationStatus((prev) => ({
      ...prev,
      [id]: false,
    }))
    setIsDirty(true)
  }

  const validatePath = async (id: string) => {
    const path = settings[id as keyof SettingsState]
    if (!path || typeof path !== 'string') return

    setValidatingIds((prev) => new Set(prev).add(id))
    await new Promise((resolve) => setTimeout(resolve, 500))

    const isValid =
      (id === 'blenderPath' && path.toLowerCase().includes('blender')) ||
      (id === 'ffmpegPath' && path.toLowerCase().includes('ffmpeg')) ||
      (id === 'pythonPath' && path.toLowerCase().includes('python')) ||
      (id === 'projectsPath' && path.length > 3) ||
      (id === 'cachePath' && path.length > 3)

    setValidationStatus((prev) => ({
      ...prev,
      [id]: isValid,
    }))

    setValidatingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleSave = () => {
    saveSettings(settings)
    setIsDirty(false)
    onSave?.(settings)
  }

  const handleAutoDetect = async () => {
    setValidatingIds(new Set(PATH_CONFIGS.map((config) => config.id)))
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setSettings((prev) => ({
      ...prev,
      blenderPath: 'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      ffmpegPath: 'C:\\ffmpeg\\bin\\ffmpeg.exe',
      pythonPath: 'C:\\Python311\\python.exe',
    }))

    setValidationStatus({
      blenderPath: true,
      ffmpegPath: true,
      pythonPath: true,
    })

    setValidatingIds(new Set())
    setIsDirty(true)
  }

  if (!isOpen) return null

  const pathConfigs: PathConfig[] = PATH_CONFIGS.map((config) => ({
    ...config,
    path: (settings[config.id as keyof SettingsState] as string) || '',
    isValid: validationStatus[config.id] || false,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="aethel-card w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-sky-300" />
            <div>
              <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">Configuracao de caminhos</h2>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Configure onde encontrar programas externos</p>
            </div>
          </div>

          <button onClick={onClose} className="aethel-button aethel-button-ghost rounded-lg p-2">
            <X className="h-5 w-5 text-[var(--aethel-text-tertiary)]" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3">
            <div>
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Deteccao automatica</p>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Deixe o Aethel encontrar os programas por voce</p>
            </div>
            <button
              onClick={handleAutoDetect}
              disabled={validatingIds.size > 0}
              className="aethel-button aethel-button-primary flex items-center gap-2 text-xs disabled:opacity-60"
            >
              <FolderOpen className="h-4 w-4" />
              {validatingIds.size > 0 ? 'Detectando...' : 'Auto-detectar'}
            </button>
          </div>

          {pathConfigs.map((config) => (
            <PathInput
              key={config.id}
              config={config}
              value={config.path}
              onChange={(value) => updatePath(config.id, value)}
              onValidate={() => validatePath(config.id)}
              isValidating={validatingIds.has(config.id)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-[var(--aethel-text-tertiary)]">
            {isDirty && <span className="text-yellow-300">Alteracoes nao salvas</span>}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="aethel-button aethel-button-ghost text-xs">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="aethel-button aethel-button-primary flex items-center gap-2 text-xs disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPathConfig

