import type { Metadata } from 'next'

import DocsContent from './docs-content'

export const metadata: Metadata = {
  title: 'Docs | Aethel Studio',
  description:
    'Aethel Studio public documentation for onboarding, trust, procurement, IDE, and product areas.',
}

export default function DocsPage() {
  return <DocsContent />
}
