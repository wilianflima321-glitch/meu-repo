'use client'

// Phase 4 (AAA Studio Deepening Sweep) — real PBR texture drag-and-drop slots for
// the object inspector, wired directly to the live `ViewportSceneObject.textureMaps`
// field that `ViewportSceneObjectMesh.tsx` actually renders in the R3F scene graph.
//
// Honesty note: `lib/materials/material-editor-runtime/editor.ts` exposes a
// `setTexture`/`removeTexture` API, but it operates on a fully separate
// `MaterialSettings` model consumed only by the standalone node-graph Material
// Editor route (`MaterialEditor.runtime.tsx`) — it has no connection to how the
// live viewport actually renders `ViewportSceneObject`s. Wiring this panel to
// that disconnected API would compile, but would not change what the user sees
// in the viewport (Anti-Mock violation). Instead this reuses the exact
// `generateProceduralPBRMaps` pipeline already shipped for the drag-a-photo-onto-
// the-viewport flow, applied to the currently selected object instead of a new
// plane object.

import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ImageOff, Upload, X } from 'lucide-react'
import { generateProceduralPBRMaps } from '@/lib/viewport/procedural-pbr'
import type { ViewportPBRTextureMaps } from '@/components/viewport/viewport-model'

type PBRSlotKey = 'albedo' | 'normal' | 'roughness' | 'displacement'

const SLOT_ORDER: PBRSlotKey[] = ['albedo', 'normal', 'roughness', 'displacement']

const SLOT_LABELS: Record<PBRSlotKey, string> = {
  albedo: 'Albedo',
  normal: 'Normal',
  roughness: 'Roughness',
  displacement: 'Height',
}

export function ViewportPBRTextureSlots({
  textureMaps,
  onChange,
}: {
  textureMaps?: ViewportPBRTextureMaps
  onChange: (next: ViewportPBRTextureMaps | undefined) => void
}) {
  const [busySlot, setBusySlot] = useState<PBRSlotKey | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<PBRSlotKey | null>(null)
  const inputRefs = useRef<Partial<Record<PBRSlotKey, HTMLInputElement | null>>>({})

  const applyAlbedo = useCallback(async (file: File) => {
    setBusySlot('albedo')
    try {
      const maps = await generateProceduralPBRMaps(file)
      onChange({
        albedo: maps.albedo,
        normal: maps.normal,
        roughness: maps.roughness,
        displacement: maps.displacement,
        sourceFileName: file.name,
      })
    } finally {
      setBusySlot(null)
    }
  }, [onChange])

  const applyChannelOverride = useCallback((slot: Exclude<PBRSlotKey, 'albedo'>, file: File) => {
    setBusySlot(slot)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onChange(
        textureMaps
          ? { ...textureMaps, [slot]: dataUrl }
          : { albedo: dataUrl, normal: dataUrl, roughness: dataUrl, displacement: dataUrl, sourceFileName: file.name }
      )
      setBusySlot(null)
    }
    reader.onerror = () => setBusySlot(null)
    reader.readAsDataURL(file)
  }, [onChange, textureMaps])

  const handleFile = useCallback((slot: PBRSlotKey, file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    if (slot === 'albedo') {
      void applyAlbedo(file)
    } else {
      applyChannelOverride(slot, file)
    }
  }, [applyAlbedo, applyChannelOverride])

  const handleDrop = useCallback((slot: PBRSlotKey, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOverSlot(null)
    handleFile(slot, event.dataTransfer.files[0])
  }, [handleFile])

  const handleClearSlot = useCallback((slot: PBRSlotKey) => {
    if (!textureMaps) return
    if (slot === 'albedo') {
      onChange(undefined)
      return
    }
    // Individual auxiliary maps are always derived from an albedo source, so
    // "clearing" one resets it to the raw albedo image rather than leaving the
    // required ViewportPBRTextureMaps shape with a missing field.
    onChange({ ...textureMaps, [slot]: textureMaps.albedo })
  }, [onChange, textureMaps])

  return (
    <div className="grid grid-cols-4 gap-1.5" data-viewport-pbr-slots="true">
      {SLOT_ORDER.map((slot) => {
        const dataUrl = textureMaps?.[slot]
        const isDragOver = dragOverSlot === slot
        return (
          <div
            key={slot}
            className={`relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-lg border transition ${
              isDragOver
                ? 'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)]'
                : 'border-dashed border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]'
            }`}
            onDragOver={(event) => { event.preventDefault(); setDragOverSlot(slot) }}
            onDragLeave={() => setDragOverSlot((current) => (current === slot ? null : current))}
            onDrop={(event) => handleDrop(slot, event)}
            data-viewport-pbr-slot={slot}
          >
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: URL preview, next/image cannot optimize it
              <img src={dataUrl} alt={`${SLOT_LABELS[slot]} texture preview`} className="absolute inset-0 h-full w-full object-cover opacity-85" />
            ) : (
              <ImageOff className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-[var(--aethel-text-quaternary)]" />
            )}
            <div className="relative z-10 flex w-full flex-col items-center gap-0.5 bg-[rgba(var(--aethel-panel-ink-rgb), 0.65)] px-1 py-1">
              <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--aethel-text-primary)]">
                {SLOT_LABELS[slot]}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Browse for ${SLOT_LABELS[slot]} texture`}
                  title={slot === 'albedo' ? 'Drop or browse an image — auto-generates all 4 maps' : 'Drop or browse an image to override this channel'}
                  onClick={() => inputRefs.current[slot]?.click()}
                  className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_84%,transparent)] p-0.5 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
                >
                  <Upload className="h-2.5 w-2.5" />
                </button>
                {dataUrl ? (
                  <button
                    type="button"
                    aria-label={`Clear ${SLOT_LABELS[slot]} texture`}
                    onClick={() => handleClearSlot(slot)}
                    className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_84%,transparent)] p-0.5 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-error-light)]"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                ) : null}
              </div>
            </div>
            {busySlot === slot ? (
              <span className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(var(--aethel-panel-ink-rgb), 0.78)] text-center text-[8px] uppercase tracking-[0.08em] text-[var(--aethel-text-primary)]">
                Processing…
              </span>
            ) : null}
            <input
              ref={(el) => { inputRefs.current[slot] = el }}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => handleFile(slot, event.target.files?.[0])}
            />
          </div>
        )
      })}
    </div>
  )
}
