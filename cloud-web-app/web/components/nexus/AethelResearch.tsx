'use client'

import React, { useState } from 'react'
import { Search, Globe, Shield, CheckCircle, ExternalLink, Loader2, BookOpen, Database, BarChart3 } from 'lucide-react'

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

export default function AethelResearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ResearchResult>({
    query: '',
    summary: '',
    sources: [],
    status: 'idle'
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setResult({ ...result, query, status: 'searching' })

    // Simulação de pesquisa profunda
    setTimeout(() => {
      setResult(prev => ({ ...prev, status: 'analyzing' }))
      
      setTimeout(() => {
        setResult({
          query,
          status: 'complete',
          summary: `Análise profunda concluída para "${query}". Identificamos padrões AAA em 15 fontes verificadas. O Aethel Engine supera Manus e Perplexity através da verificação cruzada de dados técnicos e validação de contexto em tempo real.`,
          sources: [
            { id: '1', title: 'Aethel Technical Whitepaper', url: 'https://aethel.ai/docs', credibility: 0.98, verified: true, snippet: 'Definição da arquitetura de superação para motores de IA.' },
            { id: '2', title: 'Market Analysis 2026', url: 'https://research.market', credibility: 0.92, verified: true, snippet: 'Comparativo entre Manus, Perplexity e Aethel.' },
            { id: '3', title: 'Unreal Engine 6 Roadmap', url: 'https://unreal.com', credibility: 0.95, verified: true, snippet: 'Gaps técnicos em motores 3D tradicionais.' }
          ]
        })
      }, 2000)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
          <Search className="text-blue-400" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Aethel Research</h2>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Deep Verification Engine</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
        <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-2 pl-4">
          <Globe className="text-zinc-500 mr-3" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisa profunda verificada..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none py-2"
          />
          <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all ml-2">
            <Search size={18} />
          </button>
        </div>
      </form>

      {result.status !== 'idle' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Progress Indicator */}
          {result.status !== 'complete' && (
            <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl border-dashed">
              <Loader2 className="text-blue-500 animate-spin" size={20} />
              <div className="flex-1">
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-blue-500 transition-all duration-1000 ${result.status === 'searching' ? 'w-1/3' : 'w-2/3'}`}></div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-tighter">
                  {result.status === 'searching' ? 'Vasculhando a Web...' : 'Analisando Credibilidade e Síntese...'}
                </p>
              </div>
            </div>
          )}

          {/* Summary Result */}
          {result.status === 'complete' && (
            <>
              <div className="p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield size={64} className="text-blue-400" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Síntese Verificada AAA</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-200">{result.summary}</p>
              </div>

              {/* Sources */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen size={14} /> Fontes de Alta Credibilidade
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {result.sources.map(source => (
                    <div key={source.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">{source.title}</span>
                          {source.verified && <Shield size={12} className="text-blue-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] font-mono text-zinc-400">
                            {Math.round(source.credibility * 100)}% Confiança
                          </div>
                          <ExternalLink size={12} className="text-zinc-600" />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-2">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Database size={14} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Dados Brutos</span>
                  </div>
                  <div className="text-lg font-bold text-zinc-200">1.2 TB</div>
                  <div className="text-[9px] text-zinc-600">Indexados em tempo real</div>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={14} className="text-orange-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Latência</span>
                  </div>
                  <div className="text-lg font-bold text-zinc-200">450ms</div>
                  <div className="text-[9px] text-zinc-600">Processamento paralelo</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
