import { formatLimit, formatStorage, type PricingPlan } from './pricing-utils'

export const FAQ_ITEMS = [
  {
    q: 'Can I start without a credit card?',
    a: 'Yes. You can explore the free flow and Studio onboarding before any upgrade.',
  },
  {
    q: 'How is Aethel different from other AI IDEs?',
    a: 'Aethel combines Studio Home, workbench, preview, billing, and readiness in one operational product flow instead of acting like a prompt wrapper.',
  },
  {
    q: 'Do the prices include AI tokens?',
    a: 'Yes. Every plan includes quotas, and you can also connect your own providers for more cost flexibility.',
  },
  {
    q: 'Are Games and Films included?',
    a: 'The surfaces exist, but the commercial product today focuses on Apps + Research. Games and Films remain experimental maturity areas.',
  },
  {
    q: 'Is billing live end to end?',
    a: 'Billing surfaces exist, while public checkout depends on real Stripe credentials. We keep that readiness visible on the page itself.',
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
  { label: 'Projects', getValue: (plan: PricingPlan) => formatLimit(plan.limits.projects) },
  { label: 'Monthly tokens', getValue: (plan: PricingPlan) => formatLimit(plan.limits.tokensPerMonth) },
  { label: 'Storage', getValue: (plan: PricingPlan) => formatStorage(plan.limits.storage) },
  { label: 'Collaborators', getValue: (plan: PricingPlan) => formatLimit(plan.limits.collaborators) },
  { label: 'History', getValue: (plan: PricingPlan) => `${formatLimit(plan.limits.historyDays)} days` },
  { label: 'Concurrency', getValue: (plan: PricingPlan) => formatLimit(plan.limits.concurrent) },
]
