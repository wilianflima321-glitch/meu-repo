'use client';

import type { PanelState } from '../ModernIDEShell';
import type { BottomPanelMode } from '../modern-shell/types';
import type { EntryNotice } from './WorkbenchEntryNotice';
import type { PreviewMode, SidebarTab } from './types';

export type WorkbenchEntryLaneId =
  | 'apps'
  | 'research'
  | 'cloud'
  | 'growth'
  | 'games'
  | 'media'
  | 'general';

export type WorkbenchEntryProfile = {
  laneId: WorkbenchEntryLaneId;
  laneLabel: string;
  dominantSurface: 'artifact' | 'runtime' | 'console' | 'ai';
  previewEnabled: boolean;
  previewMode: PreviewMode;
  sidebarTab: SidebarTab;
  bottomPanel: BottomPanelMode;
  panelState: PanelState;
  notice: EntryNotice | null;
};

export type WorkbenchEntryChromeContext = {
  focusLabel: string;
  supportLabel: string;
  summary: string;
  stageLabel: string;
};

const GENERAL_PANEL_STATE: PanelState = {
  sidebar: { open: true, size: 18 },
  editor: { open: true, size: 46 },
  preview: { open: true, size: 36 },
  chat: { open: false, size: 22 },
};

const ENTRY_PROFILES: Record<Exclude<WorkbenchEntryLaneId, 'general'>, WorkbenchEntryProfile> = {
  apps: {
    laneId: 'apps',
    laneLabel: 'Apps / Sites',
    dominantSurface: 'artifact',
    previewEnabled: true,
    previewMode: 'runtime',
    sidebarTab: 'explorer',
    bottomPanel: 'chat',
    panelState: {
      sidebar: { open: true, size: 18 },
      editor: { open: true, size: 42 },
      preview: { open: true, size: 40 },
      chat: { open: false, size: 20 },
    },
    notice: {
      tone: 'info',
      title: 'Artifact-first Studio',
      description: 'Apps / Sites opens with preview on stage and review ready to deepen only what truly needs code.',
    },
  },
  research: {
    laneId: 'research',
    laneLabel: 'Research',
    dominantSurface: 'ai',
    previewEnabled: true,
    previewMode: 'canvas',
    sidebarTab: 'explorer',
    bottomPanel: 'chat',
    panelState: {
      sidebar: { open: true, size: 18 },
      editor: { open: true, size: 48 },
      preview: { open: true, size: 34 },
      chat: { open: true, size: 26 },
    },
    notice: {
      tone: 'info',
      title: 'Research lane ready',
      description: 'Briefing, receipts, and output stay together so the Studio does not become a generic chat screen.',
    },
  },
  cloud: {
    laneId: 'cloud',
    laneLabel: 'Cloud / DevOps',
    dominantSurface: 'runtime',
    previewEnabled: true,
    previewMode: 'runtime',
    sidebarTab: 'git',
    bottomPanel: 'terminal',
    panelState: {
      sidebar: { open: true, size: 18 },
      editor: { open: true, size: 40 },
      preview: { open: true, size: 42 },
      chat: { open: true, size: 22 },
    },
    notice: {
      tone: 'info',
      title: 'Runtime in focus',
      description: 'Cloud / DevOps opens with runtime, terminal, and status signals in one focused shell.',
    },
  },
  growth: {
    laneId: 'growth',
    laneLabel: 'Growth / Ops',
    dominantSurface: 'ai',
    previewEnabled: true,
    previewMode: 'runtime',
    sidebarTab: 'explorer',
    bottomPanel: 'chat',
    panelState: {
      sidebar: { open: true, size: 18 },
      editor: { open: true, size: 46 },
      preview: { open: true, size: 34 },
      chat: { open: true, size: 24 },
    },
    notice: {
      tone: 'info',
      title: 'Centralized ops lane',
      description: 'Growth / Ops opens with AI, context, and artifact in one flow to avoid bloated dashboards and weak continuity.',
    },
  },
  games: {
    laneId: 'games',
    laneLabel: 'Games',
    dominantSurface: 'artifact',
    previewEnabled: true,
    previewMode: 'viewport3d',
    sidebarTab: 'explorer',
    bottomPanel: 'chat',
    panelState: {
      sidebar: { open: true, size: 18 },
      editor: { open: true, size: 36 },
      preview: { open: true, size: 46 },
      chat: { open: false, size: 18 },
    },
    notice: {
      tone: 'info',
      title: 'Viewport in command',
      description: 'Games opens with the 3D viewport in command so Studio feels like a production tool, not chat with a squeezed preview.',
    },
  },
  media: {
    laneId: 'media',
    laneLabel: 'Films / Media',
    dominantSurface: 'artifact',
    previewEnabled: true,
    previewMode: 'canvas',
    sidebarTab: 'explorer',
    bottomPanel: 'chat',
    panelState: {
      sidebar: { open: true, size: 18 },
      editor: { open: true, size: 38 },
      preview: { open: true, size: 44 },
      chat: { open: false, size: 20 },
    },
    notice: {
      tone: 'info',
      title: 'Artifact review in focus',
      description: 'Films / Media opens with a dominant canvas and less chrome so review, composition, and handoff feel more professional.',
    },
  },
};

function clonePanelState(panelState: PanelState): PanelState {
  return {
    sidebar: { ...panelState.sidebar },
    editor: { ...panelState.editor },
    preview: { ...panelState.preview },
    chat: { ...panelState.chat },
  };
}

export function resolveWorkbenchEntryLane(source: string | null | undefined): WorkbenchEntryLaneId {
  const normalized = source?.trim().toLowerCase() ?? '';

  if (!normalized) return 'general';
  if (normalized.startsWith('home-apps')) return 'apps';
  if (normalized.startsWith('home-research') || normalized.startsWith('research')) return 'research';
  if (normalized.startsWith('home-cloud')) return 'cloud';
  if (normalized.startsWith('home-growth')) return 'growth';
  if (normalized.startsWith('home-games')) return 'games';
  if (normalized.startsWith('home-media')) return 'media';

  return 'general';
}

export function resolveWorkbenchEntryProfile(params: {
  source: string | null | undefined;
  mission: string | null | undefined;
}): WorkbenchEntryProfile {
  const laneId = resolveWorkbenchEntryLane(params.source);
  const mission = params.mission?.trim() ?? '';

  if (!mission && laneId === 'general') {
    return {
      laneId: 'general',
      laneLabel: 'Studio',
      dominantSurface: 'artifact',
      previewEnabled: true,
      previewMode: 'runtime',
      sidebarTab: 'explorer',
      bottomPanel: 'chat',
      panelState: clonePanelState(GENERAL_PANEL_STATE),
      notice: null,
    };
  }

  const base =
    laneId === 'general'
      ? {
          laneId: 'general' as const,
          laneLabel: 'Project',
          dominantSurface: 'ai' as const,
          previewEnabled: true,
          previewMode: 'runtime' as const,
          sidebarTab: 'explorer' as const,
          bottomPanel: 'chat' as const,
          panelState: {
            sidebar: { open: true, size: 18 },
            editor: { open: true, size: 46 },
            preview: { open: true, size: 34 },
            chat: { open: true, size: 24 },
          },
          notice: mission
            ? {
                tone: 'info' as const,
                title: 'Mission in focus',
                description: mission,
              }
            : {
                tone: 'info' as const,
                title: 'Project opened in Studio',
                description: 'AI, artifact, diff, and review stay in one focused flow.',
              },
        }
      : ENTRY_PROFILES[laneId];

  return {
    ...base,
    panelState: clonePanelState(base.panelState),
    notice: base.notice ? { ...base.notice } : null,
  };
}

export function describeWorkbenchEntryProfile(
  profile: WorkbenchEntryProfile,
): WorkbenchEntryChromeContext {
  switch (profile.laneId) {
    case 'apps':
      return {
        focusLabel: 'Artifact-first',
        supportLabel: 'Files stay close',
        summary: 'Keep the live artifact ahead of rails, while files and review stay one click away.',
        stageLabel: 'App review lane',
      };
    case 'research':
      return {
        focusLabel: 'Receipts-first',
        supportLabel: 'Canvas plus AI',
        summary: 'Research keeps receipts, draft output, and AI context in one Studio surface instead of a generic chat lane.',
        stageLabel: 'Research lane',
      };
    case 'cloud':
      return {
        focusLabel: 'Runtime-first',
        supportLabel: 'Git plus terminal',
        summary: 'Cloud work keeps runtime trust, Git state, and terminal checks hot without collapsing back into preview-plus-chat.',
        stageLabel: 'Runtime lane',
      };
    case 'growth':
      return {
        focusLabel: 'AI-led ops',
        supportLabel: 'Artifact stays visible',
        summary: 'Ops work keeps prompts, outputs, and the artifact in the same lane so the Studio still feels operational.',
        stageLabel: 'Ops lane',
      };
    case 'games':
      return {
        focusLabel: 'Viewport-first',
        supportLabel: 'Scene tools nearby',
        summary: 'Games work gives the 3D stage more authority while code and AI stay ready when deeper work is needed.',
        stageLabel: '3D lane',
      };
    case 'media':
      return {
        focusLabel: 'Canvas-first',
        supportLabel: 'Review stays close',
        summary: 'Media work keeps composition and review ahead of extra chrome so the Studio feels closer to production tooling.',
        stageLabel: 'Media lane',
      };
    default:
      return {
        focusLabel: profile.dominantSurface === 'ai' ? 'Project-led' : 'Studio-ready',
        supportLabel: 'Depth on demand',
        summary: 'Starts light. Expands only when the project needs it.',
        stageLabel: 'Studio lane',
      };
  }
}
