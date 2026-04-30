import type { ActiveTab, ToastType } from './aethel-dashboard-model'

export type EntryLaneId =
  | 'apps'
  | 'research'
  | 'cloud'
  | 'growth'
  | 'games'
  | 'media'
  | 'resume'
  | 'general'

export type DashboardEntryLane = {
  id: EntryLaneId
  label: string
  description: string
  targetTab: ActiveTab
  onboardingToast: string
}

type DashboardEntrySeed = {
  targetTab: ActiveTab
  showFirstValueGuide: boolean
  chatSeed: string | null
  toast: {
    message: string
    type: ToastType
  } | null
}

const DEFAULT_LANE: DashboardEntryLane = {
  id: 'general',
  label: 'Mission intake',
  description: 'Start light, then deepen only when the work really needs Studio.',
  targetTab: 'overview',
  onboardingToast: 'Studio Home pronto. Escolha a melhor proxima acao sem cair em um dashboard generico.',
}

const ENTRY_LANES: Array<{
  matches: (source: string) => boolean
  lane: DashboardEntryLane
}> = [
  {
    matches: (source) => source.startsWith('home-apps'),
    lane: {
      id: 'apps',
      label: 'Apps / Sites',
      description: 'Crie o workspace certo antes de abrir o Studio completo.',
      targetTab: 'projects',
      onboardingToast: 'Fluxo de Apps / Sites pronto. Escolha ou crie o workspace antes do handoff para o Studio.',
    },
  },
  {
    matches: (source) => source.startsWith('home-research'),
    lane: {
      id: 'research',
      label: 'Research',
      description: 'Comece no AI Console para alinhar briefing, evidencias e benchmark.',
      targetTab: 'ai-chat',
      onboardingToast: 'Fluxo de Research pronto. Use o AI Console para consolidar contexto, evidencias e proxima decisao.',
    },
  },
  {
    matches: (source) => source.startsWith('home-cloud'),
    lane: {
      id: 'cloud',
      label: 'Cloud / DevOps',
      description: 'Verifique conectividade e prontidao da plataforma antes de aprofundar.',
      targetTab: 'connectivity',
      onboardingToast: 'Fluxo de Cloud / DevOps pronto. Confirme conectividade, ambiente e readiness antes de seguir.',
    },
  },
  {
    matches: (source) => source.startsWith('home-growth'),
    lane: {
      id: 'growth',
      label: 'Growth / Ops',
      description: 'Use o AI Console para organizar operacao, automacoes e proximos passos.',
      targetTab: 'ai-chat',
      onboardingToast: 'Fluxo de Growth / Ops pronto. Estruture a operacao no AI Console antes de espalhar o trabalho.',
    },
  },
  {
    matches: (source) => source.startsWith('home-games'),
    lane: {
      id: 'games',
      label: 'Games',
      description: 'Prepare o workspace primeiro e deixe a profundidade pesada para o Studio.',
      targetTab: 'projects',
      onboardingToast: 'Fluxo de Games pronto. Organize o workspace e so depois aprofunde no Studio.',
    },
  },
  {
    matches: (source) => source.startsWith('home-media'),
    lane: {
      id: 'media',
      label: 'Films / Media',
      description: 'Comece pelo workspace e preserve o Studio para review e viewport.',
      targetTab: 'projects',
      onboardingToast: 'Fluxo de Films / Media pronto. Organize o workspace antes de abrir a camada mais profunda.',
    },
  },
  {
    matches: (source) => source.startsWith('resume-'),
    lane: {
      id: 'resume',
      label: 'Mission resume',
      description: 'Retome a superficie principal e so abra profundidade quando a missao pedir.',
      targetTab: 'overview',
      onboardingToast: 'Missao retomada no ponto certo.',
    },
  },
]

export function resolveDashboardEntryLane(source: string | null | undefined): DashboardEntryLane {
  if (!source) {
    return DEFAULT_LANE
  }

  const normalized = source.trim().toLowerCase()
  if (!normalized) {
    return DEFAULT_LANE
  }

  return ENTRY_LANES.find((candidate) => candidate.matches(normalized))?.lane ?? DEFAULT_LANE
}

export function resolveDashboardEntrySeed(params: {
  mission: string | null
  source: string | null
  onboarding: boolean
}): DashboardEntrySeed {
  const lane = resolveDashboardEntryLane(params.source)
  const mission = params.mission?.trim() || null

  if (mission) {
    return {
      targetTab: 'ai-chat',
      showFirstValueGuide: params.onboarding,
      chatSeed: mission,
      toast: {
        message: 'Missao carregada no AI Console. Revise, refine e envie quando estiver pronto.',
        type: 'info',
      },
    }
  }

  if (params.onboarding) {
    return {
      targetTab: lane.targetTab,
      showFirstValueGuide: true,
      chatSeed: null,
      toast: {
        message: lane.onboardingToast,
        type: 'success',
      },
    }
  }

  return {
    targetTab: lane.targetTab,
    showFirstValueGuide: false,
    chatSeed: null,
    toast: null,
  }
}
