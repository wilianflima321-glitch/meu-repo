'use client';

import { useEffect } from 'react';

import type { EntryNotice } from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import type { PreviewMode } from '@/components/ide/fullscreen/types';

type UseWorkbenchEntryConvergenceParams = {
  entryParam: string | null;
  clearEntryNotice: () => void;
  openCommandPalette: (mode?: 'commands' | 'files') => void;
  showEntryNotice: (notice: EntryNotice) => void;
  setPreviewEnabled: (value: boolean | ((current: boolean) => boolean)) => void;
  handleSelectPreviewMode: (mode: PreviewMode) => void;
};

export function useWorkbenchEntryConvergence({
  entryParam,
  clearEntryNotice,
  openCommandPalette,
  showEntryNotice,
  setPreviewEnabled,
  handleSelectPreviewMode,
}: UseWorkbenchEntryConvergenceParams) {
  useEffect(() => {
    if (!entryParam) return;

    const entry = entryParam.toLowerCase();
    const labNotice = {
      tone: 'warning' as const,
      title: 'Surface em modo Labs',
      description:
        'Esta rota foi convergida para o workbench principal. A experiência canônica ainda está no shell de código, prévia e revisão.',
    };

    clearEntryNotice();

    if (entry === 'ai' || entry === 'chat' || entry === 'ai-command') {
      window.dispatchEvent(new Event('aethel.layout.openAI'));
      if (entry === 'ai-command') {
        showEntryNotice({
          tone: 'info',
          title: 'Comando de IA convergido',
          description:
            'A ação abriu o painel principal de IA dentro do workbench, onde diff, execução e contexto ficam centralizados.',
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
          'A rota dedicada foi convergida para a barra lateral do IDE para manter revisão, arquivos e diff no mesmo fluxo.',
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
        title: 'Prévia aberta no shell principal',
        description:
          'A prévia canônica agora vive dentro do workbench para manter runtime, console e editor no mesmo contexto.',
      });
      return;
    }

    if (entry === 'editor-hub') {
      setPreviewEnabled(true);
      showEntryNotice({
        tone: 'info',
        title: 'Editor Hub convergido',
        description:
          'Você já está no hub principal do editor. A navegação dedicada foi removida para evitar duplicidade de shell.',
      });
      return;
    }

    if (entry === 'search') {
      openCommandPalette('files');
      showEntryNotice({
        tone: 'info',
        title: 'Busca convergida',
        description:
          'A busca dedicada foi substituída pela command palette e pelo quick open do workbench.',
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
          'O playground agora usa o shell principal com prévia ativa e copiloto aberto, evitando uma superfície paralela.',
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
          'A rota abriu a prévia e os diagnósticos do editor para manter testes e inspeção no mesmo fluxo.',
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
    entryParam,
    handleSelectPreviewMode,
    openCommandPalette,
    setPreviewEnabled,
    showEntryNotice,
  ]);
}

export default useWorkbenchEntryConvergence;
