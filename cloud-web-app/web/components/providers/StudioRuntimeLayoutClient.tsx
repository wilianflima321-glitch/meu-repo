'use client'

import type { ReactNode } from 'react'
import StudioRuntimeProviders, { type StudioRuntimeSurface } from '@/components/providers/StudioRuntimeProviders'

interface StudioRuntimeLayoutClientProps {
  children: ReactNode
  surface?: StudioRuntimeSurface
}

export default function StudioRuntimeLayoutClient({
  children,
  surface = 'full',
}: StudioRuntimeLayoutClientProps) {
  return <StudioRuntimeProviders surface={surface}>{children}</StudioRuntimeProviders>
}
