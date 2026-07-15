'use client';

/**
 * CreditWallet purchase tab — packs from wallet-credit-packs (single source) + custom ≥$5.
 * Block 6B.4 UI — fail-closed on HELD Stripe; never treat null checkout as success.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Coins, CreditCard, Gift, Loader2 } from 'lucide-react';
import {
  WALLET_CREDIT_PACKS,
  WALLET_CUSTOM_TOPUP,
  creditsForCustomUsd,
  type WalletCreditPack,
} from '@/lib/billing/wallet-credit-packs';
import { createComponentLogger } from '@/lib/observability/logger';

const logger = createComponentLogger('CreditWalletPurchasePanel');

type UiPack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
};

function toUiPack(pack: WalletCreditPack): UiPack {
  return {
    id: pack.id,
    name: pack.name,
    credits: pack.credits,
    price: pack.priceUsd,
    bonus: pack.bonusCredits,
    popular: pack.id === 'pack-1500',
    bestValue: pack.id === 'pack-5000',
  };
}

type PurchaseResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; message: string; held?: boolean };

async function requestWalletCheckout(body: {
  packageId?: string;
  customUsd?: number;
}): Promise<PurchaseResult> {
  const response = await fetch('/api/wallet/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    checkoutUrl?: string | null;
    message?: string;
    error?: string;
    capabilityStatus?: string;
  };

  if (response.ok && typeof payload.checkoutUrl === 'string' && payload.checkoutUrl.length > 0) {
    return { ok: true, checkoutUrl: payload.checkoutUrl };
  }

  const held =
    response.status === 503 ||
    payload.capabilityStatus === 'HELD' ||
    payload.error === 'STRIPE_NOT_CONFIGURED';

  return {
    ok: false,
    held,
    message:
      payload.message ||
      (held
        ? 'Wallet purchase is held until Stripe is configured. Use BYOK or subscription pools — IDE stays unlocked.'
        : 'Could not start checkout. Try again or contact support.'),
  };
}

function PackageCard({
  pkg,
  onSelect,
  isLoading,
}: {
  pkg: UiPack;
  onSelect: () => void;
  isLoading?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`Buy ${pkg.name}`}
      onClick={onSelect}
      disabled={isLoading}
      className={`
        relative p-4 rounded-xl border text-left transition-all hover:scale-[1.02]
        ${
          pkg.popular
            ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
            : pkg.bestValue
              ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]'
              : 'bg-[var(--aethel-surface-tertiary)] border-[var(--aethel-border-primary)] hover:border-[var(--aethel-border-secondary)]'
        }
      `}
    >
      {(pkg.popular || pkg.bestValue) && (
        <span
          className={`
          absolute -top-2 left-4 px-2 py-0.5 text-xs font-medium rounded-full
          ${pkg.popular ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'}
        `}
        >
          {pkg.popular ? 'Popular' : 'Best value'}
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-[var(--aethel-text-primary)]">{pkg.name}</h4>
          <p className="text-2xl font-bold text-[var(--aethel-text-primary)] mt-1">
            {pkg.credits.toLocaleString()}
            <span className="text-sm font-normal text-[var(--aethel-text-tertiary)] ml-1">credits</span>
          </p>
        </div>
        <Coins
          className={`w-8 h-8 ${pkg.popular ? 'text-[var(--aethel-info-light)]' : pkg.bestValue ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning-light)]'}`}
        />
      </div>

      {pkg.bonus > 0 && (
        <div className="flex items-center gap-1 text-sm text-[var(--aethel-success-light)] mb-3">
          <Gift className="w-4 h-4" />
          +{pkg.bonus} bonus
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-[var(--aethel-border-primary)]">
        <span className="text-xl font-bold text-[var(--aethel-text-primary)]">${pkg.price.toFixed(2)}</span>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          ${((pkg.price / (pkg.credits + pkg.bonus)) * 100).toFixed(2)}/100cr
        </span>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--aethel-text-primary)]" />
        </div>
      )}
    </button>
  );
}

export type CreditWalletPurchasePanelProps = {
  onPurchased?: (packageId: string) => void;
};

export function CreditWalletPurchasePanel({ onPurchased }: CreditWalletPurchasePanelProps) {
  const packs = useMemo(() => WALLET_CREDIT_PACKS.map(toUiPack), []);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [customUsd, setCustomUsd] = useState(String(WALLET_CUSTOM_TOPUP.minUsd));
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'error' | 'info'>('error');

  const customPreview = useMemo(() => {
    const n = Number(customUsd);
    if (!Number.isFinite(n) || n < WALLET_CUSTOM_TOPUP.minUsd || n > WALLET_CUSTOM_TOPUP.maxUsd) {
      return null;
    }
    return creditsForCustomUsd(n);
  }, [customUsd]);

  const runPurchase = useCallback(
    async (body: { packageId?: string; customUsd?: number }, label: string) => {
      setIsPurchasing(true);
      setSelectedPackage(label);
      setNotice(null);
      try {
        const result = await requestWalletCheckout(body);
        if (result.ok) {
          if (body.packageId) onPurchased?.(body.packageId);
          window.location.href = result.checkoutUrl;
          return;
        }
        setNoticeTone(result.held ? 'info' : 'error');
        setNotice(result.message);
      } catch (err) {
        logger.error('wallet_purchase_ui_error', err);
        setNoticeTone('error');
        setNotice('Purchase request failed. Check your connection and try again.');
      } finally {
        setIsPurchasing(false);
        setSelectedPackage(null);
      }
    },
    [onPurchased],
  );

  const handleCustomPurchase = useCallback(() => {
    const n = Number(customUsd);
    if (!Number.isFinite(n) || n < WALLET_CUSTOM_TOPUP.minUsd || n > WALLET_CUSTOM_TOPUP.maxUsd) {
      setNoticeTone('error');
      setNotice(
        `Custom top-up must be between $${WALLET_CUSTOM_TOPUP.minUsd} and $${WALLET_CUSTOM_TOPUP.maxUsd}.`,
      );
      return;
    }
    void runPurchase({ customUsd: Math.round(n * 100) / 100 }, 'custom');
  }, [customUsd, runPurchase]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--aethel-text-tertiary)]">
        Choose a prepaid pack or enter a custom amount (min ${WALLET_CUSTOM_TOPUP.minUsd}). Credits top up
        your wallet after Stripe confirms payment.
      </p>

      {notice && (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            noticeTone === 'info'
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] text-[var(--aethel-info-light)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]'
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {packs.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            onSelect={() => void runPurchase({ packageId: pkg.id }, pkg.id)}
            isLoading={isPurchasing && selectedPackage === pkg.id}
          />
        ))}
      </div>

      <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
          <h4 className="font-semibold text-[var(--aethel-text-primary)]">Custom top-up</h4>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--aethel-text-tertiary)]">
            Amount (USD)
            <input
              type="number"
              min={WALLET_CUSTOM_TOPUP.minUsd}
              max={WALLET_CUSTOM_TOPUP.maxUsd}
              step="0.01"
              value={customUsd}
              onChange={(e) => setCustomUsd(e.target.value)}
              disabled={isPurchasing}
              className="w-32 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)]"
            />
          </label>
          <p className="pb-2 text-sm text-[var(--aethel-text-secondary)]">
            {customPreview != null ? (
              <>
                ≈ <span className="font-semibold text-[var(--aethel-text-primary)]">{customPreview}</span>{' '}
                credits
              </>
            ) : (
              <>Enter ${WALLET_CUSTOM_TOPUP.minUsd}–${WALLET_CUSTOM_TOPUP.maxUsd}</>
            )}
          </p>
          <button
            type="button"
            disabled={isPurchasing || customPreview == null}
            onClick={handleCustomPurchase}
            className="ml-auto rounded-lg bg-[var(--aethel-info)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] disabled:opacity-50"
          >
            {isPurchasing && selectedPackage === 'custom' ? 'Starting…' : 'Buy custom'}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--aethel-surface-tertiary)] p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--aethel-text-tertiary)]" />
          <div className="text-sm text-[var(--aethel-text-tertiary)]">
            <p className="mb-1 font-medium text-[var(--aethel-text-secondary)]">About credits</p>
            <ul className="space-y-1 text-xs">
              <li>- Credits do not expire while the account is active</li>
              <li>- Pack bonuses are included automatically at purchase</li>
              <li>- Custom top-ups use the Starter pack retail rate</li>
              <li>- Checkout requires Stripe; otherwise purchase stays HELD (IDE unlocked)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
