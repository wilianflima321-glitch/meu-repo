'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ============================================================================
// PROFESSIONAL EXPORT SYSTEM (Premiere Pro / Media Encoder style)
// ============================================================================

export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1' | 'prores' | 'dnxhd'
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'pcm' | 'flac'
export type Container = 'mp4' | 'webm' | 'mov' | 'mkv' | 'avi' | 'gif'

export interface ExportPreset {
  id: string
  name: string
  category: string
  description?: string
  settings: ExportSettings
  icon?: string
}

export interface ExportSettings {
  // Format
  container: Container
  videoCodec: VideoCodec | null    // null = no video
  audioCodec: AudioCodec | null    // null = no audio
  
  // Video
  resolution: { width: number; height: number }
  frameRate: number
  bitrate: number                   // kbps
  bitrateMode: 'cbr' | 'vbr' | 'crf'
  crf?: number                      // Constant Rate Factor (0-51 for h264)
  maxBitrate?: number               // For VBR
  keyframeInterval?: number         // Frames between keyframes
  pixelFormat?: 'yuv420p' | 'yuv422p' | 'yuv444p' | 'rgb24'
  profile?: 'baseline' | 'main' | 'high' | 'high10' | 'high422' | 'high444'
  
  // Audio
  sampleRate: number
  channels: 1 | 2 | 6               // Mono, Stereo, 5.1
  audioBitrate: number              // kbps
  
  // Range
  useInOutPoints: boolean
  inPoint?: number
  outPoint?: number
  
  // Advanced
  twoPass: boolean
  fastStart: boolean                // moov atom at start for streaming
  hardwareAcceleration: boolean
  deinterlace: boolean
  
  // Metadata
  includeMetadata: boolean
  customMetadata?: Record<string, string>
}

// ============================================================================
// PRESET LIBRARY
// ============================================================================

export const EXPORT_PRESETS: ExportPreset[] = [
  // YouTube
  {
    id: 'youtube-4k',
    name: 'YouTube 4K',
    category: 'YouTube',
    description: 'Optimal settings for YouTube 4K upload',
    icon: '📺',
    settings: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 3840, height: 2160 },
      frameRate: 30,
      bitrate: 35000,
      bitrateMode: 'vbr',
      maxBitrate: 40000,
      profile: 'high',
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 384,
      useInOutPoints: false,
      twoPass: true,
      fastStart: true,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: true
    }
  },
  {
    id: 'youtube-1080p',
    name: 'YouTube 1080p',
    category: 'YouTube',
    description: 'Optimal settings for YouTube HD upload',
    icon: '📺',
    settings: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrate: 8000,
      bitrateMode: 'vbr',
      maxBitrate: 12000,
      profile: 'high',
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 320,
      useInOutPoints: false,
      twoPass: true,
      fastStart: true,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: true
    }
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    category: 'YouTube',
    description: 'Vertical video for YouTube Shorts',
    icon: '📱',
    settings: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 1080, height: 1920 },
      frameRate: 30,
      bitrate: 6000,
      bitrateMode: 'vbr',
      profile: 'high',
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 256,
      useInOutPoints: false,
      twoPass: false,
      fastStart: true,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: true
    }
  },
  
  // Social Media
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    category: 'Social Media',
    description: 'Square video for Instagram feed',
    icon: '📷',
    settings: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 1080, height: 1080 },
      frameRate: 30,
      bitrate: 5000,
      bitrateMode: 'vbr',
      profile: 'main',
      sampleRate: 44100,
      channels: 2,
      audioBitrate: 192,
      useInOutPoints: false,
      twoPass: false,
      fastStart: true,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: false
    }
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    category: 'Social Media',
    description: 'Vertical video for Instagram Reels',
    icon: '📱',
    settings: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 1080, height: 1920 },
      frameRate: 30,
      bitrate: 6000,
      bitrateMode: 'vbr',
      profile: 'main',
      sampleRate: 44100,
      channels: 2,
      audioBitrate: 192,
      useInOutPoints: false,
      twoPass: false,
      fastStart: true,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: false
    }
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'Social Media',
    description: 'Optimized for TikTok upload',
    icon: '🎵',
    settings: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 1080, height: 1920 },
      frameRate: 30,
      bitrate: 4000,
      bitrateMode: 'vbr',
      profile: 'main',
      sampleRate: 44100,
      channels: 2,
      audioBitrate: 192,
      useInOutPoints: false,
      twoPass: false,
      fastStart: true,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: false
    }
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    category: 'Social Media',
    description: 'Optimized for Twitter video',
    icon: '🐦',
    settings: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: { width: 1280, height: 720 },
      frameRate: 30,
      bitrate: 5000,
      bitrateMode: 'vbr',
      profile: 'main',
      sampleRate: 44100,
      channels: 2,
      audioBitrate: 192,
      useInOutPoints: false,
      twoPass: false,
      fastStart: true,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: false
    }
  },
  
  // Web
  {
    id: 'web-vp9',
    name: 'Web VP9',
    category: 'Web',
    description: 'Modern web format with great compression',
    icon: '🌐',
    settings: {
      container: 'webm',
      videoCodec: 'vp9',
      audioCodec: 'opus',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrate: 4000,
      bitrateMode: 'crf',
      crf: 31,
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 128,
      useInOutPoints: false,
      twoPass: true,
      fastStart: false,
      hardwareAcceleration: false,
      deinterlace: false,
      includeMetadata: true
    }
  },
  {
    id: 'web-av1',
    name: 'Web AV1',
    category: 'Web',
    description: 'Next-gen web format (slower encoding)',
    icon: '🌐',
    settings: {
      container: 'webm',
      videoCodec: 'av1',
      audioCodec: 'opus',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrate: 3000,
      bitrateMode: 'crf',
      crf: 30,
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 128,
      useInOutPoints: false,
      twoPass: false,
      fastStart: false,
      hardwareAcceleration: false,
      deinterlace: false,
      includeMetadata: true
    }
  },
  
  // Professional
  {
    id: 'prores-422',
    name: 'Apple ProRes 422',
    category: 'Professional',
    description: 'High-quality intermediate codec',
    icon: '🎬',
    settings: {
      container: 'mov',
      videoCodec: 'prores',
      audioCodec: 'pcm',
      resolution: { width: 1920, height: 1080 },
      frameRate: 24,
      bitrate: 147000,
      bitrateMode: 'cbr',
      pixelFormat: 'yuv422p',
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 1536,
      useInOutPoints: false,
      twoPass: false,
      fastStart: false,
      hardwareAcceleration: false,
      deinterlace: false,
      includeMetadata: true
    }
  },
  {
    id: 'dnxhd',
    name: 'DNxHD',
    category: 'Professional',
    description: 'Avid intermediate codec',
    icon: '🎬',
    settings: {
      container: 'mov',
      videoCodec: 'dnxhd',
      audioCodec: 'pcm',
      resolution: { width: 1920, height: 1080 },
      frameRate: 24,
      bitrate: 115000,
      bitrateMode: 'cbr',
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 1536,
      useInOutPoints: false,
      twoPass: false,
      fastStart: false,
      hardwareAcceleration: false,
      deinterlace: false,
      includeMetadata: true
    }
  },
  
  // Archive
  {
    id: 'archive-high',
    name: 'Archive (High Quality)',
    category: 'Archive',
    description: 'Maximum quality for archival',
    icon: '📦',
    settings: {
      container: 'mkv',
      videoCodec: 'h265',
      audioCodec: 'flac',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrate: 20000,
      bitrateMode: 'crf',
      crf: 18,
      profile: 'main',
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 0,
      useInOutPoints: false,
      twoPass: false,
      fastStart: false,
      hardwareAcceleration: true,
      deinterlace: false,
      includeMetadata: true
    }
  },
  
  // GIF
  {
    id: 'gif-high',
    name: 'Animated GIF',
    category: 'Other',
    description: 'High quality animated GIF',
    icon: '🎞️',
    settings: {
      container: 'gif',
      videoCodec: null,
      audioCodec: null,
      resolution: { width: 480, height: 270 },
      frameRate: 15,
      bitrate: 0,
      bitrateMode: 'cbr',
      sampleRate: 0,
      channels: 1,
      audioBitrate: 0,
      useInOutPoints: false,
      twoPass: false,
      fastStart: false,
      hardwareAcceleration: false,
      deinterlace: false,
      includeMetadata: false
    }
  },
  
  // Audio Only
  {
    id: 'audio-mp3',
    name: 'MP3 Audio',
    category: 'Audio Only',
    description: 'Standard MP3 audio',
    icon: '🎵',
    settings: {
      container: 'mp4',
      videoCodec: null,
      audioCodec: 'mp3',
      resolution: { width: 0, height: 0 },
      frameRate: 0,
      bitrate: 0,
      bitrateMode: 'cbr',
      sampleRate: 44100,
      channels: 2,
      audioBitrate: 320,
      useInOutPoints: false,
      twoPass: false,
      fastStart: false,
      hardwareAcceleration: false,
      deinterlace: false,
      includeMetadata: true
    }
  },
  {
    id: 'audio-wav',
    name: 'WAV Audio',
    category: 'Audio Only',
    description: 'Uncompressed WAV audio',
    icon: '🎵',
    settings: {
      container: 'mov',
      videoCodec: null,
      audioCodec: 'pcm',
      resolution: { width: 0, height: 0 },
      frameRate: 0,
      bitrate: 0,
      bitrateMode: 'cbr',
      sampleRate: 48000,
      channels: 2,
      audioBitrate: 1536,
      useInOutPoints: false,
      twoPass: false,
      fastStart: false,
      hardwareAcceleration: false,
      deinterlace: false,
      includeMetadata: true
    }
  }
]

// ============================================================================
// EXPORT QUEUE
// ============================================================================

export type ExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface ExportJob {
  id: string
  name: string
  settings: ExportSettings
  status: ExportJobStatus
  progress: number
  startedAt?: number
  completedAt?: number
  error?: string
  outputPath?: string
  estimatedTimeRemaining?: number
  // Source info
  sourceProjectId?: string
  sourceRange: { start: number; end: number }
}

// ============================================================================
// EXPORT MANAGER CLASS
// ============================================================================

export class ExportManager {
  private queue: ExportJob[] = []
  private currentJob: ExportJob | null = null
  private isProcessing = false
  private abortController: AbortController | null = null
  
  private onQueueUpdate?: (queue: ExportJob[]) => void
  private onJobProgress?: (jobId: string, progress: number) => void
  private onJobComplete?: (jobId: string, outputUrl: string) => void
  private onJobError?: (jobId: string, error: string) => void
  
  constructor(callbacks?: {
    onQueueUpdate?: (queue: ExportJob[]) => void
    onJobProgress?: (jobId: string, progress: number) => void
    onJobComplete?: (jobId: string, outputUrl: string) => void
    onJobError?: (jobId: string, error: string) => void
  }) {
    if (callbacks) {
      this.onQueueUpdate = callbacks.onQueueUpdate
      this.onJobProgress = callbacks.onJobProgress
      this.onJobComplete = callbacks.onJobComplete
      this.onJobError = callbacks.onJobError
    }
  }
  
  addJob(name: string, settings: ExportSettings, sourceRange: { start: number; end: number }): string {
    const job: ExportJob = {
      id: `export-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      settings,
      status: 'queued',
      progress: 0,
      sourceRange
    }
    
    this.queue.push(job)
    this.onQueueUpdate?.(this.queue)
    
    if (!this.isProcessing) {
      this.processNext()
    }
    
    return job.id
  }
  
  cancelJob(jobId: string): boolean {
    const jobIndex = this.queue.findIndex(j => j.id === jobId)
    
    if (jobIndex >= 0) {
      if (this.currentJob?.id === jobId) {
        this.abortController?.abort()
        this.currentJob.status = 'cancelled'
      } else {
        this.queue[jobIndex].status = 'cancelled'
      }
      
      this.onQueueUpdate?.(this.queue)
      return true
    }
    
    return false
  }
  
  removeJob(jobId: string): boolean {
    const index = this.queue.findIndex(j => j.id === jobId)
    if (index >= 0 && this.queue[index].status !== 'processing') {
      this.queue.splice(index, 1)
      this.onQueueUpdate?.(this.queue)
      return true
    }
    return false
  }
  
  getQueue(): ExportJob[] {
    return [...this.queue]
  }
  
  private async processNext(): Promise<void> {
    const nextJob = this.queue.find(j => j.status === 'queued')
    
    if (!nextJob) {
      this.isProcessing = false
      return
    }
    
    this.isProcessing = true
    this.currentJob = nextJob
    this.abortController = new AbortController()
    
    nextJob.status = 'processing'
    nextJob.startedAt = Date.now()
    this.onQueueUpdate?.(this.queue)
    
    try {
      const outputUrl = await this.processJob(nextJob, this.abortController.signal)
      
      nextJob.status = 'completed'
      nextJob.completedAt = Date.now()
      nextJob.progress = 100
      nextJob.outputPath = outputUrl
      
      this.onJobComplete?.(nextJob.id, outputUrl)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        nextJob.status = 'cancelled'
      } else {
        nextJob.status = 'failed'
        nextJob.error = (error as Error).message
        this.onJobError?.(nextJob.id, (error as Error).message)
      }
    }
    
    this.onQueueUpdate?.(this.queue)
    this.currentJob = null
    this.abortController = null
    
    // Process next in queue
    this.processNext()
  }
  
  private async processJob(job: ExportJob, signal: AbortSignal): Promise<string> {
    // This is where actual encoding would happen
    // For now, simulate progress
    
    const { settings } = job
    const duration = job.sourceRange.end - job.sourceRange.start
    
    // Simulate encoding progress
    const totalFrames = duration * settings.frameRate
    const framesPerSecond = settings.hardwareAcceleration ? 120 : 30
    const estimatedDuration = totalFrames / framesPerSecond
    
    for (let progress = 0; progress <= 100; progress += 1) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      
      await new Promise(resolve => setTimeout(resolve, estimatedDuration * 10))
      
      job.progress = progress
      job.estimatedTimeRemaining = (estimatedDuration * (100 - progress)) / 100
      this.onJobProgress?.(job.id, progress)
    }
    
    // Return a blob URL (in real implementation, this would be the actual encoded file)
    const blob = new Blob(['dummy video data'], { type: 'video/mp4' })
    return URL.createObjectURL(blob)
  }
}

// ============================================================================
// EXPORT DIALOG COMPONENT
// ============================================================================

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  onExport: (settings: ExportSettings) => void
  projectDuration: number
  projectResolution: { width: number; height: number }
}

export function ExportDialog({
  open,
  onClose,
  onExport,
  projectDuration,
  projectResolution
}: ExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset | null>(EXPORT_PRESETS[1])
  const [customSettings, setCustomSettings] = useState<ExportSettings>(EXPORT_PRESETS[1].settings)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [outputName, setOutputName] = useState('export')
  
  // Group presets by category
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
  
  // Estimate file size
  const estimatedSize = useMemo(() => {
    const videoBitrate = customSettings.bitrate || 0
    const audioBitrate = customSettings.audioBitrate || 0
    const totalBitrate = videoBitrate + audioBitrate // kbps
    const sizeKB = (totalBitrate * projectDuration) / 8
    
    if (sizeKB < 1024) return `~${Math.round(sizeKB)} KB`
    if (sizeKB < 1024 * 1024) return `~${(sizeKB / 1024).toFixed(1)} MB`
    return `~${(sizeKB / 1024 / 1024).toFixed(1)} GB`
  }, [customSettings, projectDuration])
  
  // Estimate encoding time
  const estimatedTime = useMemo(() => {
    const frames = projectDuration * customSettings.frameRate
    const fps = customSettings.hardwareAcceleration ? 120 : (customSettings.twoPass ? 15 : 30)
    const seconds = frames / fps
    
    if (seconds < 60) return `~${Math.round(seconds)}s`
    if (seconds < 3600) return `~${Math.round(seconds / 60)}min`
    return `~${(seconds / 3600).toFixed(1)}h`
  }, [customSettings, projectDuration])
  
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
        background: '#1a1b1e',
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
          borderBottom: '1px solid #373a40',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 16 }}>Export Media</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#868e96',
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
            borderRight: '1px solid #373a40',
            overflowY: 'auto',
            padding: 12
          }}>
            <div style={{ color: '#909296', fontSize: 10, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
              Presets
            </div>
            
            {Object.entries(presetsByCategory).map(([category, presets]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <div style={{ color: '#5c5f66', fontSize: 10, marginBottom: 4 }}>
                  {category}
                </div>
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset)
                      setCustomSettings(preset.settings)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      marginBottom: 2,
                      background: selectedPreset?.id === preset.id ? '#339af0' : '#25262b',
                      border: 'none',
                      borderRadius: 4,
                      color: selectedPreset?.id === preset.id ? '#fff' : '#c1c2c5',
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
              <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
                Output Name
              </label>
              <input
                type="text"
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#25262b',
                  border: '1px solid #373a40',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 14
                }}
              />
            </div>
            
            {/* Format summary */}
            <div style={{
              background: '#25262b',
              borderRadius: 6,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ color: '#909296', fontSize: 10, marginBottom: 4 }}>Format</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {customSettings.container.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#909296', fontSize: 10, marginBottom: 4 }}>Resolution</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {customSettings.resolution.width}×{customSettings.resolution.height}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#909296', fontSize: 10, marginBottom: 4 }}>Frame Rate</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {customSettings.frameRate} fps
                  </div>
                </div>
                <div>
                  <div style={{ color: '#909296', fontSize: 10, marginBottom: 4 }}>Video Codec</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {customSettings.videoCodec?.toUpperCase() || 'None'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#909296', fontSize: 10, marginBottom: 4 }}>Audio Codec</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {customSettings.audioCodec?.toUpperCase() || 'None'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#909296', fontSize: 10, marginBottom: 4 }}>Bitrate</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {customSettings.bitrate ? `${customSettings.bitrate} kbps` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Resolution */}
              <div>
                <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Resolution
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
                    background: '#25262b',
                    border: '1px solid #373a40',
                    borderRadius: 4,
                    color: '#fff',
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
                <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Frame Rate
                </label>
                <select
                  value={customSettings.frameRate}
                  onChange={e => setCustomSettings({ ...customSettings, frameRate: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#25262b',
                    border: '1px solid #373a40',
                    borderRadius: 4,
                    color: '#fff',
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
                <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Video Bitrate (kbps)
                </label>
                <input
                  type="number"
                  value={customSettings.bitrate}
                  onChange={e => setCustomSettings({ ...customSettings, bitrate: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#25262b',
                    border: '1px solid #373a40',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 12
                  }}
                />
              </div>
              
              {/* Audio bitrate */}
              <div>
                <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Audio Bitrate (kbps)
                </label>
                <input
                  type="number"
                  value={customSettings.audioBitrate}
                  onChange={e => setCustomSettings({ ...customSettings, audioBitrate: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#25262b',
                    border: '1px solid #373a40',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 12
                  }}
                />
              </div>
            </div>
            
            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#339af0',
                cursor: 'pointer',
                fontSize: 12,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Settings
            </button>
            
            {showAdvanced && (
              <div style={{
                background: '#25262b',
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
                    <span style={{ color: '#c1c2c5', fontSize: 12 }}>Two-pass encoding</span>
                  </label>
                  
                  {/* Hardware acceleration */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customSettings.hardwareAcceleration}
                      onChange={e => setCustomSettings({ ...customSettings, hardwareAcceleration: e.target.checked })}
                    />
                    <span style={{ color: '#c1c2c5', fontSize: 12 }}>Hardware acceleration</span>
                  </label>
                  
                  {/* Fast start */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customSettings.fastStart}
                      onChange={e => setCustomSettings({ ...customSettings, fastStart: e.target.checked })}
                    />
                    <span style={{ color: '#c1c2c5', fontSize: 12 }}>Fast start (streaming)</span>
                  </label>
                  
                  {/* Include metadata */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customSettings.includeMetadata}
                      onChange={e => setCustomSettings({ ...customSettings, includeMetadata: e.target.checked })}
                    />
                    <span style={{ color: '#c1c2c5', fontSize: 12 }}>Include metadata</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Estimates */}
            <div style={{
              background: '#2c2e33',
              borderRadius: 6,
              padding: 12,
              display: 'flex',
              justifyContent: 'space-around'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#909296', fontSize: 10, marginBottom: 2 }}>Est. File Size</div>
                <div style={{ color: '#51cf66', fontSize: 14, fontWeight: 600 }}>{estimatedSize}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#909296', fontSize: 10, marginBottom: 2 }}>Est. Time</div>
                <div style={{ color: '#fab005', fontSize: 14, fontWeight: 600 }}>{estimatedTime}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#909296', fontSize: 10, marginBottom: 2 }}>Duration</div>
                <div style={{ color: '#c1c2c5', fontSize: 14, fontWeight: 600 }}>
                  {Math.floor(projectDuration / 60)}:{(projectDuration % 60).toFixed(0).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #373a40',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid #373a40',
              borderRadius: 4,
              color: '#909296',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onExport(customSettings)
              onClose()
            }}
            style={{
              padding: '8px 24px',
              background: '#339af0',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
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

// ============================================================================
// EXPORT QUEUE PANEL COMPONENT
// ============================================================================

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
        color: '#5c5f66',
        fontSize: 12
      }}>
        No exports in queue
      </div>
    )
  }
  
  return (
    <div style={{ padding: 12 }}>
      {jobs.map(job => (
        <div
          key={job.id}
          style={{
            background: '#25262b',
            borderRadius: 6,
            padding: 12,
            marginBottom: 8,
            border: '1px solid #373a40'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#c1c2c5', fontSize: 12, fontWeight: 600 }}>{job.name}</span>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 3,
              background: job.status === 'completed' ? '#2f9e44' :
                         job.status === 'processing' ? '#339af0' :
                         job.status === 'failed' ? '#e03131' :
                         job.status === 'cancelled' ? '#868e96' : '#373a40',
              color: '#fff'
            }}>
              {job.status.toUpperCase()}
            </span>
          </div>
          
          {job.status === 'processing' && (
            <>
              <div style={{
                background: '#373a40',
                borderRadius: 4,
                height: 6,
                marginBottom: 4,
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#339af0',
                  height: '100%',
                  width: `${job.progress}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#909296' }}>
                <span>{job.progress.toFixed(0)}%</span>
                {job.estimatedTimeRemaining !== undefined && (
                  <span>~{Math.ceil(job.estimatedTimeRemaining)}s remaining</span>
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
                background: '#2f9e44',
                borderRadius: 3,
                color: '#fff',
                fontSize: 11,
                textDecoration: 'none'
              }}
            >
              Download
            </a>
          )}
          
          {job.status === 'failed' && job.error && (
            <div style={{ color: '#fa5252', fontSize: 11, marginTop: 4 }}>
              Error: {job.error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {job.status === 'processing' && (
              <button
                onClick={() => onCancel(job.id)}
                style={{
                  padding: '4px 12px',
                  background: '#e03131',
                  border: 'none',
                  borderRadius: 3,
                  color: '#fff',
                  fontSize: 10,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            {['completed', 'failed', 'cancelled'].includes(job.status) && (
              <button
                onClick={() => onRemove(job.id)}
                style={{
                  padding: '4px 12px',
                  background: '#373a40',
                  border: 'none',
                  borderRadius: 3,
                  color: '#909296',
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
