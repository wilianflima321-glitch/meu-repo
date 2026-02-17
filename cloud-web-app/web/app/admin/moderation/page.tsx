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
      <div className="bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Pendentes</span>
          <Clock className="w-4 h-4 text-yellow-400" />
        </div>
        <p className="text-xl font-bold text-white mt-1">{stats.pending}</p>
      </div>
      
      <div className="bg-zinc-900/70 border border-red-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Urgentes</span>
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <p className="text-xl font-bold text-red-400 mt-1">{stats.urgent}</p>
      </div>
      
      <div className="bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Processados hoje</span>
          <CheckCircle className="w-4 h-4 text-green-400" />
        </div>
        <p className="text-xl font-bold text-white mt-1">{stats.todayProcessed}</p>
      </div>
      
      <div className="bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Tempo médio</span>
          <Clock className="w-4 h-4 text-blue-400" />
        </div>
        <p className="text-xl font-bold text-white mt-1">{stats.avgResponseTime}m</p>
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
    low: 'border-zinc-700 bg-zinc-900/60',
    normal: 'border-blue-500/30 bg-blue-500/5',
    high: 'border-yellow-500/30 bg-yellow-500/5',
    urgent: 'border-red-500/30 bg-red-500/10',
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
          <TypeIcon className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-300 capitalize">
            {TYPE_LABELS[item.type]}
          </span>
          {item.priority === 'urgent' && (
            <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded">
              URGENTE
            </span>
          )}
          {item.autoScore && item.autoScore > 0.7 && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
              Sinalizado por IA: {Math.round(item.autoScore * 100)}%
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </div>
      
      {/* Target Info */}
      <div className="mb-3">
        <p className="text-sm text-white">
          <span className="text-zinc-500">Alvo:</span>{' '}
          <span className="capitalize">{TARGET_LABELS[item.targetType]}</span> ({item.targetId.slice(0, 8)}...)
        </p>
        {item.targetOwnerEmail && (
          <p className="text-xs text-zinc-500 mt-1">
            Responsável: {item.targetOwnerEmail}
          </p>
        )}
      </div>
      
      {/* Reason & Category */}
      {item.reason && (
        <div className="mb-3 p-2 bg-zinc-800/80 rounded text-sm">
          <span className="text-zinc-500">Motivo:</span>{' '}
          <span className="text-zinc-200">{item.reason}</span>
          {item.category && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-[#333] rounded capitalize">
              {item.category}
            </span>
          )}
        </div>
      )}
      
      {/* Content Preview */}
      {item.contentSnapshot && (
        <div className="mb-3">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowContent(!showContent); }}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white"
          >
            {showContent ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showContent ? 'Ocultar conteúdo' : 'Ver conteúdo'}
          </button>
          {showContent && (
            <div className="mt-2 p-3 bg-zinc-950 border border-zinc-700 rounded text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">
              <pre className="text-zinc-300 whitespace-pre-wrap">
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
            <span key={i} className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              {flag}
            </span>
          ))}
        </div>
      )}
      
      {/* Quick Actions */}
      {isSelected && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-700">
          <button
            onClick={(e) => { e.stopPropagation(); onAction('approve'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
          >
            <CheckCircle className="w-4 h-4" />
            Aprovar (A)
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAction('reject'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
          >
            <XCircle className="w-4 h-4" />
            Rejeitar (R)
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAction('escalate'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded"
          >
            <ArrowUp className="w-4 h-4" />
            Escalar (E)
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAction('shadowban'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded"
          >
            <UserX className="w-4 h-4" />
            Banimento sombra (B)
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAction('skip'); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded ml-auto"
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900/70 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Atalhos do teclado
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-2">
          {Object.entries(SHORTCUTS).map(([key, action]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-zinc-700">
              <span className="text-zinc-300">{action}</span>
              <kbd className="px-2 py-1 bg-zinc-800/80 border border-zinc-600 rounded text-sm text-zinc-300 font-mono">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-zinc-500 mt-4">
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
        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Fila de moderação
          </h1>
          <p className="text-sm text-zinc-500">
            Revisar e moderar conteúdos sinalizados
          </p>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Shortcuts hint */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/70 border border-zinc-700 rounded text-sm text-zinc-500 hover:text-white"
          >
            <Keyboard className="w-4 h-4" />
            Atalhos (?)
          </button>
          
          {/* Filter */}
          <div className="flex items-center gap-1 bg-zinc-900/70 border border-zinc-700 rounded-lg p-1">
            {(['pending', 'urgent', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded capitalize ${
                  filter === f 
                    ? 'bg-blue-600 text-white' 
                    : 'text-zinc-500 hover:text-white'
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
            className="px-3 py-1.5 text-xs rounded bg-zinc-900/70 border border-zinc-700 text-zinc-200"
          />
          
          {/* Refresh */}
          <button
            onClick={fetchItems}
            className="p-2 bg-zinc-900/70 border border-zinc-700 rounded-lg text-zinc-500 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <StatsBar stats={stats} />
      
      {/* Queue */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-zinc-900/70 border border-zinc-700 rounded-lg">
          <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
          <p className="text-lg text-zinc-300">Tudo certo!</p>
          <p className="text-sm text-zinc-500">Nenhum item na fila de moderação</p>
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
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Processando...
        </div>
      )}
      
      {/* Shortcuts Modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
