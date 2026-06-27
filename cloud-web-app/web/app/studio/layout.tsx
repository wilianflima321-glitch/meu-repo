'use client'

import type { ReactNode } from 'react'
import CreativeStudioShell from './CreativeStudioShell'

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <CreativeStudioShell title="Creative Studio" subtitle="Studio">
      {children}
    </CreativeStudioShell>
  )
}
