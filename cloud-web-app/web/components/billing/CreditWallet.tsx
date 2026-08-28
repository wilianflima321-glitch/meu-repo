'use client';

/**
 * CreditWallet - Complete credit wallet UI
 *
 * Panel that shows balance, history, and top-up options.
 * Integrates with /api/wallet/* endpoints.
 *
 * @see ALINHAMENTO_PLANO_NEGOCIO_E_CUSTOS_2026.md - Section 4
 */
import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Wallet,
  Coins,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  CreditCard,
  Gift,
  RefreshCw,
  AlertCircle,
  Crown,
  Sparkles,
} from 'lucide-react';
import { CreditWalletPurchasePanel } from '@/components/billing/CreditWalletPurchasePanel';

// ============================================================================
// TYPES
// ============================================================================

interface WalletSummary {
  balance: number;
  reserved: number;
  available: number;
  monthlyUsage: number;
  monthlyLimit: number;
  plan: string;
  bonusCredits: number;
}

interface Transaction {
  id: string;
  type: 'usage' | 'purchase' | 'bonus' | 'refund' | 'subscription';
  amount: number;
  description: string;
  operation?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

interface CreditWalletProps {
  onPurchase?: (packageId: string) => void;
  onUpgrade?: () => void;
  className?: string;
}

type CreditWalletTabId = 'overview' | 'history' | 'purchase';

const CREDIT_WALLET_TABS: Array<{ id: CreditWalletTabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <Coins className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
  { id: 'purchase', label: 'Buy Credits', icon: <CreditCard className="w-4 h-4" /> },
];

// ============================================================================
// COMPONENTE: STAT CARD
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'warning' | 'success' | 'danger';
}

function StatCard({ icon, label, value, subValue, trend, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'bg-[var(--aethel-surface-tertiary)] border-[var(--aethel-border-primary)]',
    warning: 'bg-[var(--aethel-warning)]/10 border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
    success: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]',
    danger: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
  };

  const iconColors = {
    default: 'text-[var(--aethel-text-tertiary)]',
    warning: 'text-[var(--aethel-warning-light)]',
    success: 'text-[var(--aethel-success-light)]',
    danger: 'text-[var(--aethel-error)]',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={iconColors[color]}>{icon}</span>
        {trend && (
          <span className={trend === 'up' ? 'text-[var(--aethel-success-light)]' : trend === 'down' ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-tertiary)]'}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">{value}</p>
      <p className="text-sm text-[var(--aethel-text-tertiary)]">{label}</p>
      {subValue && <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">{subValue}</p>}
    </div>
  );
}

// ============================================================================
// COMPONENTE: TRANSACTION ITEM
// ============================================================================

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.type === 'purchase' || transaction.type === 'bonus' || transaction.type === 'refund';

  const typeIcons = {
    usage: <Zap className="w-4 h-4 text-[var(--aethel-info-light)]" />,
    purchase: <CreditCard className="w-4 h-4 text-[var(--aethel-success-light)]" />,
    bonus: <Gift className="w-4 h-4 text-[var(--aethel-info-light)]" />,
    refund: <RefreshCw className="w-4 h-4 text-[var(--aethel-warning-light)]" />,
    subscription: <Crown className="w-4 h-4 text-[var(--aethel-warning-light)]" />,
  };

  const statusColors = {
    completed: 'text-[var(--aethel-success-light)]',
    pending: 'text-[var(--aethel-warning-light)]',
    failed: 'text-[var(--aethel-error)]',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--aethel-border-primary)] last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--aethel-surface-tertiary)] flex items-center justify-center">
          {typeIcons[transaction.type]}
        </div>
        <div>
          <p className="text-sm text-[var(--aethel-text-primary)]">{transaction.description}</p>
          <div className="flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
            <span>{new Date(transaction.timestamp).toLocaleDateString()}</span>
            {transaction.operation && (
              <>
                <span>-</span>
                <span>{transaction.operation}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-medium ${isPositive ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-text-secondary)]'}`}>
          {isPositive ? '+' : '-'}{Math.abs(transaction.amount)}
        </p>
        <p className={`text-xs ${statusColors[transaction.status]}`}>
          {transaction.status === 'completed'
            ? 'Completed'
            : transaction.status === 'pending'
              ? 'Pending'
              : 'Failed'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: CREDIT WALLET
// ============================================================================

export function CreditWallet({ onPurchase, onUpgrade, className }: CreditWalletProps) {
  const [activeTab, setActiveTab] = useState<CreditWalletTabId>('overview');

  // Fetch wallet data
  const { data: wallet, error: walletError, mutate: refreshWallet } = useSWR<WalletSummary>(
    '/api/wallet/summary',
    { refreshInterval: 30000 }
  );

  const { data: transactionsData, error: transactionsError } = useSWR<{ transactions: Transaction[] }>(
    activeTab === 'history' ? '/api/wallet/transactions?limit=20' : null
  );

  const transactions = transactionsData?.transactions || [];

  // Calculate usage percentage
  const usagePercent = wallet
    ? Math.round((wallet.monthlyUsage / wallet.monthlyLimit) * 100)
    : 0;

  const isLowBalance = wallet && wallet.available < 100;

  // Loading state
  if (!wallet && !walletError) {
    return (
      <div className={`bg-[var(--aethel-surface-secondary)] rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--aethel-surface-tertiary)] rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-[var(--aethel-surface-tertiary)] rounded-xl" />
            <div className="h-24 bg-[var(--aethel-surface-tertiary)] rounded-xl" />
            <div className="h-24 bg-[var(--aethel-surface-tertiary)] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (walletError) {
    return (
      <div className={`bg-[var(--aethel-surface-secondary)] rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-3 text-[var(--aethel-error)]">
          <AlertCircle className="w-5 h-5" />
          <p>Error loading wallet</p>
          <button type="button" onClick={() => refreshWallet()} className="text-sm underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--aethel-surface-secondary)] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[var(--aethel-warning-light)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--aethel-text-primary)]">Credit Wallet</h2>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Plan: {wallet?.plan}</p>
          </div>
        </div>

        {/* Low balance warning */}
        {isLowBalance && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] rounded-lg text-[var(--aethel-warning-light)] text-sm">
            <AlertCircle className="w-4 h-4" />
            Low balance
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        {CREDIT_WALLET_TABS.map((tab) => (
          <button type="button" aria-label={`Open tab ${tab.label.toLowerCase()} in wallet`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && wallet && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={<Coins className="w-5 h-5" />}
                label="Available"
                value={wallet.available.toLocaleString()}
                subValue={wallet.reserved > 0 ? `${wallet.reserved} reserved` : undefined}
                color={isLowBalance ? 'warning' : 'default'}
              />
              <StatCard
                icon={<Zap className="w-5 h-5" />}
                label="Monthly Usage"
                value={wallet.monthlyUsage.toLocaleString()}
                subValue={`of ${wallet.monthlyLimit.toLocaleString()}`}
                trend={usagePercent > 80 ? 'up' : 'neutral'}
                color={usagePercent > 90 ? 'danger' : usagePercent > 70 ? 'warning' : 'default'}
              />
              <StatCard
                icon={<Gift className="w-5 h-5" />}
                label="Bonus"
                value={wallet.bonusCredits.toLocaleString()}
                color="success"
              />
            </div>

            {/* Usage Progress */}
            <div className="p-4 bg-[var(--aethel-surface-tertiary)] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--aethel-text-tertiary)]">Monthly plan usage</span>
                <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{usagePercent}%</span>
              </div>
              <div className="h-2 bg-[var(--aethel-surface-quaternary)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    usagePercent > 90 ? 'bg-[var(--aethel-error)]' : usagePercent > 70 ? 'bg-[var(--aethel-warning)]' : 'bg-[var(--aethel-success)]'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--aethel-text-tertiary)] mt-2">
                {wallet.monthlyLimit - wallet.monthlyUsage} credits remaining this cycle
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" aria-label="Go to credit purchase"
                onClick={() => setActiveTab('purchase')}
                className="flex items-center justify-center gap-2 p-3 bg-[var(--aethel-primary)] hover:brightness-110 rounded-xl text-[var(--aethel-text-primary)] font-medium transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Buy credits
              </button>
              {onUpgrade && (
                <button type="button" aria-label="Upgrade plan"
                  onClick={onUpgrade}
                  className="flex items-center justify-center gap-2 p-3 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded-xl text-[var(--aethel-text-primary)] font-medium transition-colors"
                >
                  <Crown className="w-5 h-5 text-[var(--aethel-warning-light)]" />
                  Plan upgrade
                </button>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-[var(--aethel-text-tertiary)]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'purchase' && (
          <CreditWalletPurchasePanel onPurchased={onPurchase} />
        )}
      </div>
    </div>
  );
}

export default CreditWallet;
