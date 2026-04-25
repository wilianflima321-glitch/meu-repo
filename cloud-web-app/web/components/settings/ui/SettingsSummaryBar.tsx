import { AlertCircle, Info, Search } from 'lucide-react';

interface SettingsSummaryBarProps {
  filteredCount: number;
  modifiedCount: number;
  searchQuery: string;
  totalCount: number;
}

export function SettingsSummaryBar({
  filteredCount,
  modifiedCount,
  searchQuery,
  totalCount,
}: SettingsSummaryBarProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aethel-surface-tertiary)] px-2.5 py-1">
        <Search className="h-3.5 w-3.5" />
        {filteredCount} of {totalCount} visible
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aethel-surface-tertiary)] px-2.5 py-1">
        <AlertCircle className="h-3.5 w-3.5" />
        {modifiedCount} modified
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aethel-surface-tertiary)] px-2.5 py-1">
        <Info className="h-3.5 w-3.5" />
        Cmd/Ctrl+F focuses search
      </span>
      {searchQuery && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] px-2.5 py-1 text-[var(--aethel-info-light)]">
          Query: {searchQuery}
        </span>
      )}
    </div>
  );
}
