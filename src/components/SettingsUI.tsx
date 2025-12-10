import React, { useState, useEffect } from 'react';
import { SettingsService } from '../services/SettingsService';
import { EventBus } from '../services/EventBus';

interface Setting {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'color';
  value: any;
  options?: string[];
  min?: number;
  max?: number;
  category: string;
}

export const SettingsUI: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(new Set());

  const categories = [
    'all',
    'editor',
    'workbench',
    'terminal',
    'debug',
    'git',
    'extensions',
    'search',
    'files',
    'keyboard'
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const settingsService = SettingsService.getInstance();
    const allSettings = settingsService.getAllSettings();

    const settingsArray: Setting[] = [
      // Editor settings
      { key: 'editor.fontSize', label: 'Font Size', description: 'Controls the font size in pixels', type: 'number', value: allSettings['editor.fontSize'] || 14, min: 8, max: 32, category: 'editor' },
      { key: 'editor.fontFamily', label: 'Font Family', description: 'Controls the font family', type: 'string', value: allSettings['editor.fontFamily'] || 'Consolas, monospace', category: 'editor' },
      { key: 'editor.lineHeight', label: 'Line Height', description: 'Controls the line height', type: 'number', value: allSettings['editor.lineHeight'] || 1.5, min: 1, max: 3, category: 'editor' },
      { key: 'editor.tabSize', label: 'Tab Size', description: 'Number of spaces a tab equals', type: 'number', value: allSettings['editor.tabSize'] || 4, min: 1, max: 8, category: 'editor' },
      { key: 'editor.insertSpaces', label: 'Insert Spaces', description: 'Insert spaces when pressing Tab', type: 'boolean', value: allSettings['editor.insertSpaces'] !== false, category: 'editor' },
      { key: 'editor.wordWrap', label: 'Word Wrap', description: 'Controls how lines should wrap', type: 'select', value: allSettings['editor.wordWrap'] || 'off', options: ['off', 'on', 'wordWrapColumn', 'bounded'], category: 'editor' },
      { key: 'editor.minimap.enabled', label: 'Minimap Enabled', description: 'Controls whether the minimap is shown', type: 'boolean', value: allSettings['editor.minimap.enabled'] !== false, category: 'editor' },
      { key: 'editor.lineNumbers', label: 'Line Numbers', description: 'Controls the display of line numbers', type: 'select', value: allSettings['editor.lineNumbers'] || 'on', options: ['on', 'off', 'relative'], category: 'editor' },
      { key: 'editor.renderWhitespace', label: 'Render Whitespace', description: 'Controls how whitespace is rendered', type: 'select', value: allSettings['editor.renderWhitespace'] || 'selection', options: ['none', 'boundary', 'selection', 'all'], category: 'editor' },
      { key: 'editor.cursorStyle', label: 'Cursor Style', description: 'Controls the cursor style', type: 'select', value: allSettings['editor.cursorStyle'] || 'line', options: ['line', 'block', 'underline'], category: 'editor' },
      { key: 'editor.cursorBlinking', label: 'Cursor Blinking', description: 'Controls the cursor animation style', type: 'select', value: allSettings['editor.cursorBlinking'] || 'blink', options: ['blink', 'smooth', 'phase', 'expand', 'solid'], category: 'editor' },
      { key: 'editor.autoSave', label: 'Auto Save', description: 'Controls auto save of dirty files', type: 'select', value: allSettings['editor.autoSave'] || 'off', options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'], category: 'editor' },
      { key: 'editor.formatOnSave', label: 'Format On Save', description: 'Format a file on save', type: 'boolean', value: allSettings['editor.formatOnSave'] === true, category: 'editor' },
      { key: 'editor.formatOnPaste', label: 'Format On Paste', description: 'Format the pasted content', type: 'boolean', value: allSettings['editor.formatOnPaste'] === true, category: 'editor' },

      // Workbench settings
      { key: 'workbench.colorTheme', label: 'Color Theme', description: 'Specifies the color theme', type: 'select', value: allSettings['workbench.colorTheme'] || 'dark', options: ['dark', 'light', 'high-contrast'], category: 'workbench' },
      { key: 'workbench.iconTheme', label: 'Icon Theme', description: 'Specifies the icon theme', type: 'select', value: allSettings['workbench.iconTheme'] || 'default', options: ['default', 'minimal', 'none'], category: 'workbench' },
      { key: 'workbench.sideBar.location', label: 'Sidebar Location', description: 'Controls the location of the sidebar', type: 'select', value: allSettings['workbench.sideBar.location'] || 'left', options: ['left', 'right'], category: 'workbench' },
      { key: 'workbench.activityBar.visible', label: 'Activity Bar Visible', description: 'Controls the visibility of the activity bar', type: 'boolean', value: allSettings['workbench.activityBar.visible'] !== false, category: 'workbench' },
      { key: 'workbench.statusBar.visible', label: 'Status Bar Visible', description: 'Controls the visibility of the status bar', type: 'boolean', value: allSettings['workbench.statusBar.visible'] !== false, category: 'workbench' },

      // Terminal settings
      { key: 'terminal.integrated.fontSize', label: 'Terminal Font Size', description: 'Controls the font size in the terminal', type: 'number', value: allSettings['terminal.integrated.fontSize'] || 14, min: 8, max: 32, category: 'terminal' },
      { key: 'terminal.integrated.fontFamily', label: 'Terminal Font Family', description: 'Controls the font family in the terminal', type: 'string', value: allSettings['terminal.integrated.fontFamily'] || 'monospace', category: 'terminal' },
      { key: 'terminal.integrated.cursorStyle', label: 'Terminal Cursor Style', description: 'Controls the cursor style in the terminal', type: 'select', value: allSettings['terminal.integrated.cursorStyle'] || 'block', options: ['block', 'line', 'underline'], category: 'terminal' },
      { key: 'terminal.integrated.cursorBlinking', label: 'Terminal Cursor Blinking', description: 'Controls whether the cursor blinks', type: 'boolean', value: allSettings['terminal.integrated.cursorBlinking'] === true, category: 'terminal' },
      { key: 'terminal.integrated.scrollback', label: 'Terminal Scrollback', description: 'Controls the maximum number of lines', type: 'number', value: allSettings['terminal.integrated.scrollback'] || 1000, min: 0, max: 10000, category: 'terminal' },

      // Files settings
      { key: 'files.autoSave', label: 'Auto Save Files', description: 'Controls auto save of dirty files', type: 'select', value: allSettings['files.autoSave'] || 'off', options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'], category: 'files' },
      { key: 'files.autoSaveDelay', label: 'Auto Save Delay', description: 'Controls the delay in ms after which a dirty file is saved', type: 'number', value: allSettings['files.autoSaveDelay'] || 1000, min: 0, max: 10000, category: 'files' },
      { key: 'files.encoding', label: 'Files Encoding', description: 'The default character set encoding', type: 'select', value: allSettings['files.encoding'] || 'utf8', options: ['utf8', 'utf16le', 'utf16be', 'windows1252', 'iso88591'], category: 'files' },
      { key: 'files.eol', label: 'End of Line', description: 'The default end of line character', type: 'select', value: allSettings['files.eol'] || 'auto', options: ['auto', '\\n', '\\r\\n'], category: 'files' },
      { key: 'files.trimTrailingWhitespace', label: 'Trim Trailing Whitespace', description: 'Trim trailing whitespace when saving', type: 'boolean', value: allSettings['files.trimTrailingWhitespace'] === true, category: 'files' },
      { key: 'files.insertFinalNewline', label: 'Insert Final Newline', description: 'Insert a final newline at the end of the file', type: 'boolean', value: allSettings['files.insertFinalNewline'] === true, category: 'files' },

      // Search settings
      { key: 'search.exclude', label: 'Search Exclude', description: 'Configure glob patterns for excluding files', type: 'string', value: allSettings['search.exclude'] || '**/node_modules, **/dist', category: 'search' },
      { key: 'search.followSymlinks', label: 'Follow Symlinks', description: 'Controls whether to follow symlinks', type: 'boolean', value: allSettings['search.followSymlinks'] !== false, category: 'search' },
      { key: 'search.useIgnoreFiles', label: 'Use Ignore Files', description: 'Controls whether to use .gitignore', type: 'boolean', value: allSettings['search.useIgnoreFiles'] !== false, category: 'search' },

      // Git settings
      { key: 'git.enabled', label: 'Git Enabled', description: 'Whether git is enabled', type: 'boolean', value: allSettings['git.enabled'] !== false, category: 'git' },
      { key: 'git.autoFetch', label: 'Auto Fetch', description: 'Whether to automatically fetch from remote', type: 'boolean', value: allSettings['git.autoFetch'] === true, category: 'git' },
      { key: 'git.autofetchPeriod', label: 'Auto Fetch Period', description: 'Period in seconds for auto fetch', type: 'number', value: allSettings['git.autofetchPeriod'] || 180, min: 0, max: 3600, category: 'git' },
      { key: 'git.confirmSync', label: 'Confirm Sync', description: 'Confirm before synchronizing', type: 'boolean', value: allSettings['git.confirmSync'] !== false, category: 'git' },

      // Debug settings
      { key: 'debug.console.fontSize', label: 'Debug Console Font Size', description: 'Controls the font size in the debug console', type: 'number', value: allSettings['debug.console.fontSize'] || 14, min: 8, max: 32, category: 'debug' },
      { key: 'debug.inlineValues', label: 'Inline Values', description: 'Show variable values inline', type: 'boolean', value: allSettings['debug.inlineValues'] === true, category: 'debug' },
      { key: 'debug.openDebug', label: 'Open Debug', description: 'Controls when to open debug view', type: 'select', value: allSettings['debug.openDebug'] || 'openOnDebugBreak', options: ['neverOpen', 'openOnSessionStart', 'openOnFirstSessionStart', 'openOnDebugBreak'], category: 'debug' },
    ];

    setSettings(settingsArray);
  };

  const filteredSettings = settings.filter(setting => {
    const matchesSearch = setting.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         setting.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         setting.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || setting.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSettingChange = (key: string, value: any) => {
    const settingsService = SettingsService.getInstance();
    settingsService.setSetting(key, value);
    
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    setModifiedSettings(prev => new Set(prev).add(key));
    
    EventBus.getInstance().emit('settings:changed', { key, value });
  };

  const renderSettingControl = (setting: Setting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            min={setting.min}
            max={setting.max}
            onChange={(e) => handleSettingChange(setting.key, Number(e.target.value))}
          />
        );
      case 'string':
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          />
        );
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          >
            {setting.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'color':
        return (
          <input
            type="color"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-ui">
      <div className="settings-header">
        <h1>Settings</h1>
        <input
          type="text"
          className="search-input"
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          {categories.map(category => (
            <div
              key={category}
              className={`category-item ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </div>
          ))}
        </div>

        <div className="settings-main">
          {filteredSettings.map(setting => (
            <div key={setting.key} className={`setting-item ${modifiedSettings.has(setting.key) ? 'modified' : ''}`}>
              <div className="setting-info">
                <div className="setting-label">{setting.label}</div>
                <div className="setting-description">{setting.description}</div>
                <div className="setting-key">{setting.key}</div>
              </div>
              <div className="setting-control">
                {renderSettingControl(setting)}
              </div>
            </div>
          ))}
          {filteredSettings.length === 0 && (
            <div className="no-results">No settings found</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-ui {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        .settings-header {
          padding: 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .settings-header h1 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 400;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 14px;
        }

        .search-input:focus {
          border-color: var(--vscode-focusBorder);
        }

        .settings-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .settings-sidebar {
          width: 200px;
          border-right: 1px solid var(--vscode-panel-border);
          overflow-y: auto;
        }

        .category-item {
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
        }

        .category-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .category-item.active {
          background: var(--vscode-list-activeSelectionBackground);
          color: var(--vscode-list-activeSelectionForeground);
        }

        .settings-main {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .setting-item.modified {
          background: var(--vscode-diffEditor-insertedTextBackground);
        }

        .setting-info {
          flex: 1;
          margin-right: 20px;
        }

        .setting-label {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .setting-description {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 4px;
        }

        .setting-key {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          font-family: monospace;
        }

        .setting-control {
          min-width: 200px;
        }

        .setting-control input[type="text"],
        .setting-control input[type="number"],
        .setting-control select {
          width: 100%;
          padding: 4px 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 13px;
        }

        .setting-control input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .setting-control input:focus,
        .setting-control select:focus {
          border-color: var(--vscode-focusBorder);
        }

        .no-results {
          padding: 40px;
          text-align: center;
          color: var(--vscode-descriptionForeground);
        }
      `}</style>
    </div>
  );
};
