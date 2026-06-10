import { describe, expect, it } from 'vitest'
import { SpatialAudioManager } from '@/lib/audio/spatial-audio-system'

describe('spatial audio manager', () => {
  it('keeps settings and state APIs deterministic without an audio device', () => {
    const manager = new SpatialAudioManager()

    expect(manager.getSettings()).toMatchObject({
      masterVolume: 1,
      musicVolume: 0.8,
      spatialEnabled: true,
      muted: false,
    })
    expect(manager.isPlaying('missing')).toBe(false)
    expect(manager.getActiveSounds()).toEqual([])

    manager.updateSettings({ sfxVolume: 0.25 })
    expect(manager.getSettings().sfxVolume).toBe(0.25)

    manager.mute()
    expect(manager.getSettings().muted).toBe(true)

    manager.toggleMute()
    expect(manager.getSettings().muted).toBe(false)

    manager.unmute()
    expect(manager.getSettings().muted).toBe(false)
  })
})
