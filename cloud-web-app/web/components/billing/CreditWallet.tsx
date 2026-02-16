/**
 * CreditWallet - UI Completa de Carteira de Créditos
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
// PACOTES DE CRÉDITOS
// ============================================================================

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack-500',
    name: 'Starter Pack',
    credits: 500,
    price: 9.99,
    bonus: 0,
  },
  {
    id: 'pack-1500',
    name: 'Creator Pack',
    credits: 1500,
    price: 24.99,
    bonus: 100,
    popular: true,
  },
  {
    id: 'pack-5000',
    name: 'Pro Pack',
    credits: 5000,
    price: 74.99,
    bonus: 500,
    bestValue: true,
  },
  {
    id: 'pack-15000',
    name: 'Studio Pack',
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
    default: 'bg-zinc-800 border-zinc-700',
    warning: 'bg-amber-500/10 border-amber-500/30',
    success: 'bg-green-500/10 border-green-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
  };

  const iconColors = {
    default: 'text-zinc-400',
    warning: 'text-amber-400',
    success: 'text-green-400',
    danger: 'text-red-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={iconColors[color]}>{icon}</span>
        {trend && (
          <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {subValue && <p className="text-xs text-zinc-600 mt-1">{subValue}</p>}
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
    usage: <Zap className="w-4 h-4 text-blue-400" />,
    purchase: <CreditCard className="w-4 h-4 text-green-400" />,
    bonus: <Gift className="w-4 h-4 text-blue-400" />,
    refund: <RefreshCw className="w-4 h-4 text-amber-400" />,
    subscription: <Crown className="w-4 h-4 text-amber-400" />,
  };

  const statusColors = {
    completed: 'text-green-400',
    pending: 'text-amber-400',
    failed: 'text-red-400',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
          {typeIcons[transaction.type]}
        </div>
        <div>
          <p className="text-sm text-white">{transaction.description}</p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{new Date(transaction.timestamp).toLocaleDateString()}</span>
            {transaction.operation && (
              <>
                <span>•</span>
                <span>{transaction.operation}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-medium ${isPositive ? 'text-green-400' : 'text-zinc-300'}`}>
          {isPositive ? '+' : '-'}{Math.abs(transaction.amount)}
        </p>
        <p className={`text-xs ${statusColors[transaction.status]}`}>
          {transaction.status === 'completed' ? 'Concluído' : transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
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
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={`
        relative p-4 rounded-xl border text-left transition-all hover:scale-[1.02]
        ${pkg.popular 
          ? 'bg-blue-500/10 border-purple-500/50 ring-1 ring-sky-500/30' 
          : pkg.bestValue 
          ? 'bg-green-500/10 border-green-500/50 ring-1 ring-green-500/30'
          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
        }
      `}
    >
      {/* Badge */}
      {(pkg.popular || pkg.bestValue) && (
        <span className={`
          absolute -top-2 left-4 px-2 py-0.5 text-xs font-medium rounded-full
          ${pkg.popular ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}
        `}>
          {pkg.popular ? '⭐ Popular' : '💎 Best Value'}
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-white">{pkg.name}</h4>
          <p className="text-2xl font-bold text-white mt-1">
            {pkg.credits.toLocaleString()}
            <span className="text-sm font-normal text-zinc-400 ml-1">créditos</span>
          </p>
        </div>
        <Coins className={`w-8 h-8 ${pkg.popular ? 'text-blue-400' : pkg.bestValue ? 'text-green-400' : 'text-amber-400'}`} />
      </div>

      {pkg.bonus > 0 && (
        <div className="flex items-center gap-1 text-sm text-green-400 mb-3">
          <Gift className="w-4 h-4" />
          +{pkg.bonus} bônus
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
        <span className="text-xl font-bold text-white">
          ${pkg.price.toFixed(2)}
        </span>
        <span className="text-xs text-zinc-500">
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
        throw new Error('Purchase failed');
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
      console.error('Purchase error:', err);
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
  }, [onPurchase, refreshWallet]);

  // Loading state
  if (!wallet && !walletError) {
    return (
      <div className={`bg-zinc-900 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-zinc-800 rounded-xl" />
            <div className="h-24 bg-zinc-800 rounded-xl" />
            <div className="h-24 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (walletError) {
    return (
      <div className={`bg-zinc-900 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>Erro ao carregar carteira</p>
          <button onClick={() => refreshWallet()} className="text-sm underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Carteira de Créditos</h2>
            <p className="text-xs text-zinc-500">Plano {wallet?.plan}</p>
          </div>
        </div>
        
        {/* Low balance warning */}
        {isLowBalance && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            Saldo baixo
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {[
          { id: 'overview', label: 'Resumo', icon: <Coins className="w-4 h-4" /> },
          { id: 'history', label: 'Histórico', icon: <Clock className="w-4 h-4" /> },
          { id: 'purchase', label: 'Comprar', icon: <CreditCard className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-white border-b-2 border-purple-500'
                : 'text-zinc-500 hover:text-zinc-300'
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
                label="Disponível"
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
                label="Bônus"
                value={wallet.bonusCredits.toLocaleString()}
                color="success"
              />
            </div>

            {/* Usage Progress */}
            <div className="p-4 bg-zinc-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Uso mensal do plano</span>
                <span className="text-sm font-medium text-white">{usagePercent}%</span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {wallet.monthlyLimit - wallet.monthlyUsage} créditos restantes neste ciclo
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('purchase')}
                className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Comprar Créditos
              </button>
              {onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium transition-colors"
                >
                  <Crown className="w-5 h-5 text-amber-400" />
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
              <div className="text-center py-8 text-zinc-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma transação ainda</p>
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
            <p className="text-sm text-zinc-400">
              Escolha um pacote de créditos para recarregar sua carteira.
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

            <div className="p-4 bg-zinc-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-zinc-500 mt-0.5" />
                <div className="text-sm text-zinc-400">
                  <p className="font-medium text-zinc-300 mb-1">Sobre os créditos</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Créditos não expiram enquanto a conta estiver ativa</li>
                    <li>• Chat simples: 1 crédito / Squad Task: ~20 créditos</li>
                    <li>• Bônus são adicionados automaticamente na compra</li>
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
