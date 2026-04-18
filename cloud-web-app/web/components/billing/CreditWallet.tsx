/**
 * CreditWallet - UI Completa de Carteira de creditos
 *
 * Painel que mostra saldo, histórico e opções de recarga.
 * Integra com /api/wallet/* endpoints.
 *
 * @see ALINHAMENTO_PLANO_NEGOCIO_E_CUSTOS_2026.md - Seção 4
 */

'use client';

import React, { useState, useCallback } from 'react';
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
  ChevronRight,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Crown,
  ArrowUpRight,
} from 'lucide-react';

// ============================================================================
// TIPOS
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

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
}

interface CreditWalletProps {
  onPurchase?: (packageId: string) => void;
  onUpgrade?: () => void;
  className?: string;
}

// ============================================================================
// PACOTES DE CREDITOS
// ============================================================================

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack-500',
    name: 'Pacote inicial',
    credits: 500,
    price: 9.99,
    bonus: 0,
  },
  {
    id: 'pack-1500',
    name: 'Pacote criador',
    credits: 1500,
    price: 24.99,
    bonus: 100,
    popular: true,
  },
  {
    id: 'pack-5000',
    name: 'Pacote pro',
    credits: 5000,
    price: 74.99,
    bonus: 500,
    bestValue: true,
  },
  {
    id: 'pack-15000',
    name: 'Pacote studio',
    credits: 15000,
    price: 199.99,
    bonus: 2000,
  },
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
          {transaction.status === 'completed' ? 'Concluido' : transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: PACKAGE CARD
// ============================================================================

interface PackageCardProps {
  pkg: CreditPackage;
  onSelect: () => void;
  isLoading?: boolean;
}

function PackageCard({ pkg, onSelect, isLoading }: PackageCardProps) {
  return (
    <button type="button" aria-label={`Selecionar pacote ${pkg.name}`}
      onClick={onSelect}
      disabled={isLoading}
      className={`relative p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${pkg.popular
 ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
 : pkg.bestValue
 ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]'
 : 'bg-[var(--aethel-surface-tertiary)] border-[var(--aethel-border-primary)] hover:border-[var(--aethel-border-secondary)]'
 }`}
    >
      {/* Badge */}
      {(pkg.popular || pkg.bestValue) && (
        <span className={`absolute -top-2 left-4 px-2 py-0.5 text-xs font-medium rounded-full ${pkg.popular ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'}`}>
          {pkg.popular ? 'Popular' : 'Melhor valor'}
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-[var(--aethel-text-primary)]">{pkg.name}</h4>
          <p className="text-2xl font-bold text-[var(--aethel-text-primary)] mt-1">
            {pkg.credits.toLocaleString()}
            <span className="text-sm font-normal text-[var(--aethel-text-tertiary)] ml-1">creditos</span>
          </p>
        </div>
        <Coins className={`w-8 h-8 ${pkg.popular ? 'text-[var(--aethel-info-light)]' : pkg.bestValue ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning-light)]'}`} />
      </div>

      {pkg.bonus > 0 && (
        <div className="flex items-center gap-1 text-sm text-[var(--aethel-success-light)] mb-3">
          <Gift className="w-4 h-4" />
          +{pkg.bonus} bonus
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-[var(--aethel-border-primary)]">
        <span className="text-xl font-bold text-[var(--aethel-text-primary)]">
          ${pkg.price.toFixed(2)}
        </span>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          ${(pkg.price / (pkg.credits + pkg.bonus) * 100).toFixed(2)}/100cr
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: CREDIT WALLET
// ============================================================================

export function CreditWallet({ onPurchase, onUpgrade, className }: CreditWalletProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'purchase'>('overview');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

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

  // Handle purchase
  const handlePurchase = useCallback(async (packageId: string) => {
    setIsPurchasing(true);
    setSelectedPackage(packageId);

    try {
      const response = await fetch('/api/wallet/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        throw new Error('Compra falhou');
      }

      const { checkoutUrl } = await response.json();

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        await refreshWallet();
        setActiveTab('overview');
      }

      if (onPurchase) onPurchase(packageId);
    } catch (err) {
      console.error('Erro de compra:', err);
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
  }, [onPurchase, refreshWallet]);

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
          <p>Erro ao carregar carteira</p>
          <button type="button" onClick={() => refreshWallet()} className="text-sm underline">
            Tentar novamente
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
            <h2 className="font-semibold text-[var(--aethel-text-primary)]">Carteira de creditos</h2>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Plano {wallet?.plan}</p>
          </div>
        </div>

        {/* Low balance warning */}
        {isLowBalance && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] rounded-lg text-[var(--aethel-warning-light)] text-sm">
            <AlertCircle className="w-4 h-4" />
            Saldo baixo
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        {[
          { id: 'overview', label: 'Resumo', icon: <Coins className="w-4 h-4" /> },
          { id: 'history', label: 'Historico', icon: <Clock className="w-4 h-4" /> },
          { id: 'purchase', label: 'Comprar', icon: <CreditCard className="w-4 h-4" /> },
        ].map((tab) => (
          <button type="button" aria-label={`Abrir aba ${tab.label.toLowerCase()} da carteira`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
 ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
 }`}
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
                label="Disponivel"
                value={wallet.available.toLocaleString()}
                subValue={wallet.reserved > 0 ? `${wallet.reserved} reservados` : undefined}
                color={isLowBalance ? 'warning' : 'default'}
              />
              <StatCard
                icon={<Zap className="w-5 h-5" />}
                label="Uso Mensal"
                value={wallet.monthlyUsage.toLocaleString()}
                subValue={`de ${wallet.monthlyLimit.toLocaleString()}`}
                trend={usagePercent > 80 ? 'up' : 'neutral'}
                color={usagePercent > 90 ? 'danger' : usagePercent > 70 ? 'warning' : 'default'}
              />
              <StatCard
                icon={<Gift className="w-5 h-5" />}
                label="bonus"
                value={wallet.bonusCredits.toLocaleString()}
                color="success"
              />
            </div>

            {/* Usage Progress */}
            <div className="p-4 bg-[var(--aethel-surface-tertiary)] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--aethel-text-tertiary)]">Uso mensal do plano</span>
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
                {wallet.monthlyLimit - wallet.monthlyUsage} creditos restantes neste ciclo
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" aria-label="Ir para compra de creditos"
                onClick={() => setActiveTab('purchase')}
                className="flex items-center justify-center gap-2 p-3 bg-[var(--aethel-primary)] hover:brightness-110 rounded-xl text-[var(--aethel-text-primary)] font-medium transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Comprar creditos
              </button>
              {onUpgrade && (
                <button type="button" aria-label="Fazer upgrade do plano"
                  onClick={onUpgrade}
                  className="flex items-center justify-center gap-2 p-3 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded-xl text-[var(--aethel-text-primary)] font-medium transition-colors"
                >
                  <Crown className="w-5 h-5 text-[var(--aethel-warning-light)]" />
                  Upgrade de Plano
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
                <p>Nenhuma transacao ainda</p>
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

        {/* Purchase Tab */}
        {activeTab === 'purchase' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--aethel-text-tertiary)]">
              Escolha um pacote de creditos para recarregar sua carteira.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onSelect={() => handlePurchase(pkg.id)}
                  isLoading={isPurchasing && selectedPackage === pkg.id}
                />
              ))}
            </div>

            <div className="p-4 bg-[var(--aethel-surface-tertiary)] rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--aethel-text-tertiary)] mt-0.5" />
                <div className="text-sm text-[var(--aethel-text-tertiary)]">
                  <p className="font-medium text-[var(--aethel-text-secondary)] mb-1">Sobre os creditos</p>
                  <ul className="space-y-1 text-xs">
                    <li>- creditos não expiram enquanto a conta estiver ativa</li>
                    <li>- Chat simples: 1 crédito / Squad Task: ~20 creditos</li>
                    <li>- bonus são adicionados automaticamente na compra</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreditWallet;



