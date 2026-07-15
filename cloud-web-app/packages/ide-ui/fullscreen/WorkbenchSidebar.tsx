'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { FolderTree, GitBranch, Sparkles } from 'lucide-react';

import FileExplorerPro from '../FileExplorerPro';
import { GitIntegration } from '../GitIntegration';
import AethelResearch from '../../../web/components/nexus/AethelResearch';
import { DockPanel, DockRegion, useWorkspaceStore } from '../docking';

import type { RemotePeer } from '../../../web/hooks/useCollaborationAwareness';
import {
  describeWorkbenchEntryProfile,
  resolveWorkbenchEntryProfile,
} from './workbench-entry-triage';

import type { SidebarTab } from './types';

type WorkbenchSidebarProps = {
  sidebarTab: SidebarTab;
  collaborationPeers?: RemotePeer[];
  onSidebarTabChange: (tab: SidebarTab) => void;
  onFileSelect: (file: { path: string; type: 'file' | 'folder' }) => void;
};

function isKnownSidebarTab(value: string | null): value is SidebarTab {
  return value === 'explorer' || value === 'git' || value === 'research';
}

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

  // Bridge the legacy `sidebarTab` prop (driven by keyboard shortcuts / the
  // activity-bar taskbar via `onSidebarTabChange`) with the Docking Engine's
  // own `leftBar.activeTabId`, which is now the real source of truth for
  // what's rendered — Explorer/Git/Research can be reordered, or dragged
  // into the bottom dock, independently of this enum.
  const store = useWorkspaceStore();
  const leftBarActiveTabId = store((s) => s.regions.leftBar.activeTabId);

  useEffect(() => {
    if (sidebarTab !== leftBarActiveTabId) {
      store.getState().setActiveTab('leftBar', sidebarTab);
    }
    // Only react to the external prop here — the store is pushed to, not pulled from, in this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarTab]);

  useEffect(() => {
    if (isKnownSidebarTab(leftBarActiveTabId) && leftBarActiveTabId !== sidebarTab) {
      onSidebarTabChange(leftBarActiveTabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftBarActiveTabId]);

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
      <div className="flex-1 min-h-0">
        <DockRegion regionId="leftBar" />
        <div style={{ display: 'none' }} aria-hidden>
          <DockPanel id="explorer" title="Files" icon={FolderTree} defaultRegion="leftBar">
            <FileExplorerPro onFileSelect={onFileSelect} collaborationPeers={collaborationPeers} />
          </DockPanel>
          <DockPanel id="git" title="Git" icon={GitBranch} defaultRegion="leftBar">
            <GitIntegration />
          </DockPanel>
          <DockPanel id="research" title="Research" icon={Sparkles} defaultRegion="leftBar">
            <AethelResearch />
          </DockPanel>
        </div>
      </div>
    </div>
  );
}

export default WorkbenchSidebar;
