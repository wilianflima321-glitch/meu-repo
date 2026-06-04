import Link from 'next/link'

import {
  ADMIN_CONSOLIDATED_SECTIONS,
  type AdminConsolidatedSection,
  type AdminRouteRiskLane,
} from '@/lib/admin/admin-consolidation'

export type AdminUserRow = {
  id: string
  name?: string | null
  email: string
  plan: string
  createdAt: string
  _count?: { projects?: number }
}

type AdminCoverageSummary = {
  sections: number
  routes: number
  primaryLinks: number
  criticalSections: number
  legacyCompatibleRoutes: number
}

const planLabels: Record<string, string> = {
  enterprise: 'Enterprise',
  pro: 'Pro',
  free: 'Free',
}


function maskAdminEmail(email: string) {
  const [local = 'user', domain = 'example.com'] = email.split('@')
  const safeLocal = local.length <= 2 ? `${local[0] ?? 'u'}***` : `${local.slice(0, 2)}***${local.slice(-1)}`
  const [domainName = 'example', ...suffix] = domain.split('.')
  const safeDomain = `${domainName.slice(0, 1)}***${suffix.length ? `.${suffix.join('.')}` : '.local'}`
  return `${safeLocal}@${safeDomain}`
}

const riskTone: Record<AdminRouteRiskLane, string> = {
  low: 'border-[color-mix(in_srgb,var(--aethel-success)_24%,transparent)] text-[var(--aethel-success-light)]',
  medium: 'border-[color-mix(in_srgb,var(--aethel-info)_26%,transparent)] text-[var(--aethel-info-light)]',
  high: 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] text-[var(--aethel-warning-light)]',
  critical: 'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] text-[var(--aethel-error-light)]',
}

const healthTone: Record<AdminConsolidatedSection['evidenceStatus'], string> = {
  live: 'border-[color-mix(in_srgb,var(--aethel-success)_26%,transparent)] text-[var(--aethel-success-light)]',
  review: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] text-[var(--aethel-warning-light)]',
  'legacy-compatible': 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)]',
}

function healthLabel(status: AdminConsolidatedSection['evidenceStatus']) {
  if (status === 'live') return 'Healthy'
  if (status === 'review') return 'Review'
  return 'Compatible'
}

const operatorPromptLabel: Record<AdminConsolidatedSection['id'], string> = {
  people: 'Access changes',
  money: 'Revenue movement',
  ai: 'Agent quality and cost',
  platform: 'Traffic readiness',
  trust: 'Customer-visible risk',
  product: 'Shipping gates',
}

export function AdminStatsGrid({
  users,
}: {
  users: AdminUserRow[]
}) {
  const enterpriseCount = users.filter((user) => user.plan === 'enterprise').length
  const proCount = users.filter((user) => user.plan === 'pro').length
  const freeCount = users.filter((user) => user.plan === 'free').length

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <Stat title="Users" value={users.length} />
      <Stat title="Enterprise" value={enterpriseCount} tone="emerald" />
      <Stat title="Pro" value={proCount} tone="sky" />
      <Stat title="Free" value={freeCount} tone="slate" />
    </div>
  )
}

export function AdminOperatingSpine({ coverage }: { coverage: AdminCoverageSummary }) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Operating map</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Six areas, no orphaned admin intent.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
          People, money, AI, platform, trust, and product each own clear work.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricPill label="Areas" value={coverage.sections} />
          <MetricPill label="Routes mapped" value={coverage.routes} />
          <MetricPill label="Primary paths" value={coverage.primaryLinks} />
          <MetricPill label="Critical lanes" value={coverage.criticalSections} />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,var(--aethel-surface-secondary))] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Escalation</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">Contain risk fast.</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          Emergency, audit, and security stay visible when speed matters.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/emergency" className="rounded-full border border-[var(--aethel-error)]/35 bg-[var(--aethel-error)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--aethel-error-light)]">Emergency</Link>
          <Link href="/admin/audit-logs" className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)]">Audit logs</Link>
          <Link href="/admin/security" className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)]">Security</Link>
        </div>
      </div>
    </section>
  )
}

export function AdminSectionGrid({ coverage }: { coverage: AdminCoverageSummary }) {
  return (
    <section className="mb-6 rounded-[26px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.24)]" data-admin-operator-board="linear-density">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Operator board / Operations board</p>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">Six areas</h2>
        </div>
        <p className="text-xs text-[var(--aethel-text-tertiary)]">
          {coverage.legacyCompatibleRoutes} legacy routes remain compatible
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)]">
        <div className="grid grid-cols-[minmax(180px,1.25fr)_94px_94px_minmax(120px,0.9fr)_minmax(170px,1fr)] gap-3 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_62%,transparent)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          <span>Area</span>
          <span>Health</span>
          <span>Risk</span>
          <span>Owner</span>
          <span>Next action</span>
        </div>
        {ADMIN_CONSOLIDATED_SECTIONS.map((section) => (
          <div key={section.id} className="grid grid-cols-[minmax(180px,1.25fr)_94px_94px_minmax(120px,0.9fr)_minmax(170px,1fr)] gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-3 last:border-b-0">
            <div>
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{section.label}</p>
              <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">{operatorPromptLabel[section.id]}</p>
            </div>
            <span className={`h-fit rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${healthTone[section.evidenceStatus]}`}>
              {healthLabel(section.evidenceStatus)}
            </span>
            <span className={`h-fit rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${riskTone[section.riskLane]}`}>
              {section.riskLane}
            </span>
            <span className="truncate text-xs text-[var(--aethel-text-secondary)]">{section.owner}</span>
            <div className="flex min-w-0 items-center gap-2">
              {section.primaryLinks.slice(0, 1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 py-1 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
                >
                  {link.label}
                </Link>
              ))}
              <span className="text-[11px] text-[var(--aethel-text-tertiary)]">{section.routes.length} routes</span>
            </div>
          </div>
        ))}
      </div>
      <details className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_38%,transparent)] p-3">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
          Compatibility map
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ADMIN_CONSOLIDATED_SECTIONS.map((section) => (
            <AdminSectionCard key={section.id} section={section} />
          ))}
        </div>
      </details>
    </section>
  )
}

export function AdminCoverageDisclosure({ users, coverage }: { users: AdminUserRow[]; coverage: AdminCoverageSummary }) {
  return (
    <details className="mb-6 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3" data-admin-coverage-disclosure>
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
        Diagnostics
      </summary>
      <div className="mt-4">
        <AdminStatsGrid users={users} />
        <AdminOperatingSpine coverage={coverage} />
      </div>
    </details>
  )
}

export function AdminRecentUsersTable({
  users,
  isLoading,
  errorMessage,
}: {
  users: AdminUserRow[]
  isLoading: boolean
  errorMessage?: string
}) {
  return (
    <div className="mb-8 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4 py-3">
        <h2 className="text-lg font-semibold">Recent users</h2>
        <p className="text-xs text-[var(--aethel-text-tertiary)]">Emails masked</p>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-[var(--aethel-text-tertiary)]">Loading users...</div>
      ) : errorMessage ? (
        <div className="p-4 text-sm text-[var(--aethel-error)]">{errorMessage}</div>
      ) : users.length === 0 ? (
        <div className="p-4 text-sm text-[var(--aethel-text-tertiary)]">No users returned yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)]">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Plan</th>
                <th className="p-2">Projects</th>
                <th className="p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[var(--aethel-border-subtle)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]">
                  <td className="p-2 font-medium">{user.name || 'Unnamed'}</td>
                  <td className="p-2 text-[var(--aethel-text-secondary)]" data-privacy="masked">{maskAdminEmail(user.email)}</td>
                  <td className="p-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${
                      user.plan === 'enterprise'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]'
                        : user.plan === 'pro'
                          ? 'bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] text-[var(--aethel-info)]'
                          : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'
                    }`}>
                      {planLabels[user.plan] ?? user.plan}
                    </span>
                  </td>
                  <td className="p-2">{user._count?.projects || 0}</td>
                  <td className="p-2 text-[var(--aethel-text-tertiary)]">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AdminSectionCard({ section }: { section: AdminConsolidatedSection }) {
  return (
    <article className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{section.label}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${riskTone[section.riskLane]}`}>
              {section.riskLane}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{section.description}</p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">{section.owner}</p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">{section.intent}</p>
          <p className="mt-3 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_55%,transparent)] px-3 py-2 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
            {section.operatorQuestion}
          </p>
        </div>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)]">
          {section.routes.length} routes
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {section.primaryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </article>
  )
}

function Stat({
  title,
  value,
  tone = 'sky',
}: {
  title: string
  value: number
  tone?: 'sky' | 'emerald' | 'slate'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-[var(--aethel-success)]'
      : tone === 'slate'
        ? 'text-[var(--aethel-text-secondary)]'
        : 'text-[var(--aethel-info)]'

  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--aethel-text-tertiary)]">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_58%,transparent)] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--aethel-text-primary)]">{value}</p>
    </div>
  )
}
