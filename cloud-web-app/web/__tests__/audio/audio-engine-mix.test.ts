import { describe, expect, it } from 'vitest'
import {
  calculateDuckedVolume,
  calculateEffectiveVolume,
  calculateInstanceVolume,
  clampVolume,
  createAudioInstanceId,
  hasPlayingVoice,
  nextPlaylistIndex,
  previousPlaylistIndex,
  resolveAudioSources,
  shufflePlaylist,
} from '@/lib/audio-engine.mix'
import type { AudioTrack, ChannelConfig } from '@/lib/audio-engine.types'

const master: ChannelConfig = { volume: 0.5, muted: false, ducking: 0 }
const bgm: ChannelConfig = { volume: 0.8, muted: false, ducking: 0.3 }

const track: AudioTrack = {
  id: 'theme',
  name: 'Theme',
  src: '/theme.ogg',
  channel: 'bgm',
  volume: 0.75,
  loop: true,
}

describe('audio-engine mix helpers', () => {
  it('calculates bounded effective volume and source lists', () => {
    expect(clampVolume(2)).toBe(1)
    expect(clampVolume(-1)).toBe(0)
    expect(resolveAudioSources('/one.ogg')).toEqual(['/one.ogg'])
    expect(resolveAudioSources(['/one.ogg', '/two.mp3'])).toEqual(['/one.ogg', '/two.mp3'])

    expect(calculateEffectiveVolume({ track, channel: bgm, master })).toBeCloseTo(0.3)
    expect(calculateInstanceVolume({ volume: 0.5, channel: bgm, master })).toBeCloseTo(0.2)
  })

  it('calculates ducking only while voice is playing', () => {
    expect(hasPlayingVoice([
      { channel: 'voice', state: 'paused' },
      { channel: 'bgm', state: 'playing' },
    ])).toBe(false)

    expect(hasPlayingVoice([{ channel: 'voice', state: 'playing' }])).toBe(true)
    expect(calculateDuckedVolume({ channel: bgm, master, voicePlaying: true })).toBeCloseTo(0.28)
    expect(calculateDuckedVolume({ channel: bgm, master, voicePlaying: false })).toBeCloseTo(0.4)
  })

  it('keeps playlist navigation deterministic', () => {
    expect(nextPlaylistIndex(2, 3)).toBe(0)
    expect(previousPlaylistIndex(0, 3)).toBe(2)
    expect(createAudioInstanceId('theme', 123, 0.5)).toBe('theme-123-i')
    expect(shufflePlaylist(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a'])
  })
})
