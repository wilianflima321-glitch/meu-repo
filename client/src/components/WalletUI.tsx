/**
 * AETHEL ENGINE - Wallet UI Component
 * 
 * Componente React para exibição e gerenciamento da wallet de tokens.
 * Mostra saldo de render tokens e AI tokens, histórico de transações.
 * 
 * Features:
 * - Exibição de saldo em tempo real
 * - Histórico de transações
 * - Compra de tokens
 * - Transferência entre wallets
 * - Gráficos de uso
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenBalance {
  renderTokens: number;
  aiTokens: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'transfer' | 'purchase';
  tokenType: 'render' | 'ai';
  amount: number;
  timestamp: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface WalletStats {
  totalSpent: {
    render: number;
    ai: number;
  };
  averageDaily: {
    render: number;
    ai: number;
  };
  projectedRunout?: {
    render: Date | null;
    ai: Date | null;
  };
}

interface WalletProps {
  apiEndpoint?: string;
  userId?: string;
  className?: string;
  theme?: 'dark' | 'light';
  compact?: boolean;
  onError?: (error: Error) => void;
  onTransactionComplete?: (tx: Transaction) => void;
}

// ============================================================================
// API HOOK
// ============================================================================

const useWalletAPI = (endpoint: string) => {
  const fetchBalance = async (): Promise<TokenBalance> => {
    const response = await fetch(`${endpoint}/wallet/balance`);
    if (!response.ok) throw new Error('Failed to fetch balance');
    return response.json();
  };

  const fetchTransactions = async (limit = 50): Promise<Transaction[]> => {
    const response = await fetch(`${endpoint}/wallet/transactions?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  };

  const fetchStats = async (): Promise<WalletStats> => {
    const response = await fetch(`${endpoint}/wallet/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  };

  const purchaseTokens = async (tokenType: 'render' | 'ai', amount: number): Promise<Transaction> => {
    const response = await fetch(`${endpoint}/wallet/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenType, amount })
    });
    if (!response.ok) throw new Error('Purchase failed');
    return response.json();
  };

  return { fetchBalance, fetchTransactions, fetchStats, purchaseTokens };
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface BalanceCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  onClick?: () => void;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ label, value, icon, color, trend, onClick }) => {
  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  return (
    <div 
      className={`wallet-balance-card ${onClick ? 'clickable' : ''}`}
      style={{ borderColor: color }}
      onClick={onClick}
    >
      <div className="balance-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="balance-info">
        <span className="balance-label">{label}</span>
        <span className="balance-value">{formatValue(value)}</span>
        {trend !== undefined && (
          <span className={`balance-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

interface TransactionRowProps {
  transaction: Transaction;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: Transaction['status']) => {
    const colors = {
      pending: '#f59e0b',
      completed: '#10b981',
      failed: '#ef4444'
    };
    return (
      <span className="tx-status" style={{ backgroundColor: colors[status] }}>
        {status}
      </span>
    );
  };

  const getTypeIcon = (type: Transaction['type']) => {
    const icons = {
      credit: '↓',
      debit: '↑',
      transfer: '⇄',
      purchase: '💳'
    };
    return icons[type];
  };

  return (
    <div className="transaction-row">
      <div className="tx-icon">{getTypeIcon(transaction.type)}</div>
      <div className="tx-details">
        <span className="tx-description">{transaction.description}</span>
        <span className="tx-date">{formatDate(transaction.timestamp)}</span>
      </div>
      <div className="tx-amount">
        <span className={transaction.type === 'credit' || transaction.type === 'purchase' ? 'positive' : 'negative'}>
          {transaction.type === 'debit' ? '-' : '+'}{transaction.amount}
        </span>
        <span className="tx-token-type">{transaction.tokenType}</span>
      </div>
      {getStatusBadge(transaction.status)}
    </div>
  );
};

interface UsageChartProps {
  data: { date: string; render: number; ai: number }[];
}

const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.flatMap(d => [d.render, d.ai]));
  
  return (
    <div className="usage-chart">
      <div className="chart-bars">
        {data.map((item, index) => (
          <div key={index} className="chart-bar-group">
            <div 
              className="chart-bar render" 
              style={{ height: `${(item.render / maxValue) * 100}%` }}
              title={`Render: ${item.render}`}
            />
            <div 
              className="chart-bar ai" 
              style={{ height: `${(item.ai / maxValue) * 100}%` }}
              title={`AI: ${item.ai}`}
            />
            <span className="chart-label">{new Date(item.date).getDate()}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-color render" /> Render</span>
        <span className="legend-item"><span className="legend-color ai" /> AI</span>
      </div>
    </div>
  );
};

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (tokenType: 'render' | 'ai', amount: number) => Promise<void>;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, onPurchase }) => {
  const [tokenType, setTokenType] = useState<'render' | 'ai'>('render');
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);

  const packages = [
    { amount: 1000, price: 9.99, bonus: 0 },
    { amount: 5000, price: 39.99, bonus: 10 },
    { amount: 10000, price: 69.99, bonus: 20 },
    { amount: 50000, price: 299.99, bonus: 30 }
  ];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await onPurchase(tokenType, amount);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Comprar Tokens</h2>
        
        <div className="token-type-selector">
          <button 
            className={tokenType === 'render' ? 'active' : ''}
            onClick={() => setTokenType('render')}
          >
            🎨 Render Tokens
          </button>
          <button 
            className={tokenType === 'ai' ? 'active' : ''}
            onClick={() => setTokenType('ai')}
          >
            🤖 AI Tokens
          </button>
        </div>

        <div className="package-grid">
          {packages.map(pkg => (
            <div 
              key={pkg.amount}
              className={`package-card ${amount === pkg.amount ? 'selected' : ''}`}
              onClick={() => setAmount(pkg.amount)}
            >
              <span className="package-amount">{pkg.amount.toLocaleString()}</span>
              <span className="package-price">R$ {pkg.price.toFixed(2)}</span>
              {pkg.bonus > 0 && (
                <span className="package-bonus">+{pkg.bonus}% bônus</span>
              )}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button 
            className="btn-primary" 
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? 'Processando...' : `Comprar ${amount.toLocaleString()} tokens`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN WALLET COMPONENT
// ============================================================================

export const WalletUI: React.FC<WalletProps> = ({
  apiEndpoint = '/api',
  className = '',
  theme = 'dark',
  compact = false,
  onError,
  onTransactionComplete
}) => {
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'stats'>('overview');

  const api = useWalletAPI(apiEndpoint);

  // Mock data for usage chart
  const usageData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toISOString(),
      render: Math.floor(Math.random() * 500) + 100,
      ai: Math.floor(Math.random() * 300) + 50
    };
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [balanceData, txData, statsData] = await Promise.all([
        api.fetchBalance(),
        api.fetchTransactions(20),
        api.fetchStats()
      ]);
      
      setBalance(balanceData);
      setTransactions(txData);
      setStats(statsData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    } finally {
      setLoading(false);
    }
  }, [api, onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePurchase = async (tokenType: 'render' | 'ai', amount: number) => {
    try {
      const tx = await api.purchaseTokens(tokenType, amount);
      setTransactions(prev => [tx, ...prev]);
      
      // Atualizar saldo
      setBalance(prev => prev ? {
        ...prev,
        [tokenType === 'render' ? 'renderTokens' : 'aiTokens']: 
          prev[tokenType === 'render' ? 'renderTokens' : 'aiTokens'] + amount
      } : null);
      
      onTransactionComplete?.(tx);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Falha na compra'));
      throw err;
    }
  };

  if (loading) {
    return (
      <div className={`wallet-container ${theme} ${className}`}>
        <div className="wallet-loading">
          <div className="spinner" />
          <span>Carregando wallet...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`wallet-container ${theme} ${className}`}>
        <div className="wallet-error">
          <span>⚠️ {error}</span>
          <button onClick={loadData}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`wallet-compact ${theme} ${className}`}>
        <div className="compact-balance">
          <span className="token render">🎨 {balance?.renderTokens.toLocaleString()}</span>
          <span className="token ai">🤖 {balance?.aiTokens.toLocaleString()}</span>
        </div>
        <button className="compact-buy" onClick={() => setShowPurchaseModal(true)}>+</button>
        
        <PurchaseModal 
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onPurchase={handlePurchase}
        />
      </div>
    );
  }

  return (
    <div className={`wallet-container ${theme} ${className}`}>
      <div className="wallet-header">
        <h2>Minha Wallet</h2>
        <button className="btn-primary" onClick={() => setShowPurchaseModal(true)}>
          Comprar Tokens
        </button>
      </div>

      <div className="wallet-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Visão Geral
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          Histórico
        </button>
        <button 
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Estatísticas
        </button>
      </div>

      <div className="wallet-content">
        {activeTab === 'overview' && (
          <>
            <div className="balance-cards">
              <BalanceCard
                label="Render Tokens"
                value={balance?.renderTokens || 0}
                icon={<span>🎨</span>}
                color="#8b5cf6"
                trend={5.2}
              />
              <BalanceCard
                label="AI Tokens"
                value={balance?.aiTokens || 0}
                icon={<span>🤖</span>}
                color="#06b6d4"
                trend={-2.1}
              />
            </div>

            <div className="usage-section">
              <h3>Uso dos Últimos 7 Dias</h3>
              <UsageChart data={usageData} />
            </div>

            <div className="recent-transactions">
              <h3>Transações Recentes</h3>
              {transactions.slice(0, 5).map(tx => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
              {transactions.length > 5 && (
                <button 
                  className="view-all"
                  onClick={() => setActiveTab('history')}
                >
                  Ver todas ({transactions.length})
                </button>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="transactions-list">
            {transactions.length === 0 ? (
              <div className="empty-state">
                <span>📭</span>
                <p>Nenhuma transação ainda</p>
              </div>
            ) : (
              transactions.map(tx => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Gasto (Render)</span>
              <span className="stat-value">{stats.totalSpent.render.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Gasto (AI)</span>
              <span className="stat-value">{stats.totalSpent.ai.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Média Diária (Render)</span>
              <span className="stat-value">{stats.averageDaily.render.toFixed(0)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Média Diária (AI)</span>
              <span className="stat-value">{stats.averageDaily.ai.toFixed(0)}</span>
            </div>
            {stats.projectedRunout?.render && (
              <div className="stat-card warning">
                <span className="stat-label">Previsão Fim (Render)</span>
                <span className="stat-value">
                  {stats.projectedRunout.render.toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <PurchaseModal 
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchase={handlePurchase}
      />
    </div>
  );
};

// ============================================================================
// STYLES (CSS-in-JS)
// ============================================================================

export const WalletStyles = `
.wallet-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border-radius: 12px;
  padding: 24px;
  max-width: 800px;
}

.wallet-container.dark {
  background: #1a1a2e;
  color: #fff;
}

.wallet-container.light {
  background: #fff;
  color: #1a1a2e;
  border: 1px solid #e0e0e0;
}

.wallet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.wallet-header h2 {
  margin: 0;
  font-size: 24px;
}

.wallet-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 12px;
}

.wallet-tabs button {
  background: transparent;
  border: none;
  padding: 8px 16px;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.wallet-tabs button.active,
.wallet-tabs button:hover {
  opacity: 1;
  background: rgba(255,255,255,0.1);
}

.balance-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.wallet-balance-card {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 4px solid;
  transition: transform 0.2s;
}

.wallet-balance-card.clickable:hover {
  transform: translateY(-2px);
  cursor: pointer;
}

.balance-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.balance-info {
  display: flex;
  flex-direction: column;
}

.balance-label {
  font-size: 14px;
  opacity: 0.7;
}

.balance-value {
  font-size: 28px;
  font-weight: bold;
}

.balance-trend {
  font-size: 12px;
}

.balance-trend.positive { color: #10b981; }
.balance-trend.negative { color: #ef4444; }

.usage-section {
  margin-bottom: 24px;
}

.usage-section h3,
.recent-transactions h3 {
  font-size: 16px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.usage-chart {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 20px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 150px;
  margin-bottom: 12px;
}

.chart-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.chart-bar {
  width: 100%;
  max-width: 30px;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
}

.chart-bar.render { background: #8b5cf6; }
.chart-bar.ai { background: #06b6d4; }

.chart-label {
  font-size: 12px;
  opacity: 0.6;
}

.chart-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-color.render { background: #8b5cf6; }
.legend-color.ai { background: #06b6d4; }

.transaction-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  margin-bottom: 8px;
}

.tx-icon {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tx-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tx-description {
  font-size: 14px;
}

.tx-date {
  font-size: 12px;
  opacity: 0.6;
}

.tx-amount {
  text-align: right;
}

.tx-amount .positive { color: #10b981; }
.tx-amount .negative { color: #ef4444; }

.tx-token-type {
  display: block;
  font-size: 11px;
  opacity: 0.6;
  text-transform: uppercase;
}

.tx-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
  color: #fff;
}

.view-all {
  width: 100%;
  background: transparent;
  border: 1px dashed rgba(255,255,255,0.2);
  padding: 12px;
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.view-all:hover { opacity: 1; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-card {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-card.warning {
  border: 1px solid #f59e0b;
}

.stat-label {
  display: block;
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

/* Compact Mode */
.wallet-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 8px;
}

.wallet-compact.dark {
  background: rgba(0,0,0,0.3);
}

.compact-balance {
  display: flex;
  gap: 16px;
}

.compact-balance .token {
  font-size: 14px;
  font-weight: 500;
}

.compact-buy {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #8b5cf6;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
}

.modal-content h2 {
  margin: 0 0 24px;
}

.token-type-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.token-type-selector button {
  flex: 1;
  padding: 12px;
  border: 2px solid rgba(255,255,255,0.1);
  background: transparent;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.token-type-selector button.active {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.package-card {
  padding: 16px;
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.package-card.selected {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

.package-amount {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.package-price {
  display: block;
  font-size: 14px;
  opacity: 0.6;
  margin-top: 4px;
}

.package-bonus {
  display: inline-block;
  margin-top: 8px;
  padding: 2px 8px;
  background: #10b981;
  border-radius: 4px;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #8b5cf6;
  color: #fff;
}

.btn-primary:hover {
  background: #7c3aed;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
}

/* Loading & Error */
.wallet-loading, .wallet-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.wallet-error button {
  padding: 8px 16px;
  background: #8b5cf6;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 48px;
  opacity: 0.6;
}

.empty-state span {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export default WalletUI;
