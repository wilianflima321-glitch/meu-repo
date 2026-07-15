'use client'

import type { ReactNode } from 'react'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

export default function BillingRuntimeLayout({ children }: { children: ReactNode }) {
  return <StudioRuntimeProviders surface="light">{children}</StudioRuntimeProviders>
}
