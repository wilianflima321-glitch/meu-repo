'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Eye, Monitor, Pause, Play, RefreshCw, Search, Smartphone } from 'lucide-react';

import { logger } from '@/lib/observability/logger';
import {
  parseUserAgent,
  SessionCard,
  StatsOverview,
  WorldMap,
  type GodViewSessionsResponse,
  type GodViewStats,
  type LiveSession,
} from './page.parts';

type GodViewSortBy = 'duration' | 'cost' | 'ai';

const INITIAL_STATS: GodViewStats = {
  totalActive: 0,
  totalAICalls: 0,
  totalAICost: 0,
  totalTokens: 0,
  byCountry: [],
  byDevice: [],
  byPlan: [],
};

function filterSessions(sessions: LiveSession[], searchQuery: string): LiveSession[] {
  if (!searchQuery) return sessions;
  const q = searchQuery.toLowerCase();
  return sessions.filter((session) =>
    session.userEmail.toLowerCase().includes(q) ||
    session.userName?.toLowerCase().includes(q) ||
    session.projectName?.toLowerCase().includes(q) ||
    session.country?.toLowerCase().includes(q)
  );
}

function sortSessions(sessions: LiveSession[], sortBy: GodViewSortBy): LiveSession[] {
  return [...sessions].sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        return b.aiCostIncurred - a.aiCostIncurred;
      case 'ai':
        return b.aiCallsCount - a.aiCallsCount;
      case 'duration':
        return b.duration - a.duration;
    }
  });
}

function enrichSessions(data: GodViewSessionsResponse): LiveSession[] {
  return (data.sessions || []).map((session) => {
    const { device, browser } = parseUserAgent(session.userAgent);
    const duration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    return { ...session, device, browser, duration };
  });
}

export default function GodViewPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [stats, setStats] = useState<GodViewStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<GodViewSortBy>('duration');

  const fetchSessions = useCallback(async () => {
    if (paused) return;

    try {
      const res = await fetch('/api/admin/god-view/sessions');
      if (!res.ok) throw new Error('Failed to fetch god-view sessions');
      const data = (await res.json()) as GodViewSessionsResponse;

      setSessions(enrichSessions(data));
      setStats(data.stats);
    } catch (error) {
      logger.error('admin.god_view.sessions.fetch_failed', error);
    } finally {
      setLoading(false);
    }
  }, [paused]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const filteredSessions = sortSessions(filterSessions(sessions, searchQuery), sortBy);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--aethel-text-tertiary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--aethel-text-primary)]">
            <Eye className="h-6 w-6" />
            Visao total
            {!paused && (
              <span className="ml-2 flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] px-2 py-0.5 text-xs text-[var(--aethel-success)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--aethel-success)]" />
                AO VIVO
              </span>
            )}
          </h1>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">
            Visao em tempo real de todas as sessoes ativas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search users, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] py-2 pl-9 pr-4 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as GodViewSortBy)}
            className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)]"
          >
            <option value="duration">Ordenar por duracao</option>
            <option value="cost">Ordenar por custo de IA</option>
            <option value="ai">Ordenar por chamadas de IA</option>
          </select>

          <button
            type="button"
            onClick={() => setPaused(!paused)}
            className={`rounded-lg border p-2 ${
              paused
                ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning)]'
                : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
            title={paused ? 'Retomar atualizacoes ao vivo' : 'Pausar atualizacoes ao vivo'}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={fetchSessions}
            aria-label="Atualizar sessoes do god view"
            className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <StatsOverview stats={stats} />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--aethel-text-primary)]">
              Sessoes ativas ({filteredSessions.length})
            </h2>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-[var(--aethel-text-tertiary)]">
              <Eye className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>Nenhuma sessao ativa no momento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedId === session.id}
                  onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <WorldMap byCountry={stats.byCountry} />

          <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
              <Monitor className="h-4 w-4" />
              Tipos de dispositivo
            </h3>

            <div className="space-y-3">
              {stats.byDevice.map(({ device, count }) => (
                <div key={device} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {device === 'mobile' ? (
                      <Smartphone className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
                    ) : (
                      <Monitor className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
                    )}
                    <span className="text-sm capitalize text-[var(--aethel-text-secondary)]">{device}</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {filteredSessions.some((session) => session.aiCostIncurred > 1) && (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[var(--aethel-warning)]" />
                <span className="text-sm font-medium text-[var(--aethel-warning)]">Uso elevado de IA</span>
              </div>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">
                {filteredSessions.filter((session) => session.aiCostIncurred > 1).length} sessao(oes)
                ultrapassaram $1 em custos de IA nesta sessao.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
