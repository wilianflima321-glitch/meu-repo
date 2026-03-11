'use client';

import { useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type MentionChipIcon = 'code' | 'file' | 'folder' | 'git' | 'search' | 'warning' | 'bug' | 'diff';
export type MentionChipColor = 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'slate';

export interface MentionChipData {
  tag: string;
  label: string;
  icon: MentionChipIcon;
  color: MentionChipColor;
  content?: string;
  fileCount?: number;
  lineRange?: string;
}

// ============================================================================
// ICON COMPONENTS
// ============================================================================

const icons: Record<MentionChipIcon, React.ReactNode> = {
  code: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  file: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  folder: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  git: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  search: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  warning: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  bug: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152-6.135 3.001 3.001 0 00-2.32-2.862A7.497 7.497 0 0012 4.5a7.497 7.497 0 00-4.735.943 3 3 0 00-2.32 2.862 23.908 23.908 0 01-1.152 6.135A23.932 23.932 0 0112 12.75z" />
    </svg>
  ),
  diff: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
};

const colorClasses: Record<MentionChipColor, { bg: string; text: string; border: string }> = {
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

export function MentionChip({
  data,
  onClick,
  expanded = false,
}: {
  data: MentionChipData;
  onClick?: () => void;
  expanded?: boolean;
}) {
  const colors = colorClasses[data.color];

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs
        border transition-all duration-150
        ${colors.bg} ${colors.text} ${colors.border}
        hover:brightness-125 cursor-pointer
        focus:outline-none focus:ring-1 focus:ring-cyan-500
      `}
      title={data.tag}
      aria-label={`Mention: ${data.label}`}
    >
      {icons[data.icon]}
      <span className="truncate max-w-[120px]">{data.label}</span>
      {data.fileCount !== undefined && (
        <span className="text-[10px] opacity-60">({data.fileCount})</span>
      )}
    </button>
  );
}

export function MentionChipList({
  chips,
  onChipClick,
}: {
  chips: MentionChipData[];
  onChipClick?: (chip: MentionChipData) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {chips.map((chip, index) => (
        <MentionChip
          key={`${chip.tag}-${index}`}
          data={chip}
          onClick={() => onChipClick?.(chip)}
        />
      ))}
    </div>
  );
}

export function MentionPreviewPanel({
  chip,
  onClose,
}: {
  chip: MentionChipData;
  onClose: () => void;
}) {
  const colors = colorClasses[chip.color];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3 mt-2`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={colors.text}>{icons[chip.icon]}</span>
          <span className={`text-xs font-medium ${colors.text}`}>{chip.tag}</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-xs"
          aria-label="Close preview"
        >
          ✕
        </button>
      </div>
      {chip.content && (
        <pre className="text-xs text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono leading-relaxed">
          {chip.content}
        </pre>
      )}
    </div>
  );
}

// ============================================================================
// MENTION INPUT INTEGRATION
// ============================================================================

const MENTION_TRIGGERS = [
  { trigger: '@Codebase', tag: '@codebase', icon: 'code' as const, color: 'violet' as const, description: 'Full codebase context' },
  { trigger: '@Docs', tag: '@docs:', icon: 'search' as const, color: 'blue' as const, description: 'Search documentation' },
  { trigger: '@File', tag: '@file:', icon: 'file' as const, color: 'green' as const, description: 'Include specific file' },
  { trigger: '@Folder', tag: '@folder:', icon: 'folder' as const, color: 'amber' as const, description: 'List folder contents' },
  { trigger: '@Diff', tag: '@diff', icon: 'diff' as const, color: 'amber' as const, description: 'Working tree diff' },
  { trigger: '@Error', tag: '@error', icon: 'bug' as const, color: 'red' as const, description: 'Build/lint diagnostics' },
  { trigger: '@Git', tag: '@git:', icon: 'git' as const, color: 'amber' as const, description: 'Git status/diff/log' },
];

export function MentionSuggestionList({
  filter,
  onSelect,
}: {
  filter: string;
  onSelect: (tag: string) => void;
}) {
  const filtered = useMemo(() => {
    if (!filter) return MENTION_TRIGGERS;
    const lower = filter.toLowerCase();
    return MENTION_TRIGGERS.filter(
      (t) =>
        t.trigger.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower)
    );
  }, [filter]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 min-w-[200px] z-50">
      {filtered.map((item) => {
        const colors = colorClasses[item.color];
        return (
          <button
            key={item.trigger}
            onClick={() => onSelect(item.tag)}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-md hover:bg-slate-800 transition-colors"
          >
            <span className={colors.text}>{icons[item.icon]}</span>
            <div>
              <span className="text-xs text-slate-200">{item.trigger}</span>
              <span className="text-[10px] text-slate-500 ml-2">{item.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
