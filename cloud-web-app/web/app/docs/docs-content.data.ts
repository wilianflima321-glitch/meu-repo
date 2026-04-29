import type { LucideIcon } from 'lucide-react'
import { Book, Code2, Rocket, Layers, Terminal, Puzzle, ShieldCheck } from 'lucide-react'

export type DocLink = {
  title: string
  href: string
  summary: string
}

export type DocSection = {
  title: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  href: string
  items: DocLink[]
}

export const DOC_SECTIONS: DocSection[] = [
  {
    title: 'Primeiros passos',
    description: 'Entrada oficial para configurar ambiente, abrir o primeiro projeto e entender a shell do studio.',
    icon: Rocket,
    color: 'text-[var(--aethel-success)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]',
    href: '/docs/getting-started',
    items: [
      {
        title: 'Comecar pelo studio',
        href: '/docs/getting-started',
        summary: 'Fluxo inicial para onboarding, runtime e primeiro valor.',
      },
    ],
  },
  {
    title: 'Referencia da API',
    description: 'Contratos das rotas principais, readiness endpoints e surfaces de integracao publica.',
    icon: Code2,
    color: 'text-[var(--aethel-primary-light)]',
    bgColor: 'bg-[var(--aethel-primary)]/10',
    href: '/docs/api',
    items: [
      {
        title: 'Endpoints e contratos',
        href: '/docs/api',
        summary: 'Visao da API publica e das rotas operacionais mais importantes.',
      },
    ],
  },
  {
    title: 'Trust e buyers',
    description: 'Starter pack para procurement, trust center publico e postura de compliance sem claims infladas.',
    icon: ShieldCheck,
    color: 'text-[var(--aethel-info-light)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/procurement-starter-pack',
    items: [
      {
        title: 'Procurement starter pack',
        href: '/docs/procurement-starter-pack',
        summary: 'Ordem de leitura publica para due diligence, champion tecnico e conversa enterprise.',
      },
      {
        title: 'Trust center de seguranca',
        href: '/security',
        summary: 'Separa o que esta live, parcial e planejado sem maquiar maturidade.',
      },
      {
        title: 'Compare o Aethel com o mercado',
        href: '/compare',
        summary: 'Comparativo honesto contra Cursor, Windsurf, Replit, Vercel, Linear e Notion.',
      },
      {
        title: 'Panorama de compliance',
        href: '/compliance',
        summary: 'Explica governanca atual, limites publicos e o que ainda segue como alvo.',
      },
    ],
  },
  {
    title: 'IDE e workbench',
    description: 'Como editor, chat, preview e operacao compartilham o mesmo fluxo dentro do studio.',
    icon: Layers,
    color: 'text-[var(--aethel-info)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/ide',
    items: [
      {
        title: 'Workbench do produto',
        href: '/docs/ide',
        summary: 'Contexto do editor, preview runtime, estrutura do shell e superficie de trabalho.',
      },
    ],
  },
  {
    title: 'Games',
    description: 'Status atual do dominio Games, escopo suportado e lacunas antes de promocao de maturidade.',
    icon: Terminal,
    color: 'text-[var(--aethel-warning)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]',
    href: '/docs/games',
    items: [
      {
        title: 'Estado do modulo Games',
        href: '/docs/games',
        summary: 'Limites atuais, runtime e proximas etapas antes de L3.',
      },
    ],
  },
  {
    title: 'Films',
    description: 'Timeline, story workbench e roadmap real do modulo Films sem inflar capability.',
    icon: Puzzle,
    color: 'text-[var(--aethel-info)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/films',
    items: [
      {
        title: 'Estado do modulo Films',
        href: '/docs/films',
        summary: 'Como o sistema de filmes esta organizado hoje e o que ainda depende de integracoes externas.',
      },
    ],
  },
  {
    title: 'Operacao e suporte',
    description: 'Mudancas publicas, suporte e comunidade para acompanhar evolucao do produto.',
    icon: Book,
    color: 'text-[var(--aethel-primary-light)]',
    bgColor: 'bg-[var(--aethel-primary)]/10',
    href: '/docs/support',
    items: [
      {
        title: 'Changelog publico',
        href: '/docs/changelog',
        summary: 'Releases e ajustes publicados para acompanhar deltas de produto.',
      },
      {
        title: 'Suporte',
        href: '/docs/support',
        summary: 'Canais e fluxo de suporte do produto.',
      },
      {
        title: 'Comunidade',
        href: '/docs/community',
        summary: 'Espacos publicos e loops de feedback.',
      },
    ],
  },
]

export const DOC_QUICK_LINKS: DocLink[] = [
  {
    title: 'Primeiro valor no dashboard',
    href: '/docs/getting-started',
    summary: 'Como a entrada do studio foi organizada para evitar um dashboard vazio e sem contexto.',
  },
  {
    title: 'API e readiness operacional',
    href: '/docs/api',
    summary: 'Onde olhar endpoints, health checks e superficies publicas com contrato mais estavel.',
  },
  {
    title: 'Workbench do IDE',
    href: '/docs/ide',
    summary: 'Como chat, editor e preview convivem no mesmo shell de produto.',
  },
  {
    title: 'Procurement starter pack',
    href: '/docs/procurement-starter-pack',
    summary: 'Como buyers podem revisar seguranca, compliance e rollout com base em artefatos publicos reais.',
  },
  {
    title: 'Comparativo de mercado',
    href: '/compare',
    summary: 'Ajuda buyer e champion tecnico a entender onde o Aethel ja ganha e onde o mercado ainda lidera.',
  },
  {
    title: 'Roadmap publico',
    href: '/roadmap',
    summary: 'Visao honesta do que esta live, parcial e planejado sem transformar auditoria em promessa falsa.',
  },
  {
    title: 'Roadmap de Games',
    href: '/docs/games',
    summary: 'Estado atual do modulo Games sem claims infladas.',
  },
  {
    title: 'Roadmap de Films',
    href: '/docs/films',
    summary: 'Escopo real do modulo Films e dependencias externas.',
  },
  {
    title: 'Changelog e suporte',
    href: '/docs/changelog',
    summary: 'Onde acompanhar mudancas recentes e caminhos oficiais de suporte.',
  },
]
