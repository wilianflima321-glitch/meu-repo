'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Brain, Search, Code, Eye, ChevronDown, ChevronUp, X, Play, Pause, SkipForward } from 'lucide-react'

interface AIStep {
  id: string
  type: 'thinking' | 'search' | 'code' | 'preview' | 'complete'
  message: string
  details: string
  duration: number
  timestamp: number
}

interface AIViewportAssistantProps {
  onAction?: (action: string) => void
  onGenerate?: (prompt: string) => void
}

export function AIViewportAssistant({ onAction = () => undefined, onGenerate = () => undefined }: AIViewportAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<AIStep | null>(null)
  const [steps, setSteps] = useState<AIStep[]>([])
  const [prompt, setPrompt] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  const simulateAIProcess = async (userPrompt: string) => {
    setIsProcessing(true)
    setSteps([])
    
    const processSteps: AIStep[] = [
      {
        id: '1',
        type: 'thinking',
        message: 'Analyzing request...',
        details: userPrompt,
        duration: 1500,
        timestamp: Date.now(),
      },
      {
        id: '2',
        type: 'search',
        message: 'Researching references...',
        details: 'Searching the knowledge base...',
        duration: 1500,
        timestamp: Date.now(),
      },
      {
        id: '3',
        type: 'code',
        message: 'Generating 3D code...',
        details: 'Creating geometry and materials...',
        duration: 1500,
        timestamp: Date.now(),
      },
      {
        id: '4',
        type: 'preview',
        message: 'Rendering preview...',
        details: 'Applying lighting and textures...',
        duration: 1500,
        timestamp: Date.now(),
      },
      {
        id: '5',
        type: 'complete',
        message: 'Complete!',
        details: '3D object generated successfully.',
        duration: 1500,
        timestamp: Date.now(),
      },
    ]

    for (const step of processSteps) {
      setCurrentStep(step)
      setSteps(prev => [...prev, step])
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    setIsProcessing(false)
    setCurrentStep(null)
  }

  const handleGenerate = () => {
    if (!prompt.trim()) return
    simulateAIProcess(prompt)
    setPrompt('')
  }

  return (
    <div className="flex flex-col bg-[var(--aethel-surface-primary)] border-l border-[var(--aethel-border-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isProcessing ? 'bg-[var(--aethel-primary)] animate-pulse' : 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]'}`}>
            <Sparkles className={`w-4 h-4 ${isProcessing ? 'text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-primary-light)]'}`} />
          </div>
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">AI Assistant</span>
          {isProcessing && (
            <span className="text-xs text-[var(--aethel-info-light)]">Processing...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg transition-colors ${
              isPlaying ?
                 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Process Visualization */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {steps.length === 0 && !isProcessing ? (
              <div className="flex h-full items-center justify-center text-[var(--aethel-text-tertiary)] text-sm">
                <div className="text-center">
                  <Brain className="w-12 h-12 mx-auto mb-3 text-[var(--aethel-text-quaternary)]" />
                  <p>Describe what you want to create</p>
                  <p className="text-xs mt-1">Ex: &quot;Crie um cubo vermelho girando&quot;</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const isCurrent = currentStep?.id === step.id
                  return (
                    <div
                      key={step.id}
                      className={`rounded-lg border p-3 transition-all ${
                        isCurrent ?
                           'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]'
                          : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${
                          step.type === 'thinking' ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]' :
                          step.type === 'search' ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]' :
                          step.type === 'code' ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]' :
                          step.type === 'preview' ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)]' :
                          'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]'
                        }`}>
                          {step.type === 'thinking' && <Brain className="w-3.5 h-3.5 text-[var(--aethel-info-light)]" />}
                          {step.type === 'search' && <Search className="w-3.5 h-3.5 text-[var(--aethel-primary-light)]" />}
                          {step.type === 'code' && <Code className="w-3.5 h-3.5 text-[var(--aethel-warning-light)]" />}
                          {step.type === 'preview' && <Eye className="w-3.5 h-3.5 text-[var(--aethel-success-light)]" />}
                          {step.type === 'complete' && <Sparkles className="w-3.5 h-3.5 text-[var(--aethel-primary-light)]" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[var(--aethel-text-primary)]">{step.message}</span>
                            {isCurrent && (
                              <span className="text-xs text-[var(--aethel-primary-light)] animate-pulse">Em progresso</span>
                            )}
                          </div>
                          {step.details && (
                            <p className="text-xs text-[var(--aethel-text-secondary)]">{step.details}</p>
                          )}
                        </div>
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-[var(--aethel-primary-light)] animate-pulse" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Descreva o objeto 3D..."
                disabled={isProcessing}
                className="flex-1 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isProcessing || !prompt.trim()}
                className="rounded-lg bg-[var(--aethel-primary)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setPrompt('Crie um cubo vermelho girando')}
                className="flex-1 px-2 py-1.5 text-xs rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                Cubo girando
              </button>
              <button
                type="button"
                onClick={() => setPrompt('Create a sphere with a metallic material')}
                className="flex-1 px-2 py-1.5 text-xs rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                Metallic sphere
              </button>
              <button
                type="button"
                onClick={() => setPrompt('Crie uma luz direcional com sombras')}
                className="flex-1 px-2 py-1.5 text-xs rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                Luz com sombras
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
