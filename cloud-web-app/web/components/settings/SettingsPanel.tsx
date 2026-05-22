'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudOff,
  Download,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  SETTING_CATEGORIES,
  SETTING_DEFINITIONS,
  SettingsService,
} from '@/lib/settings/settings-service';
import type { SettingValue, SyncState, UserProfile } from '@/lib/settings/settings-service';
import { ProfileCard, SettingInput, SYNC_ITEMS, colors } from './SettingsPanel.parts';

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

  const handleSettingChange = useCallback(async (key: string, value: SettingValue) => {
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
    a.download = 'settings.json';
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
          <h2 style={{ margin: 0, fontSize: '18px' }}>Settings</h2>
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
            placeholder="Search settings..."
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
            <button type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear settings search"
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
            { id: 'settings' as const, label: 'Settings', icon: Settings },
            { id: 'profiles' as const, label: 'Profiles', icon: User },
            { id: 'sync' as const, label: 'Sync', icon: Cloud },
          ].map((tab) => (
            <button type="button"
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
        {activeTab === 'settings' && (
            <div
              key="settings"
              className="animate-in fade-in duration-150"
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
                    <button type="button"
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
            </div>
          )}

          {activeTab === 'profiles' && (
            <div
              key="profiles"
              className="animate-in fade-in duration-150"
              style={{ padding: '16px' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: colors.subtext0 }}>
                  Create New Profile
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Profile name..."
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
                  <button type="button"
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
                    Create
                  </button>
                </div>
              </div>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: colors.subtext0 }}>
                  Your Profiles
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ProfileCard
                    profile={{
                      id: 'default',
                      name: 'Default profile',
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
            </div>
          )}

          {activeTab === 'sync' && (
            <div
              key="sync"
              className="animate-in fade-in duration-150"
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
                        {syncState.enabled ? 'Sync enabled' : 'Sync disabled'}
                      </div>
                      <div style={{ color: colors.subtext0, fontSize: '13px' }}>
                        {syncState.lastSync
                          ? `Last sync: ${new Date(syncState.lastSync).toLocaleString()}`
                          : 'Never synced'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {syncState.enabled ? (
                      <>
                        <button type="button"
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
                          {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button type="button"
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
                          Disable
                        </button>
                      </>
                    ) : (
                      <button type="button"
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
                        Enable sync
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

              {/* Synced Items */}
              {syncState.enabled && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: colors.subtext0 }}>
                    Synced Items
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {SYNC_ITEMS.map((item) => (
                      <div
                        key={item}
                        style={{
                          padding: '8px 12px',
                          background: syncState.syncedItems.includes(item)
                            ? colors.green + '20'
                            : colors.surface0,
                          border: `1px solid ${
                            syncState.syncedItems.includes(item)
                              ? colors.green
                              : colors.surface1
                          }`,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {syncState.syncedItems.includes(item) && (
                          <Check size={14} color={colors.green} />
                        )}
                        <span style={{ textTransform: 'capitalize' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import / Export */}
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: colors.subtext0 }}>
                  Import / Export
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button"
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
                    Export settings
                  </button>
                  <button type="button"
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
                    Import settings
                  </button>
                </div>
                <p style={{ marginTop: '8px', fontSize: '13px', color: colors.subtext0 }}>
                  Export your settings to a JSON file for backup or sharing.
                </p>
              </div>
            </div>
          )}
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
