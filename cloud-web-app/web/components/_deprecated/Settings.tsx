'use client';

import React, { useState, useEffect } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 14,
    autoSave: true,
    wordWrap: true,
    tabSize: 2,
    insertSpaces: true,
    aiProvider: 'manus',
    model: 'gpt-4',
    notifications: true,
    telemetry: false,
    keyboardShortcuts: 'default'
  });

  const [activeSection, setActiveSection] = useState('appearance');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('aethel-settings');
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    }
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('aethel-settings', JSON.stringify(settings));
    setHasUnsavedChanges(false);
    // Show success notification
    console.log('Settings saved successfully');
  };

  const handleReset = () => {
    const defaultSettings = {
      theme: 'dark',
      fontSize: 14,
      autoSave: true,
      wordWrap: true,
      tabSize: 2,
      insertSpaces: true,
      aiProvider: 'manus',
      model: 'gpt-4',
      notifications: true,
      telemetry: false,
      keyboardShortcuts: 'default'
    };
    setSettings(defaultSettings);
    setHasUnsavedChanges(true);
  };

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: '' },
    { id: 'editor', label: 'Editor', icon: '' },
    { id: 'ai', label: 'AI & ML', icon: '' },
    { id: 'workspace', label: 'Workspace', icon: '' },
    { id: 'extensions', label: 'Extensions', icon: '' },
    { id: 'privacy', label: 'Privacy', icon: '' },
  ];

  return (
    <div className="aethel-panel aethel-flex h-full">
      {/* Sidebar */}
      <div className="aethel-sidebar w-64 border-r border-slate-600">
        <div className="aethel-sidebar-header">
          <div className="aethel-flex aethel-items-center aethel-gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-sky-500 to-cyan-500 rounded aethel-flex aethel-items-center aethel-justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Settings</span>
          </div>
        </div>

        <div className="aethel-sidebar-nav aethel-space-y-1">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`aethel-sidebar-item aethel-w-full ${activeSection === section.id ? 'active' : ''}`}
            >
              {section.icon ? <span className="aethel-sidebar-icon">{section.icon}</span> : null}
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="aethel-flex-1 aethel-flex aethel-flex-col">
        <div className="aethel-panel-header aethel-flex aethel-items-center aethel-justify-between">
          <h2 className="text-xl font-semibold">
            {sections.find(s => s.id === activeSection)?.label}
          </h2>
          <div className="aethel-flex aethel-items-center aethel-gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleReset}
              className="aethel-button aethel-button-secondary"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="aethel-button aethel-button-primary"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="aethel-panel-content aethel-space-y-6">
          {activeSection === 'appearance' && (
            <div className="aethel-space-y-6">
              <div className="aethel-card">
                <h3 className="text-lg font-semibold aethel-mb-4">Theme & Appearance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Color Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => updateSetting('theme', e.target.value)}
                      className="aethel-input"
                    >
                      <option value="dark">Dark (Professional)</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto (System)</option>
                      <option value="high-contrast">High Contrast</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Font Size</label>
                    <div className="aethel-flex aethel-items-center aethel-gap-4">
                      <input
                        type="range"
                        min="10"
                        max="24"
                        value={settings.fontSize}
                        onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                        className="aethel-flex-1"
                      />
                      <span className="text-sm font-mono bg-slate-700 px-2 py-1 rounded min-w-[3rem] text-center">
                        {settings.fontSize}px
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'editor' && (
            <div className="aethel-space-y-6">
              <div className="aethel-card">
                <h3 className="text-lg font-semibold aethel-mb-4">Text Editor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Tab Size</label>
                    <select
                      value={settings.tabSize}
                      onChange={(e) => updateSetting('tabSize', Number(e.target.value))}
                      className="aethel-input"
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                      <option value={8}>8 spaces</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Insert Spaces</label>
                    <div className="aethel-flex aethel-items-center aethel-gap-3">
                      <input
                        type="checkbox"
                        checked={settings.insertSpaces}
                        onChange={(e) => updateSetting('insertSpaces', e.target.checked)}
                        className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm">Use spaces instead of tabs</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 aethel-mt-6">
                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Word Wrap</label>
                    <div className="aethel-flex aethel-items-center aethel-gap-3">
                      <input
                        type="checkbox"
                        checked={settings.wordWrap}
                        onChange={(e) => updateSetting('wordWrap', e.target.checked)}
                        className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm">Wrap long lines</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Auto Save</label>
                    <div className="aethel-flex aethel-items-center aethel-gap-3">
                      <input
                        type="checkbox"
                        checked={settings.autoSave}
                        onChange={(e) => updateSetting('autoSave', e.target.checked)}
                        className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm">Automatically save files</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'ai' && (
            <div className="aethel-space-y-6">
              <div className="aethel-card">
                <h3 className="text-lg font-semibold aethel-mb-4">AI Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">AI Provider</label>
                    <select
                      value={settings.aiProvider}
                      onChange={(e) => updateSetting('aiProvider', e.target.value)}
                      className="aethel-input"
                    >
                      <option value="manus">Manus (Primary)</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="google">Google Gemini</option>
                      <option value="huggingface">Hugging Face</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Model</label>
                    <select
                      value={settings.model}
                      onChange={(e) => updateSetting('model', e.target.value)}
                      className="aethel-input"
                    >
                      <option value="gpt-4">GPT-4 Turbo</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="claude-3">Claude 3 Opus</option>
                      <option value="gemini-pro">Gemini Pro</option>
                      <option value="manus-ai">Manus AI</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'workspace' && (
            <div className="aethel-space-y-6">
              <div className="aethel-card">
                <h3 className="text-lg font-semibold aethel-mb-4">Workspace Preferences</h3>
                <div className="aethel-space-y-4">
                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Keyboard Shortcuts</label>
                    <select
                      value={settings.keyboardShortcuts}
                      onChange={(e) => updateSetting('keyboardShortcuts', e.target.value)}
                      className="aethel-input"
                    >
                      <option value="default">Default (VSCode-like)</option>
                      <option value="vim">Vim</option>
                      <option value="emacs">Emacs</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Notifications</label>
                    <div className="aethel-flex aethel-items-center aethel-gap-3">
                      <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => updateSetting('notifications', e.target.checked)}
                        className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm">Enable desktop notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'extensions' && (
            <div className="aethel-space-y-6">
              <div className="aethel-card">
                <h3 className="text-lg font-semibold aethel-mb-4">Extension Management</h3>
                <div className="text-center aethel-py-8">
                  <div className="w-16 h-16 bg-slate-700 rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-slate-300 aethel-mb-2">Extension Marketplace</h4>
                  <p className="text-slate-400">Browse and install extensions to enhance Aethel IDE</p>
                  <button className="aethel-button aethel-button-primary aethel-mt-4">
                    Open Marketplace
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="aethel-space-y-6">
              <div className="aethel-card">
                <h3 className="text-lg font-semibold aethel-mb-4">Privacy & Telemetry</h3>
                <div className="aethel-space-y-4">
                  <div>
                    <label className="block text-sm font-medium aethel-mb-2">Telemetry</label>
                    <div className="aethel-flex aethel-items-center aethel-gap-3">
                      <input
                        type="checkbox"
                        checked={settings.telemetry}
                        onChange={(e) => updateSetting('telemetry', e.target.checked)}
                        className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                      />
                      <div>
                        <span className="text-sm">Send anonymous usage data</span>
                        <p className="text-xs text-slate-400">Help improve Aethel by sharing crash reports and feature usage</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
