'use client'

import { useMemo, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDown, ArrowUp, RotateCcw, ChevronDown, ChevronRight, Move, Layers, Palette, Box as BoxIcon } from 'lucide-react'
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
  const inputClass =
    'w-full rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] text-[var(--aethel-text-secondary)] outline-none focus:border-[var(--aethel-primary)]'
  // Unstable numeric data reads better tabular + monospaced (AGDS density rule) — digits never jitter width as they change.
  const numericInputClass = `${inputClass} font-mono tabular-nums`

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
        return (
          <div className="grid grid-cols-4 gap-1">
            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
              <MathCapableInput
                key={axis}
                axisLabel={axis}
                value={prop.value[i]}
                isMixed={axisDivergence[i]}
                inputClassName={`${numericInputClass} py-1 pl-5 pr-1 text-xs`}
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
      case 'float':
        return (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={prop.min || 0}
              max={prop.max || 100}
              value={prop.value}
              onChange={(e) => handleValueChange(sectionIndex, propIndex, parseFloat(e.target.value))}
              aria-label={`${prop.name} slider`}
              className="flex-1"
            />
            {prop.history && prop.history.length > 1 && (
              <Sparkline values={prop.history} width={40} height={16} ariaLabel={`${prop.name} recent history`} />
            )}
            <MathCapableInput
              value={prop.value}
              isMixed={Boolean(fieldDivergence)}
              inputClassName={`${numericInputClass} w-16 px-2 py-1 text-xs`}
              ariaLabel={`${prop.name} value`}
              onCommit={(next) => handleValueChange(sectionIndex, propIndex, next)}
            />
          </div>
        )
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fieldDivergence ? '#808080' : prop.value}
              onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
              aria-label={`${prop.name} color picker`}
              className="w-8 h-6 rounded cursor-pointer"
            />
            <input
              type="text"
              value={fieldDivergence ? MIXED_VALUE : prop.value}
              onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
              aria-label={`${prop.name} color value`}
              className={`${inputClass} flex-1 px-2 py-1 text-xs`}
            />
          </div>
        )
      case 'boolean':
        return (
          <button
            type="button"
            onClick={() => handleValueChange(sectionIndex, propIndex, !prop.value)}
            aria-label={`${prop.name} ${prop.value ? 'enabled' : 'disabled'}`}
            className={`w-10 h-5 rounded-full transition-colors ${fieldDivergence
                ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_60%,var(--aethel-surface-tertiary))]'
                : prop.value ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-surface-tertiary)]'
              }`}
            title={fieldDivergence ? 'Mixed values across selection' : undefined}
          >
            <div
              className={`w-4 h-4 rounded-full bg-[var(--aethel-text-primary)] transition-transform ${prop.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
          </button>
        )
      case 'enum':
        return (
          <select
            value={fieldDivergence ? '' : prop.value}
            onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
            aria-label={`${prop.name} selection`}
            className={`${inputClass} px-2 py-1 text-xs`}
          >
            {fieldDivergence ? <option value="">{MIXED_VALUE}</option> : null}
            {(prop.options ?? []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
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
            placeholder={fieldDivergence ? MIXED_VALUE : undefined}
            onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
            onDragOver={handleAssetDragOver}
            onDragLeave={handleAssetDragLeave}
            onDrop={handleAssetDrop}
            aria-label={`${prop.name} value`}
            className={`${inputClass} px-2 py-1 text-xs transition-colors ${
              isAssetDropTarget ? 'ring-1 ring-inset ring-[var(--aethel-info)] bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]' : ''
            }`}
          />
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">Properties</span>
        <button
          type="button"
          className="p-1 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
          title="Reset all properties to default"
          aria-label="Reset properties to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {isMultiEdit ? (
        <div
          className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[10px] font-medium text-[var(--aethel-info-light)]"
          role="status"
        >
          Editing {effectiveEntityIds.length} objects · fields showing &ldquo;{MIXED_VALUE}&rdquo; differ across the selection
        </div>
      ) : null}

      {/* Properties */}
      <div className="flex-1 overflow-auto">
        {sections.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-6 text-center text-xs text-[var(--aethel-text-tertiary)]">
            No object selected.
          </div>
        ) : (
        sections.map((section, sectionIndex) => (
          <div key={section.title} className="border-b border-[var(--aethel-border-secondary)]">
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
              aria-expanded={activeSection.has(sectionIndex)}
              aria-label={`${activeSection.has(sectionIndex) ? 'Collapse' : 'Expand'} section ${section.title}`}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <section.icon className="w-3.5 h-3.5 text-[var(--aethel-primary-light)]" />
                {section.title}
              </div>
              {activeSection.has(sectionIndex) ? (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
              )}
            </button>

            {activeSection.has(sectionIndex) && (
              <div className="px-3 py-2 space-y-3">
                {section.properties.map((prop, propIndex) => (
                  <div key={prop.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--aethel-text-secondary)]">{prop.name}</span>
                    </div>
                    {renderProperty(sectionIndex, prop, propIndex)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <div className="flex items-center justify-between text-xs text-[var(--aethel-text-tertiary)]">
          <span>{sections.reduce((acc, s) => acc + s.properties.length, 0)} properties</span>
          <span>{isMultiEdit ? `${effectiveEntityIds.length} objects` : objectName}</span>
        </div>
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
  ariaLabel,
  inputClassName,
  scrubStep = 0.1,
  onCommit,
}: {
  value: number
  isMixed?: boolean
  axisLabel?: string
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
          title={`Drag to scrub ${axisLabel} — hold Shift for fine, Ctrl for coarse`}
          className={`absolute left-2 top-1/2 -translate-y-1/2 select-none text-xs font-mono cursor-ew-resize ${
            isScrubbing ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-info-light)]'
          }`}
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
