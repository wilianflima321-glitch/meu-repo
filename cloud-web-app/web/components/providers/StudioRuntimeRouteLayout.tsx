import type { ReactNode } from 'react'
import nextDynamic from 'next/dynamic'
import type { StudioRuntimeSurface } from '@/components/providers/StudioRuntimeProviders'

interface StudioRuntimeRouteLayoutProps {
  children: ReactNode
  surface?: StudioRuntimeSurface
}

function StudioRuntimeRouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 py-10 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-2xl shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
        <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Carregando area do studio</p>
        <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">
          Preparando runtime, comandos e contexto do workspace.
        </p>
      </div>
    </div>
  )
}

const StudioRuntimeLayoutClient = nextDynamic(() => import('./StudioRuntimeLayoutClient'), {
  ssr: false,
  loading: () => <StudioRuntimeRouteFallback />,
})

export default function StudioRuntimeRouteLayout({
  children,
  surface = 'full',
}: StudioRuntimeRouteLayoutProps) {
  return <StudioRuntimeLayoutClient surface={surface}>{children}</StudioRuntimeLayoutClient>
}
