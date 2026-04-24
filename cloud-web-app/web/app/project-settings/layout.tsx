import type { ReactNode } from 'react'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

export default function ProjectSettingsLayout({ children }: { children: ReactNode }) {
  return <StudioRuntimeProviders>{children}</StudioRuntimeProviders>
}
