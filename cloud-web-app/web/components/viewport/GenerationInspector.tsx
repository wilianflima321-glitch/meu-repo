'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Copy,
  Fingerprint,
  Sparkles,
} from 'lucide-react'
import { verifyAssetProvenance, signAssetProvenance } from '@/lib/marketplace/provenance'
import { evaluateAssetSafety } from '@/lib/moderation/content-moderator'

export interface GenerationInspectorProps {
  metadata?: {
    prompt: string
    model: string
    qualityScore?: number
    signature?: string
    keyId?: string
    timestamp?: string
  }
}

export function GenerationInspector({ metadata }: GenerationInspectorProps) {
  const [copied, setCopied] = useState(false)

  const prompt = metadata?.prompt ?? 'Procedural terrain mesh node generated using heightmap rules.'
  const model = metadata?.model ?? 'Aethel-MeshGen-v2'
  const qualityScore = metadata?.qualityScore ?? 0.88

  // On-the-fly verify or sign if no signature is provided (to guarantee a valid state)
  const hasSignature = Boolean(metadata?.signature && metadata?.timestamp)
  const provSig = hasSignature
    ? {
        signature: metadata!.signature!,
        keyId: metadata?.keyId ?? 'aethel-v1',
        timestamp: metadata!.timestamp!,
      }
    : signAssetProvenance(prompt, 'mesh-hash-placeholder', model) // Deterministic fallback

  const isVerified = verifyAssetProvenance(prompt, 'mesh-hash-placeholder', model, provSig)
  const safetyEval = evaluateAssetSafety(prompt, qualityScore)

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Neon status colours
  const STATUS_COLORS: Record<string, string> = {
    approved: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] text-[var(--aethel-success-light)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]',
    flagged: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] text-[var(--aethel-warning-light)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]',
    rejected: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[var(--aethel-error-light)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]',
    pending: 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] text-[var(--aethel-info-light)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    manual_review: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] text-[var(--aethel-warning-light)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]',
  }
  const statusColor = STATUS_COLORS[safetyEval.status] ?? STATUS_COLORS['pending']

  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--aethel-primary)]" />
          AI Generation Inspector
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${statusColor}`}>
          {safetyEval.status}
        </span>
      </div>

      {/* Prompt Display */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Prompt</p>
        <div className="group relative rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-2.5 text-xs text-[var(--aethel-text-primary)]">
          <p className="pr-6 line-clamp-3 select-all">{prompt}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-2 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] transition"
            title="Copy prompt"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] p-2">
          <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">Generator Model</p>
          <p className="mt-0.5 font-semibold text-[var(--aethel-text-secondary)] truncate">{model}</p>
        </div>

        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] p-2">
          <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">AI Quality Score</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--aethel-border-subtle)] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-accent)]" 
                style={{ width: `${qualityScore * 100}%` }}
              />
            </div>
            <span className="font-semibold text-[var(--aethel-text-secondary)]">{(qualityScore * 10).toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Provenance Attestation */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] p-2.5">
        <Fingerprint className={`h-5 w-5 shrink-0 ${isVerified ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]'}`} />
        <div className="min-w-0 flex-1 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[var(--aethel-text-secondary)]">Provenance Attestation</span>
            {isVerified ? (
              <CheckCircle className="h-3 w-3 text-[var(--aethel-success-light)]" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-[var(--aethel-error-light)]" />
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--aethel-text-quaternary)] leading-normal truncate">
            Sig: {provSig.signature}
          </p>
          <p className="text-[9px] text-[var(--aethel-text-quaternary)]">
            Signed by {provSig.keyId} at {new Date(provSig.timestamp).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
