import type { Metadata } from 'next'
import LandingPageV3 from './landing-v3'

export const metadata: Metadata = {
  title: 'Aethel Engine | Multi-agent software studio',
  description:
    'Aethel unifica research, planejamento, codigo, preview e readiness operacional em um unico software studio com multi-agent e anti-fake-success.',
}

export default function Page() {
  return <LandingPageV3 />
}
