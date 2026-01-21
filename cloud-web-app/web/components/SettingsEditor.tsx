/**
 * Settings Editor Component
 * Professional settings UI with search, categories, and live preview
 */

'use client';

import { useState, useEffect, useMemo } from 'react';

interface SettingDefinition {
  key: string;
  title: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
  default: any;
  enum?: string[];
  category: string;
  scope?: 'user' | 'workspace' | 'both';
  tags?: string[];
}

interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
  settings: SettingDefinition[];
}

const SETTINGS_DEFINITIONS: SettingsCategory[] = [
  {
    id: 'editor',
    label: 'Editor',
    icon: '',
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
        title: 'Família da fonte',
        description: 'Controla a família da fonte',
        type: 'string',
        default: 'Consolas, "Courier New", monospace',
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.tabSize',
        title: 'Tamanho da tabulação',
        description: 'Número de espaços equivalentes a uma tabulação',
        type: 'number',
        default: 4,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.insertSpaces',
        title: 'Inserir espaços',
        description: 'Insere espaços ao pressionar Tab',
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
        description: 'Controla se o minimapa é exibido',
        type: 'boolean',
        default: true,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.lineNumbers',
        title: 'Números de linha',
        description: 'Controla a exibição de números de linha',
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
    icon: '',
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
        title: 'Tema de ícones',
        description: 'Especifica o tema de ícones usado no ambiente',
        type: 'enum',
        enum: ['vs-seti', 'vs-minimal', 'None'],
        default: 'vs-seti',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.sideBar.location',
        title: 'Local da barra lateral',
        description: 'Controla a localização da barra lateral',
        type: 'enum',
        enum: ['left', 'right'],
        default: 'left',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.activityBar.visible',
        title: 'Barra de atividade visível',
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
    icon: '',
    settings: [
      {
        key: 'files.autoSave',
        title: 'Salvar automaticamente',
        description: 'Controla o salvamento automático de arquivos modificados',
        type: 'enum',
        enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
        default: 'off',
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.autoSaveDelay',
        title: 'Atraso do salvamento automático',
        description: 'Controla o atraso em ms para salvar automaticamente arquivos modificados',
        type: 'number',
        default: 1000,
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.encoding',
        title: 'Codificação',
        description: 'Codificação padrão de caracteres a ser usada',
        type: 'enum',
        enum: ['utf8', 'utf16le', 'utf16be', 'windows1252', 'iso88591'],
        default: 'utf8',
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.eol',
        title: 'Fim de linha',
        description: 'Caractere padrão de fim de linha',
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
    icon: '💻',
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
        title: 'Família da fonte',
        description: 'Controla a família da fonte do terminal',
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
    icon: '',
    settings: [
      {
        key: 'git.enabled',
        title: 'Ativado',
        description: 'Define se o git está ativado',
        type: 'boolean',
        default: true,
        category: 'git',
        scope: 'both',
      },
      {
        key: 'git.autoFetch',
        title: 'Busca automática',
        description: 'Define se deve buscar automaticamente do remoto',
        type: 'boolean',
        default: false,
        category: 'git',
        scope: 'both',
      },
      {
        key: 'git.confirmSync',
        title: 'Confirmar sincronização',
        description: 'Confirma antes de sincronizar repositórios git',
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
    icon: '',
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
        description: 'Ativa sugestões de código com IA',
        type: 'boolean',
        default: true,
        category: 'ai',
        scope: 'both',
      },
      {
        key: 'ai.debug.enabled',
        title: 'Assistente de depuração com IA',
        description: 'Ativa assistência de depuração com IA',
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
        enum: ['OpenAI', 'Anthropic', 'Google', 'Ollama'],
        default: 'OpenAI',
        category: 'ai',
        scope: 'user',
      },
    ],
  },
];

export default function SettingsEditor() {
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<'user' | 'workspace'>('user');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    SETTINGS_DEFINITIONS[0]?.id ?? 'general'
  );

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ide-settings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (error) {
        console.error('Falha ao carregar configurações:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: Record<string, any>) => {
    setSettings(newSettings);
  };

  // Filter settings based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) {
      return SETTINGS_DEFINITIONS;
    }

    const query = searchQuery.toLowerCase();
    return SETTINGS_DEFINITIONS.map(category => ({
      ...category,
      settings: category.settings.filter(setting =>
        setting.title.toLowerCase().includes(query) ||
        setting.description.toLowerCase().includes(query) ||
        setting.key.toLowerCase().includes(query)
      ),
    })).filter(category => category.settings.length > 0);
  }, [searchQuery]);

  // Get current category settings
  const currentCategory = useMemo(() => {
    return filteredCategories.find(cat => cat.id === selectedCategory) || filteredCategories[0];
  }, [filteredCategories, selectedCategory]);

  // Update setting value
  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
    setModifiedSettings(prev => new Set(prev).add(key));
  };

  // Reset setting to default
  const resetSetting = (key: string) => {
    const setting = SETTINGS_DEFINITIONS
      .flatMap(cat => cat.settings)
      .find(s => s.key === key);
    
    if (setting) {
      const newSettings = { ...settings };
      delete newSettings[key];
      saveSettings(newSettings);
      setModifiedSettings(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Reset all settings
  const resetAllSettings = () => {
    if (confirm('Tem certeza de que deseja redefinir todas as configurações?')) {
      saveSettings({});
      setModifiedSettings(new Set());
    }
  };

  // Render setting input based on type
  const renderSettingInput = (setting: SettingDefinition) => {
    const value = settings[setting.key] ?? setting.default;
    const isModified = modifiedSettings.has(setting.key);

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateSetting(setting.key, e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">
              {value ? 'Ativado' : 'Desativado'}
            </span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value))}
            className="w-32 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="w-full max-w-md px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'enum':
        return (
          <select
            value={value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {setting.enum?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <span className="text-sm text-gray-400">
            Tipo não suportado: {setting.type}
          </span>
        );
    }
  };

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-700 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Buscar configurações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Scope selector */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setScope('user')}
              className={`flex-1 px-3 py-1.5 rounded text-sm ${
                scope === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Usuário
            </button>
            <button
              onClick={() => setScope('workspace')}
              className={`flex-1 px-3 py-1.5 rounded text-sm ${
                scope === 'workspace'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Workspace
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto">
          {filteredCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-800 ${
                selectedCategory === category.id ? 'bg-gray-800 border-l-2 border-blue-500' : ''
              }`}
            >
              <span className="text-xl">{category.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{category.label}</div>
                <div className="text-xs text-gray-400">
                  {category.settings.length} configurações
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Reset all */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={resetAllSettings}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
          >
            Redefinir todas as configurações
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <span className="text-3xl">{currentCategory?.icon}</span>
              {currentCategory?.label}
            </h1>
            <p className="text-gray-400">
              {currentCategory?.settings.length} configurações
            </p>
          </div>

          {/* Settings list */}
          <div className="space-y-6">
            {currentCategory?.settings.map(setting => {
              const isModified = modifiedSettings.has(setting.key);
              const value = settings[setting.key] ?? setting.default;

              return (
                <div
                  key={setting.key}
                  className="pb-6 border-b border-gray-700 last:border-0"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium">{setting.title}</h3>
                        {isModified && (
                          <span className="px-2 py-0.5 bg-blue-600 text-xs rounded">
                            Alterado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {setting.description}
                      </p>
                      <code className="text-xs text-gray-500 font-mono">
                        {setting.key}
                      </code>
                    </div>
                    {isModified && (
                      <button
                        onClick={() => resetSetting(setting.key)}
                        className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        Redefinir
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {renderSettingInput(setting)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {currentCategory?.settings.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>Nenhuma configuração encontrada para &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
