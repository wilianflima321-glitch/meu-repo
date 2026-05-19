import type { Metadata } from 'next'

import ContactSalesContent from './contact-sales-content'

export const metadata: Metadata = {
  title: 'Contact Sales | Aethel Studio',
  description:
    'Talk with sales about rollout, procurement, trust, SSO, and enterprise requirements for Aethel Studio.',
}

export default function ContactSalesPage({
  searchParams,
}: {
  searchParams?: { source?: string | string[] }
}) {
  const rawSource = searchParams?.source
  const initialSource = Array.isArray(rawSource) ? rawSource[0] ?? '' : rawSource ?? ''

  return <ContactSalesContent initialSource={initialSource} />
}
