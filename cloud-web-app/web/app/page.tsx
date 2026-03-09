import type { Metadata } from 'next'
import LandingPageV2 from './landing-v2'

export const metadata: Metadata = {
  title: 'Aethel Engine | Multi-agent software studio',
  description:
    'Aethel unifica research, planejamento, codigo, preview e readiness operacional em um unico software studio com multi-agent e anti-fake-success.',
}

export default function Page() {
  return <LandingPageV2 />
}
