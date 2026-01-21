'use client';

/**
 * Settings Panel Component
 * 
 * Interface completa para configurações com busca,
 * categorias, profiles e sync.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Search,
  User,
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  Undo,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  SettingsService,
  SETTING_CATEGORIES,
  SETTING_DEFINITIONS,
  DEFAULT_SETTINGS,
  UserProfile,
  SyncState,
  SettingDefinition,
} from '@/lib/settings/settings-service';

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  base: '#1e1e2e',
  surface0: '#313244',
  surface1: '#45475a',
  surface2: '#585b70',
  text: '#cdd6f4',
  subtext0: '#a6adc8',
  subtext1: '#bac2de',
  blue: '#89b4fa',
  green: '#a6e3a1',
  red: '#f38ba8',
  yellow: '#f9e2af',
  mauve: '#cba6f7',
  overlay0: '#6c7086',
};

// ============================================================================
// SETTING INPUT COMPONENT
// ============================================================================

interface SettingInputProps {
  settingKey: string;
  definition?: SettingDefinition;
  value: any;
  onChange: (value: any) => void;
  onReset: () => void;
  isModified: boolean;
}

const SettingInput: React.FC<SettingInputProps> = ({
  settingKey,
  definition,
  value,
  onChange,
  onReset,
  isModified,
}) => {
  const type = definition?.type || 'string';
  
  const renderInput = () => {
    switch (type) {
      case 'boolean':
        return (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.blue,
              }}
            />
            <span style={{ color: colors.text }}>
              {value ? 'Ativado' : 'Desativado'}
            </span>
          </label>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={definition?.minimum}
            max={definition?.maximum}
            style={{
              width: '120px',
              padding: '6px 10px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '14px',
            }}
          />
        );
      
      case 'enum':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              padding: '6px 10px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '14px',
              minWidth: '200px',
            }}
          >
            {definition?.enum?.map((opt, idx) => (
              <option key={opt} value={opt}>
                {opt}
                {definition.enumDescriptions?.[idx] && ` - ${definition.enumDescriptions[idx]}`}
              </option>
            ))}
          </select>
        );
      
      case 'object':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {}
            }}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '8px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '13px',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '6px 10px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '14px',
            }}
          />
        );
    }
  };
  
  return (
    <div
      style={{
        padding: '16px',
        borderBottom: `1px solid ${colors.surface0}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.text, fontWeight: 500 }}>{settingKey}</span>
            {isModified && (
              <span style={{
                padding: '2px 6px',
                background: colors.blue + '30',
                color: colors.blue,
                borderRadius: '4px',
                fontSize: '11px',
              }}>
                Modificado
              </span>
            )}
          </div>
          <p style={{ color: colors.subtext0, fontSize: '13px', margin: '4px 0 0' }}>
            {definition?.description || 'Sem descrição'}
          </p>
        </div>
        
        {isModified && (
          <button
            onClick={onReset}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: `1px solid ${colors.surface1}`,
              borderRadius: '4px',
              color: colors.subtext0,
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Undo size={12} />
            Resetar
          </button>
        )}
      </div>
      
      <div style={{ marginTop: '8px' }}>
        {renderInput()}
      </div>
    </div>
  );
};

// ============================================================================
// PROFILE CARD
// ============================================================================

interface ProfileCardProps {
  profile: UserProfile;
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, isActive, onActivate, onDelete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '16px',
        background: isActive ? colors.blue + '20' : colors.surface0,
        border: `1px solid ${isActive ? colors.blue : colors.surface1}`,
        borderRadius: '8px',
        cursor: 'pointer',
      }}
      onClick={onActivate}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: colors.surface1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={20} color={colors.text} />
          </div>
          <div>
            <div style={{ color: colors.text, fontWeight: 500 }}>{profile.name}</div>
            <div style={{ color: colors.subtext0, fontSize: '12px' }}>
              {Object.keys(profile.settings).length} settings • {profile.extensions.length} extensions
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isActive && (
            <span style={{
              padding: '4px 8px',
              background: colors.green + '30',
              color: colors.green,
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              Ativo
            </span>
          )}
          
          {profile.id !== 'default' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: colors.red,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SettingsPanelProps {
  settingsService: SettingsService;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settingsService }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'profiles' | 'sync'>('settings');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['editor']));
  const [settings, setSettings] = useState<Record<string, any>>(settingsService.getAll());
  const [profiles, setProfiles] = useState<UserProfile[]>(settingsService.getAllProfiles());
  const [syncState, setSyncState] = useState<SyncState>(settingsService.getSyncState());
  const [newProfileName, setNewProfileName] = useState('');
  
  // Filtered settings based on search
  const filteredSettings = useMemo(() => {
    if (!searchQuery) {
      return SETTING_CATEGORIES;
    }
    
    const results = settingsService.search(searchQuery);
    return [{
      id: 'search-results',
      label: `Search Results (${results.length})`,
      icon: 'search',
      order: 0,
      settings: results.map(r => r.key),
    }];
  }, [searchQuery, settingsService]);
  
  const handleSettingChange = useCallback(async (key: string, value: any) => {
    await settingsService.set(key, value);
    setSettings(settingsService.getAll());
  }, [settingsService]);
  
  const handleResetSetting = useCallback(async (key: string) => {
    await settingsService.reset(key);
    setSettings(settingsService.getAll());
  }, [settingsService]);
  
  const handleCreateProfile = useCallback(async () => {
    if (!newProfileName.trim()) return;
    await settingsService.createProfile(newProfileName);
    setProfiles(settingsService.getAllProfiles());
    setNewProfileName('');
  }, [settingsService, newProfileName]);
  
  const handleSwitchProfile = useCallback(async (id: string) => {
    await settingsService.switchProfile(id);
    setSettings(settingsService.getAll());
  }, [settingsService]);
  
  const handleDeleteProfile = useCallback(async (id: string) => {
    await settingsService.deleteProfile(id);
    setProfiles(settingsService.getAllProfiles());
  }, [settingsService]);
  
  const handleEnableSync = useCallback(async () => {
    await settingsService.enableSync(['settings', 'extensions', 'keybindings']);
    setSyncState(settingsService.getSyncState());
  }, [settingsService]);
  
  const handleDisableSync = useCallback(async () => {
    await settingsService.disableSync();
    setSyncState(settingsService.getSyncState());
  }, [settingsService]);
  
  const handleSync = useCallback(async () => {
    await settingsService.sync();
    setSyncState(settingsService.getSyncState());
  }, [settingsService]);
  
  const handleExport = useCallback(async () => {
    const json = await settingsService.exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aethel-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [settingsService]);
  
  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const json = await file.text();
        await settingsService.importSettings(json, true);
        setSettings(settingsService.getAll());
        setProfiles(settingsService.getAllProfiles());
      }
    };
    input.click();
  }, [settingsService]);
  
  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.base,
        color: colors.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${colors.surface0}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Settings size={24} color={colors.blue} />
          <h2 style={{ margin: 0, fontSize: '18px' }}>Configurações</h2>
        </div>
        
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: colors.surface0,
            borderRadius: '8px',
          }}
        >
          <Search size={16} color={colors.subtext0} />
          <input
            type="text"
            placeholder="Buscar configurações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.text,
              fontSize: '14px',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} color={colors.subtext0} />
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
          }}
        >
          {[
            { id: 'settings' as const, label: 'Configurações', icon: Settings },
            { id: 'profiles' as const, label: 'Perfis', icon: User },
            { id: 'sync' as const, label: 'Sincronizar', icon: Cloud },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: activeTab === tab.id ? colors.surface0 : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: activeTab === tab.id ? colors.text : colors.subtext0,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', height: '100%' }}
            >
              {/* Categories sidebar */}
              <div
                style={{
                  width: '200px',
                  borderRight: `1px solid ${colors.surface0}`,
                  padding: '8px',
                }}
              >
                {filteredSettings.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: colors.text,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      {category.label}
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Settings list */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {filteredSettings.map((category) => (
                  expandedCategories.has(category.id) && (
                    <div key={category.id}>
                      <div
                        style={{
                          padding: '12px 16px',
                          background: colors.surface0,
                          fontWeight: 500,
                          position: 'sticky',
                          top: 0,
                        }}
                      >
                        {category.label}
                      </div>
                      {category.settings.map((settingKey) => (
                        <SettingInput
                          key={settingKey}
                          settingKey={settingKey}
                          definition={SETTING_DEFINITIONS[settingKey]}
                          value={settings[settingKey] ?? DEFAULT_SETTINGS[settingKey]}
                          onChange={(value) => handleSettingChange(settingKey, value)}
                          onReset={() => handleResetSetting(settingKey)}
                          isModified={settings[settingKey] !== undefined && settings[settingKey] !== DEFAULT_SETTINGS[settingKey]}
                        />
                      ))}
                    </div>
                  )
                ))}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'profiles' && (
            <motion.div
              key="profiles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '16px' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: colors.subtext0 }}>
                  Criar Novo Perfil
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Nome do perfil..."
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: colors.surface0,
                      border: `1px solid ${colors.surface1}`,
                      borderRadius: '6px',
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={handleCreateProfile}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: colors.blue,
                      border: 'none',
                      borderRadius: '6px',
                      color: colors.base,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <Plus size={16} />
                    Criar
                  </button>
                </div>
              </div>
              
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: colors.subtext0 }}>
                  Seus Perfis
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ProfileCard
                    profile={{
                      id: 'default',
                      name: 'Perfil Padrão',
                      settings: {},
                      extensions: [],
                      keybindings: [],
                      snippets: {},
                      tasks: [],
                      globalState: {},
                      createdAt: 0,
                      updatedAt: 0,
                    }}
                    isActive={settingsService.getActiveProfile()?.id === undefined}
                    onActivate={() => handleSwitchProfile('default')}
                    onDelete={() => {}}
                  />
                  {profiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      isActive={settingsService.getActiveProfile()?.id === profile.id}
                      onActivate={() => handleSwitchProfile(profile.id)}
                      onDelete={() => handleDeleteProfile(profile.id)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'sync' && (
            <motion.div
              key="sync"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '16px' }}
            >
              {/* Sync Status */}
              <div
                style={{
                  padding: '20px',
                  background: colors.surface0,
                  borderRadius: '12px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {syncState.enabled ? (
                      <Cloud size={32} color={colors.green} />
                    ) : (
                      <CloudOff size={32} color={colors.subtext0} />
                    )}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '16px' }}>
                        {syncState.enabled ? 'Sincronização Ativada' : 'Sincronização Desativada'}
                      </div>
                      <div style={{ color: colors.subtext0, fontSize: '13px' }}>
                        {syncState.lastSync
                          ? `Última sincronização: ${new Date(syncState.lastSync).toLocaleString()}`
                          : 'Nunca sincronizado'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {syncState.enabled ? (
                      <>
                        <button
                          onClick={handleSync}
                          disabled={syncState.status === 'syncing'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: colors.surface1,
                            border: 'none',
                            borderRadius: '6px',
                            color: colors.text,
                            cursor: 'pointer',
                          }}
                        >
                          <RefreshCw
                            size={16}
                            style={{
                              animation: syncState.status === 'syncing' ? 'spin 1s linear infinite' : 'none',
                            }}
                          />
                          {syncState.status === 'syncing' ? 'Sincronizando...' : 'Sincronizar Agora'}
                        </button>
                        <button
                          onClick={handleDisableSync}
                          style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: `1px solid ${colors.red}`,
                            borderRadius: '6px',
                            color: colors.red,
                            cursor: 'pointer',
                          }}
                        >
                          Desativar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEnableSync}
                        style={{
                          padding: '8px 16px',
                          background: colors.blue,
                          border: 'none',
                          borderRadius: '6px',
                          color: colors.base,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Ativar Sincronização
                      </button>
                    )}
                  </div>
                </div>
                
                {syncState.error && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: colors.red + '20',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: colors.red,
                    }}
                  >
                    <AlertCircle size={16} />
                    {syncState.error}
                  </div>
                )}
              </div>
              
              {/* Itens Sincronizados */}
              {syncState.enabled && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: colors.subtext0 }}>
                    Itens Sincronizados
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['settings', 'extensions', 'keybindings', 'snippets', 'tasks', 'profiles'].map((item) => (
                      <div
                        key={item}
                        style={{
                          padding: '8px 12px',
                          background: syncState.syncedItems.includes(item as any)
                            ? colors.green + '20'
                            : colors.surface0,
                          border: `1px solid ${
                            syncState.syncedItems.includes(item as any)
                              ? colors.green
                              : colors.surface1
                          }`,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {syncState.syncedItems.includes(item as any) && (
                          <Check size={14} color={colors.green} />
                        )}
                        <span style={{ textTransform: 'capitalize' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Importar / Exportar */}
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: colors.subtext0 }}>
                  Importar / Exportar
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleExport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: colors.surface0,
                      border: `1px solid ${colors.surface1}`,
                      borderRadius: '6px',
                      color: colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={16} />
                    Exportar Configurações
                  </button>
                  <button
                    onClick={handleImport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: colors.surface0,
                      border: `1px solid ${colors.surface1}`,
                      borderRadius: '6px',
                      color: colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={16} />
                    Importar Configurações
                  </button>
                </div>
                <p style={{ marginTop: '8px', fontSize: '13px', color: colors.subtext0 }}>
                  Exporte suas configurações para um arquivo JSON para backup ou compartilhar.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SettingsPanel;
