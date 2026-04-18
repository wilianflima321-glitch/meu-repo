'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  MessageSquare,
  Flag,
  User,
  FileCode,
  Image,
  Bot,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Filter,
  ArrowUp,
  Keyboard,
  Ban,
  UserX,
  Trash2,
  SkipForward
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ModerationItem {
  id: string;
  type: 'user_report' | 'ai_output' | 'project_content' | 'asset';
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'normal' | 'high' | 'urgent';

  reporterId?: string;
  reporterEmail?: string;

  targetType: 'user' | 'project' | 'asset' | 'ai_generation';
  targetId: string;
  targetOwnerId?: string;
  targetOwnerEmail?: string;

  contentSnapshot?: {
    type: string;
    preview: string;
    fullContent?: string;
  };

  reason?: string;
  category?: string;
  notes?: string;

  autoScore?: number;
  autoFlags?: string[];

  createdAt: string;
  updatedAt: string;
}

interface ModerationStats {
  pending: number;
  urgent: number;
  todayProcessed: number;
  avgResponseTime: number; // minutes
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

const SHORTCUTS = {
  'a': 'Aprovar',
  'r': 'Rejeitar',
  'e': 'Escalar',
  's': 'Ignorar',
  'b': 'Banir usuário (sombra)',
  'd': 'Excluir conteúdo',
  'n': 'Próximo item',
  'p': 'Item anterior',
  'v': 'Alternar visualização',
  '?': 'Mostrar atalhos',
};

const TYPE_LABELS: Record<ModerationItem['type'], string> = {
  user_report: 'Denúncia de usuário',
  ai_output: 'Saída de IA',
  project_content: 'Conteúdo do projeto',
  asset: 'Ativo',
};

const TARGET_LABELS: Record<ModerationItem['targetType'], string> = {
  user: 'usuário',
  project: 'projeto',
  asset: 'ativo',
  ai_generation: 'geração de IA',
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsBar({ stats }: { stats: ModerationStats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Pendentes</span>
          <Clock className="w-4 h-4 text-[var(--aethel-warning)]" />
        </div>
        <p className="text-xl font-bold text-[var(--aethel-text-primary)] mt-1">{stats.pending}</p>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Urgentes</span>
          <AlertTriangle className="w-4 h-4 text-[var(--aethel-error)]" />
        </div>
        <p className="text-xl font-bold text-[var(--aethel-error)] mt-1">{stats.urgent}</p>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Processados hoje</span>
          <CheckCircle className="w-4 h-4 text-[var(--aethel-success)]" />
        </div>
        <p className="text-xl font-bold text-[var(--aethel-text-primary)] mt-1">{stats.todayProcessed}</p>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Tempo médio</span>
          <Clock className="w-4 h-4 text-[var(--aethel-primary-light)]" />
        </div>
        <p className="text-xl font-bold text-[var(--aethel-text-primary)] mt-1">{stats.avgResponseTime}m</p>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  isSelected,
  onClick,
  onAction
}: {
  item: ModerationItem;
  isSelected: boolean;
  onClick: () => void;
  onAction: (action: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const priorityColors = {
    low: 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]',
    normal: 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[var(--aethel-primary)]/5',
    high: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-warning)]/5',
    urgent: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[var(--aethel-error)]/10',
  };

  const typeIcons = {
    user_report: Flag,
    ai_output: Bot,
    project_content: FileCode,
    asset: Image,
  };

  const TypeIcon = typeIcons[item.type];

  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${priorityColors[item.priority]}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          <span className="text-sm text-[var(--aethel-text-secondary)] capitalize">
            {TYPE_LABELS[item.type]}
          </span>
          {item.priority === 'urgent' && (
            <span className="px-2 py-0.5 text-xs bg-[var(--aethel-error)] text-[var(--aethel-text-primary)] rounded">
              URGENTE
            </span>
          )}
          {item.autoScore && item.autoScore > 0.7 && (
            <span className="px-2 py-0.5 text-xs bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)] rounded">
              Sinalizado por IA: {Math.round(item.autoScore * 100)}%
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Target Info */}
      <div className="mb-3">
        <p className="text-sm text-[var(--aethel-text-primary)]">
          <span className="text-[var(--aethel-text-tertiary)]">Alvo:</span>{' '}
          <span className="capitalize">{TARGET_LABELS[item.targetType]}</span> ({item.targetId.slice(0, 8)}...)
        </p>
        {item.targetOwnerEmail && (
          <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">
            Responsável: {item.targetOwnerEmail}
          </p>
        )}
      </div>

      {/* Reason & Category */}
      {item.reason && (
        <div className="mb-3 p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] rounded text-sm">
          <span className="text-[var(--aethel-text-tertiary)]">Motivo:</span>{' '}
          <span className="text-[var(--aethel-text-secondary)]">{item.reason}</span>
          {item.category && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--aethel-surface-quaternary)] rounded capitalize">
              {item.category}
            </span>
          )}
        </div>
      )}

      {/* Content Preview */}
      {item.contentSnapshot && (
        <div className="mb-3">
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setShowContent(!showContent); }}
            aria-label={showContent ? 'Ocultar conteudo moderado' : 'Exibir conteudo moderado'}
            aria-expanded={showContent}
            className="flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            {showContent ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showContent ? 'Ocultar conteúdo' : 'Ver conteúdo'}
          </button>
          {showContent && (
            <div className="mt-2 p-3 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-secondary)] rounded text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">
              <pre className="text-[var(--aethel-text-secondary)] whitespace-pre-wrap">
                {item.contentSnapshot.preview}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Auto Flags */}
      {item.autoFlags && item.autoFlags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {item.autoFlags.map((flag, i) => (
            <span key={i} className="px-2 py-0.5 text-xs bg-[var(--aethel-error)]/20 text-[var(--aethel-error)] rounded">
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {isSelected && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--aethel-border-secondary)]">
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onAction('approve'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--aethel-success)] hover:bg-[var(--aethel-success-dark)] text-[var(--aethel-text-primary)] text-sm rounded"
          >
            <CheckCircle className="w-4 h-4" />
            Aprovar (A)
          </button>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onAction('reject'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error-dark)] text-[var(--aethel-text-primary)] text-sm rounded"
          >
            <XCircle className="w-4 h-4" />
            Rejeitar (R)
          </button>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onAction('escalate'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--aethel-warning-dark)] hover:bg-[var(--aethel-warning-dark)] text-[var(--aethel-text-primary)] text-sm rounded"
          >
            <ArrowUp className="w-4 h-4" />
            Escalar (E)
          </button>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onAction('shadowban'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)] text-[var(--aethel-text-primary)] text-sm rounded"
          >
            <UserX className="w-4 h-4" />
            Banimento sombra (B)
          </button>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onAction('skip'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] text-sm rounded ml-auto"
          >
            <SkipForward className="w-4 h-4" />
            Ignorar (S)
          </button>
        </div>
      )}
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] flex items-center justify-center z-50">
      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)] flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Atalhos do teclado
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {Object.entries(SHORTCUTS).map(([key, action]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-[var(--aethel-border-secondary)]">
              <span className="text-[var(--aethel-text-secondary)]">{action}</span>
              <kbd className="px-2 py-1 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] rounded text-sm text-[var(--aethel-text-secondary)] font-mono">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--aethel-text-tertiary)] mt-4">
          Pressione qualquer tecla enquanto um item estiver selecionado para executar a ação.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pending: 0,
    urgent: 0,
    todayProcessed: 0,
    avgResponseTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'pending'>('pending');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/moderation/queue?filter=${filter}`);
      if (!res.ok) throw new Error('Falha ao buscar');
      const data = await res.json();
      setItems(data.items);
      setStats(data.stats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Falha ao buscar fila de moderação:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      item.reason?.toLowerCase().includes(term) ||
      item.targetId.toLowerCase().includes(term) ||
      item.targetOwnerEmail?.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(filteredItems.length - 1, 0)));
  }, [filteredItems.length]);

  const handleAction = useCallback(async (action: string) => {
    const item = filteredItems[selectedIndex];
    if (!item || processing) return;

    setProcessing(true);

    try {
      const res = await fetch(`/api/admin/moderation/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error('Falha na ação');

      // Remove item from list and refresh stats
      setItems(prev => prev.filter((entry) => entry.id !== item.id));
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        todayProcessed: prev.todayProcessed + (action !== 'skip' ? 1 : 0),
      }));

      // Keep selection in bounds
      setSelectedIndex(i => Math.min(i, filteredItems.length - 2));

    } catch (error) {
      console.error('Falha na ação:', error);
    } finally {
      setProcessing(false);
    }
  }, [filteredItems, processing, selectedIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const item = filteredItems[selectedIndex];
      if (!item && e.key !== '?' && e.key !== 'n' && e.key !== 'p') return;

      switch (e.key.toLowerCase()) {
        case 'a':
          handleAction('approve');
          break;
        case 'r':
          handleAction('reject');
          break;
        case 'e':
          handleAction('escalate');
          break;
        case 's':
          handleAction('skip');
          break;
        case 'b':
          handleAction('shadowban');
          break;
        case 'd':
          handleAction('delete');
          break;
        case 'n':
          setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
          break;
        case 'p':
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'v':
          // Toggle content view - handled in ItemCard
          break;
        case '?':
          setShowShortcuts(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, handleAction, selectedIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-[var(--aethel-text-tertiary)] animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--aethel-text-primary)] flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Fila de moderação
          </h1>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">
            Revisar e moderar conteúdos sinalizados
          </p>
          {lastUpdated && (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Shortcuts hint */}
          <button type="button"
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <Keyboard className="w-4 h-4" />
            Atalhos (?)
          </button>

          {/* Filter */}
          <div className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-1">
            {(['pending', 'urgent', 'all'] as const).map((f) => (
              <button type="button"
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded capitalize ${
                  filter === f
                    ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                {f === 'pending' ? 'pendentes' : f === 'urgent' ? 'urgentes' : 'todos'}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar alvo/motivo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]"
          />

          {/* Refresh */}
          <button type="button"
            onClick={fetchItems}
            className="p-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Queue */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg">
          <CheckCircle className="w-12 h-12 text-[var(--aethel-success)] mb-4" />
          <p className="text-lg text-[var(--aethel-text-secondary)]">Tudo certo!</p>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Nenhum item na fila de moderação</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              isSelected={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div className="fixed bottom-4 right-4 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] px-4 py-2 rounded-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Processando...
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
