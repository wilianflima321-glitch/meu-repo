'use client';

import FileExplorerPro from '@/components/ide/FileExplorerPro';
import { GitIntegration } from '@/components/ide/GitIntegration';

import type { SidebarTab } from '@/components/ide/fullscreen/types';

type WorkbenchSidebarProps = {
  sidebarTab: SidebarTab;
  onSidebarTabChange: (tab: SidebarTab) => void;
  onFileSelect: (file: { path: string; type: 'file' | 'folder' }) => void;
};

export function WorkbenchSidebar({
  sidebarTab,
  onSidebarTabChange,
  onFileSelect,
}: WorkbenchSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-3">
        <button
          type="button"
          onClick={() => onSidebarTabChange('explorer')}
          className={`flex-1 rounded-lg px-3 py-2 min-h-9 text-[11px] font-medium transition-colors ${
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
          className={`flex-1 rounded-lg px-3 py-2 min-h-9 text-[11px] font-medium transition-colors ${
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
          <FileExplorerPro onFileSelect={onFileSelect} />
        ) : (
          <GitIntegration />
        )}
      </div>
    </div>
  );
}

export default WorkbenchSidebar;
