import { useState } from 'react'
import { Palette } from 'lucide-react'

type AestheticPreset =
  | 'PhotorealisticPbr'
  | 'PainterlyCellContour'
  | 'HalftoneComic'
  | 'HandDrawn2dAnime'

/**
 * Local authoring intent only — presets do not mutate the native wgpu graph.
 * Prior UI claimed "NPR KERNEL ACTIVE" with no shader apply path (theater).
 */
export function AestheticStyleStudioPanel() {
  const [aestheticPreset, setAestheticPreset] = useState<AestheticPreset>('PainterlyCellContour')
  const [inkStrokeWidth, setInkStrokeWidth] = useState(2.4)

  return (
    <div className="flex flex-col h-full p-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] text-[var(--aethel-text-primary)]">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--aethel-border-secondary)]">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[var(--aethel-warning)]" />
          <h2 className="text-sm font-bold tracking-wide">Aesthetic Presets</h2>
        </div>
        <span className="text-[10px] px-2 py-1 rounded font-mono font-semibold text-[var(--aethel-warning)] border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]">
          LOCAL INTENT ONLY
        </span>
      </div>

      <p className="mt-3 text-xs text-[var(--aethel-text-secondary)]">
        Selection is stored in this panel only. No NPR / fluid SSS kernel apply is wired to the
        desktop renderer (Onda G present path HELD). Do not treat this as shipped shading.
      </p>

      <div className="my-4">
        <label className="text-[10px] font-bold text-[var(--aethel-text-tertiary)] uppercase tracking-wider block mb-2">
          Intended shading preset
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['PhotorealisticPbr', 'Photorealistic PBR'],
              ['PainterlyCellContour', 'Painterly Cell Contour'],
              ['HalftoneComic', 'Halftone Comic Ink'],
              ['HandDrawn2dAnime', 'Hand-Drawn 2D Anime'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAestheticPreset(id)}
              className={[
                'p-2.5 text-xs font-semibold rounded-lg border transition-colors',
                aestheticPreset === id
                  ? 'border-[var(--aethel-primary)] text-[var(--aethel-primary-light)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)]'
                  : 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-[var(--aethel-text-tertiary)] font-semibold">Ink contour width (UI only)</span>
          <span className="font-mono text-[var(--aethel-text-secondary)] font-bold">{inkStrokeWidth.toFixed(1)}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={inkStrokeWidth}
          onChange={(e) => setInkStrokeWidth(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--aethel-primary)] bg-[var(--aethel-surface-primary)]"
          aria-label="Ink contour width local intent"
        />
      </div>
    </div>
  )
}
