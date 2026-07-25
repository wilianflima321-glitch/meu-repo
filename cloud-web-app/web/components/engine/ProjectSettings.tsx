'use client';

/**
 * Project Settings UI
 *
 * Professional Unreal-style interface for managing
 * project and engine configuration.
 *
 * Production-oriented project settings surface.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Settings, Upload, Download, RotateCcw, Save, Search, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createComponentLogger } from '@/lib/observability/logger'
import { defaultSettings, type Setting, type SettingCategory } from './project-settings-model'
import { SettingEditor } from './ProjectSettingsEditors'

const log = createComponentLogger('ProjectSettings')


export default function ProjectSettings() {
  const toast = useToast();
  const [categories] = useState<SettingCategory[]>(defaultSettings);
  const [selectedCategory, setSelectedCategory] = useState<string>('project');
  const [settings, setSettings] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const cat of defaultSettings) {
      for (const section of cat.sections) {
        for (const setting of section.settings) {
          initial[setting.id] = setting.value;
        }
      }
    }
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategory),
    [categories, selectedCategory]
  );

  const filteredSections = useMemo(() => {
    if (!currentCategory) return [];

    return currentCategory.sections
      .map((section) => ({
        ...section,
        settings: section.settings.filter((setting) => {
          if (!showAdvanced && setting.isAdvanced) return false;
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
              setting.name.toLowerCase().includes(query) ||
              setting.description.toLowerCase().includes(query)
            );
          }
          return true;
        }),
      }))
      .filter((section) => section.settings.length > 0);
  }, [currentCategory, searchQuery, showAdvanced]);

  const handleSettingChange = useCallback((id: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [id]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    // Save settings to localStorage or backend
    localStorage.setItem('aethel_project_settings', JSON.stringify(settings));
    setHasChanges(false);
    log.info('Settings saved:', settings);
  }, [settings]);

  const handleReset = useCallback(() => {
    const initial: Record<string, unknown> = {};
    for (const cat of defaultSettings) {
      for (const section of cat.sections) {
        for (const setting of section.settings) {
          initial[setting.id] = setting.value;
        }
      }
    }
    setSettings(initial);
    setHasChanges(true);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const imported = JSON.parse(text);
          setSettings((prev) => ({ ...prev, ...imported }));
          setHasChanges(true);
        } catch {
          toast.error('Invalid settings file');
        }
      }
    };
    input.click();
  }, [toast]);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--aethel-surface-primary)', color: 'var(--aethel-text-primary)' }}>
      {/* Header */}
      <div style={{
        height: '56px',
        background: 'var(--aethel-surface-tertiary)',
        borderBottom: '1px solid var(--aethel-border-primary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings className="w-4 h-4 text-indigo-400" /> Project Settings
        </span>

        <div style={{ flex: 1 }} />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          style={{
            width: '300px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            padding: '8px 12px',
          }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
          />
          Show Advanced
        </label>

        <div style={{ width: '1px', height: '24px', background: 'var(--aethel-border-primary)' }} />

        <button type="button" aria-label="Import project settings"
          onClick={handleImport}
          className="inline-flex items-center gap-1.5"
          style={{
            padding: '8px 16px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-secondary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
          }}
        >
          <Upload className="w-3.5 h-3.5" /> Import
        </button>

        <button type="button" aria-label="Export project settings"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5"
          style={{
            padding: '8px 16px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-secondary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
          }}
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>

        <button type="button" aria-label="Reset project settings"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5"
          style={{
            padding: '8px 16px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-secondary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>

        <button type="button" aria-label="Save project settings"
          onClick={handleSave}
          disabled={!hasChanges}
          className="inline-flex items-center gap-1.5"
          style={{
            padding: '8px 20px',
            background: hasChanges ? 'var(--aethel-primary)' : 'var(--aethel-surface-quaternary)',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            opacity: hasChanges ? 1 : 0.5,
          }}
        >
          <Save className="w-3.5 h-3.5" /> Save
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Category Sidebar */}
        <div style={{
          width: '220px',
          background: 'var(--aethel-surface-tertiary)',
          borderRight: '1px solid var(--aethel-border-primary)',
          padding: '12px 0',
          overflowY: 'auto',
        }}>
          {categories.map((category) => (
            <button type="button" aria-label={`Open ${category.name} project settings`}
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: selectedCategory === category.id ? 'var(--aethel-surface-quaternary)' : 'transparent',
                border: 'none',
                borderLeft: selectedCategory === category.id ? '3px solid var(--aethel-primary)' : '3px solid transparent',
                color: selectedCategory === category.id ? 'var(--aethel-text-primary)' : 'var(--aethel-text-tertiary)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '18px' }}>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Settings Panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {currentCategory && (
            <>
              <h1 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>{currentCategory.icon}</span>
                {currentCategory.name}
              </h1>
              <p style={{ color: 'var(--aethel-text-quaternary)', marginBottom: '32px' }}>
                Configure {currentCategory.name.toLowerCase()} settings for your project
              </p>

              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  style={{
                    marginBottom: '32px',
                    background: 'var(--aethel-surface-tertiary)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--aethel-border-primary)',
                    background: 'var(--aethel-surface-tertiary)',
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{section.name}</h2>
                    {section.description && (
                      <p style={{ fontSize: '12px', color: 'var(--aethel-text-quaternary)', margin: '4px 0 0 0' }}>{section.description}</p>
                    )}
                  </div>

                  <div style={{ padding: '8px 0' }}>
                    {section.settings.map((setting, index) => (
                      <div
                        key={setting.id}
                        style={{
                          padding: '16px 20px',
                          borderBottom: index < section.settings.length - 1 ? '1px solid var(--aethel-border-primary)' : 'none',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '20px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>{setting.name}</span>
                            {setting.requiresRestart && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: 'var(--aethel-error)',
                                borderRadius: '3px',
                              }}>
                                Requires Restart
                              </span>
                            )}
                            {setting.isAdvanced && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: 'var(--aethel-accent)',
                                borderRadius: '3px',
                              }}>
                                Advanced
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--aethel-text-quaternary)', margin: 0 }}>{setting.description}</p>
                        </div>

                        <div style={{ flex: 1, maxWidth: '400px' }}>
                          <SettingEditor
                            setting={setting}
                            value={settings[setting.id]}
                            onChange={(value) => handleSettingChange(setting.id, value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredSections.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '48px',
                  color: 'var(--aethel-text-quaternary)',
                }}>
                  <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p>No settings found matching your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div style={{
        height: '28px',
        background: 'var(--aethel-surface-tertiary)',
        borderTop: '1px solid var(--aethel-border-primary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '11px',
        color: 'var(--aethel-text-quaternary)',
      }}>
        <span>
          {hasChanges ? (
            <span style={{ color: 'var(--aethel-warning)' }}>● Unsaved changes</span>
          ) : (
            <span style={{ color: 'var(--aethel-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle className="w-3 h-3" /> All changes saved
            </span>
          )}
        </span>
        <div style={{ flex: 1 }} />
        <span>Settings v1.0</span>
      </div>
    </div>
  );
}
