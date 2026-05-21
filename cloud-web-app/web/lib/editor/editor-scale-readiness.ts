export type EditorScaleLane =
  | 'world-outliner'
  | 'details-panel'
  | 'content-browser';

export type EditorScaleStatus = 'ready' | 'watch' | 'guarded';

export interface EditorScaleBudget {
  readyMax: number;
  watchMax: number;
  unit: string;
  requiresVirtualization: boolean;
}

export interface EditorScaleReadinessInput {
  lane: EditorScaleLane;
  totalCount: number;
  visibleCount?: number;
  virtualization: boolean;
}

export interface EditorScaleReadiness {
  lane: EditorScaleLane;
  label: string;
  status: EditorScaleStatus;
  detail: string;
  totalCount: number;
  visibleCount: number;
  virtualization: boolean;
  recommendation: string;
}

export const EDITOR_SCALE_BUDGETS: Record<EditorScaleLane, EditorScaleBudget> = {
  'world-outliner': {
    readyMax: 1_000,
    watchMax: 5_000,
    unit: 'scene objects',
    requiresVirtualization: true,
  },
  'details-panel': {
    readyMax: 80,
    watchMax: 240,
    unit: 'properties',
    requiresVirtualization: false,
  },
  'content-browser': {
    readyMax: 1_000,
    watchMax: 5_000,
    unit: 'assets',
    requiresVirtualization: true,
  },
};

const LANE_LABELS: Record<EditorScaleLane, string> = {
  'world-outliner': 'Outliner scale',
  'details-panel': 'Inspector scale',
  'content-browser': 'Asset scale',
};

const STATUS_RECOMMENDATIONS: Record<EditorScaleStatus, string> = {
  ready: 'Within interactive budget.',
  watch: 'Healthy, but monitor large-project interaction cost.',
  guarded: 'High-scale project: keep heavy panels virtualized or collapsed.',
};

export function buildEditorScaleReadiness(
  input: EditorScaleReadinessInput,
): EditorScaleReadiness {
  const budget = EDITOR_SCALE_BUDGETS[input.lane];
  const totalCount = Math.max(0, input.totalCount);
  const visibleCount = Math.max(0, input.visibleCount ?? totalCount);
  const lacksRequiredVirtualization = budget.requiresVirtualization && !input.virtualization;

  let status: EditorScaleStatus = 'ready';
  if (lacksRequiredVirtualization || totalCount > budget.watchMax) {
    status = 'guarded';
  } else if (totalCount > budget.readyMax) {
    status = 'watch';
  }

  const visibleSegment =
    visibleCount < totalCount ? `${visibleCount}/${totalCount}` : `${totalCount}`;
  const virtualizationSegment = input.virtualization ? 'virtualized' : 'not virtualized';
  const recommendation = lacksRequiredVirtualization
    ? 'Add virtualization before scaling this surface.'
    : STATUS_RECOMMENDATIONS[status];

  return {
    lane: input.lane,
    label: LANE_LABELS[input.lane],
    status,
    detail: `${visibleSegment} ${budget.unit} visible, ${virtualizationSegment}.`,
    totalCount,
    visibleCount,
    virtualization: input.virtualization,
    recommendation,
  };
}
