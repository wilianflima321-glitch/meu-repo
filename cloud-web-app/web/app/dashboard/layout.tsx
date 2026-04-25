import type { ReactNode } from 'react'
import StudioRuntimeRouteLayout from '@/components/providers/StudioRuntimeRouteLayout'

export default function RouteLayout({ children }: { children: ReactNode }) {
  return <StudioRuntimeRouteLayout>{children}</StudioRuntimeRouteLayout>
}
