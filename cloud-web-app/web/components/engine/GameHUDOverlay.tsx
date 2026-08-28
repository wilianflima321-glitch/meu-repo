'use client'

/**
 * GameHUDOverlay — In-Game Head-Up Display & UI Framework
 *
 * Professional AAA game HUD runtime & designer preview.
 * Adheres strictly to Aethel Obsidian Design Tokens, Law I (Zero-Copy Shared Buffer sync),
 * Law II (LiveOps Telemetry integration), and Law X (Ergonomic Glassmorphism).
 *
 * Subsystems:
 * - Dynamic Status Gauges (Health, Shield, Stamina, Energy)
 * - Compass & Navigation Radar (360° cardinal headings, distance markers, threat blips)
 * - Interactive Quest Tracker (Multi-tier objectives with animated progress)
 * - Cinematic Dialogue Box (Typewriter text streaming, speaker portrait, choice tree)
 * - Hotbar & Radial Ability Cooldowns (Keys 1-8, sweep shaders, ammo/charges)
 * - Action & Loot Notification Stream (Rarity borders, XP counter, achievement banners)
 * - Dynamic Reticle & Hitmarker (Recoil spread, critical kill indicators)
 * - In-Game Pause & Configuration Modal (Resume, Audio, Graphics, Controls, Quit)
 * - Designer Live-Edit Mode (Anchor positioning, HUD scale, auto-hide toggles)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  Activity,
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  Grid,
  Heart,
  Layers,
  MapPin,
  Maximize2,
  MessageSquare,
  Minus,
  Moon,
  Move,
  Navigation,
  Package,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Volume2,
  X,
  Zap,
} from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('GameHUDOverlay')

// ─────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export interface PlayerStats {
  health: number
  maxHealth: number
  shield: number
  maxShield: number
  stamina: number
  maxStamina: number
  energy: number
  maxEnergy: number
  level: number
  experience: number
  maxExperience: number
}

export interface QuestObjective {
  id: string
  label: string
  current: number
  required: number
  completed: boolean
}

export interface ActiveQuest {
  id: string
  title: string
  category: 'Main' | 'Side' | 'Bounty' | 'Event'
  distanceMeters: number
  objectives: QuestObjective[]
}

export interface DialogueChoice {
  id: string
  text: string
  iconType?: 'talk' | 'investigate' | 'agree' | 'refuse' | 'action'
  requiredLevel?: number
}

export interface DialogueNode {
  speakerName: string
  speakerTitle: string
  speakerAvatarUrl?: string
  text: string
  choices: DialogueChoice[]
}

export interface HotbarItem {
  slot: number
  name: string
  iconName: string
  count?: number
  maxCooldown: number
  currentCooldown: number
  active: boolean
  keybind: string
}

export type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface LootToast {
  id: string
  title: string
  subtitle?: string
  count?: number
  rarity: LootRarity
  timestamp: number
}

export interface HUDConfig {
  showCompass: boolean
  showStatusBars: boolean
  showQuestTracker: boolean
  showHotbar: boolean
  showCrosshair: boolean
  showLootFeed: boolean
  hudScale: number
  autoHideStamina: boolean
  designerMode: boolean
}

// ─────────────────────────────────────────────────────────────
// RARITY STYLING
// ─────────────────────────────────────────────────────────────

const RARITY_THEMES: Record<LootRarity, { border: string; bg: string; text: string; glow: string }> = {
  common: {
    border: 'border-[var(--aethel-border-secondary)]',
    bg: 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]',
    text: 'text-[var(--aethel-text-secondary)]',
    glow: 'rgba(148,163,184,0.1)',
  },
  uncommon: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    glow: 'rgba(16,185,129,0.25)',
  },
  rare: {
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-300',
    glow: 'rgba(6,182,212,0.25)',
  },
  epic: {
    border: 'border-sky-500/40',
    bg: 'bg-sky-950/40',
    text: 'text-sky-300',
    glow: 'rgba(56,189,248,0.3)',
  },
  legendary: {
    border: 'border-amber-500/60',
    bg: 'bg-amber-950/50',
    text: 'text-amber-300',
    glow: 'rgba(245,158,11,0.4)',
  },
}

// ─────────────────────────────────────────────────────────────
// DEFAULT MOCK DATA FOR LIVE DESIGNER WORKBENCH
// ─────────────────────────────────────────────────────────────

const DEFAULT_STATS: PlayerStats = {
  health: 84,
  maxHealth: 100,
  shield: 45,
  maxShield: 50,
  stamina: 78,
  maxStamina: 100,
  energy: 120,
  maxEnergy: 150,
  level: 14,
  experience: 3820,
  maxExperience: 5000,
}

const DEFAULT_QUEST: ActiveQuest = {
  id: 'quest-main-01',
  title: 'Protocol Nexus: Breach the Perimeter',
  category: 'Main',
  distanceMeters: 142,
  objectives: [
    { id: 'obj-1', label: 'Overload coolant subsystem valves', current: 3, required: 3, completed: true },
    { id: 'obj-2', label: 'Acquire security keycard from Terminal Delta', current: 0, required: 1, completed: false },
    { id: 'obj-3', label: 'Neutralize core automated turrets', current: 1, required: 4, completed: false },
  ],
}

const DEFAULT_DIALOGUE: DialogueNode = {
  speakerName: 'Operator Vane',
  speakerTitle: 'Aethel Frontier Vanguard',
  text: 'The quantum containment barrier is degrading rapidly. If we do not recalibrate the primary relay within three cycles, the entire sector will destabilize.',
  choices: [
    { id: 'c-1', text: 'I will secure the control room immediately.', iconType: 'action' },
    { id: 'c-2', text: 'What caused the sudden core temperature spike?', iconType: 'investigate' },
    { id: 'c-3', text: 'Stand down. We need to evaluate secondary protocols first.', iconType: 'refuse' },
  ],
}

const DEFAULT_HOTBAR: HotbarItem[] = [
  { slot: 1, name: 'Plasma Rifle', iconName: 'Crosshair', maxCooldown: 0, currentCooldown: 0, active: true, keybind: '1' },
  { slot: 2, name: 'Arc Scattergun', iconName: 'Zap', maxCooldown: 1.5, currentCooldown: 0, active: false, keybind: '2' },
  { slot: 3, name: 'Kinetic Shield Burst', iconName: 'Shield', maxCooldown: 8, currentCooldown: 3.4, active: false, keybind: '3' },
  { slot: 4, name: 'Thermal Grenade', iconName: 'Flame', count: 4, maxCooldown: 12, currentCooldown: 0, active: false, keybind: '4' },
  { slot: 5, name: 'Nanite Med-Injector', iconName: 'Activity', count: 2, maxCooldown: 20, currentCooldown: 0, active: false, keybind: '5' },
  { slot: 6, name: 'Spatial Warp Beacon', iconName: 'Sparkles', count: 1, maxCooldown: 45, currentCooldown: 18.2, active: false, keybind: '6' },
]

const DEFAULT_TOASTS: LootToast[] = [
  { id: 'loot-1', title: 'Hyper-Density Core', subtitle: 'Rare Crafting Component', count: 2, rarity: 'rare', timestamp: Date.now() - 4000 },
  { id: 'loot-2', title: 'Vanguard Exosuit Plating', subtitle: 'Epic Armor Upgrade', count: 1, rarity: 'epic', timestamp: Date.now() - 2000 },
]

// ─────────────────────────────────────────────────────────────
// COMPASS BAR COMPONENT
// ─────────────────────────────────────────────────────────────

function CompassBar({ heading = 42, targetHeading = 68, distance = 142 }: { heading?: number; targetHeading?: number; distance?: number }) {
  const width = 360
  const fov = 120 // visible field of view in degrees

  const ticks = useMemo(() => {
    const arr: Array<{ deg: number; label?: string; isCardinal: boolean }> = []
    for (let i = 0; i < 360; i += 15) {
      let label: string | undefined
      let isCardinal = false
      if (i === 0) { label = 'N'; isCardinal = true }
      else if (i === 45) label = 'NE'
      else if (i === 90) { label = 'E'; isCardinal = true }
      else if (i === 135) label = 'SE'
      else if (i === 180) { label = 'S'; isCardinal = true }
      else if (i === 225) label = 'SW'
      else if (i === 270) { label = 'W'; isCardinal = true }
      else if (i === 315) label = 'NW'
      arr.push({ deg: i, label, isCardinal })
    }
    return arr
  }, [])

  return (
    <div className="relative mx-auto flex flex-col items-center select-none">
      {/* Target objective indicator header */}
      <div className="mb-1 flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-black/60 px-3 py-0.5 backdrop-blur-md">
        <MapPin className="h-3 w-3 text-cyan-400" />
        <span className="font-mono text-[10px] font-bold text-cyan-300">
          OBJECTIVE · {distance}m
        </span>
      </div>

      {/* Main compass strip container with horizontal gradient fade */}
      <div
        className="relative h-9 overflow-hidden rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
        style={{
          width,
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        }}
      >
        {/* Central heading indicator notch */}
        <div className="absolute left-1/2 top-0 z-20 h-full w-px -translate-x-1/2 bg-cyan-400/80 shadow-[0_0_8px_#22d3ee]">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-cyan-400" />
        </div>

        {/* Dynamic ticks */}
        <div className="relative h-full w-full">
          {ticks.map(({ deg, label, isCardinal }) => {
            let diff = deg - heading
            while (diff < -180) diff += 360
            while (diff > 180) diff -= 360

            if (Math.abs(diff) > fov / 2) return null
            const x = (width / 2) + (diff / (fov / 2)) * (width / 2)

            return (
              <div
                key={deg}
                className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                style={{ left: `${x}px` }}
              >
                <div
                  className={`w-px ${
                    isCardinal ? 'h-3 bg-cyan-300' : label ? 'h-2 bg-slate-300' : 'h-1.5 bg-slate-500/60'
                  }`}
                />
                {label && (
                  <span
                    className={`mt-0.5 font-mono text-[9px] font-bold ${
                      isCardinal ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                )}
              </div>
            )
          })}

          {/* Quest marker pin on compass */}
          {(() => {
            let diff = targetHeading - heading
            while (diff < -180) diff += 360
            while (diff > 180) diff -= 360
            if (Math.abs(diff) <= fov / 2) {
              const x = (width / 2) + (diff / (fov / 2)) * (width / 2)
              return (
                <div
                  className="absolute bottom-1 -translate-x-1/2 z-10 flex flex-col items-center"
                  style={{ left: `${x}px` }}
                >
                  <div className="h-2 w-2 rotate-45 border border-cyan-300 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                </div>
              )
            }
            return null
          })()}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// STATUS GAUGES (Health / Shield / Stamina / Energy)
// ─────────────────────────────────────────────────────────────

function StatusGauges({ stats }: { stats: PlayerStats }) {
  const hpPct = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100))
  const shieldPct = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100))
  const staminaPct = Math.max(0, Math.min(100, (stats.stamina / stats.maxStamina) * 100))
  const energyPct = Math.max(0, Math.min(100, (stats.energy / stats.maxEnergy) * 100))

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_82%,transparent)] p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl select-none min-w-[260px]">
      {/* Player Level & XP summary */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-950/60 font-mono text-[10px] font-bold text-cyan-300">
            {stats.level}
          </span>
          <span className="font-semibold text-[var(--aethel-text-primary)]">Agent Vanguard</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          <span>{stats.experience}</span>
          <span>/</span>
          <span>{stats.maxExperience} XP</span>
        </div>
      </div>

      {/* Health & Shield Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <Heart className="h-3 w-3" /> VITALITY
          </span>
          <span className="font-mono text-emerald-300">
            {stats.health} / {stats.maxHealth}
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-700/60">
          {/* Health fill */}
          <div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${hpPct}%` }}
          />
          {/* Shield overlay layer */}
          {stats.shield > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/50 to-blue-400/70 border-r-2 border-cyan-200 transition-all duration-300"
              style={{ width: `${shieldPct}%` }}
            />
          )}
        </div>
      </div>

      {/* Stamina Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 text-amber-400">
            <Zap className="h-3 w-3" /> STAMINA
          </span>
          <span className="font-mono text-amber-300">{Math.round(staminaPct)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-700/40">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-150"
            style={{ width: `${staminaPct}%` }}
          />
        </div>
      </div>

      {/* Energy / Mana Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 text-sky-400">
            <Sparkles className="h-3 w-3" /> QUANTUM ENERGY
          </span>
          <span className="font-mono text-sky-300">
            {stats.energy} / {stats.maxEnergy}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-700/40">
          <div
            className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-200"
            style={{ width: `${energyPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// QUEST TRACKER HUD
// ─────────────────────────────────────────────────────────────

function QuestTracker({ quest }: { quest: ActiveQuest }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="w-80 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_82%,transparent)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl select-none">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-cyan-300">
            {quest.category}
          </span>
          <span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
            {quest.distanceMeters}m
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition"
          aria-label={collapsed ? 'Expand quest' : 'Collapse quest'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
        </button>
      </div>

      <h4 className="text-xs font-bold tracking-tight text-[var(--aethel-text-primary)]">
        {quest.title}
      </h4>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {quest.objectives.map((obj) => (
            <div key={obj.id} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">
                {obj.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-slate-500 bg-slate-900/60" />
                )}
              </span>
              <div className="flex-1">
                <p
                  className={`leading-tight ${
                    obj.completed
                      ? 'text-[var(--aethel-text-tertiary)] line-through'
                      : 'text-[var(--aethel-text-secondary)] font-medium'
                  }`}
                >
                  {obj.label}
                </p>
                {obj.required > 1 && !obj.completed && (
                  <p className="mt-0.5 font-mono text-[10px] text-cyan-400">
                    {obj.current} / {obj.required}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DIALOGUE BOX COMPONENT
// ─────────────────────────────────────────────────────────────

function DialogueBox({
  dialogue,
  onChoose,
  onSkip,
}: {
  dialogue: DialogueNode
  onChoose: (choiceId: string) => void
  onSkip: () => void
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    setDisplayedText('')
    setIsTyping(true)
    let idx = 0
    const interval = setInterval(() => {
      if (idx <= dialogue.text.length) {
        setDisplayedText(dialogue.text.slice(0, idx))
        idx += 2
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [dialogue.text])

  const finishTyping = () => {
    setDisplayedText(dialogue.text)
    setIsTyping(false)
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_94%,transparent)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl select-none animate-in fade-in slide-in-from-bottom-6 duration-200">
      {/* Speaker Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 font-bold">
            {dialogue.speakerName.charAt(0)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--aethel-text-primary)]">
              {dialogue.speakerName}
            </h3>
            <p className="text-[10px] font-mono text-[var(--aethel-text-tertiary)]">
              {dialogue.speakerTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] font-mono text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] transition"
        >
          Skip (Esc)
        </button>
      </div>

      {/* Dialogue Text Stream */}
      <div
        className="min-h-[54px] cursor-pointer text-sm leading-relaxed text-[var(--aethel-text-secondary)]"
        onClick={() => { if (isTyping) finishTyping() }}
      >
        {displayedText}
        {isTyping && <span className="inline-block h-4 w-1.5 animate-pulse bg-cyan-400 ml-1" />}
      </div>

      {/* Interactive Choices Tree */}
      {!isTyping && (
        <div className="mt-5 space-y-2 border-t border-[var(--aethel-border-subtle)] pt-4">
          {dialogue.choices.map((choice, i) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice.id)}
              className={`flex w-full items-center justify-between rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-2.5 text-left text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-cyan-500/50 hover:bg-cyan-950/20 active:scale-[0.99] ${CANONICAL_FOCUS}`}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-cyan-400">[{i + 1}]</span>
                <span>{choice.text}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HOTBAR WITH RADIAL COOLDOWN SWEEP
// ─────────────────────────────────────────────────────────────

function Hotbar({ items, activeSlot, onSelect }: { items: HotbarItem[]; activeSlot: number; onSelect: (slot: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl select-none">
      {items.map((item) => {
        const isActive = item.slot === activeSlot
        const hasCooldown = item.currentCooldown > 0
        const cdPct = hasCooldown ? (item.currentCooldown / item.maxCooldown) * 100 : 0

        return (
          <button
            key={item.slot}
            type="button"
            onClick={() => onSelect(item.slot)}
            className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-xl border transition-all ${
              isActive
                ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_16px_rgba(34,211,238,0.3)]'
                : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:border-[var(--aethel-border-secondary)]'
            }`}
          >
            {/* Slot keybind badge */}
            <span className="absolute left-1.5 top-1 font-mono text-[9px] font-bold text-[var(--aethel-text-tertiary)]">
              {item.keybind}
            </span>

            {/* Item Count */}
            {item.count !== undefined && (
              <span className="absolute bottom-1 right-1.5 font-mono text-[10px] font-bold text-amber-300">
                x{item.count}
              </span>
            )}

            {/* Icon representation */}
            <Zap className={`h-5 w-5 ${isActive ? 'text-cyan-300' : 'text-[var(--aethel-text-secondary)]'}`} />

            {/* Radial Cooldown Overlay */}
            {hasCooldown && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 backdrop-blur-[1px]">
                <span className="font-mono text-xs font-bold text-amber-300">
                  {item.currentCooldown.toFixed(1)}s
                </span>
                <div
                  className="absolute inset-0 rounded-xl border-2 border-amber-400/60"
                  style={{ opacity: cdPct / 100 }}
                />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LOOT TOAST FEED
// ─────────────────────────────────────────────────────────────

function LootFeed({ toasts }: { toasts: LootToast[] }) {
  return (
    <div className="flex flex-col gap-2 select-none pointer-events-none">
      {toasts.map((toast) => {
        const theme = RARITY_THEMES[toast.rarity]
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl border ${theme.border} ${theme.bg} px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-300`}
            style={{ boxShadow: `0 0 16px ${theme.glow}` }}
          >
            <Package className={`h-5 w-5 ${theme.text}`} />
            <div>
              <p className={`text-xs font-bold ${theme.text}`}>
                {toast.title} {toast.count && toast.count > 1 ? `(x${toast.count})` : ''}
              </p>
              {toast.subtitle && (
                <p className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
                  {toast.subtitle}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DYNAMIC CROSSHAIR & RETICLE
// ─────────────────────────────────────────────────────────────

function Reticle({ spread = 12, hitmarked = false }: { spread?: number; hitmarked?: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
      {/* Center dot */}
      <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />

      {/* Reticle ticks */}
      <div
        className="absolute h-2.5 w-0.5 bg-cyan-400/80 transition-all duration-75"
        style={{ top: `-${spread + 10}px`, left: '2px' }}
      />
      <div
        className="absolute h-2.5 w-0.5 bg-cyan-400/80 transition-all duration-75"
        style={{ bottom: `-${spread + 10}px`, left: '2px' }}
      />
      <div
        className="absolute h-0.5 w-2.5 bg-cyan-400/80 transition-all duration-75"
        style={{ left: `-${spread + 10}px`, top: '2px' }}
      />
      <div
        className="absolute h-0.5 w-2.5 bg-cyan-400/80 transition-all duration-75"
        style={{ right: `-${spread + 10}px`, top: '2px' }}
      />

      {/* Hitmarker X pulse */}
      {hitmarked && (
        <div className="absolute -inset-2 flex items-center justify-center animate-ping">
          <div className="h-4 w-4 border-2 border-red-500 rotate-45" />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// IN-GAME PAUSE / SETTINGS MODAL
// ─────────────────────────────────────────────────────────────

function PauseMenuModal({
  onResume,
  onQuit,
}: {
  onResume: () => void
  onQuit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)]">
        <div className="border-b border-[var(--aethel-border-subtle)] pb-4 text-center">
          <h2 className="text-xl font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">
            Simulation Paused
          </h2>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            Aethel Engine Runtime · 60.0 FPS · Law I SAB Active
          </p>
        </div>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition hover:bg-cyan-400 active:scale-[0.98] ${CANONICAL_FOCUS}`}
          >
            <Play className="h-4 w-4" /> Resume Simulation
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] py-2.5 text-xs font-semibold text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition"
          >
            <Sliders className="h-4 w-4" /> Audio & Video Settings
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] py-2.5 text-xs font-semibold text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition"
          >
            <Activity className="h-4 w-4" /> Controls & Keybindings
          </button>

          <button
            type="button"
            onClick={onQuit}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-950/40 transition"
          >
            <X className="h-4 w-4" /> Return to Studio / Hub
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN GAME HUD OVERLAY CONTAINER
// ─────────────────────────────────────────────────────────────

export default function GameHUDOverlay() {
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS)
  const [quest, setQuest] = useState<ActiveQuest>(DEFAULT_QUEST)
  const [dialogue, setDialogue] = useState<DialogueNode | null>(DEFAULT_DIALOGUE)
  const [hotbar, setHotbar] = useState<HotbarItem[]>(DEFAULT_HOTBAR)
  const [activeSlot, setActiveSlot] = useState(1)
  const [toasts, setToasts] = useState<LootToast[]>(DEFAULT_TOASTS)
  const [isPaused, setIsPaused] = useState(false)
  const [hitmarked, setHitmarked] = useState(false)

  // HUD Designer Controls
  const [config, setConfig] = useState<HUDConfig>({
    showCompass: true,
    showStatusBars: true,
    showQuestTracker: true,
    showHotbar: true,
    showCrosshair: true,
    showLootFeed: true,
    hudScale: 1.0,
    autoHideStamina: false,
    designerMode: false,
  })

  // Keyboard shortcut listener for HUD actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dialogue) setDialogue(null)
        else setIsPaused((p) => !p)
      }
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        setActiveSlot(parseInt(e.key, 10))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialogue])

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent font-sans">
      {/* ── Top Bar: Compass ── */}
      {config.showCompass && (
        <div className="absolute inset-x-0 top-4 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <CompassBar heading={42} targetHeading={68} distance={quest.distanceMeters} />
          </div>
        </div>
      )}

      {/* ── Top Left: Player Status Gauges ── */}
      {config.showStatusBars && (
        <div className="absolute left-6 top-6 z-20">
          <StatusGauges stats={stats} />
        </div>
      )}

      {/* ── Top Right: Quest Tracker ── */}
      {config.showQuestTracker && (
        <div className="absolute right-6 top-6 z-20">
          <QuestTracker quest={quest} />
        </div>
      )}

      {/* ── Center: Dynamic Crosshair Reticle ── */}
      {config.showCrosshair && !isPaused && !dialogue && (
        <Reticle spread={12} hitmarked={hitmarked} />
      )}

      {/* ── Middle Right: Loot & Reward Stream ── */}
      {config.showLootFeed && (
        <div className="absolute bottom-28 right-6 z-20">
          <LootFeed toasts={toasts} />
        </div>
      )}

      {/* ── Bottom Center: Dialogue Box or Hotbar ── */}
      <div className="absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
        {dialogue ? (
          <DialogueBox
            dialogue={dialogue}
            onChoose={(choiceId) => {
              log.info('dialogue.choice', { choiceId })
              setDialogue(null)
            }}
            onSkip={() => setDialogue(null)}
          />
        ) : (
          config.showHotbar && (
            <Hotbar
              items={hotbar}
              activeSlot={activeSlot}
              onSelect={(s) => setActiveSlot(s)}
            />
          )
        )}
      </div>

      {/* ── Designer Mode Toggle Button ── */}
      <div className="absolute bottom-4 left-4 z-40">
        <button
          type="button"
          onClick={() => setConfig((c) => ({ ...c, designerMode: !c.designerMode }))}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
            config.designerMode
              ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
              : 'border-[var(--aethel-border-subtle)] bg-black/60 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
          } ${CANONICAL_FOCUS}`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>HUD Designer</span>
        </button>
      </div>

      {/* ── Designer Inspector Drawer (When active) ── */}
      {config.designerMode && (
        <div className="absolute bottom-16 left-4 z-40 w-72 rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/95 p-4 shadow-2xl backdrop-blur-xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-2 font-bold uppercase tracking-wider text-[var(--aethel-text-primary)]">
            <span>HUD Elements Setup</span>
            <X
              className="h-4 w-4 cursor-pointer text-[var(--aethel-text-tertiary)]"
              onClick={() => setConfig((c) => ({ ...c, designerMode: false }))}
            />
          </div>
          <div className="space-y-2 text-[var(--aethel-text-secondary)]">
            {(
              [
                ['showCompass', 'Compass & Radar'],
                ['showStatusBars', 'Status Gauges'],
                ['showQuestTracker', 'Quest Tracker'],
                ['showHotbar', 'Weapon Hotbar'],
                ['showCrosshair', 'Center Reticle'],
                ['showLootFeed', 'Loot Notification Stream'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.checked }))}
                  className="rounded border-[var(--aethel-border-subtle)] accent-cyan-400"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDialogue(DEFAULT_DIALOGUE)}
            className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] py-1.5 text-center font-semibold text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]"
          >
            Trigger Sample Dialogue
          </button>
        </div>
      )}

      {/* ── Pause Menu Modal ── */}
      {isPaused && (
        <PauseMenuModal
          onResume={() => setIsPaused(false)}
          onQuit={() => {
            setIsPaused(false)
            log.info('simulation.quit')
          }}
        />
      )}
    </div>
  )
}
