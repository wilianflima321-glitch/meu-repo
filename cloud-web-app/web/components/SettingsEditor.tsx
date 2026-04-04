/**
 * Settings Editor Component
 * Professional settings UI with search, categories, and live preview
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { openConfirmDialog } from '@/lib/ui/non-blocking-dialogs'

interface SettingDefinition {
  key: string
  title: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array'
  default: any
  enum?: string[]
  category: string
  scope?: 'user' | 'workspace' | 'both'
  tags?: string[]
}

interface SettingsCategory {
  id: string
  label: string
  icon: string
  settings: SettingDefinition[]
}

const SETTINGS_DEFINITIONS: SettingsCategory[] = [
  {
    id: 'editor',
    label: 'Editor',
    icon: 'ED',
    settings: [
      {
        key: 'editor.fontSize',
        title: 'Tamanho da fonte',
        description: 'Controla o tamanho da fonte em pixels',
        type: 'number',
        default: 14,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.fontFamily',
        title: 'Familia da fonte',
        description: 'Controla a familia da fonte',
        type: 'string',
        default: 'Consolas, \"Courier New\", monospace',
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.tabSize',
        title: 'Tamanho da tabulacao',
        description: 'Numero de espacos equivalentes a uma tabulacao',
        type: 'number',
        default: 4,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.insertSpaces',
        title: 'Inserir espacos',
        description: 'Insere espacos ao pressionar Tab',
        type: 'boolean',
        default: true,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.wordWrap',
        title: 'Quebra de linha',
        description: 'Controla como as linhas devem quebrar',
        type: 'enum',
        enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
        default: 'off',
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.minimap.enabled',
        title: 'Minimapa ativado',
        description: 'Controla se o minimapa e exibido',
        type: 'boolean',
        default: true,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.lineNumbers',
        title: 'Numeros de linha',
        description: 'Controla a exibicao de numeros de linha',
        type: 'enum',
        enum: ['off', 'on', 'relative', 'interval'],
        default: 'on',
        category: 'editor',
        scope: 'both',
      },
    ],
  },
  {
    id: 'workbench',
    label: 'Ambiente',
    icon: 'WB',
    settings: [
      {
        key: 'workbench.colorTheme',
        title: 'Tema de cores',
        description: 'Especifica o tema de cores usado no ambiente',
        type: 'enum',
        enum: ['Dark+', 'Light+', 'Dark (Visual Studio)', 'Light (Visual Studio)', 'High Contrast'],
        default: 'Dark+',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.iconTheme',
        title: 'Tema de icones',
        description: 'Especifica o tema de icones usado no ambiente',
        type: 'enum',
        enum: ['vs-seti', 'vs-minimal', 'None'],
        default: 'vs-seti',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.sideBar.location',
        title: 'Local da barra lateral',
        description: 'Controla a localizacao da barra lateral',
        type: 'enum',
        enum: ['left', 'right'],
        default: 'left',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.activityBar.visible',
        title: 'Barra de atividade visivel',
        description: 'Controla a visibilidade da barra de atividade',
        type: 'boolean',
        default: true,
        category: 'workbench',
        scope: 'user',
      },
    ],
  },
  {
    id: 'files',
    label: 'Arquivos',
    icon: 'FL',
    settings: [
      {
        key: 'files.autoSave',
        title: 'Salvar automaticamente',
        description: 'Controla o salvamento automatico de arquivos modificados',
        type: 'enum',
        enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
        default: 'off',
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.autoSaveDelay',
        title: 'Atraso do salvamento automatico',
        description: 'Controla o atraso em ms para salvar automaticamente arquivos modificados',
        type: 'number',
        default: 1000,
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.encoding',
        title: 'Codificacao',
        description: 'Codificacao padrao de caracteres a ser usada',
        type: 'enum',
        enum: ['utf8', 'utf16le', 'utf16be', 'windows1252', 'iso88591'],
        default: 'utf8',
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.eol',
        title: 'Fim de linha',
        description: 'Caractere padrao de fim de linha',
        type: 'enum',
        enum: ['\\n', '\\r\\n', 'auto'],
        default: 'auto',
        category: 'files',
        scope: 'both',
      },
    ],
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: 'TR',
    settings: [
      {
        key: 'terminal.integrated.fontSize',
        title: 'Tamanho da fonte',
        description: 'Controla o tamanho da fonte em pixels do terminal',
        type: 'number',
        default: 14,
        category: 'terminal',
        scope: 'both',
      },
      {
        key: 'terminal.integrated.fontFamily',
        title: 'Familia da fonte',
        description: 'Controla a familia da fonte do terminal',
        type: 'string',
        default: 'monospace',
        category: 'terminal',
        scope: 'both',
      },
      {
        key: 'terminal.integrated.shell.linux',
        title: 'Shell: Linux',
        description: 'Caminho do shell usado no Linux',
        type: 'string',
        default: '/bin/bash',
        category: 'terminal',
        scope: 'both',
      },
    ],
  },
  {
    id: 'git',
    label: 'Git',
    icon: 'GT',
    settings: [
      {
        key: 'git.enabled',
        title: 'Ativado',
        description: 'Define se o git esta ativado',
        type: 'boolean',
        default: true,
        category: 'git',
        scope: 'both',
      },
      {
        key: 'git.autoFetch',
        title: 'Busca automatica',
        description: 'Define se deve buscar automaticamente do remoto',
        type: 'boolean',
        default: false,
        category: 'git',
        scope: 'both',
      },
      {
        key: 'git.confirmSync',
        title: 'Confirmar sincronizacao',
        description: 'Confirma antes de sincronizar repositorios git',
        type: 'boolean',
        default: true,
        category: 'git',
        scope: 'both',
      },
    ],
  },
  {
    id: 'ai',
    label: 'Recursos de IA',
    icon: 'AI',
    settings: [
      {
        key: 'ai.enabled',
        title: 'IA ativada',
        description: 'Ativa recursos com IA',
        type: 'boolean',
        default: true,
        category: 'ai',
        scope: 'user',
      },
      {
        key: 'ai.completions.enabled',
        title: 'Autocompletar com IA',
        description: 'Ativa sugestoes de codigo com IA',
        type: 'boolean',
        default: true,
        category: 'ai',
        scope: 'both',
      },
      {
        key: 'ai.debug.enabled',
        title: 'Assistente de depuracao com IA',
        description: 'Ativa assistencia de depuracao com IA',
        type: 'boolean',
        default: true,
        category: 'ai',
        scope: 'both',
      },
      {
        key: 'ai.provider',
        title: 'Provedor de IA',
        description: 'Seleciona o provedor de IA',
        type: 'enum',
        enum: ['OpenRouter', 'OpenAI', 'Anthropic', 'Google', 'Ollama'],
        default: 'OpenRouter',
        category: 'ai',
        scope: 'user',
      },
    ],
  },
]

export default function SettingsEditor() {
  const [searchQuery, setSearchQuery] = useState('')
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<'user' | 'workspace'>('user')
  const [selectedCategory, setSelectedCategory] = useState<string>(SETTINGS_DEFINITIONS[0]?.id ?? 'general')

  useEffect(() => {
    const stored = localStorage.getItem('ide-settings')
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch (error) {
        console.error('Falha ao carregar configuracoes:', error)
      }
    }
  }, [])

  const saveSettings = (newSettings: Record<string, any>) => {
    setSettings(newSettings)
  }

  const filteredCategories = useMemo(() => {
    if (!searchQuery) {
      return SETTINGS_DEFINITIONS
    }

    const query = searchQuery.toLowerCase()
    return SETTINGS_DEFINITIONS.map((category) => ({
      ...category,
      settings: category.settings.filter(
        (setting) =>
          setting.title.toLowerCase().includes(query) ||
          setting.description.toLowerCase().includes(query) ||
          setting.key.toLowerCase().includes(query),
      ),
    })).filter((category) => category.settings.length > 0)
  }, [searchQuery])

  const currentCategory = useMemo(() => {
    return filteredCategories.find((cat) => cat.id === selectedCategory) || filteredCategories[0]
  }, [filteredCategories, selectedCategory])

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value }
    saveSettings(newSettings)
    setModifiedSettings((prev) => new Set(prev).add(key))
  }

  const resetSetting = (key: string) => {
    const setting = SETTINGS_DEFINITIONS.flatMap((cat) => cat.settings).find((s) => s.key === key)

    if (setting) {
      const newSettings = { ...settings }
      delete newSettings[key]
      saveSettings(newSettings)
      setModifiedSettings((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const resetAllSettings = async () => {
    const shouldReset = await openConfirmDialog({
      title: 'Redefinir configuracoes',
      message: 'Tem certeza de que deseja redefinir todas as configuracoes?',
      confirmText: 'Redefinir',
      cancelText: 'Cancelar',
    })
    if (!shouldReset) return
    saveSettings({})
    setModifiedSettings(new Set())
  }

  const renderSettingInput = (setting: SettingDefinition) => {
    const value = settings[setting.key] ?? setting.default
    const isModified = modifiedSettings.has(setting.key)

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 text-xs text-[var(--aethel-text-secondary)]">
            <input
              type="checkbox"
              checked={value}
              onChange={(event) => updateSetting(setting.key, event.target.checked)}
              className="h-4 w-4 rounded border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] text-[var(--aethel-primary)] focus:ring-2 focus:ring-[var(--aethel-primary)]"
            />
            {value ? 'Ativado' : 'Desativado'}
          </label>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(event) => updateSetting(setting.key, parseInt(event.target.value))}
            className="aethel-input w-32 text-xs"
          />
        )

      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(event) => updateSetting(setting.key, event.target.value)}
            className="aethel-input w-full max-w-md text-xs"
          />
        )

      case 'enum':
        return (
          <select
            value={value}
            onChange={(event) => updateSetting(setting.key, event.target.value)}
            className="aethel-input text-xs"
          >
            {setting.enum?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      default:
        return <span className="text-xs text-[var(--aethel-text-quaternary)]">Tipo nao suportado: {setting.type}</span>
    }
  }

  return (
    <div className="flex h-full bg-transparent text-[var(--aethel-text-primary)]">
      <div className="w-72 border-r border-[var(--aethel-border-primary)]">
        <div className="border-b border-[var(--aethel-border-primary)] p-4">
          <input
            type="text"
            placeholder="Buscar configuracoes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="aethel-input w-full text-xs"
          />
        </div>

        <div className="border-b border-[var(--aethel-border-primary)] p-4">
          <div className="flex gap-2">
            <button type="button"
              onClick={() => setScope('user')}
              className={`aethel-button flex-1 text-xs ${
                scope === 'user' ? 'aethel-button-primary' : 'aethel-button-secondary'
              }`}
            >
              Usuario
            </button>
            <button type="button"
              onClick={() => setScope('workspace')}
              className={`aethel-button flex-1 text-xs ${
                scope === 'workspace' ? 'aethel-button-primary' : 'aethel-button-secondary'
              }`}
            >
              Workspace
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCategories.map((category) => (
            <button type="button"
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                selectedCategory === category.id ? 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]'
              }`}
            >
              <span className="rounded-md bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-text-tertiary)]">{category.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{category.label}</div>
                <div className="text-xs text-[var(--aethel-text-quaternary)]">{category.settings.length} configuracoes</div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-[var(--aethel-border-primary)] p-4">
          <button type="button" onClick={resetAllSettings} className="aethel-button aethel-button-danger w-full text-xs">
            Redefinir todas as configuracoes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-8">
          <div className="mb-8">
            <h1 className="flex items-center gap-3 text-2xl font-semibold">
              <span className="rounded-md bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-1 text-sm text-[var(--aethel-text-secondary)]">{currentCategory?.icon}</span>
              {currentCategory?.label}
            </h1>
            <p className="text-sm text-[var(--aethel-text-quaternary)]">{currentCategory?.settings.length} configuracoes</p>
          </div>

          <div className="space-y-6">
            {currentCategory?.settings.map((setting) => {
              const isModified = modifiedSettings.has(setting.key)

              return (
                <div key={setting.key} className="border-b border-[var(--aethel-border-primary)] pb-6 last:border-0">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{setting.title}</h3>
                        {isModified && (
                          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-200">
                            Alterado
                          </span>
                        )}
                      </div>
                      <p className="mb-2 text-xs text-[var(--aethel-text-quaternary)]">{setting.description}</p>
                      <code className="text-[11px] text-[var(--aethel-text-quaternary)]">{setting.key}</code>
                    </div>
                    {isModified && (
                      <button type="button"
                        onClick={() => resetSetting(setting.key)}
                        className="aethel-button aethel-button-ghost text-xs"
                      >
                        Redefinir
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4">{renderSettingInput(setting)}</div>
                </div>
              )
            })}
          </div>

          {currentCategory?.settings.length === 0 && (
            <div className="aethel-state aethel-state-empty py-12">
              <p>Nenhuma configuracao encontrada para &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

