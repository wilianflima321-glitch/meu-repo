'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Move, Layers, Palette, Box as BoxIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Vector3Value = [number, number, number]
type PropertyValue = Vector3Value | number | string | boolean

interface PropertySection {
  title: string
  icon: LucideIcon
  properties: Property[]
}

type Property =
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

interface PropertiesPanelProps {
  sections?: PropertySection[]
  onPropertyChange?: (section: string, property: string, value: PropertyValue) => void
}

export function PropertiesPanel3D({
  sections = defaultSections,
  onPropertyChange = () => undefined,
}: PropertiesPanelProps) {
  const [activeSection, setActiveSection] = useState(0)
  const inputClass =
    'w-full rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] text-[var(--aethel-text-secondary)] outline-none focus:border-[var(--aethel-primary)]'

  const handleValueChange = (sectionIndex: number, propertyIndex: number, newValue: PropertyValue) => {
    onPropertyChange(sections[sectionIndex].title, sections[sectionIndex].properties[propertyIndex].name, newValue)
  }

  const renderProperty = (sectionIndex: number, prop: Property, propIndex: number) => {
    switch (prop.type) {
      case 'vector3':
        return (
          <div className="grid grid-cols-4 gap-1">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--aethel-text-quaternary)]">{axis}</span>
                <input
                  type="number"
                  value={prop.value[i]}
                  onChange={(e) => {
                    const newValue: Vector3Value = [...prop.value]
                    newValue[i] = parseFloat(e.target.value)
                    handleValueChange(sectionIndex, propIndex, newValue)
                  }}
                  aria-label={`${prop.name} ${axis}`}
                  className={`${inputClass} py-1 pl-5 pr-1 text-xs`}
                  step={0.1}
                />
              </div>
            ))}
          </div>
        )
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
            <input
              type="number"
              value={prop.value}
              onChange={(e) => handleValueChange(sectionIndex, propIndex, parseFloat(e.target.value))}
              aria-label={`${prop.name} value`}
              className={`${inputClass} w-16 px-2 py-1 text-xs`}
              step={0.1}
            />
          </div>
        )
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={prop.value}
              onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
              aria-label={`${prop.name} color picker`}
              className="w-8 h-6 rounded cursor-pointer"
            />
            <input
              type="text"
              value={prop.value}
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
            className={`w-10 h-5 rounded-full transition-colors ${
              prop.value ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-surface-tertiary)]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-[var(--aethel-text-primary)] transition-transform ${
                prop.value ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        )
      case 'enum':
        return (
          <select
            value={prop.value}
            onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
            aria-label={`${prop.name} selection`}
            className={`${inputClass} px-2 py-1 text-xs`}
          >
            {(prop.options ?? []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      case 'string':
        return (
          <input
            type="text"
            value={prop.value}
            onChange={(e) => handleValueChange(sectionIndex, propIndex, e.target.value)}
            aria-label={`${prop.name} value`}
            className={`${inputClass} px-2 py-1 text-xs`}
          />
        )
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
          title="Reset"
          aria-label="Resetar propriedades"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-auto">
        {sections.map((section, sectionIndex) => (
          <div key={section.title} className="border-b border-[var(--aethel-border-secondary)]">
            <button
              type="button"
              onClick={() => setActiveSection(activeSection === sectionIndex ? -1 : sectionIndex)}
              aria-label={`${activeSection === sectionIndex ? 'Recolher' : 'Expandir'} secao ${section.title}`}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <section.icon className="w-3.5 h-3.5 text-[var(--aethel-primary-light)]" />
                {section.title}
              </div>
              {activeSection === sectionIndex ? (
                <ArrowDown className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
              )}
            </button>

            {activeSection === sectionIndex && (
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
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <div className="flex items-center justify-between text-xs text-[var(--aethel-text-tertiary)]">
          <span>{sections.reduce((acc, s) => acc + s.properties.length, 0)} propriedades</span>
          <span>Cube</span>
        </div>
      </div>
    </div>
  )
}

export { PropertiesPanel3D as PropertiesPanel }

const defaultSections: PropertySection[] = [
  {
    title: 'Transform',
    icon: Move,
    properties: [
      { name: 'Position', type: 'vector3', value: [0, 0, 0] },
      { name: 'Rotation', type: 'vector3', value: [0, 0, 0] },
      { name: 'Scale', type: 'vector3', value: [1, 1, 1] },
    ],
  },
  {
    title: 'Material',
    icon: Palette,
    properties: [
      { name: 'Color', type: 'color', value: '#6366f1' },
      { name: 'Metallic', type: 'float', value: 0.5, min: 0, max: 1 },
      { name: 'Roughness', type: 'float', value: 0.5, min: 0, max: 1 },
      { name: 'Emissive', type: 'boolean', value: false },
    ],
  },
  {
    title: 'Geometry',
    icon: BoxIcon,
    properties: [
      { name: 'Type', type: 'enum', value: 'Cube', options: ['Cube', 'Sphere', 'Cylinder', 'Plane'] },
      { name: 'Segments', type: 'float', value: 1, min: 1, max: 32 },
      { name: 'Double Sided', type: 'boolean', value: true },
    ],
  },
  {
    title: 'Visibility',
    icon: Layers,
    properties: [
      { name: 'Visible', type: 'boolean', value: true },
      { name: 'Cast Shadows', type: 'boolean', value: true },
      { name: 'Receive Shadows', type: 'boolean', value: true },
    ],
  },
]
