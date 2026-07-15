import { formatLimit, formatStorage, type PricingPlan } from './pricing-utils'

export function formatAiPools(plan: PricingPlan): string {
  if (plan.limits.aiPoolMode === 'dual' && plan.limits.tokensPremiumRawPerMonth > 0) {
    return `${formatLimit(plan.limits.tokensFastPerMonth)} Fast + ${formatLimit(plan.limits.tokensPremiumRawPerMonth)} Premium`
  }
  return `${formatLimit(plan.limits.tokensFastPerMonth)} Fast AI only`
}

/** Block 6H.5 — badge for pricing grid */
export function aiPoolBadge(plan: PricingPlan): string {
  if (plan.limits.aiPoolMode === 'dual' && plan.limits.tokensPremiumRawPerMonth > 0) {
    return 'Dual pool · Fast + Premium'
  }
  return 'Fast AI only'
}

export const FAQ_ITEMS = [
  {
    q: 'Can I start without a credit card?',
    a: 'Yes. You can explore the free flow and Studio onboarding before any upgrade.',
  },
  {
    q: 'How is Aethel different from other AI IDEs?',
    a: 'Aethel keeps the dashboard, editor, preview, billing, and review trail in one product flow instead of scattering the work across separate tools.',
  },
  {
    q: 'Do the prices include AI tokens?',
    a: 'Plans include Fast AI quotas. Starter is Fast-only. Pro and Studio add a separate Premium pool. When Premium is exhausted, Pro+ can fall back to Fast. When both pools are empty, use credits, PAYG (with a spend cap), or BYOK — the IDE stays open.',
  },
  {
    q: 'What happens when I hit AI quota?',
    a: 'AI endpoints return a calm quota dialog with four actions: buy credits, enable PAYG, connect BYOK, or upgrade. The editor, scene, and local work are never locked.',
  },
  {
    q: 'Is AI unlimited on any plan?',
    a: 'No. Every plan has finite Fast (and Premium where applicable) pools. Extra usage is wallet, PAYG, or BYOK — we never market unlimited AI.',
  },
  {
    q: 'Does storage limit my local desktop projects?',
    a: 'No. Storage limits apply to cloud sync only. Tauri local projects use your disk and stay unlimited on every tier.',
  },
  {
    q: 'Are Games and Films included?',
    a: 'The tools exist, but the commercial product today focuses on Apps + Research. Games and Films remain experimental areas.',
  },
  {
    q: 'Is billing live end to end?',
    a: 'Billing tools exist, while public checkout depends on real Stripe credentials. We keep that status visible on the page itself.',
  },
  {
    q: 'How does cancellation work?',
    a: 'You can cancel anytime. Access remains active until the end of the paid cycle.',
  },
  {
    q: 'Do prices include taxes?',
    a: 'Displayed prices do not include local taxes. Tax handling follows the applicable policy for your region.',
  },
]

export const COMPARISON_ROWS = [
  { label: 'Cloud projects', getValue: (plan: PricingPlan) => formatLimit(plan.limits.cloudProjectsMax) },
  { label: 'Fast AI / month', getValue: (plan: PricingPlan) => formatLimit(plan.limits.tokensFastPerMonth) },
  {
    label: 'Premium AI / month',
    getValue: (plan: PricingPlan) =>
      plan.limits.tokensPremiumRawPerMonth > 0 ? formatLimit(plan.limits.tokensPremiumRawPerMonth) : '—',
  },
  { label: 'Cloud storage', getValue: (plan: PricingPlan) => formatStorage(plan.limits.storage) },
  { label: 'Local projects', getValue: () => 'Unlimited' },
  { label: 'Collaborators', getValue: (plan: PricingPlan) => formatLimit(plan.limits.collaborators) },
  { label: 'History', getValue: (plan: PricingPlan) => `${formatLimit(plan.limits.historyDays)} days` },
  { label: 'Concurrency', getValue: (plan: PricingPlan) => formatLimit(plan.limits.concurrent) },
]
