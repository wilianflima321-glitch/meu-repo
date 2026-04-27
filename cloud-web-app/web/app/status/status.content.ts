import type { SurfaceCheck } from './status.types'

export const STATUS_REFRESH_INTERVAL_MS = 30_000

export const SURFACE_CHECKS: SurfaceCheck[] = [
  { id: 'runtime', name: 'Runtime base', endpoint: '/api/health/live', required: true },
  { id: 'readiness', name: 'Prontidao da aplicacao', endpoint: '/api/health/ready', required: true },
  { id: 'ai', name: 'Provedores de IA', endpoint: '/api/health/ai' },
  { id: 'database', name: 'Banco de dados', endpoint: '/api/health/db', required: true },
  { id: 'cache', name: 'Cache / rate limiting', endpoint: '/api/health/cache' },
  { id: 'storage', name: 'Armazenamento de assets', endpoint: '/api/health/storage' },
  { id: 'stripe', name: 'Gateway Stripe', endpoint: '/api/health/stripe' },
  { id: 'billing', name: 'Runtime de billing', endpoint: '/api/billing/readiness' },
]

export const TRUST_EXPLAINERS = [
  { title: 'Ao vivo', detail: 'Sem uptime rolling artificial nem greenwashing operacional.' },
  { title: 'Impacto', detail: 'Traduzimos checks tecnicos em leitura para cliente final.' },
  { title: 'Limites', detail: 'O que nao esta publicado fica marcado como ausente, nao escondido.' },
]

export const STATUS_TRUTHS = [
  'Operacional significa que o endpoint respondeu e o payload indicou disponibilidade real.',
  'Parcial significa que a superficie responde, mas depende de configuracao, credencial ou cobertura ainda incompleta.',
  'Bloqueado significa falha publica ou dependencia obrigatoria indisponivel.',
  'Sem timeline decorativa: quando nao existe historico confiavel publicado, esta pagina assume a lacuna em aberto.',
]

export const STATUS_LIMITS = [
  'Ainda nao publicamos uptime rolling de 7, 30 ou 90 dias.',
  'Ainda nao existe arquivo publico completo de incidentes encerrados.',
  'Evidence L4 continua em outra trilha: depende de producao real, nao so destes checks publicos.',
  'Esta pagina cobre checks publicos e readiness comercial, nao toda a telemetria interna do produto.',
]

export const INCIDENT_GRAMMAR = [
  {
    eyebrow: 'Sev 1',
    title: 'Bloqueio publico',
    detail: 'Usamos este estado quando runtime, readiness ou banco obrigatorio falham e o impacto para cliente pode ser imediato.',
  },
  {
    eyebrow: 'Sev 2',
    title: 'Capacidade degradada',
    detail: 'Usamos este estado quando a base responde, mas checkout, IA, cache ou storage ainda nao sustentam a experiencia completa prometida.',
  },
  {
    eyebrow: 'Sev 3',
    title: 'Cobertura incompleta',
    detail: 'Usamos este estado para lacunas de visibilidade publica: ausencia de historico, SLA ou prova de producao mais profunda.',
  },
]
