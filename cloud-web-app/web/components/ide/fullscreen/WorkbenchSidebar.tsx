'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import FileExplorerPro from '@/components/ide/FileExplorerPro';
import { GitIntegration } from '@/components/ide/GitIntegration';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';
import {
  describeWorkbenchEntryProfile,
  resolveWorkbenchEntryProfile,
} from '@/components/ide/fullscreen/workbench-entry-triage';

import type { SidebarTab } from '@/components/ide/fullscreen/types';

type WorkbenchSidebarProps = {
  sidebarTab: SidebarTab;
  collaborationPeers?: RemotePeer[];
  onSidebarTabChange: (tab: SidebarTab) => void;
  onFileSelect: (file: { path: string; type: 'file' | 'folder' }) => void;
};

export function WorkbenchSidebar({
  sidebarTab,
  collaborationPeers = [],
  onSidebarTabChange,
  onFileSelect,
}: WorkbenchSidebarProps) {
  const searchParams = useSearchParams();
  const sourceParam = searchParams?.get('source') ?? null;
  const missionParam = searchParams?.get('mission') ?? null;
  const entryProfile = useMemo(
    () =>
      resolveWorkbenchEntryProfile({
        source: sourceParam,
        mission: missionParam,
      }),
    [missionParam, sourceParam],
  );
  const chromeContext = useMemo(
    () => describeWorkbenchEntryProfile(entryProfile),
    [entryProfile],
  );
  const focusToneClass =
    entryProfile.dominantSurface === 'runtime'
      ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
      : entryProfile.dominantSurface === 'ai'
        ? 'border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
        : 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success)]';

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent))] px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex min-h-[26px] items-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
            {entryProfile.laneLabel}
          </span>
          <span
            className={`inline-flex min-h-[26px] items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${focusToneClass}`}
          >
            {chromeContext.focusLabel}
          </span>
          {missionParam?.trim() ? (
            <span
              title={missionParam}
              className="inline-flex min-h-[26px] max-w-[210px] items-center truncate rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-2.5 py-1 text-[10px] font-medium text-[var(--aethel-text-tertiary)]"
            >
              {missionParam}
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
          {chromeContext.summary}
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-2.5 py-2">
        <button
          type="button"
          onClick={() => onSidebarTabChange('explorer')}
          className={`flex-1 rounded-lg px-2.5 py-1.5 min-h-8 text-[10px] font-medium transition-colors ${
            sidebarTab === 'explorer'
              ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
              : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
        >
          Arquivos
        </button>
        <button
          type="button"
          onClick={() => onSidebarTabChange('git')}
          className={`flex-1 rounded-lg px-2.5 py-1.5 min-h-8 text-[10px] font-medium transition-colors ${
            sidebarTab === 'git'
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
              : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
        >
          Git
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {sidebarTab === 'explorer' ? (
          <FileExplorerPro onFileSelect={onFileSelect} collaborationPeers={collaborationPeers} />
        ) : (
          <GitIntegration />
        )}
      </div>
    </div>
  );
}

export default WorkbenchSidebar;
