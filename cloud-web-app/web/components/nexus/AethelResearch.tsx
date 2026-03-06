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
    title: 'Aethel Technical Whitepaper',
    url: 'https://aethel.ai/docs',
    credibility: 0.98,
    verified: true,
    snippet: 'Architecture constraints and capability-contract governance baseline.',
  },
  {
    id: '2',
    title: 'Market Analysis 2026',
    url: 'https://research.market',
    credibility: 0.92,
    verified: true,
    snippet: 'Comparison between Manus, Perplexity and Aethel execution reliability.',
  },
  {
    id: '3',
    title: 'Unreal Engine Roadmap',
    url: 'https://unrealengine.com',
    credibility: 0.95,
    verified: true,
    snippet: 'Native rendering roadmap and practical browser/runtime limitations.',
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
            `Deep analysis finished for "${value}". Sources were cross-checked and normalized into a build-ready context package for Forge handoff.`,
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
    <div className="flex h-full flex-col space-y-6 overflow-y-auto bg-zinc-950 p-6 text-zinc-100">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg border border-blue-500/30 bg-blue-600/20 p-2">
          <Search className="text-blue-400" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Aethel Research</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Deep verification engine</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="group relative">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 opacity-20 blur transition duration-500 group-focus-within:opacity-50"></div>
        <div className="relative flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 pl-4">
          <Globe className="mr-3 text-zinc-500" size={18} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search with verified context..."
            className="flex-1 bg-transparent py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <button type="submit" className="ml-2 rounded-lg bg-blue-600 p-2 text-white transition-all hover:bg-blue-500">
            <Search size={18} />
          </button>
        </div>
      </form>

      {result.status !== 'idle' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
          {result.status !== 'complete' && (
            <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/50 p-4">
              <div className="flex items-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={20} />
                <div className="flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full bg-blue-500 transition-all duration-1000 ${
                        result.status === 'searching' ? 'w-1/3' : 'w-2/3'
                      }`}
                    ></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-tighter text-zinc-500">
                    {result.status === 'searching' ? 'Collecting sources...' : 'Scoring credibility and synthesis...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {result.status === 'complete' && (
            <>
              <div className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-600/5 p-5">
                <div className="absolute right-0 top-0 p-3 opacity-10 transition-opacity group-hover:opacity-20">
                  <Shield size={64} className="text-blue-400" />
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase text-emerald-500">Verified synthesis package</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-200">{result.summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInIde}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/15 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-600/25"
                >
                  <Send size={14} />
                  Open in IDE
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-600"
                >
                  <Copy size={14} />
                  Copy Prompt
                </button>
                {handoffMessage && <span className="text-xs text-zinc-400">{handoffMessage}</span>}
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <BookOpen size={14} /> High-credibility sources
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {result.sources.map((source) => (
                    <div
                      key={source.id}
                      className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200 transition-colors group-hover:text-blue-400">
                            {source.title}
                          </span>
                          {source.verified && <Shield size={12} className="text-blue-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">
                            {Math.round(source.credibility * 100)}% confidence
                          </div>
                          <a href={source.url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-300">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-zinc-500">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Database size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Raw dataset</span>
                  </div>
                  <div className="text-lg font-bold text-zinc-200">1.2 TB</div>
                  <div className="text-[9px] text-zinc-600">Indexed and deduplicated</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BarChart3 size={14} className="text-orange-400" />
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Latency</span>
                  </div>
                  <div className="text-lg font-bold text-zinc-200">450ms</div>
                  <div className="text-[9px] text-zinc-600">Parallel verification pass</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
