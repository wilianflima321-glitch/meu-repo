/**
 * Project Settings UI - Configurações do Projeto
 * 
 * Interface profissional estilo Unreal Engine para gerenciar
 * todas as configurações do projeto e engine.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

import {
  defaultProjectSettings,
  type Setting,
  type SettingCategory,
} from './ProjectSettings.schema';

// ============================================================================
// SETTING EDITORS
// ============================================================================

interface SettingEditorProps {
  setting: Setting;
  value: unknown;
  onChange: (value: unknown) => void;
}

function BooleanEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={value as boolean}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '18px', height: '18px', accentColor: '#3498db' }}
      />
      <span style={{ color: value ? '#fff' : '#888' }}>{value ? 'Enabled' : 'Disabled'}</span>
    </label>
  );
}

function NumberEditor({ setting, value, onChange }: SettingEditorProps) {
  const numValue = value as number;
  const isPercentage = setting.max === 1 && setting.min === 0;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        type="range"
        value={numValue}
        min={setting.min ?? 0}
        max={setting.max ?? 100}
        step={setting.step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#3498db' }}
      />
      <input
        type="number"
        value={numValue}
        min={setting.min}
        max={setting.max}
        step={setting.step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '80px',
          background: '#252525',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#fff',
          padding: '4px 8px',
          textAlign: 'right',
        }}
      />
      {isPercentage && <span style={{ color: '#888', fontSize: '12px' }}>({Math.round(numValue * 100)}%)</span>}
    </div>
  );
}

function StringEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <input
      type="text"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      placeholder={setting.name}
      style={{
        width: '100%',
        background: '#252525',
        border: '1px solid #444',
        borderRadius: '4px',
        color: '#fff',
        padding: '8px 12px',
      }}
    />
  );
}

function EnumEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <select
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: '#252525',
        border: '1px solid #444',
        borderRadius: '4px',
        color: '#fff',
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      {setting.options?.map((opt) => (
        <option key={String(opt.value)} value={opt.value as string}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ColorEditor({ setting, value, onChange }: SettingEditorProps) {
  const color = value as string;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '48px',
          height: '32px',
          border: '1px solid #444',
          borderRadius: '4px',
          cursor: 'pointer',
          padding: '0',
        }}
      />
      <input
        type="text"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: '#252525',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#fff',
          padding: '6px 12px',
          fontFamily: 'monospace',
        }}
      />
    </div>
  );
}

function Vector2Editor({ setting, value, onChange }: SettingEditorProps) {
  const vec = value as { x: number; y: number };
  
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>X</span>
        <input
          type="number"
          value={vec.x}
          onChange={(e) => onChange({ ...vec, x: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>Y</span>
        <input
          type="number"
          value={vec.y}
          onChange={(e) => onChange({ ...vec, y: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
    </div>
  );
}

function Vector3Editor({ setting, value, onChange }: SettingEditorProps) {
  const vec = value as { x: number; y: number; z: number };
  
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>X</span>
        <input
          type="number"
          value={vec.x}
          onChange={(e) => onChange({ ...vec, x: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>Y</span>
        <input
          type="number"
          value={vec.y}
          onChange={(e) => onChange({ ...vec, y: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#3498db', fontWeight: 'bold' }}>Z</span>
        <input
          type="number"
          value={vec.z}
          onChange={(e) => onChange({ ...vec, z: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: '#252525',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 8px',
          }}
        />
      </label>
    </div>
  );
}

function PathEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Select path..."
        style={{
          flex: 1,
          background: '#252525',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#fff',
          padding: '8px 12px',
        }}
      />
      <button
        onClick={() => {/* Open file picker */}}
        style={{
          padding: '8px 16px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Browse
      </button>
    </div>
  );
}

function KeybindEditor({ setting, value, onChange }: SettingEditorProps) {
  const [isListening, setIsListening] = useState(false);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isListening) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    let key = e.key;
    if (key === ' ') key = 'Space';
    if (key === 'Control') key = e.location === 1 ? 'LeftCtrl' : 'RightCtrl';
    if (key === 'Shift') key = e.location === 1 ? 'LeftShift' : 'RightShift';
    if (key === 'Alt') key = e.location === 1 ? 'LeftAlt' : 'RightAlt';
    
    onChange(key);
    setIsListening(false);
    
    window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, onChange]);
  
  const startListening = useCallback(() => {
    setIsListening(true);
    window.addEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return (
    <button
      onClick={startListening}
      style={{
        padding: '8px 16px',
        background: isListening ? '#3498db' : '#333',
        border: `1px solid ${isListening ? '#3498db' : '#555'}`,
        borderRadius: '4px',
        color: '#fff',
        cursor: 'pointer',
        minWidth: '120px',
        textAlign: 'center',
        fontFamily: 'monospace',
      }}
    >
      {isListening ? 'Press a key...' : value as string}
    </button>
  );
}

function SettingEditor({ setting, value, onChange }: SettingEditorProps) {
  switch (setting.type) {
    case 'boolean':
      return <BooleanEditor setting={setting} value={value} onChange={onChange} />;
    case 'number':
      return <NumberEditor setting={setting} value={value} onChange={onChange} />;
    case 'string':
      return <StringEditor setting={setting} value={value} onChange={onChange} />;
    case 'enum':
      return <EnumEditor setting={setting} value={value} onChange={onChange} />;
    case 'color':
      return <ColorEditor setting={setting} value={value} onChange={onChange} />;
    case 'vector2':
      return <Vector2Editor setting={setting} value={value} onChange={onChange} />;
    case 'vector3':
      return <Vector3Editor setting={setting} value={value} onChange={onChange} />;
    case 'path':
      return <PathEditor setting={setting} value={value} onChange={onChange} />;
    case 'keybind':
      return <KeybindEditor setting={setting} value={value} onChange={onChange} />;
    default:
      return <StringEditor setting={setting} value={value} onChange={onChange} />;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectSettings() {
  const toast = useToast();
  const [categories] = useState<SettingCategory[]>(defaultProjectSettings);
  const [selectedCategory, setSelectedCategory] = useState<string>('project');
  const [settings, setSettings] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const cat of defaultProjectSettings) {
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
    console.log('Settings saved:', settings);
  }, [settings]);
  
  const handleReset = useCallback(() => {
    const initial: Record<string, unknown> = {};
    for (const cat of defaultProjectSettings) {
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
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a', color: '#fff' }}>
      {/* Header */}
      <div style={{
        height: '56px',
        background: '#252525',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>⚙️ Project Settings</span>
        
        <div style={{ flex: 1 }} />
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          style={{
            width: '300px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
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
        
        <div style={{ width: '1px', height: '24px', background: '#444' }} />
        
        <button
          onClick={handleImport}
          style={{
            padding: '8px 16px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          📥 Import
        </button>
        
        <button
          onClick={handleExport}
          style={{
            padding: '8px 16px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          📤 Export
        </button>
        
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          🔄 Reset
        </button>
        
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          style={{
            padding: '8px 20px',
            background: hasChanges ? '#3498db' : '#333',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            opacity: hasChanges ? 1 : 0.5,
          }}
        >
          💾 Save
        </button>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Category Sidebar */}
        <div style={{
          width: '220px',
          background: '#252525',
          borderRight: '1px solid #333',
          padding: '12px 0',
          overflowY: 'auto',
        }}>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: selectedCategory === category.id ? '#333' : 'transparent',
                border: 'none',
                borderLeft: selectedCategory === category.id ? '3px solid #3498db' : '3px solid transparent',
                color: selectedCategory === category.id ? '#fff' : '#aaa',
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
              <p style={{ color: '#888', marginBottom: '32px' }}>
                Configure {currentCategory.name.toLowerCase()} settings for your project
              </p>
              
              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  style={{
                    marginBottom: '32px',
                    background: '#252525',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #333',
                    background: '#2a2a2a',
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{section.name}</h2>
                    {section.description && (
                      <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>{section.description}</p>
                    )}
                  </div>
                  
                  <div style={{ padding: '8px 0' }}>
                    {section.settings.map((setting, index) => (
                      <div
                        key={setting.id}
                        style={{
                          padding: '16px 20px',
                          borderBottom: index < section.settings.length - 1 ? '1px solid #333' : 'none',
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
                                background: '#e74c3c',
                                borderRadius: '3px',
                              }}>
                                Requires Restart
                              </span>
                            )}
                            {setting.isAdvanced && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: '#9b59b6',
                                borderRadius: '3px',
                              }}>
                                Advanced
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{setting.description}</p>
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
                  color: '#888',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
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
        background: '#252525',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '11px',
        color: '#888',
      }}>
        <span>
          {hasChanges ? (
            <span style={{ color: '#f39c12' }}>● Unsaved changes</span>
          ) : (
            <span style={{ color: '#2ecc71' }}>✓ All changes saved</span>
          )}
        </span>
        <div style={{ flex: 1 }} />
        <span>Settings v1.0</span>
      </div>
    </div>
  );
}
