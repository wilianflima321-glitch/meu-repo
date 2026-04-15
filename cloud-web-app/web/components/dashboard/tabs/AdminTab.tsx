'use client'

import React from 'react'
import AdminPanel from '../../AdminPanel'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

interface AdminTabProps {
  // Props para o AdminPanel se necessario
}

export default function AdminTab({}: AdminTabProps) {
  const shellClass = [
    'space-y-8 rounded-[28px] border border-[var(--aethel-border-subtle)]',
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))]',
    'p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:p-8',
  ].join(' ')

  const cardClass = [
    'rounded-2xl border border-[var(--aethel-border-subtle)]',
    'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)]',
    'p-5 lg:p-6',
  ].join(' ')

  const statRowClass = [
    'flex items-center justify-between gap-4 rounded-xl border border-[var(--aethel-border-subtle)]',
    'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-4 py-3',
  ].join(' ')

  const alertClass = [
    'flex items-center gap-3 rounded-xl border px-3 py-3',
    'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)]',
  ].join(' ')

  return (
    <div className={shellClass}>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--aethel-primary-light)]">
          Admin Studio
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
          Painel de administracao
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--aethel-text-secondary)] lg:text-[15px]">
          Gerencie usuarios, faturamento, permissoes e configuracoes do sistema em uma superficie
          mais clara, densa e consistente com o restante do Studio.
        </p>
      </div>

      <div className={cardClass}>
        <AdminPanel />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={cardClass}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Estatisticas do sistema</h3>
              <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                Sinais rapidos para operacao, crescimento e uso da plataforma.
              </p>
            </div>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-3 py-1 text-xs font-medium text-[var(--aethel-text-tertiary)]">
              Atualizado agora
            </span>
          </div>
          <div className="space-y-4">
            <div className={statRowClass}>
              <span className="text-sm text-[var(--aethel-text-secondary)]">Usuarios ativos</span>
              <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">1,234</span>
            </div>
            <div className={statRowClass}>
              <span className="text-sm text-[var(--aethel-text-secondary)]">Novas contas hoje</span>
              <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">42</span>
            </div>
            <div className={statRowClass}>
              <span className="text-sm text-[var(--aethel-text-secondary)]">Total de projetos</span>
              <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">5,678</span>
            </div>
            <div className={statRowClass}>
              <span className="text-sm text-[var(--aethel-text-secondary)]">Geracao de tokens mensal</span>
              <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">4.2M</span>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Alertas de seguranca</h3>
              <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                Eventos operacionais que merecem triagem imediata do time.
              </p>
            </div>
            <button
              type="button"
              aria-label="Abrir triagem completa de seguranca"
              className={`rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-focus)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
            >
              Ver fila completa
            </button>
          </div>
          <div className="space-y-3">
            <div className={`${alertClass} border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)]`}>
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--aethel-error)]"></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-error)]">Critico</p>
                <span className="mt-1 block text-sm text-[var(--aethel-text-secondary)]">
                  3 tentativas de login suspeitas detectadas
                </span>
              </div>
            </div>
            <div className={`${alertClass} border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]`}>
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--aethel-warning)]"></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-warning-light)]">Atencao</p>
                <span className="mt-1 block text-sm text-[var(--aethel-text-secondary)]">
                  Certificado SSL expira em 15 dias
                </span>
              </div>
            </div>
            <div className={`${alertClass} border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)]`}>
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--aethel-primary)]"></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">Operacional</p>
                <span className="mt-1 block text-sm text-[var(--aethel-text-secondary)]">
                  Backup semanal concluido com sucesso
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
