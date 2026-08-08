'use client'

/**
 * ResearchProgressCard — live step-by-step Deep Research progress
 * shown inline in AI messages during a web research run.
 *
 * Mimics the Manus Research UX: each step appears with a micro-animation,
 * completed steps get a green check, and the active step has a spinning loader.
 */

// @aethel-heavy-async-boundary
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Globe, Loader2, Search, Shield } from 'lucide-react'

export type ResearchStepStatus = 'pending' | 'active' | 'done' | 'error'

export interface ResearchStep {
  id: string
  label: string
  detail?: string
  status: ResearchStepStatus
  icon?: 'search' | 'globe' | 'check' | 'shield'
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  search: <Search className="h-3 w-3" />,
  globe:  <Globe className="h-3 w-3" />,
  check:  <CheckCircle2 className="h-3 w-3" />,
  shield: <Shield className="h-3 w-3" />,
}

const STATUS_COLORS: Record<ResearchStepStatus, string> = {
  pending: 'var(--aethel-text-quaternary)',
  active:  'var(--aethel-neon-cyan)',
  done:    'var(--aethel-success)',
  error:   'var(--aethel-error-light)',
}

/** Alpha-blended status colour for backgrounds/borders (CSS custom props can't be string-concatenated with a hex alpha suffix). */
function statusColorMix(status: ResearchStepStatus, percent: number): string {
  return `color-mix(in srgb, ${STATUS_COLORS[status]} ${percent}%, transparent)`
}

interface ResearchProgressCardProps {
  steps: ResearchStep[]
  /** Optional total sources count (shown when research completes) */
  sourcesFound?: number
  /** Whether the research is still running */
  isRunning?: boolean
}

export function ResearchProgressCard({
  steps,
  sourcesFound,
  isRunning = false,
}: ResearchProgressCardProps) {
  const doneCount = steps.filter((s) => s.status === 'done').length
  const progress = steps.length > 0 ? doneCount / steps.length : 0

  return (
    <div
      className="my-2 overflow-hidden rounded-xl"
      style={{
        border: '1px solid rgba(var(--aethel-neon-cyan-rgb), 0.18)',
        background: 'rgba(var(--aethel-surface-primary-rgb), 0.60)',
        backdropFilter: 'blur(12px)',
      }}
      role="status"
      aria-label="Deep Research progress"
      aria-live="polite"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid rgba(var(--aethel-neon-cyan-rgb), 0.10)' }}
      >
        <Globe className="h-3.5 w-3.5 text-[var(--aethel-neon-cyan)]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-neon-cyan)]">
          Deep Research
        </span>
        {isRunning && (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-[var(--aethel-text-quaternary)]" aria-hidden />
        )}
        {!isRunning && sourcesFound !== undefined && (
          <span className="ml-auto rounded border border-[rgba(var(--aethel-neon-emerald-rgb), 0.28)] bg-[rgba(var(--aethel-neon-emerald-rgb), 0.10)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--aethel-neon-emerald)]">
            {sourcesFound} sources
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--aethel-bg)]">
        <motion.div
          className="h-full"
          style={{
            background: isRunning
              ? 'linear-gradient(90deg, var(--aethel-neon-cyan), var(--aethel-accent))'
              : 'var(--aethel-success)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          aria-hidden
        />
      </div>

      {/* Steps */}
      <div className="space-y-0 px-3 py-2">
        <AnimatePresence initial={false}>
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="flex items-start gap-2.5 py-1.5"
            >
              {/* Status indicator */}
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
                style={{
                  color: STATUS_COLORS[step.status],
                  background: statusColorMix(step.status, 18),
                  border: `1px solid ${statusColorMix(step.status, 30)}`,
                }}
              >
                {step.status === 'active' ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : step.status === 'done' ? (
                  <CheckCircle2 className="h-2.5 w-2.5" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[step.status] }} />
                )}
              </span>

              {/* Label + detail */}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-medium leading-5"
                  style={{
                    color: step.status === 'done'
                      ? 'var(--aethel-text-tertiary)'
                      : step.status === 'active'
                      ? 'var(--aethel-text-secondary)'
                      : 'var(--aethel-text-quaternary)',
                    fontFamily: step.status !== 'pending' ? "'Geist Mono', monospace" : undefined,
                  }}
                >
                  {step.label}
                </div>
                {step.detail && step.status !== 'pending' && (
                  <div className="mt-0.5 truncate text-[9px] text-[var(--aethel-text-quaternary)]">{step.detail}</div>
                )}
              </div>

              {/* Step icon */}
              {step.icon && (
                <span className="mt-0.5 shrink-0 text-[var(--aethel-text-quaternary)]">
                  {STEP_ICONS[step.icon]}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Preset step factory ──────────────────────────────────────────────────────

/** Create a standard "web search" step sequence from a query string */
export function buildWebSearchSteps(query: string, sourcesCount = 5): ResearchStep[] {
  return [
    { id: 'search',  label: 'Searching Web…',          detail: `"${query}"`,          status: 'active', icon: 'search' },
    { id: 'fetch',   label: `Parsing ${sourcesCount} sources…`, detail: undefined,     status: 'pending', icon: 'globe'  },
    { id: 'verify',  label: 'Verifying Citations…',    detail: undefined,              status: 'pending', icon: 'shield' },
    { id: 'compose', label: 'Composing answer…',       detail: undefined,              status: 'pending', icon: 'check'  },
  ]
}
