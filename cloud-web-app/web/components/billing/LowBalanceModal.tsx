/**
 * LowBalanceModal - Modal Não-Intrusivo de Saldo Baixo
 * 
 * Aparece quando o saldo do usuário está crítico.
 * Design não-bloqueante com opção de "depois".
 * Animações suaves e não-agressivas.
 * 
 * @see ROADMAP_MONETIZACAO_XP_FINAL.md
 * 
 * @module components/billing/LowBalanceModal
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  AlertTriangle,
  CreditCard,
  Zap,
  Gift,
  Clock,
  X,
  ChevronRight,
  Sparkles,
  Shield,
  TrendingUp,
  Check,
  Star,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type BalanceLevel = 'low' | 'critical' | 'empty';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus?: number;
  popular?: boolean;
  savings?: number; // percentage
}

export interface LowBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPackage?: (pkg: CreditPackage) => void;
  onRemindLater?: () => void;
  balanceLevel: BalanceLevel;
  currentBalance: number;
  estimatedUsage?: number; // Minutes of work remaining
  packages?: CreditPackage[];
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 500, price: 9.99, currency: 'USD' },
  { id: 'popular', name: 'Popular', credits: 2000, price: 29.99, currency: 'USD', bonus: 200, popular: true, savings: 25 },
  { id: 'pro', name: 'Pro Pack', credits: 5000, price: 59.99, currency: 'USD', bonus: 750, savings: 40 },
  { id: 'enterprise', name: 'Enterprise', credits: 15000, price: 149.99, currency: 'USD', bonus: 3000, savings: 50 },
];

const BALANCE_MESSAGES: Record<BalanceLevel, { title: string; subtitle: string; color: string; icon: React.ReactNode }> = {
  low: {
    title: 'Créditos acabando',
    subtitle: 'Recarregue para continuar criando sem interrupções',
    color: 'text-amber-400',
    icon: <Clock className="w-6 h-6" />,
  },
  critical: {
    title: 'Saldo muito baixo',
    subtitle: 'Restam poucos créditos para operações de IA',
    color: 'text-orange-400',
    icon: <AlertTriangle className="w-6 h-6" />,
  },
  empty: {
    title: 'Créditos esgotados',
    subtitle: 'Recarregue para continuar usando recursos de IA',
    color: 'text-red-400',
    icon: <Coins className="w-6 h-6" />,
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PackageCardProps {
  pkg: CreditPackage;
  onSelect: (pkg: CreditPackage) => void;
  isSelected: boolean;
}

function PackageCard({ pkg, onSelect, isSelected }: PackageCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(pkg)}
      className={`
        relative p-4 rounded-xl border-2 transition-all text-left w-full
        ${isSelected 
          ? 'border-violet-500 bg-violet-500/10' 
          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
        }
        ${pkg.popular ? 'ring-2 ring-violet-500/30' : ''}
      `}
    >
      {/* Popular badge */}
      {pkg.popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 
                      px-2 py-0.5 bg-violet-600 rounded-full
                      text-[10px] font-semibold uppercase tracking-wider">
          Mais Popular
        </div>
      )}

      {/* Content */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white">{pkg.name}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-white">
              {pkg.credits.toLocaleString()}
            </span>
            <span className="text-sm text-zinc-400">créditos</span>
          </div>
          
          {pkg.bonus && (
            <div className="flex items-center gap-1 mt-1 text-emerald-400">
              <Gift className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                +{pkg.bonus.toLocaleString()} bônus
              </span>
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-white">
            ${pkg.price.toFixed(2)}
          </p>
          {pkg.savings && (
            <p className="text-xs text-emerald-400 font-medium">
              {pkg.savings}% economia
            </p>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 bg-violet-600 rounded-full 
                   flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}

function UsageEstimate({ minutes }: { minutes: number }) {
  if (minutes <= 0) {
    return (
      <p className="text-xs text-red-400">
        Você não tem créditos para operações de IA
      </p>
    );
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <p className="text-xs text-zinc-400">
      Estimativa: {hours > 0 ? `${hours}h ${mins}min` : `${mins} minutos`} de trabalho restante
    </p>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LowBalanceModal({
  isOpen,
  onClose,
  onSelectPackage,
  onRemindLater,
  balanceLevel,
  currentBalance,
  estimatedUsage = 0,
  packages = DEFAULT_PACKAGES,
  className = '',
}: LowBalanceModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const balanceInfo = BALANCE_MESSAGES[balanceLevel];

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPackage(packages.find(p => p.popular) || packages[0] || null);
    }
  }, [isOpen, packages]);

  const handleContinue = useCallback(async () => {
    if (!selectedPackage) return;
    
    setIsProcessing(true);
    try {
      await onSelectPackage?.(selectedPackage);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPackage, onSelectPackage]);

  const handleRemindLater = useCallback(() => {
    onRemindLater?.();
    onClose();
  }, [onRemindLater, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - clickable to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-full max-w-lg max-h-[90vh] overflow-y-auto
              bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50
              ${className}
            `}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-800 
                       rounded-lg transition-colors z-10"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>

            {/* Header */}
            <div className="p-6 pb-0">
              <div className="flex items-start gap-4">
                {/* Icon with animation */}
                <div className={`
                  relative w-14 h-14 rounded-2xl flex items-center justify-center
                  ${balanceLevel === 'empty' ? 'bg-red-500/20' 
                    : balanceLevel === 'critical' ? 'bg-orange-500/20' 
                    : 'bg-amber-500/20'}
                `}>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className={balanceInfo.color}
                  >
                    {balanceInfo.icon}
                  </motion.div>
                  
                  {/* Pulse effect */}
                  <motion.div
                    className={`absolute inset-0 rounded-2xl ${
                      balanceLevel === 'empty' ? 'bg-red-500/20'
                        : balanceLevel === 'critical' ? 'bg-orange-500/20'
                        : 'bg-amber-500/20'
                    }`}
                    animate={{ 
                      scale: [1, 1.3],
                      opacity: [0.5, 0] 
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </div>

                <div className="flex-1">
                  <h2 className={`text-xl font-bold ${balanceInfo.color}`}>
                    {balanceInfo.title}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {balanceInfo.subtitle}
                  </p>
                </div>
              </div>

              {/* Current balance display */}
              <div className="mt-4 p-3 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Saldo atual</span>
                  <div className="flex items-center gap-2">
                    <Coins className={`w-4 h-4 ${balanceInfo.color}`} />
                    <span className="text-lg font-bold text-white">
                      {currentBalance.toLocaleString()}
                    </span>
                    <span className="text-sm text-zinc-500">créditos</span>
                  </div>
                </div>
                <UsageEstimate minutes={estimatedUsage} />
              </div>
            </div>

            {/* Package selection */}
            <div className="p-6">
              <p className="text-sm font-medium text-zinc-300 mb-3">
                Escolha um pacote de créditos
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {packages.map(pkg => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    isSelected={selectedPackage?.id === pkg.id}
                    onSelect={setSelectedPackage}
                  />
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Pagamento seguro
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  Ativação instantânea
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  Sem expiração
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 space-y-3">
              <button
                onClick={handleContinue}
                disabled={!selectedPackage || isProcessing}
                className="w-full flex items-center justify-center gap-2 py-3
                         bg-gradient-to-r from-violet-600 to-fuchsia-600
                         hover:from-violet-500 hover:to-fuchsia-500
                         rounded-xl text-white font-semibold transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Recarregar Agora
                    {selectedPackage && (
                      <span className="opacity-80">
                        - ${selectedPackage.price.toFixed(2)}
                      </span>
                    )}
                  </>
                )}
              </button>

              <button
                onClick={handleRemindLater}
                className="w-full py-2.5 text-sm text-zinc-400 hover:text-zinc-300
                         transition-colors"
              >
                Lembrar mais tarde
              </button>
            </div>

            {/* Upgrade suggestion for heavy users */}
            {balanceLevel === 'critical' && (
              <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 
                            border border-violet-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-violet-300">
                      Você usa muitos créditos?
                    </p>
                    <p className="text-xs text-violet-400/70 mt-1">
                      Considere o plano Pro para créditos ilimitados por $49/mês
                    </p>
                    <button className="flex items-center gap-1 mt-2 text-xs font-medium 
                                     text-violet-400 hover:text-violet-300 transition-colors">
                      Ver planos
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// AUTO-MANAGED WRAPPER (Integrado com AethelProvider)
// ============================================================================

/**
 * LowBalanceModalAuto - Versão auto-gerenciada
 * Monitora o saldo automaticamente e exibe o modal quando necessário.
 * Use este componente no ClientLayout para funcionalidade automática.
 */
export function LowBalanceModalAuto() {
  const [isOpen, setIsOpen] = useState(false);
  const [balanceLevel, setBalanceLevel] = useState<BalanceLevel>('low');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [lastDismissTime, setLastDismissTime] = useState<number | null>(null);

  // Verifica saldo periodicamente
  useEffect(() => {
    const checkBalance = async () => {
      try {
        const res = await fetch('/api/wallet/summary');
        if (res.ok) {
          const data = await res.json();
          const balance = data.balance || 0;
          setCurrentBalance(balance);

          // Determinar nível de alerta
          let level: BalanceLevel = 'low';
          if (balance <= 0) level = 'empty';
          else if (balance < 50) level = 'critical';
          else if (balance < 200) level = 'low';
          else return; // Saldo ok, não mostrar modal

          setBalanceLevel(level);

          // Verificar se deve mostrar o modal
          const now = Date.now();
          const cooldownMs = level === 'empty' ? 60000 : // 1 min para empty
                             level === 'critical' ? 300000 : // 5 min para critical
                             600000; // 10 min para low

          if (!dismissed || (lastDismissTime && now - lastDismissTime > cooldownMs)) {
            setIsOpen(true);
            setDismissed(false);
          }
        }
      } catch (e) {
        // Silently fail - não interromper UX
      }
    };

    checkBalance();
    const interval = setInterval(checkBalance, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [dismissed, lastDismissTime]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setDismissed(true);
    setLastDismissTime(Date.now());
  }, []);

  const handleSelectPackage = useCallback(async (pkg: CreditPackage) => {
    // Redirecionar para checkout
    window.location.href = `/dashboard?tab=billing&package=${pkg.id}`;
  }, []);

  const handleRemindLater = useCallback(() => {
    handleClose();
    // Lembrar em 30 min
    setTimeout(() => {
      setDismissed(false);
    }, 30 * 60 * 1000);
  }, [handleClose]);

  return (
    <LowBalanceModal
      isOpen={isOpen}
      onClose={handleClose}
      onSelectPackage={handleSelectPackage}
      onRemindLater={handleRemindLater}
      balanceLevel={balanceLevel}
      currentBalance={currentBalance}
      estimatedUsage={Math.floor(currentBalance / 2)} // ~2 créditos/min estimado
    />
  );
}

export { LowBalanceModalAuto as LowBalanceModalWrapper };
export default LowBalanceModal;
