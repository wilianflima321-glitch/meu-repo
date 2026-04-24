import type { ReactNode } from 'react'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <StudioRuntimeProviders>{children}</StudioRuntimeProviders>
}
