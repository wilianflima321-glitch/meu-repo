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
      description: 'Start in AI Console to align the brief, evidence, and benchmark.',
      targetTab: 'ai-chat',
      onboardingToast: 'Research flow ready. Use the AI Console to consolidate context, evidence, and the next decision.',
    },
  },
  {
    matches: (source) => source.startsWith('home-cloud'),
    lane: {
      id: 'cloud',
      label: 'Cloud / DevOps',
      description: 'Check connectivity and platform readiness before going deeper.',
      targetTab: 'connectivity',
      onboardingToast: 'Cloud / DevOps flow ready. Confirm connectivity, environment, and readiness before continuing.',
    },
  },
  {
    matches: (source) => source.startsWith('home-growth'),
    lane: {
      id: 'growth',
      label: 'Growth / Ops',
      description: 'Use the AI Console to organize operations, automations, and next steps.',
      targetTab: 'ai-chat',
      onboardingToast: 'Growth / Ops flow ready. Structure the operation in the AI Console before spreading the work.',
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
      targetTab: 'ai-chat',
      showFirstValueGuide: params.onboarding,
      chatSeed: mission,
      toast: {
        message: 'Mission loaded in the AI Console. Review, refine, and send when ready.',
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
