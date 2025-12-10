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
    icon: '📝',
    settings: [
      {
        key: 'editor.fontSize',
        title: 'Font Size',
        description: 'Controls the font size in pixels',
        type: 'number',
        default: 14,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.fontFamily',
        title: 'Font Family',
        description: 'Controls the font family',
        type: 'string',
        default: 'Consolas, "Courier New", monospace',
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.tabSize',
        title: 'Tab Size',
        description: 'The number of spaces a tab is equal to',
        type: 'number',
        default: 4,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.insertSpaces',
        title: 'Insert Spaces',
        description: 'Insert spaces when pressing Tab',
        type: 'boolean',
        default: true,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.wordWrap',
        title: 'Word Wrap',
        description: 'Controls how lines should wrap',
        type: 'enum',
        enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
        default: 'off',
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.minimap.enabled',
        title: 'Minimap Enabled',
        description: 'Controls whether the minimap is shown',
        type: 'boolean',
        default: true,
        category: 'editor',
        scope: 'both',
      },
      {
        key: 'editor.lineNumbers',
        title: 'Line Numbers',
        description: 'Controls the display of line numbers',
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
    label: 'Workbench',
    icon: '🎨',
    settings: [
      {
        key: 'workbench.colorTheme',
        title: 'Color Theme',
        description: 'Specifies the color theme used in the workbench',
        type: 'enum',
        enum: ['Dark+', 'Light+', 'Dark (Visual Studio)', 'Light (Visual Studio)', 'High Contrast'],
        default: 'Dark+',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.iconTheme',
        title: 'Icon Theme',
        description: 'Specifies the icon theme used in the workbench',
        type: 'enum',
        enum: ['vs-seti', 'vs-minimal', 'None'],
        default: 'vs-seti',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.sideBar.location',
        title: 'Side Bar Location',
        description: 'Controls the location of the sidebar',
        type: 'enum',
        enum: ['left', 'right'],
        default: 'left',
        category: 'workbench',
        scope: 'user',
      },
      {
        key: 'workbench.activityBar.visible',
        title: 'Activity Bar Visible',
        description: 'Controls the visibility of the activity bar',
        type: 'boolean',
        default: true,
        category: 'workbench',
        scope: 'user',
      },
    ],
  },
  {
    id: 'files',
    label: 'Files',
    icon: '📁',
    settings: [
      {
        key: 'files.autoSave',
        title: 'Auto Save',
        description: 'Controls auto save of dirty files',
        type: 'enum',
        enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
        default: 'off',
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.autoSaveDelay',
        title: 'Auto Save Delay',
        description: 'Controls the delay in ms after which a dirty file is saved automatically',
        type: 'number',
        default: 1000,
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.encoding',
        title: 'Encoding',
        description: 'The default character set encoding to use',
        type: 'enum',
        enum: ['utf8', 'utf16le', 'utf16be', 'windows1252', 'iso88591'],
        default: 'utf8',
        category: 'files',
        scope: 'both',
      },
      {
        key: 'files.eol',
        title: 'End of Line',
        description: 'The default end of line character',
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
        title: 'Font Size',
        description: 'Controls the font size in pixels of the terminal',
        type: 'number',
        default: 14,
        category: 'terminal',
        scope: 'both',
      },
      {
        key: 'terminal.integrated.fontFamily',
        title: 'Font Family',
        description: 'Controls the font family of the terminal',
        type: 'string',
        default: 'monospace',
        category: 'terminal',
        scope: 'both',
      },
      {
        key: 'terminal.integrated.shell.linux',
        title: 'Shell: Linux',
        description: 'The path of the shell that the terminal uses on Linux',
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
    icon: '🔀',
    settings: [
      {
        key: 'git.enabled',
        title: 'Enabled',
        description: 'Whether git is enabled',
        type: 'boolean',
        default: true,
        category: 'git',
        scope: 'both',
      },
      {
        key: 'git.autoFetch',
        title: 'Auto Fetch',
        description: 'Whether to automatically fetch from the remote',
        type: 'boolean',
        default: false,
        category: 'git',
        scope: 'both',
      },
      {
        key: 'git.confirmSync',
        title: 'Confirm Sync',
        description: 'Confirm before synchronizing git repositories',
        type: 'boolean',
        default: true,
        category: 'git',
        scope: 'both',
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI Features',
    icon: '🤖',
    settings: [
      {
        key: 'ai.enabled',
        title: 'AI Enabled',
        description: 'Enable AI-powered features',
        type: 'boolean',
        default: true,
        category: 'ai',
        scope: 'user',
      },
      {
        key: 'ai.completions.enabled',
        title: 'AI Completions',
        description: 'Enable AI-enhanced code completions',
        type: 'boolean',
        default: true,
        category: 'ai',
        scope: 'both',
      },
      {
        key: 'ai.debug.enabled',
        title: 'AI Debug Assistant',
        description: 'Enable AI debug assistance',
        type: 'boolean',
        default: true,
        category: 'ai',
        scope: 'both',
      },
      {
        key: 'ai.provider',
        title: 'AI Provider',
        description: 'Select AI provider',
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
  const [selectedCategory, setSelectedCategory] = useState<string>('editor');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<'user' | 'workspace'>('user');

  // Load settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      const stored = localStorage.getItem('ide-settings');
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
    };
    loadSettings();
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: Record<string, any>) => {
    localStorage.setItem('ide-settings', JSON.stringify(newSettings));
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
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
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
              {value ? 'Enabled' : 'Disabled'}
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
            Unsupported type: {setting.type}
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
            placeholder="Search settings..."
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
              User
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
                  {category.settings.length} settings
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
            Reset All Settings
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
              {currentCategory?.settings.length} settings
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
                            Modified
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
                        Reset
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
              <p>No settings found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
