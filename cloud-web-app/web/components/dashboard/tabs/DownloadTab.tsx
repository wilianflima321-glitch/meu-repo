'use client'

import React from 'react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

interface DownloadOption {
  id: string
  platform: 'windows' | 'mac' | 'linux'
  name: string
  description: string
  size: string
  version: string
  icon: React.ReactNode
  accent: string
  badge: string
}

interface DownloadTabProps {
  onDownload: (platform: string) => void
}

const DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    id: 'windows',
    platform: 'windows',
    name: 'Instalador Windows',
    description: 'Experiencia completa para Windows 10/11 com shell, preview e IA conectados.',
    size: '~250 MB',
    version: 'v2.1.0',
    accent: 'from-[var(--aethel-primary)] to-[var(--aethel-info)]',
    badge: 'Mais popular',
    icon: (
      <svg className="h-8 w-8 text-[var(--aethel-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'mac',
    platform: 'mac',
    name: 'Instalador macOS',
    description: 'Aplicativo nativo para macOS 11+ com setup rapido e atualizacoes continuas.',
    size: '~220 MB',
    version: 'v2.1.0',
    accent: 'from-[var(--aethel-secondary)] to-[var(--aethel-info)]',
    badge: 'Nativo',
    icon: (
      <svg className="h-8 w-8 text-[var(--aethel-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'linux',
    platform: 'linux',
    name: 'Instalador Linux',
    description: 'Pacote universal para ambientes Linux com tooling conectado ao Studio.',
    size: '~200 MB',
    version: 'v2.1.0',
    accent: 'from-[var(--aethel-warning)] to-[var(--aethel-error)]',
    badge: 'Universal',
    icon: (
      <svg className="h-8 w-8 text-[var(--aethel-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
]

const shellClass = [
  'space-y-8 rounded-[28px] border border-[var(--aethel-border-subtle)]',
  'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))]',
  'p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:p-8',
].join(' ')

const cardClass = [
  'rounded-2xl border border-[var(--aethel-border-subtle)]',
  'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)]',
  'p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]',
].join(' ')

const actionButtonClass = `inline-flex items-center justify-center rounded-xl bg-[var(--aethel-primary)] px-4 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] hover:brightness-110 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const secondaryButtonClass = `inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-4 py-3 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-focus)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

function platformLabel(platform: DownloadOption['platform']) {
  if (platform === 'mac') return 'macOS'
  if (platform === 'linux') return 'Linux'
  return 'Windows'
}

export default function DownloadTab({ onDownload }: DownloadTabProps) {
  return (
    <div className={shellClass}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--aethel-primary-light)]">
          Desktop Workbench
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)] lg:text-4xl">
          Baixe a Aethel IDE
        </h2>
        <p className="max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)]">
          Leve o Studio para o desktop com editor, preview, terminal e IA conectados ao mesmo projeto.
          O objetivo aqui e reduzir friccao: instalar, abrir e entrar no fluxo principal sem telas confusas.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--aethel-text-tertiary)]">
          <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-3 py-1">Gratuito no uso pessoal</span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-3 py-1">Atualizacoes continuas</span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-3 py-1">Conectado ao backend do Studio</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {DOWNLOAD_OPTIONS.map((option) => (
            <div key={option.id} className={`${cardClass} flex flex-col`}>
              <div className="mb-6 flex items-start justify-between gap-3">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${option.accent}`}>
                  {option.icon}
                </div>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  {option.badge}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[var(--aethel-text-primary)]">{option.name}</h3>
                <p className="min-h-[72px] text-sm leading-6 text-[var(--aethel-text-secondary)]">{option.description}</p>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--aethel-text-secondary)]">Tamanho</span>
                  <span className="font-medium text-[var(--aethel-text-primary)]">{option.size}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--aethel-text-secondary)]">Versao</span>
                  <span className="font-medium text-[var(--aethel-text-primary)]">{option.version}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--aethel-text-secondary)]">Plataforma</span>
                  <span className="font-medium text-[var(--aethel-text-primary)]">{platformLabel(option.platform)}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  aria-label={`Baixar Aethel IDE para ${platformLabel(option.platform)}`}
                  onClick={() => onDownload(option.platform)}
                  className={actionButtonClass}
                >
                  Baixar para {platformLabel(option.platform)}
                </button>
                <button
                  type="button"
                  aria-label={`Ver requisitos de instalacao para ${platformLabel(option.platform)}`}
                  className={secondaryButtonClass}
                >
                  Ver requisitos
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className={`${cardClass} flex flex-col gap-6`}>
          <div>
            <h3 className="text-xl font-semibold text-[var(--aethel-text-primary)]">Pronto para o ambiente local</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              Antes do download, ja deixamos claro o que o usuario precisa para evitar install flow frustrante.
            </p>
          </div>

          <div className="space-y-3">
            {[
              ['RAM', '8GB+ recomendado'],
              ['CPU', 'Quad-core 2GHz+'],
              ['Espaco livre', '1GB'],
              ['Internet', 'Conexao estavel'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-4 py-3 text-sm">
                <span className="text-[var(--aethel-text-secondary)]">{label}</span>
                <span className="font-medium text-[var(--aethel-text-primary)]">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-success-light)]">Fluxo recomendado</p>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              <li>1. Baixe o instalador da sua plataforma.</li>
              <li>2. Abra a IDE e conecte ao mesmo workspace do Studio.</li>
              <li>3. Continue no mesmo projeto com editor, preview e IA sincronizados.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
