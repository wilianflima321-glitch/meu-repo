'use client';

import { useState } from 'react';

type OnboardingStep = 'intro' | 'kyc' | 'bank' | 'tax' | 'complete';

const STEPS: { key: OnboardingStep; label: string }[] = [
  { key: 'intro', label: 'Overview' },
  { key: 'kyc', label: 'Identity Verification' },
  { key: 'bank', label: 'Bank Account' },
  { key: 'tax', label: 'Tax Information' },
  { key: 'complete', label: 'Complete' },
];

function StepIndicator({ current }: { current: OnboardingStep }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i < idx
                ? 'bg-[var(--aethel-neon-cyan)] text-black'
                : i === idx
                ? 'ring-2 ring-[var(--aethel-neon-cyan)] text-[var(--aethel-neon-cyan)]'
                : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]'
            }`}
          >
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`hidden text-xs sm:block ${i === idx ? 'text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)]'}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-6 ${i < idx ? 'bg-[var(--aethel-neon-cyan)]' : 'bg-[var(--aethel-border-subtle)]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function PayoutSetupPage() {
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [loading, setLoading] = useState(false);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  const startStripeOnboarding = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/stripe/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        setStripeUrl(data.url);
        window.location.href = data.url;
      }
    } catch {
      alert('Failed to start Stripe onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--aethel-neon-cyan)]">
          Creator Payouts
        </p>
        <h1 className="text-2xl font-bold text-[var(--aethel-text-primary)]">Payout Setup</h1>
        <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
          Earn 70% of every sale. Payouts via Stripe Connect — supports 40+ countries.
        </p>
      </header>

      <StepIndicator current={step} />

      <div className="mt-8 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-6">
        {step === 'intro' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">How Creator Payouts Work</h2>
            <ul className="space-y-3 text-sm text-[var(--aethel-text-secondary)]">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--aethel-neon-cyan)]/20 text-xs text-[var(--aethel-neon-cyan)]">1</span>
                <span><strong className="text-[var(--aethel-text-primary)]">70/30 Revenue Split</strong> — You earn 70% of every sale. Aethel retains 30% for platform operations.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--aethel-neon-cyan)]/20 text-xs text-[var(--aethel-neon-cyan)]">2</span>
                <span><strong className="text-[var(--aethel-text-primary)]">Monthly Payouts</strong> — Earnings above $25 are paid out on the 1st of each month.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--aethel-neon-cyan)]/20 text-xs text-[var(--aethel-neon-cyan)]">3</span>
                <span><strong className="text-[var(--aethel-text-primary)]">Tax Compliance</strong> — US creators earning over $600/yr receive a 1099-K. Non-US creators complete W-8BEN.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--aethel-neon-cyan)]/20 text-xs text-[var(--aethel-neon-cyan)]">4</span>
                <span><strong className="text-[var(--aethel-text-primary)]">Powered by Stripe</strong> — Bank-grade security. Supports bank transfers in 40+ countries.</span>
              </li>
            </ul>
            <button
              onClick={() => setStep('kyc')}
              className="mt-4 w-full rounded-xl bg-[var(--aethel-neon-cyan)] px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
            >
              Get Started →
            </button>
          </div>
        )}

        {step === 'kyc' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Identity Verification</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Required by financial regulations to prevent fraud and money laundering. Stripe verifies your identity securely — Aethel never sees your documents.
            </p>
            <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-4 text-sm">
              <p className="font-medium text-[var(--aethel-text-primary)]">You will need:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--aethel-text-secondary)]">
                <li>Government-issued photo ID (passport or driver's license)</li>
                <li>Proof of address (bank statement or utility bill)</li>
                <li>Bank account details for payouts</li>
              </ul>
            </div>
            <button
              onClick={startStripeOnboarding}
              disabled={loading}
              className="w-full rounded-xl bg-[var(--aethel-stripe-brand)] px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {loading ? 'Redirecting to Stripe…' : 'Continue with Stripe →'}
            </button>
            <p className="text-center text-xs text-[var(--aethel-text-tertiary)]">
              Powered by Stripe Connect — bank-grade security
            </p>
          </div>
        )}

        {step === 'bank' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Bank Account</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Your bank account is set up through the Stripe dashboard. Return here after completing setup.
            </p>
            {stripeUrl && (
              <a href={stripeUrl} className="block w-full rounded-xl bg-[var(--aethel-stripe-brand)] px-4 py-3 text-center text-sm font-bold text-white hover:opacity-90">
                Return to Stripe Setup →
              </a>
            )}
            <button onClick={() => setStep('tax')} className="w-full rounded-xl border border-[var(--aethel-border-subtle)] px-4 py-2.5 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
              Already done → Continue
            </button>
          </div>
        )}

        {step === 'tax' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Tax Information</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Tax forms are collected via Stripe. You will be prompted for your W-9 (US) or W-8BEN (international) during Stripe onboarding.
            </p>
            <div className="rounded-xl border border-yellow-700/30 bg-yellow-900/10 p-4 text-sm text-yellow-400">
              US creators who earn over $600 in a calendar year will receive a 1099-K form by January 31.
            </div>
            <button
              onClick={() => setStep('complete')}
              className="w-full rounded-xl bg-[var(--aethel-neon-cyan)] px-4 py-3 text-sm font-bold text-black"
            >
              Complete Setup →
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-3xl">
              ✓
            </div>
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Payout Setup Complete!</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Your account is ready to receive creator earnings. Start publishing assets to the Marketplace to earn revenue.
            </p>
            <a
              href="/marketplace/upload"
              className="inline-block rounded-xl bg-[var(--aethel-neon-cyan)] px-6 py-3 text-sm font-bold text-black hover:opacity-90"
            >
              Publish Your First Asset →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
