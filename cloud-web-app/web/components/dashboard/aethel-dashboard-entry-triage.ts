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
  onboardingToast: 'Studio Home ready. Choose the best next action without falling into a generic dashboard.',
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
      description: 'Create the right workspace before opening the full Studio.',
      targetTab: 'projects',
      onboardingToast: 'Apps / Sites flow ready. Choose or create the workspace before handing off to Studio.',
    },
  },
  {
    matches: (source) => source.startsWith('home-research'),
    lane: {
      id: 'research',
      label: 'Research',
      description: 'Start with compact activity, then open IDE agents when the brief is ready for execution.',
      targetTab: 'activity',
      onboardingToast: 'Research flow ready. Activity keeps evidence, cost, and the next action together.',
    },
  },
  {
    matches: (source) => source.startsWith('home-cloud'),
    lane: {
      id: 'cloud',
      label: 'Cloud / DevOps',
      description: 'Check status without turning Studio Home into a settings wall.',
      targetTab: 'activity',
      onboardingToast: 'Cloud / DevOps flow ready. Activity summarizes status and links to settings only when needed.',
    },
  },
  {
    matches: (source) => source.startsWith('home-growth'),
    lane: {
      id: 'growth',
      label: 'Growth / Ops',
      description: 'Organize operations, automations, and next steps from a compact activity lane.',
      targetTab: 'activity',
      onboardingToast: 'Growth / Ops flow ready. Activity keeps the next operational decision in one place.',
    },
  },
  {
    matches: (source) => source.startsWith('home-games'),
    lane: {
      id: 'games',
      label: 'Games',
      description: 'Prepare the workspace first and leave heavy depth for Studio.',
      targetTab: 'projects',
      onboardingToast: 'Games flow ready. Organize the workspace before going deeper in Studio.',
    },
  },
  {
    matches: (source) => source.startsWith('home-media'),
    lane: {
      id: 'media',
      label: 'Films / Media',
      description: 'Start from the workspace and preserve Studio for review and viewport work.',
      targetTab: 'projects',
      onboardingToast: 'Films / Media flow ready. Organize the workspace before opening the deeper layer.',
    },
  },
  {
    matches: (source) => source.startsWith('resume-'),
    lane: {
      id: 'resume',
      label: 'Mission resume',
      description: 'Resume the main surface and open depth only when the mission asks for it.',
      targetTab: 'overview',
      onboardingToast: 'Mission resumed at the right point.',
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
      targetTab: 'activity',
      showFirstValueGuide: params.onboarding,
      chatSeed: mission,
      toast: {
        message: 'Mission loaded. Open IDE agents when you are ready to execute.',
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
