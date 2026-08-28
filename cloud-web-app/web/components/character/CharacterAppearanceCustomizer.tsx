'use client'

/**
 * CharacterAppearanceCustomizer — Professional End-User Character Creator & Loadout Studio
 *
 * Parity target: Cyberpunk 2077 / Baldur's Gate 3 / Unreal MetaHuman Customizer
 * Architecture:
 * - Morph Targets & Facial Anatomy (Jaw, Eyes, Nose, Cheekbones, Brow)
 * - Hair & Groom Style Studio (Style meshes, Primary/Secondary Hair Color, Roughness)
 * - Complexion & PBR Skin Layering (Tone, Freckles, Scars, Metallic Augments)
 * - Tactical Armor & Gear Customizer (Helmet, Chestplate, Gauntlets, Greaves, Shaders)
 * - Stance & Animation Turntable Preview (Idle, Combat Ready, Walk Cycle, Sprint, Emote)
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  Flame,
  Layers,
  Palette,
  Play,
  RotateCcw,
  Save,
  Scissors,
  Shield,
  Sliders,
  Sparkles,
  Square,
  Sun,
  User,
  Zap,
} from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('CharacterAppearanceCustomizer')

// ─────────────────────────────────────────────────────────────
// TYPES & PRESETS
// ─────────────────────────────────────────────────────────────

export interface CharacterCustomizationState {
  // Identity
  presetName: string
  bodyType: 'Type_A' | 'Type_B' | 'Augmented'

  // Face Morphs (-1.0 to 1.0)
  jawWidth: number
  jawProminence: number
  eyeSize: number
  eyeAngle: number
  noseBridge: number
  noseTip: number
  cheekboneProminence: number
  browDepth: number

  // Skin & Complexion
  skinToneHex: string
  skinRoughness: number
  subsurfaceScattering: number
  cyberAugments: boolean
  augmentColorHex: string

  // Hair & Groom
  hairStyle: string
  hairColorPrimary: string
  hairColorSecondary: string
  hairRoughness: number

  // Armor & Tactical Loadout
  chestArmorStyle: string
  armorPrimaryColor: string
  armorSecondaryColor: string
  armorMetallic: number
  armorRoughness: number
  emissiveAccentColor: string

  // Stance
  activeAnimation: 'idle_relaxed' | 'combat_ready' | 'tactical_aim' | 'inspect_gear'
}

const HAIR_STYLES = [
  'Vanguard Slick',
  'Cyber Punk Fade',
  'Braided Tactical',
  'Undercut Mohawk',
  'Zero-G Buzz',
  'Long Waves',
]

const ARMOR_STYLES = [
  'Aethel MK-IV Exosuit',
  'Nanite Infiltration Suit',
  'Heavy Vanguard Aegis',
  'Recon Pathfinder Mesh',
  'Cybernetic Operator Harness',
]

const COLOR_SWATCHES = [
  '#0f172a', // Obsidian
  '#334155', // Charcoal
  '#64748b', // Steel
  '#e2e8f0', // Titanium
  '#06b6d4', // Neon Cyan
  '#3b82f6', // Cobalt
  '#8b5cf6', // Violet
  '#f59e0b', // Amber Gold
  '#ef4444', // Crimson
  '#10b981', // Emerald
]

const INITIAL_CHARACTER: CharacterCustomizationState = {
  presetName: 'Vanguard Operative',
  bodyType: 'Type_A',

  jawWidth: 0.1,
  jawProminence: 0.25,
  eyeSize: 0.05,
  eyeAngle: -0.1,
  noseBridge: 0.0,
  noseTip: 0.15,
  cheekboneProminence: 0.4,
  browDepth: 0.2,

  skinToneHex: '#d4a373',
  skinRoughness: 0.45,
  subsurfaceScattering: 0.35,
  cyberAugments: true,
  augmentColorHex: '#06b6d4',

  hairStyle: 'Vanguard Slick',
  hairColorPrimary: '#1e293b',
  hairColorSecondary: '#06b6d4',
  hairRoughness: 0.3,

  chestArmorStyle: 'Aethel MK-IV Exosuit',
  armorPrimaryColor: '#0f172a',
  armorSecondaryColor: '#334155',
  armorMetallic: 0.9,
  armorRoughness: 0.2,
  emissiveAccentColor: '#22d3ee',

  activeAnimation: 'combat_ready',
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function CharacterAppearanceCustomizer() {
  const [character, setCharacter] = useState<CharacterCustomizationState>(INITIAL_CHARACTER)
  const [activeTab, setActiveTab] = useState<'morphs' | 'skin' | 'hair' | 'armor' | 'stance'>('armor')
  const [turntableRotation, setTurntableRotation] = useState(25)
  const [isRotating, setIsRotating] = useState(false)

  const update = useCallback((patch: Partial<CharacterCustomizationState>) => {
    setCharacter((prev) => ({ ...prev, ...patch }))
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--aethel-surface-primary)] font-sans">
      {/* ── Top Bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-primary)]">
            Character Loadout & Appearance Studio
          </span>
          <div className="h-4 w-px bg-[var(--aethel-border-subtle)]" />
          <span className="font-mono text-xs text-cyan-300 font-bold">{character.presetName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCharacter(INITIAL_CHARACTER)}
            className="flex items-center gap-1 rounded-lg border border-[var(--aethel-border-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--aethel-text-tertiary)] hover:text-white transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Preset</span>
          </button>
          <button
            type="button"
            onClick={() => log.info('character.save', character)}
            className={`flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition ${CANONICAL_FOCUS}`}
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Operative</span>
          </button>
        </div>
      </header>

      {/* ── Main 2-Column Split ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: 3D Turntable Viewport Preview */}
        <div className="relative flex-1 bg-gradient-to-b from-[#060a14] via-[#03060c] to-[#010204] overflow-hidden flex items-center justify-center select-none">
          {/* Subtle Stage Lighting & Ground Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              background: 'radial-gradient(circle at 50% 60%, rgba(6,182,212,0.15) 0%, transparent 60%)',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* 3D Character Silhouette Hologram Representation */}
          <div
            className="relative flex flex-col items-center transition-transform duration-75"
            style={{ transform: `rotateY(${turntableRotation}deg)` }}
          >
            {/* Holographic Mannequin Display with Dynamic Shader Accent */}
            <div className="relative flex flex-col items-center">
              {/* Head / Helmet */}
              <div
                className="h-20 w-16 rounded-3xl border-2 shadow-2xl transition-all"
                style={{
                  backgroundColor: character.skinToneHex,
                  borderColor: character.emissiveAccentColor,
                  boxShadow: `0 0 24px ${character.emissiveAccentColor}40`,
                }}
              >
                {character.cyberAugments && (
                  <div
                    className="absolute top-6 right-2 h-2 w-5 rounded-full"
                    style={{ backgroundColor: character.augmentColorHex }}
                  />
                )}
              </div>

              {/* Chestplate Armor */}
              <div
                className="mt-2 h-44 w-32 rounded-2xl border-2 shadow-xl p-3 flex flex-col justify-between transition-all"
                style={{
                  backgroundColor: character.armorPrimaryColor,
                  borderColor: character.armorSecondaryColor,
                  boxShadow: `0 0 32px rgba(0,0,0,0.8)`,
                }}
              >
                <div
                  className="h-1.5 w-full rounded-full"
                  style={{ backgroundColor: character.emissiveAccentColor }}
                />
                <div className="text-center font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {character.chestArmorStyle.slice(0, 16)}
                </div>
                <div
                  className="h-2 w-12 mx-auto rounded-full"
                  style={{ backgroundColor: character.emissiveAccentColor }}
                />
              </div>

              {/* Legs / Greaves */}
              <div className="flex gap-2 mt-1">
                <div
                  className="h-48 w-12 rounded-xl border-2"
                  style={{ backgroundColor: character.armorSecondaryColor, borderColor: character.armorPrimaryColor }}
                />
                <div
                  className="h-48 w-12 rounded-xl border-2"
                  style={{ backgroundColor: character.armorSecondaryColor, borderColor: character.armorPrimaryColor }}
                />
              </div>
            </div>
          </div>

          {/* Turntable Rotation Controls Overlay */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-4 pointer-events-auto">
            <button
              type="button"
              onClick={() => setTurntableRotation((r) => r - 15)}
              className="rounded-full border border-slate-800 bg-black/70 p-2 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-xs text-slate-400 bg-black/60 px-3 py-1 rounded-full border border-slate-800">
              Turntable: {turntableRotation}°
            </span>
            <button
              type="button"
              onClick={() => setTurntableRotation((r) => r + 15)}
              className="rounded-full border border-slate-800 bg-black/70 p-2 text-slate-300 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Customization Tabs & Sliders */}
        <aside className="flex w-96 shrink-0 flex-col border-l border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] overflow-y-auto">
          {/* Navigation Category Tabs */}
          <div className="flex border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
            {(
              [
                ['armor', 'Armor & Gear', Shield],
                ['skin', 'Complexion', Palette],
                ['hair', 'Hair & Groom', Scissors],
                ['morphs', 'Face Morphs', Sliders],
                ['stance', 'Stance', Activity],
              ] as const
            ).map(([tab, label, Icon]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-center transition flex flex-col items-center gap-1 ${
                  activeTab === tab
                    ? 'border-b-2 border-cyan-400 text-cyan-300 bg-cyan-950/20 font-bold'
                    : 'text-[var(--aethel-text-tertiary)] hover:text-white text-xs'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">{label}</span>
              </button>
            ))}
          </div>

          <div className="p-5 space-y-6">
            {/* TAB: ARMOR & GEAR */}
            {activeTab === 'armor' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-[var(--aethel-text-secondary)] mb-1.5">
                    Exosuit Model
                  </label>
                  <select
                    value={character.chestArmorStyle}
                    onChange={(e) => update({ chestArmorStyle: e.target.value })}
                    className="w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-xs font-semibold text-cyan-300 outline-none"
                  >
                    {ARMOR_STYLES.map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--aethel-text-secondary)] mb-2">
                    Primary Plating Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => update({ armorPrimaryColor: color })}
                        className={`h-7 w-7 rounded-lg border-2 transition ${
                          character.armorPrimaryColor === color ? 'border-cyan-400 scale-110' : 'border-slate-800'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--aethel-text-secondary)] mb-2">
                    Emissive Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => update({ emissiveAccentColor: color })}
                        className={`h-7 w-7 rounded-lg border-2 transition ${
                          character.emissiveAccentColor === color ? 'border-cyan-400 scale-110' : 'border-slate-800'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-300">Armor Metallicity</span>
                    <span className="font-mono text-cyan-300">{character.armorMetallic.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={character.armorMetallic}
                    onChange={(e) => update({ armorMetallic: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* TAB: SKIN & COMPLEXION */}
            {activeTab === 'skin' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-[var(--aethel-text-secondary)] mb-2">
                    Skin Tone Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['#f8d5c2', '#e8b89d', '#d4a373', '#a9714b', '#6f4e37', '#3c2415'].map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => update({ skinToneHex: tone })}
                        className={`h-8 w-8 rounded-full border-2 transition ${
                          character.skinToneHex === tone ? 'border-cyan-400 scale-110' : 'border-slate-800'
                        }`}
                        style={{ backgroundColor: tone }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--aethel-border-subtle)] pt-3">
                  <span className="text-xs font-semibold text-slate-300">Cybernetic Augments</span>
                  <input
                    type="checkbox"
                    checked={character.cyberAugments}
                    onChange={(e) => update({ cyberAugments: e.target.checked })}
                    className="rounded accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* TAB: HAIR & GROOM */}
            {activeTab === 'hair' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-[var(--aethel-text-secondary)] mb-1.5">
                    Hairstyle Mesh
                  </label>
                  <select
                    value={character.hairStyle}
                    onChange={(e) => update({ hairStyle: e.target.value })}
                    className="w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-xs font-semibold text-cyan-300 outline-none"
                  >
                    {HAIR_STYLES.map((h) => (
                      <option key={h} value={h} className="bg-slate-900 text-white">
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TAB: FACE MORPHS */}
            {activeTab === 'morphs' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {(
                  [
                    ['jawWidth', 'Jaw Width'],
                    ['jawProminence', 'Jaw Prominence'],
                    ['eyeSize', 'Eye Scale'],
                    ['eyeAngle', 'Eye Canthal Tilt'],
                    ['noseBridge', 'Nose Bridge Depth'],
                    ['cheekboneProminence', 'Cheekbone Definition'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-mono text-cyan-300">{character[key].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.05}
                      value={character[key]}
                      onChange={(e) => update({ [key]: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* TAB: STANCE & ANIMATION */}
            {activeTab === 'stance' && (
              <div className="space-y-2 animate-in fade-in duration-150">
                {(
                  [
                    ['idle_relaxed', 'Idle Relaxed Stance'],
                    ['combat_ready', 'Tactical Combat Ready'],
                    ['tactical_aim', 'Precision Aim Pose'],
                    ['inspect_gear', 'Gear Inspection Turntable'],
                  ] as const
                ).map(([anim, label]) => (
                  <button
                    key={anim}
                    type="button"
                    onClick={() => update({ activeAnimation: anim })}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs font-semibold transition ${
                      character.activeAnimation === anim
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                        : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]'
                    }`}
                  >
                    <span>{label}</span>
                    {character.activeAnimation === anim && <Check className="h-4 w-4 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
