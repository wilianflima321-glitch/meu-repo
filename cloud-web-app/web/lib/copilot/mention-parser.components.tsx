'use client'

import type { Mention, MentionSuggestion, MentionType } from './mention-parser'

// ============= Mention Chip Component =============

interface MentionChipProps {
  mention: Mention
  onRemove?: () => void
}

export function MentionChip({ mention, onRemove }: MentionChipProps) {
  const icons: Record<MentionType, string> = {
    file: 'FILE',
    folder: 'DIR',
    function: 'FN',
    symbol: 'SYM',
    selection: 'SEL',
    diagnostics: 'ERR',
    git: 'GIT',
    terminal: 'TERM',
    web: 'WEB',
    docs: 'DOC',
    codebase: 'CODE',
  }

  const colors: Record<MentionType, string> = {
    file: 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-info-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
    folder: 'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-warning-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]',
    function: 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-primary-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]',
    symbol: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_20%,transparent)] text-[color-mix(in_srgb,var(--aethel-secondary)_85%,white)] border-[color-mix(in_srgb,var(--aethel-secondary)_30%,transparent)]',
    selection: 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-success-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)]',
    diagnostics: 'bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-error)_88%,white)] border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)]',
    git: 'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-warning-light)_88%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]',
    terminal: 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] text-[var(--aethel-text-secondary)] border-[var(--aethel-border-secondary)]',
    web: 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-info-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]',
    docs: 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-primary-light)_90%,transparent)] border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)]',
    codebase: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_18%,transparent)] text-[color-mix(in_srgb,var(--aethel-secondary)_85%,white)] border-[color-mix(in_srgb,var(--aethel-secondary)_28%,transparent)]',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${colors[mention.type]}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{icons[mention.type]}</span>
      <span className="text-xs font-medium">
        {mention.value || mention.type}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove mention ${mention.value || mention.type}`}
          className="ml-1 hover:opacity-70"
        >
          x
        </button>
      )}
    </span>
  )
}

// ============= Suggestion List Component =============

interface SuggestionListProps {
  suggestions: MentionSuggestion[]
  activeIndex: number
  onSelect: (suggestion: MentionSuggestion) => void
  onHover: (index: number) => void
  listboxId?: string
}

export function SuggestionList({ suggestions, activeIndex, onSelect, onHover, listboxId }: SuggestionListProps) {
  return (
    <div
      id={listboxId}
      role="listbox"
      aria-label="Mention suggestions"
      aria-activedescendant={activeIndex >= 0 ? `mention-suggestion-${activeIndex}` : undefined}
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-xl z-50"
    >
      {suggestions.map((suggestion, idx) => (
        <div
          key={`${suggestion.type}-${suggestion.value}-${idx}`}
          id={`mention-suggestion-${idx}`}
          role="option"
          aria-selected={idx === activeIndex}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
            idx === activeIndex ? 'bg-[color-mix(in_srgb,var(--aethel-primary-dark)_30%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)]'
          }`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(idx)}
        >
          <span className="min-w-[2.75rem] text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            {suggestion.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--aethel-text-primary)] truncate">
              {suggestion.displayName}
            </div>
            {suggestion.description && (
              <div className="text-xs text-[var(--aethel-text-tertiary)] truncate">
                {suggestion.description}
              </div>
            )}
          </div>
          {idx === activeIndex && (
            <span className="text-xs text-[var(--aethel-text-quaternary)]">Tab</span>
          )}
        </div>
      ))}
    </div>
  )
}
