import type { Metadata } from 'next'
import LandingPageV3 from './landing-v3'

export const metadata: Metadata = {
  title: 'Aethel Engine | Multi-agent software studio',
  description:
    'Aethel unifies research, planning, code, preview, and receipts in one multi-agent software studio.',
}

export default function Page() {
  return <LandingPageV3 />
}
