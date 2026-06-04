import type { Metadata } from 'next'
import { ProcurementStarterPackContent } from './procurement-starter-pack.parts'

export const metadata: Metadata = {
  title: 'Procurement Starter Pack | Aethel Docs',
  description:
    'Public buyer packet for reading order, trust artifacts, due-diligence questions, and enterprise evaluation handoff.',
}

export default function ProcurementStarterPackPage() {
  return <ProcurementStarterPackContent />
}
