'use client';

import { useEffect } from 'react';

import type { EntryNotice } from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import type { PreviewMode } from '@/components/ide/fullscreen/types';
import type { WorkbenchEntryProfile } from '@/components/ide/fullscreen/workbench-entry-triage';

type UseWorkbenchEntryConvergenceParams = {
  entryParam: string | null;
  sourceParam: string | null;
  missionParam: string | null;
  entryProfile: WorkbenchEntryProfile;
  clearEntryNotice: () => void;
  openCommandPalette: (mode?: 'commands' | 'files') => void;
  showEntryNotice: (notice: EntryNotice) => void;
  setPreviewEnabled: (value: boolean | ((current: boolean) => boolean)) => void;
  handleSelectPreviewMode: (mode: PreviewMode) => void;
};

export function useWorkbenchEntryConvergence({
  entryParam,
  sourceParam,
  missionParam,
  entryProfile,
  clearEntryNotice,
  openCommandPalette,
  showEntryNotice,
  setPreviewEnabled,
  handleSelectPreviewMode,
}: UseWorkbenchEntryConvergenceParams) {
  useEffect(() => {
    const entry = entryParam?.toLowerCase() ?? null;
    const hasContextualEntry = Boolean(sourceParam?.trim() || missionParam?.trim());
    const laneLabel = entryProfile.laneLabel;
    const showLaneNotice = () => {
      if (entryProfile.notice) {
        showEntryNotice(entryProfile.notice);
      }
    };
    const labNotice = {
      tone: 'warning' as const,
      title: 'Surface em modo Labs',
      description:
        'This route was converged into the main workbench. The canonical experience continues in the code, preview, and review shell.',
    };

    clearEntryNotice();

    if (!entry) {
      if (hasContextualEntry) {
        showLaneNotice();
      }
      return;
    }

    if (entry === 'ai' || entry === 'chat' || entry === 'ai-command') {
      window.dispatchEvent(new Event('aethel.layout.openAI'));
      if (entry === 'ai-command' || missionParam?.trim()) {
        showEntryNotice({
          tone: 'info',
          title: missionParam?.trim() ? `${laneLabel} em foco no AI Console` : 'Comando de IA convergido',
          description: missionParam?.trim()
            ? 'The mission entered the main AI rail, where brief, diff, execution, and context stay centralized.'
            : 'The action opened the main AI panel inside the workbench, where diff, execution, and context stay centralized.',
        });
      }
      return;
    }

    if (entry === 'explorer') {
      window.dispatchEvent(
        new CustomEvent('aethel.layout.openSidebarTab', {
          detail: { tab: 'explorer' },
        }),
      );
      return;
    }

    if (entry === 'git') {
      window.dispatchEvent(
        new CustomEvent('aethel.layout.openSidebarTab', {
          detail: { tab: 'git' },
        }),
      );
      showEntryNotice({
        tone: 'info',
        title: 'Git aberto no workbench',
        description:
          'The dedicated route converged into the IDE sidebar to keep review, files, and diff in one flow.',
      });
      return;
    }

    if (entry === 'debugger' || entry === 'debug') {
      window.dispatchEvent(
        new CustomEvent('aethel.layout.openBottomTab', {
          detail: { tab: 'debug' },
        }),
      );
      return;
    }

    if (entry === 'terminal') {
      window.dispatchEvent(
        new CustomEvent('aethel.layout.openBottomTab', {
          detail: { tab: 'terminal' },
        }),
      );
      return;
    }

    if (entry === 'live-preview' || entry === 'preview') {
      setPreviewEnabled(true);
      showEntryNotice({
        tone: 'info',
        title: entryProfile.dominantSurface === 'runtime' ? 'Runtime opened in the main shell' : 'Preview opened in the main shell',
        description:
          entryProfile.dominantSurface === 'runtime'
            ? `${laneLabel} opened with runtime, console, and editor in the same cockpit to avoid a weak chat-preview split.`
            : 'The canonical preview now lives inside the workbench so runtime, console, and editor share one context.',
      });
      return;
    }

    if (entry === 'editor-hub') {
      setPreviewEnabled(true);
      showEntryNotice({
        tone: 'info',
        title: 'Editor hub converged',
        description:
          'You are already in the main editor hub. Dedicated navigation was removed to avoid duplicate shells.',
      });
      return;
    }

    if (entry === 'quick-open') {
      showLaneNotice();
      return;
    }

    if (entry === 'search') {
      openCommandPalette('files');
      showEntryNotice({
        tone: 'info',
        title: 'Busca convergida',
        description:
          'A busca dedicada foi substituida pela command palette e pelo quick open do workbench.',
      });
      return;
    }

    if (entry === 'playground') {
      setPreviewEnabled(true);
      window.dispatchEvent(new Event('aethel.layout.openAI'));
      showEntryNotice({
        tone: 'info',
        title: 'Playground convergido',
        description:
          'The playground now uses the main shell with preview active and copilot open, avoiding a parallel surface.',
      });
      return;
    }

    if (entry === 'testing') {
      setPreviewEnabled(true);
      window.dispatchEvent(
        new CustomEvent('aethel.layout.openBottomTab', {
          detail: { tab: 'debug' },
        }),
      );
      showEntryNotice({
        tone: 'info',
        title: 'Testing convergido',
        description:
          'The route opened preview and editor diagnostics so tests and inspection stay in one flow.',
      });
      return;
    }

    if (
      entry === 'animation-blueprint' ||
      entry === 'blueprint-editor' ||
      entry === 'landscape-editor' ||
      entry === 'level-editor' ||
      entry === 'niagara-editor' ||
      entry === 'vr-preview'
    ) {
      handleSelectPreviewMode('viewport3d');
      window.dispatchEvent(new Event('aethel.layout.openAI'));
      showEntryNotice(labNotice);
    }
  }, [
    clearEntryNotice,
    entryProfile,
    entryParam,
    handleSelectPreviewMode,
    missionParam,
    openCommandPalette,
    setPreviewEnabled,
    showEntryNotice,
    sourceParam,
  ]);
}

export default useWorkbenchEntryConvergence;
