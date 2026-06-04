'use client'

import Link from 'next/link'
import type { Dispatch, SetStateAction } from 'react'

type SettingsTab = 'overview' | 'editor' | 'profile' | 'security' | 'billing' | 'api'

type SettingsCommandCenterProps = {
  configuredProviders: number
  missingProviders: number
  providerStatusLoaded: boolean
  onSelectTab: Dispatch<SetStateAction<SettingsTab>>
}

const actionCards: Array<{
  id: SettingsTab
  title: string
  eyebrow: string
  body: string
  action: string
}> = [
  { id: 'security', eyebrow: 'Account safety', title: 'Security first', body: 'Passkeys, 2FA, recovery, and audit events stay close to the account owner.', action: 'Review security' },
  { id: 'billing', eyebrow: 'Spend control', title: 'Billing and limits', body: 'Usage, plan, and upgrade controls live on the billing page.', action: 'Open billing' },
  { id: 'api', eyebrow: 'AI runtime', title: 'Provider setup', body: 'Provider status is checked explicitly; missing keys stay visible before generation.', action: 'Check providers' },
]

const advancedCard = {
  id: 'editor' as const,
  title: 'Advanced editor',
  body: 'Editor and engine controls stay available without becoming the first screen.',
  action: 'Open advanced controls',
}

export default function SettingsCommandCenter({
  configuredProviders,
  missingProviders,
  providerStatusLoaded,
  onSelectTab,
}: SettingsCommandCenterProps) {
  const providerStatus = providerStatusLoaded
    ? `${configuredProviders} ready / ${missingProviders} missing`
    : 'Check required'

  return (
    <div data-settings-command-center="true" className="p-4 sm:p-6">
      <section className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(8,10,16,0.88))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">Workspace control</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--aethel-text-primary)]">Settings should show the next action.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
              Account, security, billing, and AI setup stay organized. Advanced controls stay one layer deeper.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[var(--aethel-success-light)]">Account ready</span>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1 text-[var(--aethel-warning-light)]">{providerStatus}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => onSelectTab('security')} className="rounded-2xl bg-[var(--aethel-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--aethel-text-inverse)] transition hover:bg-[var(--aethel-primary-dark)]">
            Review security
          </button>
          <Link href="/billing" className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
            Open usage
          </Link>
        </div>
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {actionCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectTab(card.id)}
            className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_46%,transparent)] p-4 text-left transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">{card.eyebrow}</p>
            <h3 className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">{card.title}</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{card.body}</p>
            <span className="mt-3 inline-flex text-xs font-semibold text-[var(--aethel-info-light)]">{card.action}</span>
          </button>
        ))}
      </div>

      <details className="mt-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_34%,transparent)] px-4 py-3">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Advanced controls
        </summary>
        <button
          type="button"
          onClick={() => onSelectTab(advancedCard.id)}
          className="mt-3 block w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] p-4 text-left transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)]"
        >
          <h3 className="text-base font-semibold text-[var(--aethel-text-primary)]">{advancedCard.title}</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{advancedCard.body}</p>
          <span className="mt-3 inline-flex text-xs font-semibold text-[var(--aethel-info-light)]">{advancedCard.action}</span>
        </button>
      </details>
    </div>
  )
}
