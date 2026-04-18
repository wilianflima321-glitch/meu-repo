"use client"
import useSWR from 'swr'
import { API_BASE } from '@/lib/api'

const API = API_BASE
const json = (u:string)=>fetch(u).then(r=>r.json())

export default function HealthPage(){
  const { data: health, error: healthErr } = useSWR(`${API}/health`, json)
  const { data: providers, error: provErr } = useSWR(`${API}/auth/providers`, json)
  const { data: plans, error: plansErr } = useSWR(`${API}/billing/plans`, json)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backend Health</h1>

  <section className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 p-4">
        <h2 className="text-lg font-semibold mb-2">/health</h2>
        {healthErr && <div className="text-[var(--aethel-error)]">Erro: {String(healthErr)}</div>}
        <pre className="bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] p-3 rounded overflow-auto min-h-[80px]">{JSON.stringify(health ?? { status: 'unknown' }, null, 2)}</pre>
      </section>

  <section className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 p-4">
        <h2 className="text-lg font-semibold mb-2">/auth/providers</h2>
        {provErr && <div className="text-[var(--aethel-warning)]">Aviso: {String(provErr)}</div>}
        <pre className="bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] p-3 rounded overflow-auto min-h-[80px]">{JSON.stringify(providers ?? {}, null, 2)}</pre>
      </section>

  <section className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 p-4">
        <h2 className="text-lg font-semibold mb-2">/billing/plans</h2>
        {plansErr && <div className="text-[var(--aethel-warning)]">Aviso: {String(plansErr)}</div>}
        <pre className="bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] p-3 rounded overflow-auto min-h-[80px]">{JSON.stringify(plans ?? [], null, 2)}</pre>
      </section>
    </div>
  )
}
