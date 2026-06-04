'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EXPORT_PRESETS, type ExportJob, type ExportPreset, type ExportSettings } from './export-system-model'
export { EXPORT_PRESETS, ExportManager } from './export-system-model'
export type { AudioCodec, Container, ExportJob, ExportJobStatus, ExportPreset, ExportSettings, VideoCodec } from './export-system-model'
interface ExportDialogProps {
  open: boolean
  onClose: () => void
  onExport: (settings: ExportSettings) => void
  projectDuracao: number
  projectResolucao: { width: number; height: number }
}
export function ExportDialog({
  open,
  onClose,
  onExport,
  projectDuracao,
  projectResolucao
}: ExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset | null>(EXPORT_PRESETS[1])
  const [customSettings, setCustomSettings] = useState<ExportSettings>(EXPORT_PRESETS[1].settings)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [outputName, setOutputName] = useState('export')
  const presetsByCategory = useMemo(() => {
    const grouped: Record<string, ExportPreset[]> = {}
    EXPORT_PRESETS.forEach(preset => {
      if (!grouped[preset.category]) {
        grouped[preset.category] = []
      }
      grouped[preset.category].push(preset)
    })
    return grouped
  }, [])
  const estimatedSize = useMemo(() => {
    const videoBitrate = customSettings.bitrate || 0
    const audioBitrate = customSettings.audioBitrate || 0
    const totalBitrate = videoBitrate + audioBitrate // kbps
    const sizeKB = (totalBitrate * projectDuracao) / 8
    if (sizeKB < 1024) return `~${Math.round(sizeKB)} KB`
    if (sizeKB < 1024 * 1024) return `~${(sizeKB / 1024).toFixed(1)} MB`
    return `~${(sizeKB / 1024 / 1024).toFixed(1)} GB`
  }, [customSettings, projectDuracao])
  const estimatedTime = useMemo(() => {
    const frames = projectDuracao * customSettings.frameRate
    const fps = customSettings.hardwareAcceleration ? 120 : (customSettings.twoPass ? 15 : 30)
    const seconds = frames / fps
    if (seconds < 60) return `~${Math.round(seconds)}s`
    if (seconds < 3600) return `~${Math.round(seconds / 60)}min`
    return `~${(seconds / 3600).toFixed(1)}h`
  }, [customSettings, projectDuracao])
  if (!open) return null
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--aethel-surface-secondary)',
        borderRadius: 8,
        width: '90%',
        maxWidth: 900,
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--aethel-border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ color: 'var(--aethel-text-primary)', margin: 0, fontSize: 16 }}>Export Media</h2>
          <button type="button" aria-label="Close export dialog"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--aethel-text-quaternary)',
              fontSize: 20,
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Presets sidebar */}
          <div style={{
            width: 240,
            borderRight: '1px solid var(--aethel-border-primary)',
            overflowY: 'auto',
            padding: 12
          }}>
            <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
              Presets
            </div>
            {Object.entries(presetsByCategory).map(([category, presets]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <div style={{ color: 'var(--aethel-text-quaternary)', fontSize: 10, marginBottom: 4 }}>
                  {category}
                </div>
                {presets.map(preset => (
                  <button type="button" aria-label={`Select export preset ${preset.name}`}
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset)
                      setCustomSettings(preset.settings)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      marginBottom: 2,
                      background: selectedPreset?.id === preset.id ? 'var(--aethel-primary)' : 'var(--aethel-surface-tertiary)',
                      border: 'none',
                      borderRadius: 4,
                      color: selectedPreset?.id === preset.id ? 'var(--aethel-text-primary)' : 'var(--aethel-text-secondary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span>{preset.icon || '📹'}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {/* Settings panel */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            {/* Output name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                Output name
              </label>
              <input
                type="text"
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--aethel-surface-tertiary)',
                  border: '1px solid var(--aethel-border-primary)',
                  borderRadius: 4,
                  color: 'var(--aethel-text-primary)',
                  fontSize: 14
                }}
              />
            </div>
            {/* Formato summary */}
            <div style={{
              background: 'var(--aethel-surface-tertiary)',
              borderRadius: 6,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 4 }}>Formato</div>
                  <div style={{ color: 'var(--aethel-text-primary)', fontSize: 14 }}>
                    {customSettings.container.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 4 }}>Resolucao</div>
                  <div style={{ color: 'var(--aethel-text-primary)', fontSize: 14 }}>
                    {customSettings.resolution.width}×{customSettings.resolution.height}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 4 }}>Frame rate</div>
                  <div style={{ color: 'var(--aethel-text-primary)', fontSize: 14 }}>
                    {customSettings.frameRate} fps
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 4 }}>Video codec</div>
                  <div style={{ color: 'var(--aethel-text-primary)', fontSize: 14 }}>
                    {customSettings.videoCodec?.toUpperCase() || 'No'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 4 }}>Audio codec</div>
                  <div style={{ color: 'var(--aethel-text-primary)', fontSize: 14 }}>
                    {customSettings.audioCodec?.toUpperCase() || 'No'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 4 }}>Bitrate</div>
                  <div style={{ color: 'var(--aethel-text-primary)', fontSize: 14 }}>
                    {customSettings.bitrate ? `${customSettings.bitrate} kbps` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            {/* Quick settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Resolucao */}
              <div>
                <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Resolucao
                </label>
                <select
                  value={`${customSettings.resolution.width}x${customSettings.resolution.height}`}
                  onChange={e => {
                    const [w, h] = e.target.value.split('x').map(Number)
                    setCustomSettings({ ...customSettings, resolution: { width: w, height: h } })
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--aethel-surface-tertiary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: 4,
                    color: 'var(--aethel-text-primary)',
                    fontSize: 12
                  }}
                >
                  <option value="3840x2160">4K (3840×2160)</option>
                  <option value="1920x1080">1080p (1920×1080)</option>
                  <option value="1280x720">720p (1280×720)</option>
                  <option value="1080x1920">Vertical 1080p</option>
                  <option value="1080x1080">Square (1080×1080)</option>
                </select>
              </div>
              {/* Frame rate */}
              <div>
                <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Frame rate
                </label>
                <select
                  value={customSettings.frameRate}
                  onChange={e => setCustomSettings({ ...customSettings, frameRate: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--aethel-surface-tertiary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: 4,
                    color: 'var(--aethel-text-primary)',
                    fontSize: 12
                  }}
                >
                  <option value={24}>24 fps</option>
                  <option value={25}>25 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={50}>50 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
              {/* Bitrate */}
              <div>
                <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Video Bitrate (kbps)
                </label>
                <input
                  type="number"
                  value={customSettings.bitrate}
                  onChange={e => setCustomSettings({ ...customSettings, bitrate: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--aethel-surface-tertiary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: 4,
                    color: 'var(--aethel-text-primary)',
                    fontSize: 12
                  }}
                />
              </div>
              {/* Audio bitrate */}
              <div>
                <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Audio Bitrate (kbps)
                </label>
                <input
                  type="number"
                  value={customSettings.audioBitrate}
                  onChange={e => setCustomSettings({ ...customSettings, audioBitrate: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--aethel-surface-tertiary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: 4,
                    color: 'var(--aethel-text-primary)',
                    fontSize: 12
                  }}
                />
              </div>
            </div>
            {/* Advanced toggle */}
            <button type="button" aria-label={showAdvanced ? 'Hide advanced export settings' : 'Show advanced export settings'}
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--aethel-primary)',
                cursor: 'pointer',
                fontSize: 12,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {showAdvanced ? '▼' : '▶'} Configuracoes avancadas
            </button>
            {showAdvanced && (
              <div style={{
                background: 'var(--aethel-surface-tertiary)',
                borderRadius: 6,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Two-pass */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customSettings.twoPass}
                      onChange={e => setCustomSettings({ ...customSettings, twoPass: e.target.checked })}
                    />
                    <span style={{ color: 'var(--aethel-text-secondary)', fontSize: 12 }}>Codificacao em duas passadas</span>
                  </label>
                  {/* Aceleracao por hardware */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customSettings.hardwareAcceleration}
                      onChange={e => setCustomSettings({ ...customSettings, hardwareAcceleration: e.target.checked })}
                    />
                    <span style={{ color: 'var(--aethel-text-secondary)', fontSize: 12 }}>Aceleracao por hardware</span>
                  </label>
                  {/* Fast start */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customSettings.fastStart}
                      onChange={e => setCustomSettings({ ...customSettings, fastStart: e.target.checked })}
                    />
                    <span style={{ color: 'var(--aethel-text-secondary)', fontSize: 12 }}>Inicio rapido (streaming)</span>
                  </label>
                  {/* Incluir metadata */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customSettings.includeMetadata}
                      onChange={e => setCustomSettings({ ...customSettings, includeMetadata: e.target.checked })}
                    />
                    <span style={{ color: 'var(--aethel-text-secondary)', fontSize: 12 }}>Incluir metadata</span>
                  </label>
                </div>
              </div>
            )}
            {/* Estimates */}
            <div style={{
              background: 'var(--aethel-surface-quaternary)',
              borderRadius: 6,
              padding: 12,
              display: 'flex',
              justifyContent: 'space-around'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 2 }}>Tamanho estimado</div>
                <div style={{ color: 'var(--aethel-success)', fontSize: 14, fontWeight: 600 }}>{estimatedSize}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 2 }}>Tempo estimado</div>
                <div style={{ color: 'var(--aethel-warning)', fontSize: 14, fontWeight: 600 }}>{estimatedTime}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--aethel-text-tertiary)', fontSize: 10, marginBottom: 2 }}>Duracao</div>
                <div style={{ color: 'var(--aethel-text-secondary)', fontSize: 14, fontWeight: 600 }}>
                  {Math.floor(projectDuracao / 60)}:{(projectDuracao % 60).toFixed(0).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--aethel-border-primary)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <button type="button" aria-label="Cancel export"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: 4,
              color: 'var(--aethel-text-tertiary)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Cancel
          </button>
          <button type="button" aria-label="Start export"
            onClick={() => {
              onExport(customSettings)
              onClose()
            }}
            style={{
              padding: '8px 24px',
              background: 'var(--aethel-primary)',
              border: 'none',
              borderRadius: 4,
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
interface ExportQueuePanelProps {
  jobs: ExportJob[]
  onCancel: (jobId: string) => void
  onRemove: (jobId: string) => void
}
export function ExportQueuePanel({ jobs, onCancel, onRemove }: ExportQueuePanelProps) {
  if (jobs.length === 0) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: 'var(--aethel-text-quaternary)',
        fontSize: 12
      }}>
        No exportacao na fila
      </div>
    )
  }
  return (
    <div style={{ padding: 12 }}>
      {jobs.map(job => (
        <div
          key={job.id}
          style={{
            background: 'var(--aethel-surface-tertiary)',
            borderRadius: 6,
            padding: 12,
            marginBottom: 8,
            border: '1px solid var(--aethel-border-primary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--aethel-text-secondary)', fontSize: 12, fontWeight: 600 }}>{job.name}</span>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 3,
              background: job.status === 'completed' ? 'var(--aethel-success)' :
                         job.status === 'processing' ? 'var(--aethel-primary)' :
                         job.status === 'failed' ? 'var(--aethel-error)' :
                         job.status === 'cancelled' ? 'var(--aethel-text-quaternary)' : 'var(--aethel-border-secondary)',
              color: 'var(--aethel-text-primary)'
            }}>
              {job.status.toUpperCase()}
            </span>
          </div>
          {job.status === 'processing' && (
            <>
              <div style={{
                background: 'var(--aethel-border-secondary)',
                borderRadius: 4,
                height: 6,
                marginBottom: 4,
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'var(--aethel-primary)',
                  height: '100%',
                  width: `${job.progress}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--aethel-text-tertiary)' }}>
                <span>{job.progress.toFixed(0)}%</span>
                {job.estimatedTimeRemaining !== undefined && (
                  <span>~{Math.ceil(job.estimatedTimeRemaining)}s restante</span>
                )}
              </div>
            </>
          )}
          {job.status === 'completed' && job.outputPath && (
            <a
              href={job.outputPath}
              download={job.name}
              style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '4px 12px',
                background: 'var(--aethel-success)',
                borderRadius: 3,
                color: 'var(--aethel-text-primary)',
                fontSize: 11,
                textDecoration: 'none'
              }}
            >
              Download
            </a>
          )}
          {job.status === 'failed' && job.error && (
            <div style={{ color: 'var(--aethel-error)', fontSize: 11, marginTop: 4 }}>
              Error: {job.error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {job.status === 'processing' && (
              <button type="button" aria-label={`Cancel export job ${job.id}`}
                onClick={() => onCancel(job.id)}
                style={{
                  padding: '4px 12px',
                  background: 'var(--aethel-error)',
                  border: 'none',
                  borderRadius: 3,
                  color: 'var(--aethel-text-primary)',
                  fontSize: 10,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            {['completed', 'failed', 'cancelled'].includes(job.status) && (
              <button type="button" aria-label={`Remove export job ${job.id}`}
                onClick={() => onRemove(job.id)}
                style={{
                  padding: '4px 12px',
                  background: 'var(--aethel-border-secondary)',
                  border: 'none',
                  borderRadius: 3,
                  color: 'var(--aethel-text-tertiary)',
                  fontSize: 10,
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
export default ExportDialog
