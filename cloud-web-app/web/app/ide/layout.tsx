import type { ReactNode } from 'react'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

export default function IDELayout({ children }: { children: ReactNode }) {
  return <StudioRuntimeProviders>{children}</StudioRuntimeProviders>
}
