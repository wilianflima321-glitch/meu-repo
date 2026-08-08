'use client'

import React, { useState, useEffect } from 'react'
import { Download, Loader2, FileBox, CheckCircle, XCircle, Package, Layers, Globe, Cpu, ChevronRight, X } from 'lucide-react'
import { createComponentLogger } from '@/lib/observability/logger'
import { getAuthHeaders } from '@/lib/ai/change-feedback-client'

const log = createComponentLogger('ExportModal')

export interface ExportModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'glb' | 'usdz'
type ExportStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

interface FormatOption {
  id: ExportFormat
  label: string
  sublabel: string
  description: string
  icon: React.ComponentType<any>
  accentColor: string
  glowColor: string
  tags: string[]
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'glb',
    label: 'GLB',
    sublabel: 'Binary glTF 2.0',
    description: 'Universal web standard. Maximum compatibility across engines, browsers and XR platforms.',
    icon: Globe,
    accentColor: 'var(--aethel-primary)',
    glowColor: 'color-mix(in srgb, var(--aethel-primary) 20%, transparent)',
    tags: ['Web', 'Three.js', 'Babylon.js', 'AR'],
  },
  {
    id: 'usdz',
    label: 'USDZ',
    sublabel: 'Universal Scene Desc.',
    description: 'Native format for Apple AR Quick Look and NVIDIA Omniverse pipelines.',
    icon: Package,
    accentColor: 'var(--aethel-accent)',
    glowColor: 'color-mix(in srgb, var(--aethel-accent) 20%, transparent)',
    tags: ['iOS', 'macOS', 'Omniverse'],
  },
]

const PIPELINE_STAGES = [
  { id: 'compile', label: 'Compiling Assets', detail: 'Baking geometry and materials' },
  { id: 'optimize', label: 'Optimizing', detail: 'Mesh compression & LOD generation' },
  { id: 'pack', label: 'Packaging', detail: 'Bundling textures and buffers' },
  { id: 'upload', label: 'Uploading', detail: 'Transferring to CDN' },
]

export function ExportModal({ projectId, isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('glb')
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [pollUrl, setPollUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stageIndex, setStageIndex] = useState(0)
  const [progressPct, setProgressPct] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle')
      setJobId(null)
      setPollUrl(null)
      setDownloadUrl(null)
      setErrorMsg(null)
      setStageIndex(0)
      setProgressPct(0)
    }
  }, [isOpen])

  // Reflect real backend progress into the stage indicator (no synthetic increments).
  useEffect(() => {
    if (status === 'completed') {
      setProgressPct(100)
      setStageIndex(PIPELINE_STAGES.length - 1)
      return
    }
    if (status !== 'queued' && status !== 'processing') {
      return
    }
    setStageIndex(Math.min(
      PIPELINE_STAGES.length - 1,
      Math.floor((progressPct / 100) * PIPELINE_STAGES.length)
    ))
  }, [status, progressPct])

  useEffect(() => {
    if (status !== 'queued' && status !== 'processing') return
    if (!pollUrl) return

    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const res = await fetch(pollUrl, { headers: getAuthHeaders() })
        if (!res.ok) throw new Error(`Failed to poll job status (HTTP ${res.status})`)

        const data = await res.json()
        const job = data.job ?? data
        if (cancelled) return

        if (typeof job.progress === 'number') {
          setProgressPct(job.progress)
        }

        if (job.status === 'completed' && job.outputUrl) {
          setStatus('completed')
          setDownloadUrl(job.outputUrl)
          clearInterval(interval)
        } else if (job.status === 'failed') {
          setStatus('failed')
          setErrorMsg(job.errorMessage || 'Export job failed')
          clearInterval(interval)
        } else if (job.status === 'rendering' || job.status === 'processing') {
          setStatus('processing')
        }
      } catch (err) {
        log.error('Export job polling failed', err)
        if (!cancelled) {
          setStatus('failed')
          setErrorMsg(err instanceof Error ? err.message : 'Polling failed')
          clearInterval(interval)
        }
      }
    }, 2500)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [status, pollUrl])

  const handleExport = async () => {
    setStatus('queued')
    setErrorMsg(null)
    setDownloadUrl(null)
    setProgressPct(0)
    setStageIndex(0)

    try {
      const res = await fetch(`/api/exports/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ projectId, quality: 'production' }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setJobId(data.jobId)
      setPollUrl(data.pollUrl)
    } catch (err) {
      setStatus('failed')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }

  if (!isOpen) return null

  const selectedFormat = FORMAT_OPTIONS.find(f => f.id === format)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Export Geometry"
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: 480,
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,0.12)',
          background: 'rgba(10,14,24,0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, ${selectedFormat.accentColor} 0%, transparent 100%)`,
            transition: 'background 300ms ease',
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(148,163,184,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{
                background: selectedFormat.glowColor,
                border: `1px solid color-mix(in srgb, ${selectedFormat.accentColor} 19%, transparent)`,
              }}
            >
              <FileBox size={18} style={{ color: selectedFormat.accentColor }} />
            </div>
            <div>
              <h2
                className="text-sm font-bold tracking-tight"
                style={{ color: 'var(--aethel-text-primary)' }}
              >
                Export Geometry
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--aethel-text-quaternary)' }}>
                Compile project assets into production format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150"
            style={{ color: 'var(--aethel-text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.1)'; e.currentTarget.style.color = 'var(--aethel-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aethel-text-tertiary)' }}
            aria-label="Close export modal"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* ── IDLE: Format Selection ── */}
          {status === 'idle' && (
            <div className="space-y-5">
              {/* Format cards */}
              <div className="grid grid-cols-2 gap-3">
                {FORMAT_OPTIONS.map(opt => {
                  const Ico = opt.icon
                  const isActive = format === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setFormat(opt.id)}
                      className="relative flex flex-col items-start p-4 rounded-xl text-left transition-all duration-200"
                      style={{
                        border: `1px solid ${isActive ? `color-mix(in srgb, ${opt.accentColor} 38%, transparent)` : 'rgba(148,163,184,0.1)'}`,
                        background: isActive ? opt.glowColor : 'rgba(16,22,36,0.5)',
                        boxShadow: isActive ? `0 0 0 1px color-mix(in srgb, ${opt.accentColor} 19%, transparent), 0 4px 16px ${opt.glowColor}` : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-lg"
                          style={{ background: isActive ? opt.glowColor : 'rgba(148,163,184,0.08)' }}
                        >
                          <Ico size={14} style={{ color: isActive ? opt.accentColor : 'var(--aethel-text-tertiary)' }} />
                        </div>
                        <div>
                          <div
                            className="text-sm font-black tracking-wide"
                            style={{ color: isActive ? opt.accentColor : 'var(--aethel-text-primary)' }}
                          >
                            {opt.label}
                          </div>
                          <div className="text-[10px]" style={{ color: 'var(--aethel-text-quaternary)' }}>
                            {opt.sublabel}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--aethel-text-tertiary)' }}>
                        {opt.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {opt.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-wider uppercase"
                            style={{
                              background: isActive ? `color-mix(in srgb, ${opt.accentColor} 13%, transparent)` : 'rgba(148,163,184,0.08)',
                              color: isActive ? opt.accentColor : 'var(--aethel-text-quaternary)',
                              border: `1px solid ${isActive ? `color-mix(in srgb, ${opt.accentColor} 19%, transparent)` : 'transparent'}`,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {isActive && (
                        <div
                          className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: opt.accentColor }}
                        >
                          <CheckCircle size={10} style={{ color: 'white' }} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Pipeline preview */}
              <div
                className="rounded-xl p-3 border"
                style={{
                  background: 'rgba(16,22,36,0.5)',
                  borderColor: 'rgba(148,163,184,0.08)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={11} style={{ color: 'var(--aethel-text-quaternary)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aethel-text-quaternary)' }}>
                    Export Pipeline
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {PIPELINE_STAGES.map((stage, i) => (
                    <React.Fragment key={stage.id}>
                      <span className="text-[10px]" style={{ color: 'var(--aethel-text-tertiary)', whiteSpace: 'nowrap' }}>
                        {stage.label}
                      </span>
                      {i < PIPELINE_STAGES.length - 1 && (
                        <ChevronRight size={9} style={{ color: 'var(--aethel-text-quaternary)', flexShrink: 0 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Export CTA */}
              <button
                onClick={handleExport}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold tracking-wide transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${selectedFormat.accentColor} 0%, color-mix(in srgb, ${selectedFormat.accentColor} 80%, transparent) 100%)`,
                  color: 'white',
                  boxShadow: `0 4px 20px ${selectedFormat.glowColor}, 0 1px 0 rgba(255,255,255,0.1) inset`,
                }}
              >
                <Download size={16} />
                Start Export — {format.toUpperCase()}
              </button>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {(status === 'queued' || status === 'processing') && (
            <div className="flex flex-col items-center py-6 gap-5">
              {/* Animated ring */}
              <div className="relative flex items-center justify-center w-20 h-20">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="4" />
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke={selectedFormat.accentColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                    style={{ transition: 'stroke-dashoffset 300ms ease' }}
                  />
                </svg>
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full"
                  style={{ background: selectedFormat.glowColor }}
                >
                  <Loader2 size={20} className="animate-spin" style={{ color: selectedFormat.accentColor }} />
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--aethel-text-primary)' }}>
                  {PIPELINE_STAGES[Math.min(stageIndex, PIPELINE_STAGES.length - 1)].label}
                </div>
                <div className="text-xs" style={{ color: 'var(--aethel-text-tertiary)' }}>
                  {PIPELINE_STAGES[Math.min(stageIndex, PIPELINE_STAGES.length - 1)].detail}
                </div>
                {jobId && (
                  <div className="mt-2 text-[10px] font-mono" style={{ color: 'var(--aethel-text-quaternary)' }}>
                    Job {jobId}
                  </div>
                )}
              </div>

              {/* Stage dots */}
              <div className="flex items-center gap-2">
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={stage.id} className="flex flex-col items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full transition-all duration-300"
                      style={{
                        background: i <= stageIndex ? selectedFormat.accentColor : 'rgba(148,163,184,0.2)',
                        boxShadow: i === stageIndex ? `0 0 6px ${selectedFormat.accentColor}` : 'none',
                        transform: i === stageIndex ? 'scale(1.4)' : 'scale(1)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── COMPLETED ── */}
          {status === 'completed' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div
                className="flex items-center justify-center w-16 h-16 rounded-full"
                style={{
                  background: 'rgba(34,197,94,0.12)',
                  boxShadow: '0 0 0 1px rgba(34,197,94,0.3), 0 0 24px rgba(34,197,94,0.2)',
                }}
              >
                <CheckCircle size={28} style={{ color: 'var(--aethel-success)' }} />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: 'var(--aethel-text-primary)' }}>
                  Export Complete
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--aethel-text-tertiary)' }}>
                  {format.toUpperCase()} asset compiled and ready for download.
                </p>
              </div>
              <a
                href={downloadUrl!}
                download
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, var(--aethel-success) 0%, color-mix(in srgb, var(--aethel-success-dark) 80%, transparent) 100%)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.25)',
                }}
              >
                <Download size={16} />
                Download {format.toUpperCase()}
              </a>
            </div>
          )}

          {/* ── FAILED ── */}
          {status === 'failed' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div
                className="flex items-center justify-center w-16 h-16 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  boxShadow: '0 0 0 1px rgba(239,68,68,0.3)',
                }}
              >
                <XCircle size={28} style={{ color: 'var(--aethel-error)' }} />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: 'var(--aethel-text-primary)' }}>
                  Export Failed
                </div>
                <p
                  className="mt-1 text-xs font-mono px-4"
                  style={{ color: 'var(--aethel-error-light)', wordBreak: 'break-all' }}
                >
                  {errorMsg}
                </p>
              </div>
              <button
                onClick={() => setStatus('idle')}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-150 hover:brightness-110"
                style={{
                  border: '1px solid rgba(148,163,184,0.12)',
                  background: 'rgba(16,22,36,0.6)',
                  color: 'var(--aethel-text-secondary)',
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
