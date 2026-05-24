'use client'

import React, { useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  CheckCircle,
  Copy,
  Database,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  Send,
  Shield,
} from 'lucide-react'
import { analytics } from '@/lib/analytics'
import { buildResearchPrompt, saveResearchHandoff, type ResearchHandoffPayload } from '@/lib/research-handoff'

interface Source {
  id: string
  title: string
  url: string
  credibility: number
  snippet: string
  verified: boolean
}

interface ResearchResult {
  query: string
  summary: string
  sources: Source[]
  status: 'idle' | 'searching' | 'analyzing' | 'complete'
}

const PRESET_SOURCES: Source[] = [
  {
    id: '1',
    title: 'Cursor Background Agents',
    url: 'https://docs.cursor.com/en/background-agents',
    credibility: 0.96,
    verified: true,
    snippet: 'Async agent status, takeover, branch handoff, and security disclosure benchmark.',
  },
  {
    id: '2',
    title: 'OpenAI Realtime WebRTC',
    url: 'https://platform.openai.com/docs/guides/realtime-webrtc',
    credibility: 0.95,
    verified: true,
    snippet: 'Voice-agent session state, ephemeral credentials, tool events, and interruption path.',
  },
  {
    id: '3',
    title: 'Gemini Live API capabilities',
    url: 'https://ai.google.dev/gemini-api/docs/live-api/capabilities',
    credibility: 0.94,
    verified: true,
    snippet: 'Live audio/video/text expectations, barge-in, transcripts, and tool-use capability state.',
  },
]

function toHandoffPayload(result: ResearchResult): ResearchHandoffPayload {
  return {
    query: result.query,
    summary: result.summary,
    generatedAt: new Date().toISOString(),
    sources: result.sources.map((source) => ({
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      credibility: source.credibility,
    })),
  }
}

export default function AethelResearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ResearchResult>({
    query: '',
    summary: '',
    sources: [],
    status: 'idle',
  })
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null)

  const canHandoff = result.status === 'complete' && result.sources.length > 0
  const handoffPayload = useMemo(() => (canHandoff ? toHandoffPayload(result) : null), [canHandoff, result])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) return

    setResult((prev) => ({ ...prev, query: value, status: 'searching' }))
    setHandoffMessage(null)
    analytics?.track?.('ai', 'ai_chat', { metadata: { source: 'nexus-research', queryLength: value.length } })

    window.setTimeout(() => {
      setResult((prev) => ({ ...prev, status: 'analyzing' }))

      window.setTimeout(() => {
        setResult({
          query: value,
          status: 'complete',
          summary:
            `Draft research package prepared for "${value}". Sources are curated references and the handoff stays review-first before any execution.`,
          sources: PRESET_SOURCES,
        })
      }, 1200)
    }, 900)
  }

  const handleCopyPrompt = async () => {
    if (!handoffPayload) return
    const prompt = buildResearchPrompt(handoffPayload)
    try {
      await navigator.clipboard.writeText(prompt)
      setHandoffMessage('Research prompt copied.')
      analytics?.track?.('ai', 'ai_chat', { metadata: { source: 'nexus-research-copy-prompt' } })
    } catch {
      setHandoffMessage('Could not copy prompt. Clipboard permission blocked.')
    }
  }

  const handleOpenInIde = () => {
    if (!handoffPayload) return
    const saved = saveResearchHandoff(handoffPayload)
    if (!saved) {
      setHandoffMessage('Could not prepare handoff payload.')
      return
    }
    analytics?.track?.('ai', 'ai_chat', {
      metadata: {
        source: 'nexus-research-handoff',
        sources: handoffPayload.sources.length,
      },
    })
    window.location.assign('/ide?entry=ai&source=research')
  }

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)] p-2">
          <Search className="text-[var(--aethel-info-light)]" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Research Workspace</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--aethel-text-quaternary)]">Plan, sources, replay, handoff</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2" aria-label="Research runboard">
        {[
          ['Plan', result.query ? 'ready' : 'waiting'],
          ['Sources', result.sources.length ? `${result.sources.length}` : 'held'],
          ['Handoff', canHandoff ? 'review' : 'blocked'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">{label}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--aethel-text-secondary)]">{value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSearch} className="group relative">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] opacity-20 blur transition duration-500 group-focus-within:opacity-50"></div>
        <div className="relative flex items-center rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-2 pl-4">
          <Globe className="mr-3 text-[var(--aethel-text-quaternary)]" size={18} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask for market, source, or implementation evidence..."
            className="flex-1 bg-transparent py-2 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:outline-none"
          />
          <button type="submit" className="ml-2 rounded-lg bg-[var(--aethel-primary)] p-2 text-[var(--aethel-text-primary)] transition-all hover:brightness-110">
            <Search size={18} />
          </button>
        </div>
      </form>

      {result.status !== 'idle' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
          {result.status !== 'complete' && (
            <div className="rounded-xl border border-[var(--aethel-border-primary)] border-dashed bg-[var(--aethel-surface-secondary)]/50 p-4">
              <div className="flex items-center gap-4">
                <Loader2 className="animate-spin text-[var(--aethel-info)]" size={20} />
                <div className="flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--aethel-surface-tertiary)]">
                    <div
                      className={`h-full bg-[var(--aethel-info)] transition-all duration-1000 ${
                        result.status === 'searching' ? 'w-1/3' : 'w-2/3'
                      }`}
                    ></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-tighter text-[var(--aethel-text-quaternary)]">
                    {result.status === 'searching' ? 'Collecting sources...' : 'Scoring credibility and synthesis...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {result.status === 'complete' && (
            <>
              <div className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] p-5">
                <div className="absolute right-0 top-0 p-3 opacity-10 transition-opacity group-hover:opacity-20">
                  <Shield size={64} className="text-[var(--aethel-info-light)]" />
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-[var(--aethel-success)]" />
                  <span className="text-[10px] font-bold uppercase text-[var(--aethel-success)]">Review-first research package</span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--aethel-text-primary)]">{result.summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInIde}
                  className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)]"
                >
                  <Send size={14} />
                  Open in IDE
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]/70 px-3 py-2 text-xs font-semibold text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)]"
                >
                  <Copy size={14} />
                  Copy prompt
                </button>
                {handoffMessage && <span className="text-xs text-[var(--aethel-text-tertiary)]">{handoffMessage}</span>}
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--aethel-text-quaternary)]">
                  <BookOpen size={14} /> High-confidence sources
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {result.sources.map((source) => (
                    <div
                      key={source.id}
                      className="group rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 transition-colors hover:border-[var(--aethel-border-primary)]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--aethel-text-primary)] transition-colors group-hover:text-[var(--aethel-info-light)]">
                            {source.title}
                          </span>
                          {source.verified && <Shield size={12} className="text-[var(--aethel-info)]" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--aethel-text-tertiary)]">
                            {Math.round(source.credibility * 100)}% confidence
                          </div>
                          <a href={source.url} target="_blank" rel="noreferrer" className="text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-[var(--aethel-text-quaternary)]">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Database size={14} className="text-[var(--aethel-info-light)]" />
                    <span className="text-[10px] font-bold uppercase text-[var(--aethel-text-quaternary)]">Artifacts</span>
                  </div>
                  <div className="text-lg font-bold text-[var(--aethel-text-primary)]">Held</div>
                  <div className="text-[9px] text-[var(--aethel-text-quaternary)]">Saved only after user review</div>
                </div>
                <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BarChart3 size={14} className="text-[var(--aethel-warning-light)]" />
                    <span className="text-[10px] font-bold uppercase text-[var(--aethel-text-quaternary)]">Cost</span>
                  </div>
                  <div className="text-lg font-bold text-[var(--aethel-text-primary)]">Review</div>
                  <div className="text-[9px] text-[var(--aethel-text-quaternary)]">Estimate before long runs</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}


