'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Lazy load simple 3D preview component (without required complex props)
const SimpleMini3DPreview = dynamic(
  () => import('./SimpleMini3DPreview'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 text-sm">Carregando preview 3D...</div>
      </div>
    )
  }
)

interface MiniPreviewProps {
  isExpanded: boolean
  onToggleExpand: () => void
  aiActivity: string
  suggestions: string[]
  onAcceptSuggestion: (suggestion: string) => void
}

export default function MiniPreview({ isExpanded, onToggleExpand, aiActivity, suggestions, onAcceptSuggestion }: MiniPreviewProps) {
  const [previewError, setPreviewError] = useState<string | null>(null)

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl overflow-hidden transition-all duration-300 shadow-xl ${
      isExpanded ? 'fixed inset-4 z-50' : 'w-72 h-56'
    }`}>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <h4 className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI Live Preview
        </h4>
        <button
          onClick={onToggleExpand}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
          title={isExpanded ? 'Minimizar' : 'Expandir'}
        >
          {isExpanded ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      <div className={`${isExpanded ? 'flex h-[calc(100%-44px)]' : 'h-[calc(100%-44px)]'}`}>
        {/* AI Activity & Suggestions Panel */}
        <div className={`p-3 overflow-y-auto ${isExpanded ? 'w-80 border-r border-slate-700' : 'h-full'}`}>
          <div className="text-slate-400 text-xs mb-3">
            <div className="font-semibold text-slate-300 mb-1">Atividade IA:</div>
            <div className="text-slate-500">{aiActivity || 'Aguardando comandos...'}</div>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-slate-300 text-xs font-semibold">Sugestões:</div>
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg text-xs group hover:bg-slate-700 transition-colors">
                  <span className="text-slate-300 flex-1">{suggestion}</span>
                  <button
                    onClick={() => onAcceptSuggestion(suggestion)}
                    className="bg-emerald-600 px-2 py-1 rounded text-white hover:bg-emerald-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Aplicar
                  </button>
                </div>
              ))}
            </div>
          )}

          {!suggestions.length && !aiActivity && (
            <div className="text-slate-600 text-xs text-center py-4">
              Preview em tempo real das alterações feitas pela IA
            </div>
          )}
        </div>

        {/* 3D Preview Canvas (only in expanded mode) */}
        {isExpanded && (
          <div className="flex-1 bg-slate-950">
            {previewError ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="text-red-400 text-sm mb-2">Erro ao carregar preview</div>
                  <div className="text-slate-500 text-xs">{previewError}</div>
                  <button
                    onClick={() => setPreviewError(null)}
                    className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : (
              <Suspense fallback={
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full" />
                </div>
              }>
                <div className="h-full w-full">
                  <SimpleMini3DPreview />
                </div>
              </Suspense>
            )}
          </div>
        )}
      </div>
    </div>
  )
}