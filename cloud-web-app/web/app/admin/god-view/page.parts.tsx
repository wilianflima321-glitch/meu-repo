'use client';

import {
  Users,
  Globe,
  Monitor,
  Smartphone,
  MapPin,
  Clock,
  Bot,
  DollarSign,
  ChevronDown,
  Zap,
  MousePointer,
  Code,
  FileCode,
  Box,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface LiveSession {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;

  projectId?: string;
  projectName?: string;

  socketId?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;

  currentPage?: string;
  currentTool?: string;
  lastAction?: string;

  aiCallsCount: number;
  aiTokensUsed: number;
  aiCostIncurred: number;

  startedAt: string;
  lastPingAt: string;

  isActive: boolean;

  // Derived
  duration: number; // seconds
  device: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
}

export interface GodViewStats {
  totalActive: number;
  totalAICalls: number;
  totalAICost: number;
  totalTokens: number;
  byCountry: { country: string; count: number }[];
  byDevice: { device: string; count: number }[];
  byPlan: { plan: string; count: number }[];
}

export type GodViewSessionsResponse = {
  sessions?: Array<Omit<LiveSession, 'duration' | 'device' | 'browser'> & {
    duration?: number;
    device?: LiveSession['device'];
    browser?: string;
  }>;
  stats: GodViewStats;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function parseUserAgent(ua?: string): { device: 'desktop' | 'mobile' | 'tablet'; browser?: string } {
  if (!ua) return { device: 'desktop' };

  const isMobile = /Mobile|Android|iPhone|iPod/.test(ua);
  const isTablet = /iPad|Tablet/.test(ua);

  let browser: string | undefined;
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  return {
    device: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser,
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function getToolIcon(tool?: string) {
  if (!tool) return Box;
  const lower = tool.toLowerCase();
  if (lower.includes('code') || lower.includes('script')) return Code;
  if (lower.includes('file')) return FileCode;
  if (lower.includes('ai') || lower.includes('copilot')) return Bot;
  return Box;
}

// =============================================================================
// COMPONENTS
// =============================================================================

export function StatsOverview({ stats }: { stats: GodViewStats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--aethel-text-tertiary)] uppercase">Usuarios ao vivo</span>
          <Users className="w-4 h-4 text-[var(--aethel-success)]" />
        </div>
        <p className="text-3xl font-bold text-[var(--aethel-text-primary)]">{stats.totalActive}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-[var(--aethel-success)] animate-pulse" />
          <span className="text-xs text-[var(--aethel-success)]">Ao vivo</span>
        </div>
      </div>

      <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--aethel-text-tertiary)] uppercase">Chamadas de IA</span>
          <Bot className="w-4 h-4 text-[var(--aethel-info)]" />
        </div>
        <p className="text-3xl font-bold text-[var(--aethel-text-primary)]">{stats.totalAICalls.toLocaleString()}</p>
        <p className="text-xs text-[var(--aethel-text-tertiary)] mt-2">{stats.totalTokens.toLocaleString()} tokens</p>
      </div>

      <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--aethel-text-tertiary)] uppercase">Cost de IA (ao vivo)</span>
          <DollarSign className="w-4 h-4 text-[var(--aethel-warning)]" />
        </div>
        <p className="text-3xl font-bold text-[var(--aethel-text-primary)]">${stats.totalAICost.toFixed(2)}</p>
        <p className="text-xs text-[var(--aethel-text-tertiary)] mt-2">Sessoes atuais</p>
      </div>

      <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--aethel-text-tertiary)] uppercase">Regiao principal</span>
          <Globe className="w-4 h-4 text-[var(--aethel-info)]" />
        </div>
        <p className="text-3xl font-bold text-[var(--aethel-text-primary)]">
          {stats.byCountry[0]?.country || 'N/D'}
        </p>
        <p className="text-xs text-[var(--aethel-text-tertiary)] mt-2">
          {stats.byCountry[0]?.count || 0} usuarios
        </p>
      </div>
    </div>
  );
}

export function SessionCard({
  session,
  isExpanded,
  onToggle
}: {
  session: LiveSession;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const DeviceIcon = session.device === 'mobile' ? Smartphone : Monitor;
  const ToolIcon = getToolIcon(session.currentTool);

  return (
    <div
      className={`
        bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg overflow-hidden
        ${session.aiCostIncurred > 1 ? 'border-l-4 border-l-yellow-500' : ''}
      `}
    >
      {/* Header Row */}
      <div
        className="p-4 cursor-pointer hover:bg-[var(--aethel-surface-tertiary)] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[var(--aethel-surface-tertiary)] flex items-center justify-center">
                <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
                  {session.userName?.charAt(0) || session.userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--aethel-success)] border-2 border-[var(--aethel-border-primary)]" />
            </div>

            {/* User Info */}
            <div>
              <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
                {session.userName || session.userEmail}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {session.projectName && (
                  <span className="text-xs text-[var(--aethel-text-tertiary)]">
                    {session.projectName}
                  </span>
                )}
                {session.country && (
                  <span className="text-xs text-[var(--aethel-text-tertiary)] flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {session.city && `${session.city}, `}{session.country}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Duracao</p>
              <p className="text-sm text-[var(--aethel-text-primary)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(session.duration)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Chamadas de IA</p>
              <p className="text-sm text-[var(--aethel-text-primary)] flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {session.aiCallsCount}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-[var(--aethel-text-tertiary)]">Cost</p>
              <p className={`text-sm font-medium flex items-center gap-1 ${
                session.aiCostIncurred > 1 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-text-primary)]'
              }`}>
                <DollarSign className="w-3 h-3" />
                {session.aiCostIncurred.toFixed(3)}
              </p>
            </div>

            <DeviceIcon className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />

            <ChevronDown className={`w-4 h-4 text-[var(--aethel-text-tertiary)] transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`} />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[var(--aethel-border-primary)] pt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Activity */}
            <div className="space-y-3">
              <h4 className="text-xs text-[var(--aethel-text-tertiary)] uppercase">Atividade atual</h4>

              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                <div>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">Pagina</p>
                  <p className="text-sm text-[var(--aethel-text-primary)]">{session.currentPage || 'Desconhecida'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ToolIcon className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                <div>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">Ferramenta ativa</p>
                  <p className="text-sm text-[var(--aethel-text-primary)]">{session.currentTool || 'Nenhuma'}</p>
                </div>
              </div>

              {session.lastAction && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                  <div>
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">Ultima acao</p>
                    <p className="text-sm text-[var(--aethel-text-primary)]">{session.lastAction}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Technical */}
            <div className="space-y-3">
              <h4 className="text-xs text-[var(--aethel-text-tertiary)] uppercase">Tecnico</h4>

              <div>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">ID da sessao</p>
                <p className="text-sm text-[var(--aethel-text-primary)] font-mono">{session.id.slice(0, 12)}...</p>
              </div>

              <div>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Endereco IP</p>
                <p className="text-sm text-[var(--aethel-text-primary)] font-mono">{session.ipAddress || 'Desconhecido'}</p>
              </div>

              <div>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Navegador</p>
                <p className="text-sm text-[var(--aethel-text-primary)]">{session.browser || 'Desconhecido'}</p>
              </div>
            </div>

            {/* AI Usage */}
            <div className="space-y-3">
              <h4 className="text-xs text-[var(--aethel-text-tertiary)] uppercase">Uso de IA</h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--aethel-surface-tertiary)] rounded p-2">
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">Chamadas</p>
                  <p className="text-lg font-medium text-[var(--aethel-text-primary)]">{session.aiCallsCount}</p>
                </div>

                <div className="bg-[var(--aethel-surface-tertiary)] rounded p-2">
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">Tokens</p>
                  <p className="text-lg font-medium text-[var(--aethel-text-primary)]">
                    {session.aiTokensUsed.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-[var(--aethel-surface-tertiary)] rounded p-2">
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Cost da sessao</p>
                <p className={`text-xl font-bold ${
                  session.aiCostIncurred > 1 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-success)]'
                }`}>
                  ${session.aiCostIncurred.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function WorldMap({ byCountry }: { byCountry: { country: string; count: number }[] }) {
  // Simplified text representation - in production use a proper map library
  const maxCount = Math.max(...byCountry.map(c => c.count), 1);

  return (
    <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-4 flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Actives por regiao
      </h3>

      <div className="space-y-2">
        {byCountry.slice(0, 10).map(({ country, count }) => (
          <div key={country} className="flex items-center gap-3">
            <span className="text-sm text-[var(--aethel-text-tertiary)] w-20 truncate">{country}</span>
            <div className="flex-1 h-2 bg-[var(--aethel-surface-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--aethel-primary)] rounded-full"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-sm text-[var(--aethel-text-secondary)] w-12 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

