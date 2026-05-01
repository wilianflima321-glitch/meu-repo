export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1' | 'prores' | 'dnxhd'
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'pcm' | 'flac'
export type Container = 'mp4' | 'webm' | 'mov' | 'mkv' | 'avi' | 'gif'
export interface ExportarPreset {
  id: string
  name: string
  category: string
  description?: string
  settings: ExportarSettings
  icon?: string
}
export interface ExportarSettings {
  container: Container
  videoCodec: VideoCodec | null    // null = no video
  audioCodec: AudioCodec | null    // null = no audio
  resolution: { width: number; height: number }
  frameRate: number
  bitrate: number                   // kbps
  bitrateMode: 'cbr' | 'vbr' | 'crf'
  crf?: number                      // Constant Rate Factor (0-51 for h264)
  maxBitrate?: number               // For VBR
  keyframeInterval?: number         // Frames between keyframes
  pixelFormato?: 'yuv420p' | 'yuv422p' | 'yuv444p' | 'rgb24'
  profile?: 'baseline' | 'main' | 'high' | 'high10' | 'high422' | 'high444'
  sampleRate: number
  channels: 1 | 2 | 6               // Mono, Stereo, 5.1
  audioBitrate: number              // kbps
  useInOutPoints: boolean
  inPoint?: number
  outPoint?: number
  twoPass: boolean
  fastStart: boolean                // moov atom at start for streaming
  hardwareAcceleration: boolean
  deinterlace: boolean
  includeMetadata: boolean
  customMetadata?: Record<string, string>
}
export const EXPORT_PRESETS: ExportarPreset[] = [
  {
    id: 'youtube-4k',
    name: 'YouTube 4K',
    category: 'YouTube',
    description: 'Optimal settings for YouTube 4K upload',
    icon: 'YT',
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
    icon: 'YT',
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
    icon: 'YS',
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
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    category: 'Social Media',
    description: 'Square video for Instagram feed',
    icon: 'IG',
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
    icon: 'IR',
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
    icon: 'TT',
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
    icon: 'X',
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
      pixelFormato: 'yuv422p',
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
export type ExportarJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
export interface ExportarJob {
  id: string
  name: string
  settings: ExportarSettings
  status: ExportarJobStatus
  progress: number
  startedAt?: number
  completedAt?: number
  error?: string
  outputPath?: string
  estimatedTimeRemaining?: number
  sourceProjectId?: string
  sourceRange: { start: number; end: number }
}
export class ExportarManager {
  private queue: ExportarJob[] = []
  private currentJob: ExportarJob | null = null
  private isProcessing = false
  private abortController: AbortController | null = null
  private onQueueUpdate?: (queue: ExportarJob[]) => void
  private onJobProgress?: (jobId: string, progress: number) => void
  private onJobComplete?: (jobId: string, outputUrl: string) => void
  private onJobError?: (jobId: string, error: string) => void
  constructor(callbacks?: {
    onQueueUpdate?: (queue: ExportarJob[]) => void
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
  addJob(name: string, settings: ExportarSettings, sourceRange: { start: number; end: number }): string {
    const job: ExportarJob = {
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
  getQueue(): ExportarJob[] {
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
    this.processNext()
  }
  private async processJob(job: ExportarJob, signal: AbortSignal): Promise<string> {
    const { settings } = job
    const duration = job.sourceRange.end - job.sourceRange.start
    const totalFrames = duration * settings.frameRate
    const framesPerSecond = settings.hardwareAcceleration ? 120 : 30
    const estimatedDuracao = totalFrames / framesPerSecond
    for (let progress = 0; progress <= 100; progress += 1) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      await new Promise(resolve => setTimeout(resolve, estimatedDuracao * 10))
      job.progress = progress
      job.estimatedTimeRemaining = (estimatedDuracao * (100 - progress)) / 100
      this.onJobProgress?.(job.id, progress)
    }
    const blob = new Blob(['dummy video data'], { type: 'video/mp4' })
    return URL.createObjectURL(blob)
  }
}
