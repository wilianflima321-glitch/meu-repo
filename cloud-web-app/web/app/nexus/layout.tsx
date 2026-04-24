import type { ReactNode } from 'react'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

export default function NexusLayout({ children }: { children: ReactNode }) {
  return <StudioRuntimeProviders>{children}</StudioRuntimeProviders>
}
