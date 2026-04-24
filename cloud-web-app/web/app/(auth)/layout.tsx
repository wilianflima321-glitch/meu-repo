import type { ReactNode } from 'react'
import CoreUiProviders from '@/components/providers/CoreUiProviders'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <CoreUiProviders>{children}</CoreUiProviders>
}
