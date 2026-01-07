/**
 * Terminal Profiles Configuration
 * 
 * Perfis pré-configurados para diferentes propósitos:
 * - Server Log: Monitoramento de servidor
 * - Build Output: Saída de compilação
 * - Git: Operações git
 * - Shell: Terminal geral
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Terminal,
  Server,
  Hammer,
  GitBranch,
  Settings,
  Play,
  Pause,
  RotateCcw,
  X,
  Plus,
  ChevronDown,
  Check,
  Cpu,
  Database,
  Globe,
  Zap,
  Bug,
  FileCode,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TerminalProfile {
  id: string;
  name: string;
  icon: React.ReactNode;
  shell: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  color: string;
  description: string;
  category: 'development' | 'monitoring' | 'tools';
  autoStart?: boolean;
  commands?: string[]; // Auto-execute on start
}

export interface ActiveTerminal {
  id: string;
  profileId: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  startedAt: Date;
}

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceHover: '#1a1a25',
  surfaceActive: '#22222f',
  border: '#2a2a3a',
  borderFocus: '#4f46e5',
  text: '#e4e4eb',
  textMuted: '#8b8b9e',
  textDim: '#5a5a6e',
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  accent: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
};

// ============================================================================
// DEFAULT PROFILES
// ============================================================================

export const DEFAULT_TERMINAL_PROFILES: TerminalProfile[] = [
  {
    id: 'shell',
    name: 'Shell',
    icon: <Terminal size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.primary,
    description: 'Terminal interativo padrão',
    category: 'development',
  },
  {
    id: 'server-log',
    name: 'Server Log',
    icon: <Server size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.success,
    description: 'Monitoramento de logs do servidor',
    category: 'monitoring',
    commands: ['npm run dev'],
    autoStart: true,
  },
  {
    id: 'build-output',
    name: 'Build Output',
    icon: <Hammer size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.warning,
    description: 'Saída de compilação e bundling',
    category: 'development',
    commands: ['npm run build -- --watch'],
  },
  {
    id: 'git',
    name: 'Git',
    icon: <GitBranch size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.accent,
    description: 'Operações Git',
    category: 'tools',
    commands: ['git status'],
  },
  {
    id: 'docker',
    name: 'Docker',
    icon: <Database size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.cyan,
    description: 'Gerenciamento de containers',
    category: 'tools',
    commands: ['docker ps'],
  },
  {
    id: 'debug',
    name: 'Debug Console',
    icon: <Bug size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.error,
    description: 'Console de depuração',
    category: 'development',
  },
  {
    id: 'tests',
    name: 'Test Runner',
    icon: <Zap size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.pink,
    description: 'Execução de testes',
    category: 'development',
    commands: ['npm test -- --watch'],
  },
  {
    id: 'api-server',
    name: 'API Server',
    icon: <Globe size={16} />,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    color: colors.cyan,
    description: 'Servidor de API',
    category: 'monitoring',
    commands: ['npm run api'],
  },
];

// ============================================================================
// PROFILE SELECTOR
// ============================================================================

interface ProfileSelectorProps {
  profiles: TerminalProfile[];
  onSelect: (profile: TerminalProfile) => void;
  selectedId?: string;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  onSelect,
  selectedId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'development' | 'monitoring' | 'tools'>('all');

  const filteredProfiles = filter === 'all' 
    ? profiles 
    : profiles.filter(p => p.category === filter);

  const selectedProfile = profiles.find(p => p.id === selectedId);

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          color: colors.text,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        {selectedProfile ? (
          <>
            <span style={{ color: selectedProfile.color }}>{selectedProfile.icon}</span>
            {selectedProfile.name}
          </>
        ) : (
          <>
            <Plus size={14} />
            Novo Terminal
          </>
        )}
        <ChevronDown size={14} style={{ marginLeft: '4px', opacity: 0.6 }} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              width: '320px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                padding: '8px',
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              {(['all', 'development', 'monitoring', 'tools'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: filter === f ? colors.surfaceActive : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: filter === f ? colors.text : colors.textMuted,
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {f === 'all' ? 'Todos' : f}
                </button>
              ))}
            </div>

            {/* Profile List */}
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {filteredProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    onSelect(profile);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${colors.border}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: profile.color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: profile.color,
                      flexShrink: 0,
                    }}
                  >
                    {profile.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: colors.text, fontWeight: 500, fontSize: '13px' }}>
                        {profile.name}
                      </span>
                      {profile.autoStart && (
                        <span
                          style={{
                            padding: '2px 6px',
                            background: colors.success + '20',
                            borderRadius: '4px',
                            color: colors.success,
                            fontSize: '9px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          Auto
                        </span>
                      )}
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>
                      {profile.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Profile */}
            <div style={{ padding: '8px' }}>
              <button
                onClick={() => {
                  // Open custom profile dialog
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  border: `1px dashed ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textMuted,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <Settings size={14} />
                Criar Perfil Personalizado
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// TERMINAL TAB
// ============================================================================

interface TerminalTabProps {
  terminal: ActiveTerminal;
  profile: TerminalProfile;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRestart: () => void;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  terminal,
  profile,
  isActive,
  onSelect,
  onClose,
  onRestart,
}) => {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: isActive ? colors.surfaceActive : colors.surface,
        borderBottom: isActive ? `2px solid ${profile.color}` : '2px solid transparent',
        cursor: 'pointer',
        minWidth: '120px',
        maxWidth: '200px',
      }}
    >
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: terminal.status === 'running' 
            ? colors.success 
            : terminal.status === 'error' 
            ? colors.error 
            : colors.textDim,
        }}
      />
      
      <span style={{ color: profile.color }}>{profile.icon}</span>
      
      <span
        style={{
          flex: 1,
          color: isActive ? colors.text : colors.textMuted,
          fontSize: '12px',
          fontWeight: isActive ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {terminal.name}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {terminal.status !== 'running' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestart();
            }}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RotateCcw size={12} />
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: 'transparent',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// TERMINAL PROFILES MANAGER
// ============================================================================

interface TerminalProfilesManagerProps {
  profiles?: TerminalProfile[];
  activeTerminals: ActiveTerminal[];
  activeTerminalId?: string;
  onCreateTerminal: (profile: TerminalProfile) => void;
  onSelectTerminal: (terminalId: string) => void;
  onCloseTerminal: (terminalId: string) => void;
  onRestartTerminal: (terminalId: string) => void;
}

export const TerminalProfilesManager: React.FC<TerminalProfilesManagerProps> = ({
  profiles = DEFAULT_TERMINAL_PROFILES,
  activeTerminals,
  activeTerminalId,
  onCreateTerminal,
  onSelectTerminal,
  onCloseTerminal,
  onRestartTerminal,
}) => {
  const getProfile = useCallback((profileId: string) => {
    return profiles.find(p => p.id === profileId) || profiles[0];
  }, [profiles]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {/* Terminal Tabs */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflowX: 'auto',
        }}
      >
        {activeTerminals.map((terminal) => {
          const profile = getProfile(terminal.profileId);
          return (
            <TerminalTab
              key={terminal.id}
              terminal={terminal}
              profile={profile}
              isActive={terminal.id === activeTerminalId}
              onSelect={() => onSelectTerminal(terminal.id)}
              onClose={() => onCloseTerminal(terminal.id)}
              onRestart={() => onRestartTerminal(terminal.id)}
            />
          );
        })}
      </div>

      {/* Add Terminal Button */}
      <div style={{ padding: '4px 8px' }}>
        <ProfileSelector
          profiles={profiles}
          onSelect={onCreateTerminal}
        />
      </div>
    </div>
  );
};

export default TerminalProfilesManager;
