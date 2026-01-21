/**
 * WalletStatusWidget - Widget Compacto de Saldo na StatusBar
 * 
 * Exibe saldo de créditos de forma compacta na StatusBar.
 * Expande para mostrar detalhes ao clicar.
 * Integra via WebSocket para atualizações em tempo real.
 * 
 * @see ROADMAP_MONETIZACAO_XP_FINAL.md
 * 
 * @module components/billing/WalletStatusWidget
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import {
  Coins,
  Zap,
  TrendingDown,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  CreditCard,
  Clock,
  AlertTriangle,
  Crown,
  Sparkles,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface WalletData {
  balance: number;
  reserved: number;
  available: number;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  planLabel: string;
  monthlyUsage: number;
  monthlyLimit: number;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
  lowBalanceWarning: boolean;
}

interface RecentTransaction {
  id: string;
  type: 'usage' | 'purchase' | 'bonus';
  amount: number;
  description: string;
  timestamp: string;
}

interface WalletStatusWidgetProps {
  onOpenWallet?: () => void;
  onRecharge?: () => void;
  className?: string;
}

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch wallet');
  return res.json();
};

// ============================================================================
// HOOKS
// ============================================================================

function useWebSocketBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Conectar ao WebSocket para atualizações em tempo real
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/wallet`);
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'BALANCE_UPDATED') {
            setBalance(data.balance);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      wsRef.current.onerror = () => {
        // Silently fail - will use polling fallback
      };
    } catch {
      // WebSocket not available - use polling
    }

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return balance;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCredits(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString('pt-BR');
}

function getBalanceColor(available: number, limit: number): string {
  const ratio = available / limit;
  if (ratio > 0.5) return 'text-emerald-400';
  if (ratio > 0.2) return 'text-amber-400';
  return 'text-red-400';
}

function getPlanIcon(plan: string): React.ReactNode {
  switch (plan) {
    case 'enterprise':
      return <Crown className="w-3.5 h-3.5 text-amber-400" />;
    case 'pro':
      return <Zap className="w-3.5 h-3.5 text-violet-400" />;
    case 'starter':
      return <Sparkles className="w-3.5 h-3.5 text-sky-400" />;
    default:
      return null;
  }
}

function getPlanBadgeClass(plan: string): string {
  switch (plan) {
    case 'enterprise':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'pro':
      return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'starter':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    default:
      return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WalletStatusWidget({ 
  onOpenWallet, 
  onRecharge,
  className = '' 
}: WalletStatusWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLowBalanceAlert, setShowLowBalanceAlert] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch wallet data
  const { data: wallet, error, isLoading, mutate } = useSWR<WalletData>(
    '/api/wallet/summary',
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30s
  );

  // WebSocket for real-time updates
  const wsBalance = useWebSocketBalance();

  // Recent transactions
  const { data: transactions } = useSWR<RecentTransaction[]>(
    isExpanded ? '/api/wallet/transactions?limit=3' : null,
    fetcher
  );

  // Update balance from WebSocket
  useEffect(() => {
    if (wsBalance !== null && wallet) {
      mutate({ ...wallet, balance: wsBalance, available: wsBalance - wallet.reserved }, false);
    }
  }, [wsBalance, wallet, mutate]);

  // Show low balance alert
  useEffect(() => {
    if (wallet?.lowBalanceWarning && !showLowBalanceAlert) {
      setShowLowBalanceAlert(true);
    }
  }, [wallet?.lowBalanceWarning, showLowBalanceAlert]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 ${className}`}>
        <Coins className="w-4 h-4 text-zinc-500 animate-pulse" />
        <span className="text-xs text-zinc-500">...</span>
      </div>
    );
  }

  // Error state - show minimal UI
  if (error || !wallet) {
    return (
      <button
        onClick={() => mutate()}
        className={`flex items-center gap-1.5 px-2 py-1 text-zinc-500 
                   hover:text-zinc-400 transition-colors ${className}`}
        title="Erro ao carregar saldo. Clique para tentar novamente."
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="text-xs">Offline</span>
      </button>
    );
  }

  const balanceColor = getBalanceColor(wallet.available, wallet.monthlyLimit);
  const usagePercent = Math.round((wallet.monthlyUsage / wallet.monthlyLimit) * 100);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Widget Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-2.5 py-1 rounded-md transition-all
          hover:bg-zinc-800 group
          ${isExpanded ? 'bg-zinc-800' : ''}
          ${wallet.lowBalanceWarning ? 'animate-pulse' : ''}
        `}
      >
        {/* Credits */}
        <div className="flex items-center gap-1.5">
          <Coins className={`w-4 h-4 ${balanceColor}`} />
          <span className={`text-sm font-medium ${balanceColor}`}>
            {formatCredits(wallet.available)}
          </span>
          
          {/* Trend indicator */}
          {wallet.trend === 'down' && (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          {wallet.trend === 'up' && (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-zinc-700" />

        {/* Plan badge */}
        <div className={`
          flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border
          ${getPlanBadgeClass(wallet.plan)}
        `}>
          {getPlanIcon(wallet.plan)}
          <span>{wallet.planLabel}</span>
        </div>

        {/* Expand indicator */}
        {isExpanded 
          ? <ChevronUp className="w-3 h-3 text-zinc-500" />
          : <ChevronDown className="w-3 h-3 text-zinc-500" />
        }
      </button>

      {/* Low Balance Alert Badge */}
      {wallet.lowBalanceWarning && !isExpanded && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
      )}

      {/* Expanded Dropdown */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-72 
                      bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl
                      animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Header */}
          <div className="p-3 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Carteira</span>
              <button
                onClick={() => mutate()}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
            
            {/* Balance display */}
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${balanceColor}`}>
                {wallet.available.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm text-zinc-500">créditos</span>
            </div>
            
            {/* Reserved indicator */}
            {wallet.reserved > 0 && (
              <p className="text-xs text-zinc-500 mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                {wallet.reserved.toLocaleString('pt-BR')} reservados
              </p>
            )}
          </div>

          {/* Usage bar */}
          <div className="p-3 border-b border-zinc-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-zinc-400">Uso mensal</span>
              <span className="text-zinc-300">{usagePercent}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  usagePercent > 80 ? 'bg-red-500' :
                  usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {wallet.monthlyUsage.toLocaleString('pt-BR')} / {wallet.monthlyLimit.toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Recent transactions */}
          {transactions && transactions.length > 0 && (
            <div className="p-3 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">Histórico recente</p>
              <div className="space-y-1.5">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate max-w-[160px]">
                      {tx.description}
                    </span>
                    <span className={tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {tx.amount < 0 ? '' : '+'}
                      {tx.amount.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low balance warning */}
          {wallet.lowBalanceWarning && (
            <div className="p-3 bg-red-500/10 border-b border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-300 font-medium">Saldo baixo</p>
                  <p className="text-xs text-red-400/80 mt-0.5">
                    Recarregue para continuar usando IA e renderização
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-3 flex gap-2">
            <button
              onClick={() => {
                setIsExpanded(false);
                onRecharge?.();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2
                       bg-violet-600 hover:bg-violet-500 rounded-md
                       text-sm font-medium transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Recarregar
            </button>
            <button
              onClick={() => {
                setIsExpanded(false);
                onOpenWallet?.();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2
                       bg-zinc-800 hover:bg-zinc-700 rounded-md
                       text-sm text-zinc-300 transition-colors"
            >
              Ver Detalhes
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Low Balance Modal (non-blocking) */}
      {showLowBalanceAlert && wallet.lowBalanceWarning && (
        <div className="fixed bottom-20 right-4 w-80 bg-zinc-900 border border-red-500/30 
                      rounded-lg shadow-2xl p-4 animate-in slide-in-from-right-5 z-50">
          <button
            onClick={() => setShowLowBalanceAlert(false)}
            className="absolute top-2 right-2 p-1 hover:bg-zinc-800 rounded"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Créditos acabando</h4>
              <p className="text-sm text-zinc-400 mt-1">
                Restam apenas {wallet.available.toLocaleString('pt-BR')} créditos. 
                Recarregue para continuar criando.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowLowBalanceAlert(false);
                    onRecharge?.();
                  }}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 
                           rounded text-sm font-medium transition-colors"
                >
                  Recarregar agora
                </button>
                <button
                  onClick={() => setShowLowBalanceAlert(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 
                           rounded text-sm text-zinc-300 transition-colors"
                >
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletStatusWidget;
