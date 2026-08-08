'use client'

import { useMemo, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { RotateCcw, ChevronDown, Move, Layers, Palette, Box as BoxIcon, Cpu, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AETHEL_ASSET_DRAG_MIME, readAssetDragPayload } from '../../web/lib/ide/assetDragPayload'
import { Sparkline } from './Sparkline'

type Vector3Value = [number, number, number]
type PropertyValue = Vector3Value | number | string | boolean

export interface PropertySection {
  title: string
  icon: LucideIcon
  properties: Property[]
}

export type Property =
  | {
    name: string
    type: 'vector3'
    value: Vector3Value
  }
  | {
    name: string
    type: 'float'
    value: number
    min?: number
    max?: number
    /** Optional rolling sample history (oldest-first) — renders an inline Sparkline when present. */
    history?: number[]
  }
  | {
    name: string
    type: 'color' | 'string'
    value: string
  }
  | {
    name: string
    type: 'boolean'
    value: boolean
  }
  | {
    name: string
    type: 'enum'
    value: string
    options?: string[]
  }

export interface PropertiesPanelProps {
  sections?: PropertySection[]
  objectName?: string
  /**
   * Called whenever a field commits. `entityIds` is the full set of
   * currently-selected entities the change should apply to — always
   * `selectedEntityIds` when provided (Multi-Edit, FASE 3.2 Ação A), or an
   * empty array in classic single-object mode (no entity id tracking).
   * Existing callers that only read the first three arguments keep working
   * unchanged — this parameter is purely additive.
   */
  onPropertyChange?: (section: string, property: string, value: PropertyValue, entityIds: string[]) => void
  /**
   * Multi-Edit (FASE 3.2 Ação A). When 2+ ids are provided alongside
   * `resolveSections`, the panel renders one shared inspector for the whole
   * selection: fields whose value is identical across every selected entity
   * show that value; fields that diverge show `--` and, when edited, the
   * typed value is applied to every id in the array via `onPropertyChange`.
   */
  selectedEntityIds?: string[]
  /** Resolves the live PropertySection[] for a single entity id — required for Multi-Edit. */
  resolveSections?: (entityId: string) => PropertySection[]
}

const MIXED_VALUE = '--'

/**
 * Evaluates a literal math expression typed into a numeric field (e.g.
 * `15 * 3`, `(2 + 4) / 2`) and returns the processed result, or `null` when
 * the input isn't a safe arithmetic expression. Deliberately restricted to
 * `+ - * / ( ) .` and digits — mirrors the same safe-eval contract already
 * proven in `web/components/ui/ScrubbableInput.tsx` (Function constructor
 * over a whitelisted character set, never a raw `eval`).
 */
function evaluateMathExpression(expression: string): number | null {
  const sanitized = expression.replace(/\s/g, '')
  if (!sanitized) return null
  if (!/^[\d+\-*/().]+$/.test(sanitized)) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${sanitized})`)()
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

type DivergenceEntry = boolean | [boolean, boolean, boolean]

/** Keyed by `${sectionTitle}::${propertyName}` — `true`/`[..]` marks fields (or vector axes) that diverge across the selection. */
type DivergenceMap = Map<string, DivergenceEntry>

function computeMultiEditState(
  entityIds: string[],
  resolveSections: (entityId: string) => PropertySection[]
): { sections: PropertySection[]; divergence: DivergenceMap } {
  const perEntitySections = entityIds.map((id) => resolveSections(id))
  const baseline = perEntitySections[0] ?? []
  const divergence: DivergenceMap = new Map()

  baseline.forEach((section) => {
    section.properties.forEach((prop) => {
      const key = `${section.title}::${prop.name}`
      const valuesAcrossEntities = perEntitySections.map((sections) => {
        const matchingSection = sections.find((s) => s.title === section.title)
        return matchingSection?.properties.find((p) => p.name === prop.name)?.value
      })

      if (prop.type === 'vector3') {
        const axisDivergence: [boolean, boolean, boolean] = [0, 1, 2].map((axis) =>
          valuesAcrossEntities.some((value) => {
            const vector = value as Vector3Value | undefined
            const baselineVector = prop.value
            return !vector || vector[axis] !== baselineVector[axis]
          })
        ) as [boolean, boolean, boolean]
        divergence.set(key, axisDivergence)
      } else {
        const diverges = valuesAcrossEntities.some((value) => value !== prop.value)
        divergence.set(key, diverges)
      }
    })
  })

  return { sections: baseline, divergence }
}

// ── Section accent color per icon type ────────────────────────────────────────
const SECTION_ACCENT: Record<string, { bar: string; glow: string; label: string }> = {
  Transform: { bar: '#3b82f6', glow: 'rgba(59,130,246,0.18)', label: '#93c5fd' },
  Material:  { bar: '#a855f7', glow: 'rgba(168,85,247,0.18)', label: '#d8b4fe' },
  Geometry:  { bar: '#22d3ee', glow: 'rgba(34,211,238,0.18)', label: '#a5f3fc' },
  Visibility:{ bar: '#34d399', glow: 'rgba(52,211,153,0.18)', label: '#6ee7b7' },
  Physics:   { bar: '#f59e0b', glow: 'rgba(245,158,11,0.18)', label: '#fcd34d' },
  Audio:     { bar: '#f472b6', glow: 'rgba(244,114,182,0.18)', label: '#fbcfe8' },
  Rendering: { bar: '#818cf8', glow: 'rgba(129,140,248,0.18)', label: '#c7d2fe' },
}

function getSectionAccent(title: string) {
  return SECTION_ACCENT[title] ?? { bar: '#3b82f6', glow: 'rgba(59,130,246,0.14)', label: '#93c5fd' }
}

export function PropertiesPanel3D({
  sections: sectionsProp = [],
  objectName = '',
  onPropertyChange = () => undefined,
  selectedEntityIds,
  resolveSections,
}: PropertiesPanelProps) {
  const [activeSection, setActiveSection] = useState<Set<number>>(() => new Set([0]))
  // Universal Asset Drag (AGDS): tracks which `string` field is currently
  // being hovered by a texture/material dragged out of the File Explorer —
  // same `AETHEL_ASSET_DRAG_MIME` payload the 3D viewport and Visual
  // Scripting node ports already accept.
  const [assetDropKey, setAssetDropKey] = useState<string | null>(null)

  // AAA input base: glassmorphism, subtle border, monospaced numbers
  const inputBase =
    'w-full rounded-md border bg-[rgba(16,22,36,0.7)] text-[var(--aethel-text-secondary)] outline-none transition-all duration-150 focus:border-[var(--aethel-primary)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)] focus:text-[var(--aethel-text-primary)]'
  const borderClass = 'border-[rgba(148,163,184,0.12)]'
  const numericInputBase = `${inputBase} ${borderClass} font-mono tabular-nums text-right`

  const isMultiEdit = Boolean(selectedEntityIds && selectedEntityIds.length > 1 && resolveSections)
  const effectiveEntityIds = selectedEntityIds ?? []

  const { sections, divergence } = useMemo(() => {
    if (isMultiEdit && resolveSections) {
      return computeMultiEditState(effectiveEntityIds, resolveSections)
    }
    if (selectedEntityIds && selectedEntityIds.length === 1 && resolveSections) {
      return { sections: resolveSections(selectedEntityIds[0]), divergence: new Map<string, DivergenceEntry>() }
    }
    return { sections: sectionsProp, divergence: new Map<string, DivergenceEntry>() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiEdit, resolveSections, effectiveEntityIds.join(','), sectionsProp])

  const handleValueChange = (sectionIndex: number, propertyIndex: number, newValue: PropertyValue) => {
    const section = sections[sectionIndex]
    const property = section.properties[propertyIndex]
    onPropertyChange(section.title, property.name, newValue, effectiveEntityIds)
  }

  const getDivergence = (sectionTitle: string, propertyName: string): DivergenceEntry | undefined =>
    divergence.get(`${sectionTitle}::${propertyName}`)

  const renderProperty = (sectionIndex: number, prop: Property, propIndex: number) => {
    const sectionTitle = sections[sectionIndex].title
    const fieldDivergence = getDivergence(sectionTitle, prop.name)

    switch (prop.type) {
      case 'vector3': {
        const axisDivergence = (fieldDivergence as [boolean, boolean, boolean] | undefined) ?? [false, false, false]
        const AXIS_COLORS = ['#f87171', '#86efac', '#93c5fd'] // red/green/blue X/Y/Z
        return (
          <div className="grid grid-cols-3 gap-1.5">
            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
              <MathCapableInput
                key={axis}
                axisLabel={axis}
                axisColor={AXIS_COLORS[i]}
                value={prop.value[i]}
                isMixed={axisDivergence[i]}
                inputClassName={`${numericInputBase} py-1 pl-5 pr-2 text-xs`}
                ariaLabel={`${prop.name} ${axis}`}
                scrubStep={0.01}
                onCommit={(nextAxisValue) => {
                  const newValue: Vector3Value = [...prop.value]
                  newValue[i] = nextAxisValue
                  handleValueChange(sectionIndex, propIndex, newValue)
                }}
              />
            ))}
          </div>
        )
      }
      case 'float': {
        const pct = prop.min !== undefined && prop.max !== undefined
          ? ((prop.value - prop.min) / (prop.max - prop.min)) * 100
          : prop.value
        return (
          <div className="space-y-1">
            {/* Custom-styled slider track */}
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 h-[3px] rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: 'var(--aethel-primary)' }}
                />
                <input
                  type="range"
                  min={prop.min ?? 0}
                  max={prop.max ?? 100}
                  step={(((prop.max ?? 100) - (prop.min ?? 0)) / 100)}
                  value={prop.value}
                  onChange={(e) => handleValueChange(sectionIndex, propIndex, parseFloat(e.target.value))}
                  aria-label={`${prop.name} slider`}
                  className="absolute inset-0 w-full opacity-0 cursor-ew-resize"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>
              {prop.history && prop.history.length > 1 && (
                <Sparkline values={prop.history} width={40} height={16} ariaLabel={`${prop.name} recent history`} />
              )}
              <MathCapableInput
                value={prop.value}
                isMixed={Boolean(fieldDivergence)}
                inputClassName={`${numericInputBase} w-16 px-2 py-1 text-xs`}
                ariaLabel={`${prop.name} value`}
                onCommit={(next) => handleValueChange(sectionIndex, propIndex, next)}
              />
            </div>
          </div>
        )
      }
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <input
                type="color"
                value={fieldDivergence ? '#808080' : prop.value}
                onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
                aria-label={`${prop.name} color picker`}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <div
                className="w-7 h-7 rounded-md border border-[rgba(255,255,255,0.15)] shadow-inner cursor-pointer"
                style={{ background: fieldDivergence ? '#808080' : prop.value }}
              />
            </div>
            <input
              type="text"
              value={fieldDivergence ? MIXED_VALUE : prop.value}
              onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
              aria-label={`${prop.name} color value`}
              className={`${inputBase} ${borderClass} flex-1 px-2 py-1 text-xs font-mono`}
            />
          </div>
        )
      case 'boolean':
        return (
          <button
            type="button"
            onClick={() => handleValueChange(sectionIndex, propIndex, !prop.value)}
            aria-label={`${prop.name} ${prop.value ? 'enabled' : 'disabled'}`}
            title={fieldDivergence ? 'Mixed values across selection' : undefined}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--aethel-primary)] focus:ring-offset-1 focus:ring-offset-[var(--aethel-surface-primary)]"
            style={{
              background: fieldDivergence
                ? 'rgba(245,158,11,0.4)'
                : prop.value
                  ? 'var(--aethel-primary)'
                  : 'rgba(148,163,184,0.2)',
              boxShadow: prop.value && !fieldDivergence ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
            }}
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
              style={{ transform: prop.value ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </button>
        )
      case 'enum':
        return (
          <div className="relative">
            <select
              value={fieldDivergence ? '' : prop.value}
              onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
              aria-label={`${prop.name} selection`}
              className={`${inputBase} ${borderClass} w-full px-2 py-1 text-xs appearance-none pr-7 cursor-pointer`}
            >
              {fieldDivergence ? <option value="">{MIXED_VALUE}</option> : null}
              {(prop.options ?? []).map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--aethel-text-tertiary)]" />
          </div>
        )
      case 'string': {
        const fieldKey = `${sectionTitle}::${prop.name}`
        const isAssetDropTarget = assetDropKey === fieldKey
        const handleAssetDragOver = (event: ReactDragEvent<HTMLInputElement>) => {
          if (!event.dataTransfer.types.includes(AETHEL_ASSET_DRAG_MIME)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setAssetDropKey(fieldKey)
        }
        const handleAssetDragLeave = () => setAssetDropKey((current) => (current === fieldKey ? null : current))
        const handleAssetDrop = (event: ReactDragEvent<HTMLInputElement>) => {
          const payload = readAssetDragPayload(event.dataTransfer)
          if (!payload) return
          event.preventDefault()
          setAssetDropKey(null)
          handleValueChange(sectionIndex, propIndex, payload.path)
        }
        return (
          <input
            type="text"
            value={fieldDivergence ? '' : prop.value}
            placeholder={fieldDivergence ? MIXED_VALUE : 'Drag asset or type path...'}
            onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
            onDragOver={handleAssetDragOver}
            onDragLeave={handleAssetDragLeave}
            onDrop={handleAssetDrop}
            aria-label={`${prop.name} value`}
            className={`${inputBase} px-2 py-1 text-xs transition-all ${
              isAssetDropTarget
                ? 'border-[var(--aethel-info)] shadow-[0_0_0_2px_rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.06)]'
                : borderClass
            }`}
          />
        )
      }
      default:
        return null
    }
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: 'var(--aethel-surface-primary)', color: 'var(--aethel-text-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b"
        style={{
          borderColor: 'var(--aethel-border-primary)',
          background: 'rgba(10,14,24,0.85)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2">
          <Activity size={12} style={{ color: 'var(--aethel-primary-light)', opacity: 0.8 }} />
          <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--aethel-text-primary)', letterSpacing: '0.04em' }}>
            {objectName ? objectName : 'PROPERTIES'}
          </span>
        </div>
        <button
          type="button"
          className="p-1 rounded-lg transition-all duration-150 hover:bg-[rgba(59,130,246,0.12)] hover:text-[var(--aethel-primary-light)]"
          style={{ color: 'var(--aethel-text-tertiary)' }}
          title="Reset all properties to default"
          aria-label="Reset properties to default"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {isMultiEdit ? (
        <div
          className="border-b px-3 py-1.5 text-[10px] font-medium tracking-wide"
          style={{
            borderColor: 'rgba(56,189,248,0.2)',
            background: 'rgba(56,189,248,0.06)',
            color: 'var(--aethel-info-light)',
          }}
          role="status"
        >
          MULTI-EDIT — {effectiveEntityIds.length} objects &middot; "{MIXED_VALUE}" indicates mixed values
        </div>
      ) : null}

      {/* Properties */}
      <div className="flex-1 overflow-auto">
        {sections.length === 0 ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center"
            style={{ color: 'var(--aethel-text-quaternary)' }}
          >
            <Cpu size={28} style={{ opacity: 0.25 }} />
            <span className="text-xs">Select an object to inspect its properties.</span>
          </div>
        ) : (
          sections.map((section, sectionIndex) => {
            const accent = getSectionAccent(section.title)
            const isOpen = activeSection.has(sectionIndex)
            return (
              <div
                key={section.title}
                className="border-b"
                style={{ borderColor: 'rgba(148,163,184,0.08)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(prev => {
                      const next = new Set(prev)
                      if (next.has(sectionIndex)) next.delete(sectionIndex)
                      else next.add(sectionIndex)
                      return next
                    })
                  }}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} section ${section.title}`}
                  className="w-full flex items-center justify-between px-3 py-2 transition-all duration-150 group"
                  style={{
                    background: isOpen ? `${accent.glow}` : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(148,163,184,0.04)' }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-2">
                    {/* Section accent bar */}
                    <div
                      className="w-[3px] h-4 rounded-full flex-shrink-0"
                      style={{ background: accent.bar }}
                    />
                    <section.icon size={12} style={{ color: accent.label }} />
                    <span
                      className="text-[11px] font-semibold tracking-widest uppercase"
                      style={{ color: accent.label, letterSpacing: '0.08em' }}
                    >
                      {section.title}
                    </span>
                  </div>
                  <ChevronDown
                    size={12}
                    style={{
                      color: 'var(--aethel-text-tertiary)',
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                </button>

                {isOpen && (
                  <div
                    className="px-3 pt-2 pb-3 space-y-3"
                    style={{ background: 'rgba(10,14,24,0.4)' }}
                  >
                    {section.properties.map((prop, propIndex) => (
                      <div key={prop.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: 'var(--aethel-text-tertiary)' }}
                          >
                            {prop.name}
                          </span>
                        </div>
                        {renderProperty(sectionIndex, prop, propIndex)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-3 py-2 border-t flex-shrink-0"
        style={{
          borderColor: 'var(--aethel-border-primary)',
          background: 'rgba(10,14,24,0.7)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="text-[10px] font-mono" style={{ color: 'var(--aethel-text-quaternary)' }}>
          {sections.reduce((acc, s) => acc + s.properties.length, 0)} fields
        </span>
        {isMultiEdit && (
          <span
            className="text-[10px] font-mono"
            style={{ color: 'var(--aethel-info-light)', opacity: 0.8 }}
          >
            {effectiveEntityIds.length} entities
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Numeric field with Math On-the-Fly (FASE 3.2 Ação B): typing a literal
 * expression (e.g. `15 * 3`) and pressing Enter/blurring evaluates it and
 * commits the processed result. Falls back to the last committed value when
 * the typed text isn't a valid expression, so a bad keystroke never corrupts
 * scene data. `isMixed` renders the Multi-Edit `--` placeholder instead of a
 * numeric value until the user types a replacement.
 *
 * When `axisLabel` is set (the X/Y/Z badge), that badge doubles as an
 * "invisible slider" scrub handle — Pointer Lock click-drag, same contract
 * as `web/components/ui/ScrubbableInput.tsx` (Shift = fine, Ctrl = coarse) —
 * without touching the input's own click-to-caret/typing behavior at all.
 */
function MathCapableInput({
  value,
  isMixed = false,
  axisLabel,
  axisColor,
  ariaLabel,
  inputClassName,
  scrubStep = 0.1,
  onCommit,
}: {
  value: number
  isMixed?: boolean
  axisLabel?: string
  axisColor?: string
  ariaLabel: string
  inputClassName: string
  scrubStep?: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const scrubValueRef = useRef(value)
  const displayValue = draft ?? (isMixed ? '' : String(value))

  const commit = () => {
    if (draft === null) return
    const trimmed = draft.trim()
    if (trimmed.length > 0) {
      const evaluated = evaluateMathExpression(trimmed)
      if (evaluated !== null) {
        onCommit(evaluated)
      }
    }
    setDraft(null)
  }

  const handleScrubPointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    scrubValueRef.current = isMixed ? 0 : value
    setIsScrubbing(true)

    const target = event.currentTarget
    target.requestPointerLock?.()

    const handleMove = (moveEvent: PointerEvent) => {
      let step = scrubStep
      if (moveEvent.shiftKey) step *= 0.1
      if (moveEvent.ctrlKey) step *= 10
      scrubValueRef.current += (moveEvent.movementX || 0) * step
      onCommit(Number(scrubValueRef.current.toFixed(4)))
    }
    const handleUp = () => {
      document.exitPointerLock?.()
      setIsScrubbing(false)
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }

  return (
    <div className="relative">
      {axisLabel ? (
        <span
          onPointerDown={handleScrubPointerDown}
          title={`Drag to scrub ${axisLabel} — Shift for fine, Ctrl for coarse`}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-bold font-mono cursor-ew-resize z-10 transition-opacity duration-100"
          style={{
            color: isScrubbing ? 'var(--aethel-text-inverse)' : axisColor ?? 'var(--aethel-text-quaternary)',
            opacity: isScrubbing ? 1 : 0.9,
            textShadow: isScrubbing ? `0 0 6px ${axisColor ?? 'var(--aethel-text-inverse)'}` : 'none',
          }}
        >
          {axisLabel}
        </span>
      ) : null}
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder={isMixed ? MIXED_VALUE : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setDraft(isMixed ? '' : String(value))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            ;(e.target as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            setDraft(null)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        aria-label={ariaLabel}
        title="Accepts math expressions, e.g. 15 * 3"
        className={inputClassName}
      />
    </div>
  )
}

export { PropertiesPanel3D as PropertiesPanel }

/**
 * Derives real property sections from a live scene node (transform/material/
 * visibility). Replaces the previous hardcoded "Cube" mock — callers should
 * feed this the selected node from their actual scene service
 * (see `web/lib/ide/WebIDEBackend.ts`) rather than a static fixture.
 */
export function buildScenePropertySections(node: {
  type: string
  position: Vector3Value
  rotation: Vector3Value
  scale: Vector3Value
  color?: string
  geometry?: string
  visible?: boolean
  locked?: boolean
}): PropertySection[] {
  const sections: PropertySection[] = [
    {
      title: 'Transform',
      icon: Move,
      properties: [
        { name: 'Position', type: 'vector3', value: node.position },
        { name: 'Rotation', type: 'vector3', value: node.rotation },
        { name: 'Scale', type: 'vector3', value: node.scale },
      ],
    },
  ]

  if (node.color) {
    sections.push({
      title: 'Material',
      icon: Palette,
      properties: [{ name: 'Color', type: 'color', value: node.color }],
    })
  }

  if (node.geometry) {
    sections.push({
      title: 'Geometry',
      icon: BoxIcon,
      properties: [{ name: 'Type', type: 'string', value: node.geometry }],
    })
  }

  sections.push({
    title: 'Visibility',
    icon: Layers,
    properties: [
      { name: 'Visible', type: 'boolean', value: node.visible ?? true },
      { name: 'Locked', type: 'boolean', value: node.locked ?? false },
    ],
  })

  return sections
}
