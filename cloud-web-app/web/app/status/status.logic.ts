import type {
  SurfaceCheck,
  SurfaceResult,
  SurfaceState,
  StatusCoverageCard,
  StatusTimelineEntry,
} from './status.types'

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function getNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return asRecord(source[key])
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function stateStyles(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
    case 'partial':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
    case 'unhealthy':
      return 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
    default:
      return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)]'
  }
}

export function stateLabel(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'Operacional'
    case 'partial':
      return 'Parcial'
    case 'unhealthy':
      return 'Indisponivel'
    default:
      return 'Desconhecido'
  }
}

export function summarizePayload(
  checkId: string,
  payload: unknown,
  ok: boolean
): { state: SurfaceState; detail: string; latency?: number } {
  const data = asRecord(payload)
  const latency = typeof data.latency === 'number' ? data.latency : undefined
  const ai = getNestedRecord(data, 'ai')
  const database = getNestedRecord(data, 'database')
  const cache = getNestedRecord(data, 'cache')
  const storage = getNestedRecord(data, 'storage')
  const gateway = getNestedRecord(data, 'gateway')
  const provider = getNestedRecord(data, 'provider')
  const stripe = getNestedRecord(data, 'stripe')
  const stats = getNestedRecord(database, 'stats')

  if (checkId === 'runtime') {
    return {
      state: ok ? 'healthy' : 'unhealthy',
      detail: ok ? 'Rota de liveness respondendo.' : 'Probe do runtime base falhou.',
      latency,
    }
  }

  if (checkId === 'readiness') {
    return {
      state: data.status === 'ready' ? 'healthy' : ok ? 'partial' : 'unhealthy',
      detail:
        data.status === 'ready'
          ? 'Dependencias obrigatorias do runtime estao disponiveis.'
          : 'Runtime ainda sem uma ou mais dependencias obrigatorias.',
      latency,
    }
  }

  if (checkId === 'ai') {
    if (ai.configured) {
      const providerName = typeof ai.provider === 'string' ? ai.provider : 'provedor configurado'
      return { state: 'healthy', detail: `Configurado via ${providerName}.`, latency }
    }
    return {
      state: data.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: typeof ai.message === 'string' ? ai.message : 'Nenhum provedor de IA configurado ainda.',
      latency,
    }
  }

  if (checkId === 'database') {
    if (database.connected) {
      const projects = typeof stats.projects === 'number' ? stats.projects : undefined
      return {
        state: 'healthy',
        detail: typeof projects === 'number' ? `Conectado. ${projects} projetos visiveis.` : 'Conectado.',
        latency,
      }
    }
    return {
      state: 'unhealthy',
      detail: typeof database.error === 'string' ? database.error : 'Falha na conexao com o banco.',
      latency,
    }
  }

  if (checkId === 'cache') {
    if (cache.configured) return { state: 'healthy', detail: 'Configurado e acessivel.', latency }
    return {
      state: data.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail:
        typeof cache.message === 'string'
          ? cache.message
          : typeof cache.error === 'string'
            ? cache.error
            : 'Cache nao configurado.',
      latency,
    }
  }

  if (checkId === 'storage') {
    if (storage.configured) {
      const storageType = typeof storage.type === 'string' ? storage.type : 'storage'
      return { state: 'healthy', detail: `Configurado em ${storageType}.`, latency }
    }
    return {
      state: data.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail:
        typeof storage.message === 'string'
          ? storage.message
          : typeof storage.error === 'string'
            ? storage.error
            : 'Armazenamento nao configurado.',
      latency,
    }
  }

  if (checkId === 'stripe') {
    if (data.healthy) return { state: 'healthy', detail: 'Gateway Stripe pronto para checkout.', latency }
    const priceCoverage =
      typeof data.configuredPriceCount === 'number' && typeof data.requiredPriceCount === 'number'
        ? ` prices=${data.configuredPriceCount}/${data.requiredPriceCount}.`
        : ''
    const missingEnv = getStringArray(data.missingEnv)
    const missingEnvDetail = missingEnv.length > 0 ? ` Ausentes: ${missingEnv.join(', ')}.` : ''
    const gatewayName = typeof data.gateway === 'string' ? data.gateway : 'unknown'
    const providerLabel =
      typeof data.providerLabel === 'string'
        ? data.providerLabel
        : typeof data.provider === 'string'
          ? data.provider
          : 'unknown'
    return {
      state: ok ? 'partial' : 'unhealthy',
      detail: `Gateway=${gatewayName}, checkout=${data.checkoutEnabled ? 'habilitado' : 'desabilitado'}, provider=${providerLabel}.${priceCoverage}${missingEnvDetail}`.trim(),
      latency,
    }
  }

  if (checkId === 'billing') {
    if (data.checkoutReady) return { state: 'healthy', detail: 'Runtime de checkout pronto.', latency }
    const gatewayName =
      typeof gateway.activeGateway === 'string'
        ? gateway.activeGateway
        : typeof gateway.gateway === 'string'
          ? gateway.gateway
          : 'unknown'
    const providerName =
      typeof provider.label === 'string'
        ? provider.label
        : typeof provider.id === 'string'
          ? provider.id
          : 'unknown'
    const priceCoverage =
      typeof stripe.configuredPriceCount === 'number' && typeof stripe.requiredPriceCount === 'number'
        ? ` prices=${stripe.configuredPriceCount}/${stripe.requiredPriceCount}.`
        : ''
    const missingEnv = getStringArray(stripe.missingEnv)
    const missingEnvDetail = missingEnv.length > 0 ? ` Ausentes: ${missingEnv.join(', ')}.` : ''
    return {
      state: data.status === 'partial' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: `Runtime de billing ainda parcial. Gateway=${gatewayName}, provider=${providerName}.${priceCoverage}${missingEnvDetail}`.trim(),
      latency,
    }
  }

  return {
    state: ok ? 'healthy' : 'unhealthy',
    detail: ok ? 'Operacional.' : 'Falha no endpoint.',
    latency,
  }
}

export async function fetchSurface(check: SurfaceCheck): Promise<SurfaceResult> {
  try {
    const response = await fetch(check.endpoint, { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    const summary = summarizePayload(check.id, payload, response.ok)
    return { id: check.id, name: check.name, ...summary }
  } catch (error) {
    return {
      id: check.id,
      name: check.name,
      state: 'unhealthy',
      detail: error instanceof Error ? error.message : 'Falha na requisicao.',
    }
  }
}

export function summarizeOverallState(surfaces: SurfaceResult[], checks: SurfaceCheck[]): SurfaceState {
  if (surfaces.length === 0) return 'unknown'
  const requiredIds = new Set(checks.filter((check) => check.required).map((check) => check.id))
  const requiredSurfaces = surfaces.filter((surface) => requiredIds.has(surface.id))
  if (requiredSurfaces.some((surface) => surface.state === 'unhealthy')) return 'unhealthy'
  if (surfaces.some((surface) => surface.state === 'partial')) return 'partial'
  if (surfaces.every((surface) => surface.state === 'healthy')) return 'healthy'
  return 'unknown'
}

export function getStateCounts(surfaces: SurfaceResult[]) {
  return {
    healthy: surfaces.filter((surface) => surface.state === 'healthy').length,
    partial: surfaces.filter((surface) => surface.state === 'partial').length,
    unhealthy: surfaces.filter((surface) => surface.state === 'unhealthy').length,
  }
}

export function getOverallTitle(overall: SurfaceState) {
  if (overall === 'healthy') return 'Runtime publico operacional'
  if (overall === 'partial') return 'Runtime publico parcial'
  if (overall === 'unhealthy') return 'Runtime com bloqueios ativos'
  return 'Coletando sinais'
}

export function getOverallDescription(overall: SurfaceState) {
  if (overall === 'healthy') return 'Os checks publicos configurados responderam sem bloqueios relevantes.'
  if (overall === 'partial') return 'A base publica responde, mas alguns subsistemas ainda estao em estado parcial.'
  if (overall === 'unhealthy') return 'Um ou mais blocos essenciais do runtime falharam na verificacao publica.'
  return 'Atualizando checks operacionais em tempo real.'
}

export function getCoverageSummary(
  surfaces: SurfaceResult[],
  checks: SurfaceCheck[],
  blockingSurfaces: SurfaceResult[],
  partialSurfaces: SurfaceResult[]
): { customerImpact: string; cards: StatusCoverageCard[] } {
  const requiredCount = checks.filter((check) => check.required).length
  const respondingCount = surfaces.filter((surface) => surface.state !== 'unknown').length

  if (blockingSurfaces.length > 0) {
    return {
      customerImpact:
        'Ha impacto potencial direto para usuarios finais: pelo menos uma dependencia obrigatoria falhou no check publico.',
      cards: [
        {
          title: 'Cobertura provada agora',
          detail: `${respondingCount}/${checks.length} checks responderam nesta rodada. ${requiredCount} deles sao obrigatorios para a experiencia base.`,
        },
        {
          title: 'Leitura comercial',
          detail: 'Nao tratamos este momento como green status. A pagina assume bloqueio publico quando runtime, readiness ou banco falham.',
        },
        {
          title: 'Ainda nao publicado',
          detail: 'Nao exibimos SLA, uptime rolling ou postmortem arquivado enquanto essa trilha publica ainda nao existe.',
        },
      ],
    }
  }

  if (partialSurfaces.length > 0) {
    return {
      customerImpact:
        'Usuarios conseguem acessar a base publica, mas capacidades vendaveis como billing, IA ou dependencias opcionais ainda podem variar.',
      cards: [
        {
          title: 'Cobertura provada agora',
          detail: `${respondingCount}/${checks.length} checks responderam. A base publica esta de pe, mas ha superficies ainda incompletas.`,
        },
        {
          title: 'Leitura comercial',
          detail: 'Usamos "parcial" para sinalizar que a jornada pode funcionar, mas ainda sem cobertura integral de credenciais, checkout ou storage.',
        },
        {
          title: 'Ainda nao publicado',
          detail: 'Nao prometemos confiabilidade historica acima do que os checks atuais conseguem demonstrar em publico.',
        },
      ],
    }
  }

  return {
    customerImpact:
      'Nenhum bloqueio publico apareceu nos checks obrigatorios desta rodada, mas a pagina continua limitada ao que estes endpoints conseguem provar.',
    cards: [
      {
        title: 'Cobertura provada agora',
        detail: `${respondingCount}/${checks.length} checks responderam nesta rodada. Os checks obrigatorios nao acusaram bloqueio ativo.`,
      },
      {
        title: 'Leitura comercial',
        detail: 'O status atual e bom para leitura de saude publica imediata, nao para substituir um historico formal de SLA ou incidentes.',
      },
      {
        title: 'Ainda nao publicado',
        detail: 'Continuamos sem uptime rolling, sem arquivo de incidentes encerrados e sem prova L4 integral nesta superficie publica.',
      },
    ],
  }
}

export function getStatusTimeline(
  overall: SurfaceState,
  blockingSurfaces: SurfaceResult[],
  partialSurfaces: SurfaceResult[],
  lastUpdated: string | null
): StatusTimelineEntry[] {
  const timestampLabel = lastUpdated ? new Date(lastUpdated).toLocaleTimeString('pt-BR') : 'agora'
  const activeIncidentTitle =
    overall === 'healthy'
      ? 'Nenhum incidente publico ativo nos checks obrigatorios'
      : overall === 'partial'
        ? 'Degradacao ativa em capacidades nao totalmente fechadas'
        : overall === 'unhealthy'
          ? 'Incidente publico ativo em superficie obrigatoria'
          : 'Checks ainda coletando estado'

  const activeIncidentDetail =
    overall === 'healthy'
      ? 'A leitura atual nao encontrou bloqueio em runtime, readiness ou banco. Isso nao substitui historico de SLA.'
      : overall === 'partial'
        ? `A base responde, mas ${partialSurfaces.map((surface) => surface.name).join(', ') || 'algumas superficies'} ainda estao em estado parcial.`
        : overall === 'unhealthy'
          ? `As superficies ${blockingSurfaces.map((surface) => surface.name).join(', ') || 'obrigatorias'} falharam no check publico atual.`
          : 'A primeira coleta ainda esta em andamento.'

  return [
    {
      id: 'now',
      label: 'Agora',
      title: activeIncidentTitle,
      detail: activeIncidentDetail,
      tone: overall === 'unknown' ? 'unknown' : overall,
      timestampLabel,
    },
    {
      id: 'watch',
      label: 'Leitura comercial',
      title: partialSurfaces.length > 0 ? 'Capacidades vendaveis ainda em observacao' : 'Sem alerta comercial parcial nesta rodada',
      detail:
        partialSurfaces.length > 0
          ? `A pagina esta sendo honesta sobre ${partialSurfaces.length} superficie(s) ainda parciais para evitar vender cobertura que o runtime nao provou.`
          : 'Nao houve necessidade de abrir alerta comercial parcial nesta coleta publica.',
      tone: partialSurfaces.length > 0 ? 'partial' : 'healthy',
      timestampLabel,
    },
    {
      id: 'history-gap',
      label: 'Historico',
      title: 'Arquivo publico de incidentes ainda incompleto',
      detail:
        'Esta pagina ja mostra o estado atual com mais qualidade, mas ainda nao publica timeline encerrada de incidentes, uptime rolling ou postmortems formais.',
      tone: 'partial',
      timestampLabel: 'lacuna aberta',
    },
  ]
}

export function getNextActions(blockingSurfaces: SurfaceResult[], partialSurfaces: SurfaceResult[]) {
  if (blockingSurfaces.some((surface) => surface.id === 'database')) {
    return [
      'Restabelecer conectividade com o banco de dados.',
      'Revalidar readiness e runtime publico apos a conexao voltar.',
      'Atualizar esta pagina apenas quando o check publico provar a recuperacao.',
    ]
  }

  if (blockingSurfaces.some((surface) => surface.id === 'runtime' || surface.id === 'readiness')) {
    return [
      'Recuperar liveness/readiness do app antes de promover qualquer narrativa publica.',
      'Executar novo ciclo de checks para confirmar estabilidade do runtime.',
      'Só entao considerar a capacidade como comercialmente confiavel de novo.',
    ]
  }

  if (partialSurfaces.some((surface) => surface.id === 'stripe' || surface.id === 'billing')) {
    return [
      'Completar checkout + webhook para transformar billing em capacidade vendavel.',
      'Validar os planos e price IDs com o runtime de billing real.',
      'Publicar esse ganho aqui apenas quando os checks deixarem de marcar parcial.',
    ]
  }

  if (partialSurfaces.some((surface) => surface.id === 'storage' || surface.id === 'cache' || surface.id === 'ai')) {
    return [
      'Fechar credenciais/configuracoes das dependencias opcionais ainda parciais.',
      'Executar um novo check publico para confirmar o ganho de cobertura operacional.',
      'Usar a leitura comercial para evitar prometer experiencia que ainda depende de setup manual.',
    ]
  }

  return [
    'Manter os checks publicos respondendo e ampliar evidencias de producao real.',
    'Abrir historico publico de incidentes encerrados quando a trilha estiver madura.',
    'Usar o admin de monitoramento para fechar os blockers de L4 que ainda nao aparecem aqui.',
  ]
}
