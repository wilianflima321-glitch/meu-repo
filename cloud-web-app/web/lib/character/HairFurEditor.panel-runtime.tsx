'use client';
import { HAIR_PRESETS, type HairPreset } from '@/components/character/hair-fur-model';
import { HAIR_PRESET_LABELS } from './HairFurEditor.config-runtime';

export function HairPresetBar({
  preset,
  onPresetChange,
}: {
  preset: HairPreset;
  onPresetChange: (preset: HairPreset) => void;
}) {
  return (
    <div className="p-4 border-b border-[var(--aethel-border-primary)]">
      <label className="text-sm font-medium text-[var(--aethel-text-secondary)] block mb-2">Presets</label>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(HAIR_PRESETS) as HairPreset[]).map((presetId) => (
          <button
            type="button"
            aria-label={`Aplicar preset ${presetId} no cabelo`}
            key={presetId}
            onClick={() => onPresetChange(presetId)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              preset === presetId
                ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
            }`}
          >
            {HAIR_PRESET_LABELS[presetId]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HairExportFooter({
  onExportCards,
  onExportStrands,
}: {
  onExportCards: () => void;
  onExportStrands: () => void;
}) {
  return (
    <div className="p-4 border-t border-[var(--aethel-border-primary)] space-y-3">
      <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)]">Export for Runtime</h3>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Export hair as cards"
          onClick={onExportCards}
          className="flex-1 px-4 py-2.5 bg-[var(--aethel-warning)] hover:bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)] rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-[var(--aethel-warning-light)]">Cards</span>
          <span>Cards</span>
        </button>
        <button
          type="button"
          aria-label="Export hair as strands"
          onClick={onExportStrands}
          className="flex-1 px-4 py-2.5 bg-[var(--aethel-info)] hover:brightness-110 text-[var(--aethel-text-primary)] rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-[var(--aethel-info-light)]">Strands</span>
          <span>Strands</span>
        </button>
      </div>
      <p className="text-xs text-[var(--aethel-text-tertiary)] text-center">
        Cards: best performance | Strands: highest quality
      </p>
    </div>
  );
}
