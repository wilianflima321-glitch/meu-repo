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
        'Esta rota foi convergida para o workbench principal. A experiencia canonica continua no shell de codigo, previa e revisao.',
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
            ? 'A missao entrou no rail principal de IA, onde briefing, diff, execucao e contexto ficam centralizados.'
            : 'A acao abriu o painel principal de IA dentro do workbench, onde diff, execucao e contexto ficam centralizados.',
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
          'A rota dedicada foi convergida para a barra lateral do IDE para manter revisao, arquivos e diff no mesmo fluxo.',
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
        title: entryProfile.dominantSurface === 'runtime' ? 'Runtime aberto no shell principal' : 'Previa aberta no shell principal',
        description:
          entryProfile.dominantSurface === 'runtime'
            ? `${laneLabel} abriu com runtime, console e editor no mesmo cockpit para evitar um side-by-side fraco entre chat e preview.`
            : 'A previa canonica agora vive dentro do workbench para manter runtime, console e editor no mesmo contexto.',
      });
      return;
    }

    if (entry === 'editor-hub') {
      setPreviewEnabled(true);
      showEntryNotice({
        tone: 'info',
        title: 'Editor Hub convergido',
        description:
          'Voce ja esta no hub principal do editor. A navegacao dedicada foi removida para evitar duplicidade de shell.',
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
          'O playground agora usa o shell principal com previa ativa e copiloto aberto, evitando uma superficie paralela.',
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
          'A rota abriu a previa e os diagnosticos do editor para manter testes e inspecao no mesmo fluxo.',
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
