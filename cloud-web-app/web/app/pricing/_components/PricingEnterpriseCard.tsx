import Link from 'next/link'
import Codicon from '@/components/ide/Codicon'
import { formatLimit, formatStorage, type PricingPlan } from './pricing-utils'

type PricingEnterpriseCardProps = {
  enterprisePlan?: PricingPlan
  isAnnual: boolean
}

export function PricingEnterpriseCard({ enterprisePlan, isAnnual }: PricingEnterpriseCardProps) {
  if (!enterprisePlan) return null

  return (
    <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <article className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[var(--aethel-panel)] shadow-[var(--aethel-shadow-xl)]">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Enterprise</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)]">Enterprise support for SSO, compliance, and rollout</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--aethel-text-secondary)]">Talk with us when you need team controls, contracts, or guided setup.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['SSO + SAML', 'Audit trails', '24/7 support', 'Guided rollout'].map((label) => (
                <span key={label} className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">{label}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <TrustLink href="/security">View security</TrustLink>
              <TrustLink href="/compliance">View compliance</TrustLink>
              <TrustLink href="/trust">View trust fit</TrustLink>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_68%,transparent)] p-5 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Base price</p>
              <p className="mt-2 text-3xl font-bold text-[var(--aethel-text-primary)]">R${enterprisePlan.displayPriceBRL}</p>
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">US${enterprisePlan.displayPrice}/{isAnnual ? 'year' : 'month'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Capacity</p>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{formatLimit(enterprisePlan.limits.cloudProjectsMax)} projects, {formatStorage(enterprisePlan.limits.storage)} of storage, enterprise requests, and guided rollout.</p>
            </div>
            <div className="md:col-span-2">
              <ul className="space-y-2 text-sm text-[var(--aethel-text-secondary)]">
                {enterprisePlan.features.slice(0, 6).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-[var(--aethel-success-light)]"><Codicon name="check" /></span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/contact-sales" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-4 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-colors hover:bg-[var(--aethel-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] md:col-span-2" data-analytics-category="user" data-analytics-action="contact_sales_start" data-analytics-label="pricing_enterprise_contact_sales" data-analytics-source="pricing-enterprise-card">
              Talk to sales
            </Link>
          </div>
        </div>
      </article>
    </section>
  )
}

function TrustLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
      {children}
    </Link>
  )
}
