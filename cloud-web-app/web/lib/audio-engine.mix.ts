import type { AudioChannel, AudioTrack, ChannelConfig, PlayOptions } from './audio-engine.types'

export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume))
}

export function createAudioInstanceId(trackId: string, now = Date.now(), random = Math.random()): string {
  return `${trackId}-${now}-${random.toString(36).slice(2, 11)}`
}

export function resolveAudioSources(src: AudioTrack['src']): string[] {
  return Array.isArray(src) ? src : [src]
}

export function calculateEffectiveVolume({
  track,
  options,
  channel,
  master,
}: {
  track: AudioTrack
  options?: PlayOptions
  channel: ChannelConfig
  master: ChannelConfig
}): number {
  if (channel.muted || master.muted) return 0
  return clampVolume((options?.volume ?? track.volume) * channel.volume * master.volume)
}

export function calculateInstanceVolume({
  volume,
  channel,
  master,
}: {
  volume: number
  channel: ChannelConfig
  master: ChannelConfig
}): number {
  if (channel.muted || master.muted) return 0
  return clampVolume(volume * channel.volume * master.volume)
}

export function calculateChannelOutputVolume({
  channel,
  master,
}: {
  channel: ChannelConfig
  master: ChannelConfig
}): number {
  if (channel.muted || master.muted) return 0
  return clampVolume(channel.volume * master.volume)
}

export function hasPlayingVoice(instances: Iterable<{ channel: AudioChannel; state: string }>): boolean {
  for (const instance of instances) {
    if (instance.channel === 'voice' && instance.state === 'playing') return true
  }
  return false
}

export function calculateDuckedVolume({
  channel,
  master,
  voicePlaying,
}: {
  channel: ChannelConfig
  master: ChannelConfig
  voicePlaying: boolean
}): number {
  const channelVolume = voicePlaying && channel.ducking > 0
    ? channel.volume * (1 - channel.ducking)
    : channel.volume
  return calculateChannelOutputVolume({ channel: { ...channel, volume: channelVolume }, master })
}

export function nextPlaylistIndex(currentIndex: number, playlistLength: number): number {
  if (playlistLength <= 0) return 0
  return (currentIndex + 1) % playlistLength
}

export function previousPlaylistIndex(currentIndex: number, playlistLength: number): number {
  if (playlistLength <= 0) return 0
  return currentIndex === 0 ? playlistLength - 1 : currentIndex - 1
}

export function shufflePlaylist(trackIds: string[], random = Math.random): string[] {
  const shuffled = [...trackIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
