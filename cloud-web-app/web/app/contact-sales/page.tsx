import type { Metadata } from 'next'

import ContactSalesContent from './contact-sales-content'

export const metadata: Metadata = {
  title: 'Contact Sales | Aethel Studio',
  description:
    'Converse com vendas sobre rollout, procurement, trust, SSO e requisitos enterprise do Aethel Studio.',
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
