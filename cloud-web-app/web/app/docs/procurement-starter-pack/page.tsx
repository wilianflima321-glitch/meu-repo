import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BadgeHelp,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  Users2,
} from 'lucide-react'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Procurement Starter Pack | Aethel Docs',
  description:
    'Kit publico para buyers do Aethel com ordem de leitura, trust artifacts, FAQ de due diligence e o que enviar para acelerar uma avaliacao enterprise.',
}

const STARTER_METRICS = [
  {
    label: 'MFA',
    value: 'Live',
    detail: 'TOTP com QR code, setup manual e backup codes ja aparece como capacidade entregue.',
  },
  {
    label: 'SSO / SAML',
    value: 'Assistido',
    detail: 'Readiness tecnica existe, mas a narrativa publica continua de rollout assistido e nao de self-serve GA.',
  },
  {
    label: 'SOC 2 / GDPR',
    value: 'Sem overclaim',
    detail: 'Tratamos certificacoes e conformidade formal como alvo ou planejamento quando ainda nao existe publicacao final.',
  },
]

const REVIEW_STEPS = [
  {
    title: '1. Comece por trust e status',
    description:
      'Leia /security, /compliance e /status antes de qualquer call. Isso mostra o que esta live, o que segue parcial e onde ainda preferimos ser explicitos sobre lacunas.',
  },
  {
    title: '2. Cruze com pricing e customer proof',
    description:
      'Use /pricing e /customers para entender o foco comercial atual do produto, a linha entre self-serve e enterprise e o tipo de time que ja encontra valor.',
  },
  {
    title: '3. Monte a lista de requisitos',
    description:
      'Chegue com perguntas sobre identidade, rollout, logging, contratos, timeline e ownership. Isso reduz a chance de uma call generica e acelera triagem real.',
  },
  {
    title: '4. Acione vendas com escopo melhor',
    description:
      'Quando a conversa virar procurement, champion tecnico ou rollout enterprise, use /contact-sales com contexto suficiente para resposta orientada.',
  },
]

const ARTIFACTS = [
  {
    eyebrow: 'Trust',
    title: 'Seguranca publica',
    href: '/security',
    description:
      'Resumo honesto de MFA, status operacional, SSO/SAML e limites atuais da narrativa enterprise.',
  },
  {
    eyebrow: 'Governanca',
    title: 'Compliance publico',
    href: '/compliance',
    description:
      'Panorama da base atual de governanca, auditorias e do que ainda nao aparece como certificacao formal publicada.',
  },
  {
    eyebrow: 'Operacao',
    title: 'Status operacional',
    href: '/status',
    description:
      'Checks de readiness, dependencias e saude do runtime sem inventar uptime decorativo ou historico de incidente que nao existe.',
  },
  {
    eyebrow: 'Comercial',
    title: 'Pricing e readiness',
    href: '/pricing',
    description:
      'Onde a trilha self-serve termina, onde a conversa enterprise comeca e como o produto trata billing de forma publica.',
  },
  {
    eyebrow: 'Proof',
    title: 'Clientes beta',
    href: '/customers',
    description:
      'Tipos de time, snapshots compostos e superficies publicas de prova sem logo wall falsa nem contagem inflada.',
  },
  {
    eyebrow: 'Contato',
    title: 'Falar com vendas',
    href: '/contact-sales?source=procurement-pack',
    description:
      'Canal certo para security questionnaires, procurement timeline, requisitos de identidade ou rollout enterprise assistido.',
  },
]

const QUESTIONNAIRE_COLUMNS = [
  {
    title: 'Seguranca e identidade',
    bullets: [
      'Se TOTP com backup codes cobre o hardening minimo do seu processo agora.',
      'Se a avaliacao depende de SSO, SAML ou OIDC com rollout assistido.',
      'Quais expectativas existem para trilha de auditoria, visibilidade admin e postura de incidentes.',
    ],
  },
  {
    title: 'Rollout e operacao',
    bullets: [
      'Qual superficie do produto esta em avaliacao: Apps, Pesquisa, preview ou readiness comercial.',
      'Se o time quer piloto controlado, champion tecnico ou comparacao direta com stack atual.',
      'Qual timeline importa: exploratoria, 30 dias, 90 dias ou planejamento de semestre.',
    ],
  },
  {
    title: 'Comercial e procurement',
    bullets: [
      'Quem decide, quem aprova e quem precisa revisar trust artifacts antes da compra.',
      'Se contratos, faturamento, juridico ou governanca ja entram na primeira rodada.',
      'Quais respostas podem ficar publicas e quais dependem de conversa bilateral.',
    ],
  },
]

const FAQS = [
  {
    question: 'Vocês publicam logo wall ou customer count oficial?',
    answer:
      'Nao. A prova publica atual usa design partners beta, tipos de times e snapshots compostos de jornada sem inventar marcas, volumes ou resultados fechados.',
  },
  {
    question: 'SSO / SAML ja e checkbox de compra self-serve?',
    answer:
      'Ainda nao. O estado publico atual e de readiness tecnica + conversa assistida, nao de fluxo canonico, autoatendido e GA enterprise.',
  },
  {
    question: 'Existe certificacao SOC 2 publicada agora?',
    answer:
      'Nao declaramos isso hoje. Quando houver, a pagina publica precisa mostrar escopo, data e limites da auditoria com o mesmo nivel de franqueza.',
  },
  {
    question: 'Qual e a melhor ordem de leitura para um champion tecnico?',
    answer:
      'Security, compliance, status, pricing, customers e so depois contact-sales. Esse pack foi montado exatamente para reduzir descoberta repetida antes da call.',
  },
]

export default function ProcurementStarterPackPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[540px] w-[540px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[460px] w-[460px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para docs
        </Link>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
              <ClipboardList className="h-4 w-4" />
              Procurement starter pack
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
              O melhor ponto de partida publico para buyers sem depender de logo wall ou promessa vaga.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
              Este pack organiza a leitura que um champion tecnico, seguranca ou procurement pode fazer agora usando
              apenas superficies publicas do Aethel. A ideia e simples: menos brochura, mais evidencia navegavel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact-sales?source=procurement-pack-hero"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
              >
                Abrir conversa enterprise
              </Link>
              <Link
                href="/security"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                Comecar pelo trust center
              </Link>
            </div>
          </div>

          <aside className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              <BadgeHelp className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />
              Leitura honesta
            </div>
            <h2 className="mt-3 text-2xl font-semibold">O que este pack nao faz</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              <div className="rounded-[20px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3">
                Nao substitui questionario bilateral, revisao juridica ou conversa de rollout quando os requisitos ja ficaram especificos.
              </div>
              <div className="rounded-[20px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3">
                Nao inventa customer logos, contagem de clientes, certificacoes ou SSO GA para encurtar a jornada.
              </div>
              <div className="rounded-[20px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3">
                Nao esconde gaps: quando algo esta em roadmap ou assistido, preferimos deixar isso explicito logo de inicio.
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {STARTER_METRICS.map((metric) => (
            <article
              key={metric.label}
              className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                {metric.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">{metric.value}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-14">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              Ordem de leitura
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Como um buyer normalmente usa este pack.</h2>
            <p className="mt-3 text-base leading-7 text-[var(--aethel-text-secondary)]">
              A melhor ROI aqui vem de chegar na call com contexto melhor. Estas quatro etapas resumem a trilha publica mais util hoje.
            </p>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-4">
            {REVIEW_STEPS.map((step) => (
              <article
                key={step.title}
                className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-soft))] p-5 shadow-[0_18px_50px_rgba(2,8,23,0.22)]"
              >
                <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                Artefatos publicos
              </p>
              <h2 className="mt-2 text-3xl font-semibold">O que voce consegue validar agora.</h2>
              <p className="mt-3 text-base leading-7 text-[var(--aethel-text-secondary)]">
                Estes links conectam o trust center, a prova comercial e os limites do produto sem depender de claims que ainda nao cabem em uma pagina publica.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
              Sem placeholders
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {ARTIFACTS.map((artifact) => (
              <Link
                key={artifact.href}
                href={artifact.href}
                className="group rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] p-5 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  {artifact.eyebrow}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{artifact.title}</h3>
                  <ArrowRight className="h-4 w-4 text-[var(--aethel-info-light)] transition group-hover:translate-x-0.5" />
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{artifact.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
          <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6">
            <div className="flex items-center gap-3">
              <Users2 className="h-5 w-5 text-[var(--aethel-info-light)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
                O que enviar para nos
              </p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Entre na call com menos improviso.</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
              Se voce mandar estas informacoes logo no primeiro contato, a resposta tende a ser mais util do que um discovery call generico.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {QUESTIONNAIRE_COLUMNS.map((column) => (
              <article
                key={column.title}
                className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-soft))] p-5"
              >
                <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{column.title}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  {column.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--aethel-primary-light)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.86fr)]">
          <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-6">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-5 w-5 text-[var(--aethel-primary-light)]" />
              <h2 className="text-2xl font-semibold">Perguntas frequentes para due diligence inicial</h2>
            </div>
            <div className="mt-5 space-y-4">
              {FAQS.map((faq) => (
                <article
                  key={faq.question}
                  className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4"
                >
                  <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-6">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
              <ShieldCheck className="h-4 w-4" />
              Proximo melhor passo
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Se a leitura fez sentido, avance por aqui.</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
              O objetivo deste pack e melhorar a conversa seguinte. Se ja existe escopo claro, vale transformar leitura em briefing com ownership e timeline.
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href="/contact-sales?source=procurement-pack-cta"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
              >
                Enviar briefing enterprise
              </Link>
              <Link
                href="/customers"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                Revisar customer proof
              </Link>
            </div>
          </aside>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
