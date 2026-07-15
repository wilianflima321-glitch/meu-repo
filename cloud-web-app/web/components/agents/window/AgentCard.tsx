'use client'

import type { ReactNode } from 'react'
import { AlertTriangle, Bot, CheckCircle2, Lock, Pause } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { AgentFleetMemberSnapshot, AgentFleetMemberStatus } from './types'

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const statusTone: Record<AgentFleetMemberStatus, string> = {
  ready: 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] text-[var(--aethel-success-light)]',
  attention: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_9%,transparent)] text-[var(--aethel-warning-light)]',
  blocked: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_9%,transparent)] text-[var(--aethel-error-light)]',
  paused: 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-tertiary)]',
}

const statusIcon: Record<AgentFleetMemberStatus, ReactNode> = {
  ready: <CheckCircle2 className="h-3.5 w-3.5" />,
  attention: <AlertTriangle className="h-3.5 w-3.5" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5" />,
  paused: <Pause className="h-3.5 w-3.5" />,
}

/** CSS var for the LED dot glow colour, keyed by execution status. */
const LED_COLOR: Record<AgentFleetMemberStatus, string> = {
  ready: 'var(--aethel-success)',
  attention: 'var(--aethel-warning)',
  blocked: 'var(--aethel-error)',
  paused: 'var(--aethel-text-tertiary)',
}

/** Tailwind animation class for the LED pulse — active agents get a faster beat. */
const LED_ANIMATION: Record<AgentFleetMemberStatus, string> = {
  ready: 'animate-pulse',
  attention: '[animation:pulse_0.9s_ease-in-out_infinite]',
  blocked: '[animation:pulse_0.6s_ease-in-out_infinite]',
  paused: '',
}

// ---------------------------------------------------------------------------
// Agent role → bubble label mapping
// (infers from the agent name / lane when no explicit role is provided)
// ---------------------------------------------------------------------------

function inferRoleBubble(agent: string, lane: string): string | null {
  const lower = (agent + ' ' + lane).toLowerCase()
  if (lower.includes('qa') || lower.includes('quality') || lower.includes('test')) return 'QA'
  if (lower.includes('sys') || lower.includes('system') || lower.includes('ops')) return 'SYS'
  if (lower.includes('code') || lower.includes('dev') || lower.includes('engineer')) return 'DEV'
  if (lower.includes('research') || lower.includes('browse') || lower.includes('navigation')) return 'RES'
  if (lower.includes('render') || lower.includes('asset') || lower.includes('media')) return 'ART'
  if (lower.includes('plan') || lower.includes('director') || lower.includes('coord')) return 'DIR'
  return null
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated LED indicator dot for the cockpit status panel. */
function AgentLED({ status }: { status: AgentFleetMemberStatus }) {
  const color = LED_COLOR[status]
  const pulse = LED_ANIMATION[status]
  return (
    <span
      aria-hidden="true"
      className={cn('relative flex h-2.5 w-2.5 flex-shrink-0 items-center justify-center rounded-full', pulse)}
      style={{
        background: color,
        transition: 'background 400ms ease, box-shadow 400ms ease',
        boxShadow: status !== 'paused'
          ? `0 0 0 2px color-mix(in_srgb,${color} 20%,transparent), 0 0 10px color-mix(in_srgb,${color} 65%,transparent)`
          : 'none',
      }}
    />
  )
}

/** Small role / context bubble that floats beside the agent name. */
function RoleBubble({ label }: { label: string }) {
  const palette: Record<string, string> = {
    QA: 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)]',
    SYS: 'bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)]',
    DEV: 'bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)] border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)]',
    RES: 'bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_12%,transparent)] text-[var(--aethel-neon-cyan)] border-[color-mix(in_srgb,var(--aethel-neon-cyan)_20%,transparent)]',
    ART: 'bg-[color-mix(in_srgb,var(--aethel-neon-amber)_12%,transparent)] text-[var(--aethel-neon-amber)] border-[color-mix(in_srgb,var(--aethel-neon-amber)_20%,transparent)]',
    DIR: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]',
  }
  const cls = palette[label] ?? 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)] border-[var(--aethel-border-subtle)]'
  return (
    <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest leading-none', cls)}>
      [{label}]
    </span>
  )
}

// ---------------------------------------------------------------------------
// AgentCard
// ---------------------------------------------------------------------------

type AgentCardProps = {
  member: AgentFleetMemberSnapshot
}

export function AgentCard({ member }: AgentCardProps) {
  const roleBubble = inferRoleBubble(member.agent, member.lane)

  return (
    <article
      className={cn(
        'relative rounded-xl border bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_26%,transparent)] p-3',
        'transition-all duration-300',
        member.status === 'ready'
          ? 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] shadow-[0_0_0_1px_rgba(34,197,94,0.07),0_0_20px_rgba(34,197,94,0.04)]'
          : member.status === 'blocked'
            ? 'border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)] shadow-[0_0_0_1px_rgba(239,68,68,0.07)]'
            : member.status === 'attention'
              ? 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] shadow-[0_0_0_1px_rgba(245,158,11,0.07)]'
              : 'border-[var(--aethel-border-subtle)]',
      )}
    >
      {/* LED strip — top-left accent */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{ background: LED_COLOR[member.status], opacity: member.status === 'paused' ? 0.25 : 0.75 }}
      />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* LED micro-pulse dot */}
            <AgentLED status={member.status} />
            <Bot className="h-4 w-4 text-[var(--aethel-primary-light)]" />
            <h4 className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{member.agent}</h4>
            {/* Role bubble */}
            {roleBubble && <RoleBubble label={roleBubble} />}
          </div>
          <p className="mt-1 pl-[22px] text-xs text-[var(--aethel-text-tertiary)]">{member.lane}</p>
        </div>

        {/* Status badge */}
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]', statusTone[member.status])}>
          {statusIcon[member.status]}
          {member.status}
        </span>
      </div>

      <p className="mt-3 pl-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">{member.nextAction}</p>

      <div className="mt-3 flex flex-wrap gap-2 pl-3 text-[10px] text-[var(--aethel-text-tertiary)]">
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
          {member.ownedSurfaceCount} surfaces
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
          <Lock className="h-3 w-3" />
          {member.activeLockCount} locks
        </span>
        {member.staleSurfaceCount > 0 ? (
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] px-2 py-1 text-[var(--aethel-warning-light)]">
            {member.staleSurfaceCount} stale
          </span>
        ) : null}
      </div>
    </article>
  )
}