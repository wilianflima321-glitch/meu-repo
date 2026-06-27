'use client';

/**
 * LowBalanceModal - Non-intrusive low-balance modal
 *
 * Appears when the user credit balance is critical.
 * Non-blocking design with a later option.
 * Soft, non-aggressive animations.
 *
 * @see ROADMAP_MONETIZACAO_XP_FINAL.md
 *
 * @module components/billing/LowBalanceModal
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  { id: 'pro', name: 'Pro', credits: 5000, price: 59.99, currency: 'USD', bonus: 750, savings: 40 },
  { id: 'enterprise', name: 'Enterprise', credits: 15000, price: 149.99, currency: 'USD', bonus: 3000, savings: 50 },
];

const BALANCE_MESSAGES: Record<BalanceLevel, { title: string; subtitle: string; color: string; icon: React.ReactNode }> = {
  low: {
    title: 'Credits running low',
    subtitle: 'Reload to keep creating without interruptions',
    color: 'text-[var(--aethel-warning-light)]',
    icon: <Clock className="w-6 h-6" />,
  },
  critical: {
    title: 'Balance critically low',
    subtitle: 'Very few credits remain for AI operations',
    color: 'text-[var(--aethel-warning-light)]',
    icon: <AlertTriangle className="w-6 h-6" />,
  },
  empty: {
    title: 'Credits exhausted',
    subtitle: 'Reload to continue using AI features',
    color: 'text-[var(--aethel-error)]',
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
    <button
      type="button"
      onClick={() => onSelect(pkg)}
      className={`
        relative p-4 rounded-xl border-2 transition-all text-left w-full hover:scale-[1.01] active:scale-[0.99]
        ${isSelected
          ? 'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)]'
          : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] hover:border-[var(--aethel-border-secondary)]'
        }
        ${pkg.popular ? 'ring-2 ring-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]' : ''}
      `}
    >
      {/* Popular badge */}
      {pkg.popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2
                      px-2 py-0.5 bg-[var(--aethel-primary)] rounded-full
                      text-[10px] font-semibold uppercase tracking-wider">
                    Most Popular
        </div>
      )}

      {/* Content */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{pkg.name}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-[var(--aethel-text-primary)]">
              {pkg.credits.toLocaleString()}
            </span>
            <span className="text-sm text-[var(--aethel-text-tertiary)]">credits</span>
          </div>

          {pkg.bonus && (
            <div className="flex items-center gap-1 mt-1 text-[var(--aethel-success)]">
              <Gift className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                +{pkg.bonus.toLocaleString()} free bonus
              </span>
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-[var(--aethel-text-primary)]">
            ${pkg.price.toFixed(2)}
          </p>
          {pkg.savings && (
            <p className="text-xs text-[var(--aethel-success)] font-medium">
              {pkg.savings}% savings
            </p>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--aethel-primary)] rounded-full
                   flex items-center justify-center animate-in zoom-in-95 duration-150">
          <Check className="w-3 h-3 text-[var(--aethel-text-primary)]" />
        </div>
      )}
    </button>
  );
}

function UsageEstimate({ minutes }: { minutes: number }) {
  if (minutes <= 0) {
    return (
      <p className="text-xs text-[var(--aethel-error)]">
        No credits remaining for AI operations
      </p>
    );
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <p className="text-xs text-[var(--aethel-text-tertiary)]">
      Estimate: {hours > 0 ? `${hours}h ${mins}min` : `${mins} min`} of work remaining
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - clickable to close */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm z-50 animate-in fade-in-0 duration-150"
      />

      {/* Modal */}
      <div
        className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-full max-w-lg max-h-[90vh] overflow-y-auto
              bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-secondary)] rounded-2xl shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200
              ${className}
            `}
      >
            {/* Close button */}
            <button type="button" aria-label="Close low balance modal"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-[var(--aethel-surface-quaternary)]
                       rounded-lg transition-colors z-10"
            >
              <X className="w-5 h-5 text-[var(--aethel-text-tertiary)]" />
            </button>

            {/* Header */}
            <div className="p-6 pb-0">
              <div className="flex items-start gap-4">
                {/* Icon with animation */}
                <div className={`
                  relative w-14 h-14 rounded-2xl flex items-center justify-center
                  ${balanceLevel === 'empty' ? 'bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)]'
                    : balanceLevel === 'critical' ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)]'
                    : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]'}
                `}>
                  <div className={`${balanceInfo.color} animate-pulse`}>
                    {balanceInfo.icon}
                  </div>

                  {/* Pulse effect */}
                  <div
                    className={`absolute inset-0 rounded-2xl animate-ping ${
                      balanceLevel === 'empty' ? 'bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)]'
                        : balanceLevel === 'critical' ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)]'
                        : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]'
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <h2 className={`text-xl font-bold ${balanceInfo.color}`}>
                    {balanceInfo.title}
                  </h2>
                  <p className="text-sm text-[var(--aethel-text-tertiary)] mt-1">
                    {balanceInfo.subtitle}
                  </p>
                </div>
              </div>

              {/* Current balance display */}
              <div className="mt-4 p-3 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Current balance</span>
                  <div className="flex items-center gap-2">
                    <Coins className={`w-4 h-4 ${balanceInfo.color}`} />
                    <span className="text-lg font-bold text-[var(--aethel-text-primary)]">
                      {currentBalance.toLocaleString()}
                    </span>
                    <span className="text-sm text-[var(--aethel-text-tertiary)]">credits</span>
                  </div>
                </div>
                <UsageEstimate minutes={estimatedUsage} />
              </div>
            </div>

            {/* Package selection */}
            <div className="p-6">
              <p className="text-sm font-medium text-[var(--aethel-text-secondary)] mb-3">
                Choose a credit package
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
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[var(--aethel-text-tertiary)]">
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Secure payment
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  Instant activation
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  No expiration
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 space-y-3">
              <button type="button" aria-label="Reload credits now"
                onClick={handleContinue}
                disabled={!selectedPackage || isProcessing}
                className="w-full flex items-center justify-center gap-2 py-3
                         bg-[linear-gradient(120deg,var(--aethel-primary),var(--aethel-info))]
                         hover:brightness-110
                         rounded-xl text-[var(--aethel-text-primary)] font-semibold transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin">
                      <Sparkles className="w-5 h-5" />
                    </span>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Reload now
                    {selectedPackage && (
                      <span className="opacity-80">
                        - ${selectedPackage.price.toFixed(2)}
                      </span>
                    )}
                  </>
                )}
              </button>

              <button type="button" aria-label="Remind me later about low balance"
                onClick={handleRemindLater}
                className="w-full py-2.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]
                         transition-colors"
              >
                Remind me later
              </button>
            </div>

            {/* Upgrade suggestion for heavy users */}
            {balanceLevel === 'critical' && (
              <div className="mx-6 mb-6 p-4 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--aethel-primary)_18%,transparent),color-mix(in_srgb,var(--aethel-info)_18%,transparent))]
                            border border-[var(--aethel-primary)]/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-[var(--aethel-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--aethel-primary)]">
                      Do you use many credits?
                    </p>
                    <p className="text-xs text-[color-mix(in_srgb,var(--aethel-primary)_70%,transparent)] mt-1">
                      Consider the Pro plan for unlimited credits at $49/month
                    </p>
                    <button type="button" aria-label="View plans to upgrade credits" className="flex items-center gap-1 mt-2 text-xs font-medium
                                      text-[var(--aethel-primary)] hover:text-[var(--aethel-primary)] transition-colors">
                      View plans
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
      </div>
    </>
  );
}

// ============================================================================
// AUTO-MANAGED WRAPPER
// ============================================================================

/**
 * LowBalanceModalAuto watches wallet balance and opens the modal only when
 * the billing provider returns real balance data.
 */
export function LowBalanceModalAuto() {
  const [isOpen, setIsOpen] = useState(false);
  const [balanceLevel, setBalanceLevel] = useState<BalanceLevel>('low');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [lastDismissTime, setLastDismissTime] = useState<number | null>(null);
  const reminderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check balance periodically without claiming a provider is configured.
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
          else return; // Balance is healthy; do not show the modal

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
        // Silently fail without interrupting the UX
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
    if (reminderTimerRef.current) {
      clearTimeout(reminderTimerRef.current);
    }
    reminderTimerRef.current = setTimeout(() => {
      setDismissed(false);
    }, 30 * 60 * 1000);
  }, [handleClose]);

  useEffect(() => {
    return () => {
      if (reminderTimerRef.current) {
        clearTimeout(reminderTimerRef.current);
      }
    };
  }, []);

  return (
    <LowBalanceModal
      isOpen={isOpen}
      onClose={handleClose}
      onSelectPackage={handleSelectPackage}
      onRemindLater={handleRemindLater}
      balanceLevel={balanceLevel}
      currentBalance={currentBalance}
      estimatedUsage={Math.floor(currentBalance / 2)} // ~2 credits/min estimado
    />
  );
}

export { LowBalanceModalAuto as LowBalanceModalWrapper };
export default LowBalanceModal;
