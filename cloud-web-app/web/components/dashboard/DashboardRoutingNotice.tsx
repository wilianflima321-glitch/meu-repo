'use client'

import { Suspense, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

function DashboardRoutingNoticeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  const code = searchParams.get('notice')

  const copy = useMemo(() => {
    if (!code) return null

    if (code === 'labs-hidden') {
      return {
        title: 'Laboratorio indisponivel neste ambiente',
        body: 'Rotas experimentais ficam ocultas em producao. Para uso interno, defina NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=true. O Studio e o /ide continuam a ser os caminhos suportados.',
      }
    }

    if (code === 'design-demo-dev-only') {
      return {
        title: 'Demo do design system',
        body: 'Esta rota so fica disponivel em desenvolvimento. Em producao, use os tokens --aethel-* nas aplicacoes reais.',
      }
    }

    return {
      title: 'Redirecionamento',
      body: 'Voce foi encaminhado para o dashboard.',
    }
  }, [code])

  if (hidden || !copy || !code) return null

  const dismiss = () => {
    setHidden(true)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('notice')
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
      <div
        role="status"
        className="flex items-start justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-3 text-xs text-[var(--aethel-text-secondary)]"
      >
        <div className="min-w-0">
          <p className="font-semibold text-[var(--aethel-text-primary)]">{copy.title}</p>
          <p className="mt-1 leading-relaxed text-[var(--aethel-text-secondary)]">{copy.body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg border border-[var(--aethel-border-secondary)] p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
          aria-label="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function DashboardRoutingNotice() {
  return (
    <Suspense fallback={null}>
      <DashboardRoutingNoticeInner />
    </Suspense>
  )
}
