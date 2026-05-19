import type { Metadata } from 'next'

import DocsContent from './docs-content'

export const metadata: Metadata = {
  title: 'Docs | Aethel Studio',
  description:
    'Documentacao publica do Aethel Studio para onboarding, trust, procurement, workbench e superfícies operacionais.',
}

export default function DocsPage() {
  return <DocsContent />
}

