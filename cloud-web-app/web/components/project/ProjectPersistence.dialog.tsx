'use client'

import { useState } from 'react'
import type { ProjectSettings } from './project-persistence-models'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, settings: Partial<ProjectSettings>) => void
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('Untitled Project')
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const [frameRate, setFrameRate] = useState(30)

  if (!open) return null

  const presets = [
    { label: '1080p HD', width: 1920, height: 1080 },
    { label: '4K UHD', width: 3840, height: 2160 },
    { label: '720p HD', width: 1280, height: 720 },
    { label: 'Instagram Square', width: 1080, height: 1080 },
    { label: 'Instagram Story', width: 1080, height: 1920 },
    { label: 'YouTube Shorts', width: 1080, height: 1920 },
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--aethel-surface-secondary)',
        borderRadius: 8,
        padding: 24,
        minWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <h2 style={{ color: 'var(--aethel-text-primary)', margin: '0 0 20px 0', fontSize: 18 }}>New Project</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Project name */}
          <div>
            <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--aethel-surface-primary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: 4,
                color: 'var(--aethel-text-primary)',
                fontSize: 14
              }}
            />
          </div>

          {/* Resolution presets */}
          <div>
            <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
              Resolution Preset
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {presets.map(preset => (
                <button type="button"
                  key={preset.label}
                  onClick={() => {
                    setWidth(preset.width)
                    setHeight(preset.height)
                  }}
                  style={{
                    padding: '6px 12px',
                    background: width === preset.width && height === preset.height ? 'var(--aethel-info)' : 'var(--aethel-border-primary)',
                    border: 'none',
                    borderRadius: 4,
                    color: 'var(--aethel-text-primary)',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom resolution */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                Width
              </label>
              <input
                type="number"
                value={width}
                onChange={e => setWidth(parseInt(e.target.value) || 1920)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--aethel-surface-primary)',
                  border: '1px solid var(--aethel-border-primary)',
                  borderRadius: 4,
                  color: 'var(--aethel-text-primary)',
                  fontSize: 14
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                Height
              </label>
              <input
                type="number"
                value={height}
                onChange={e => setHeight(parseInt(e.target.value) || 1080)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--aethel-surface-primary)',
                  border: '1px solid var(--aethel-border-primary)',
                  borderRadius: 4,
                  color: 'var(--aethel-text-primary)',
                  fontSize: 14
                }}
              />
            </div>
          </div>

          {/* Frame rate */}
          <div>
            <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: 11, display: 'block', marginBottom: 4 }}>
              Frame Rate
            </label>
            <select
              value={frameRate}
              onChange={e => setFrameRate(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--aethel-surface-primary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: 4,
                color: 'var(--aethel-text-primary)',
                fontSize: 14
              }}
            >
              <option value={24}>24 fps (Cinema)</option>
              <option value={25}>25 fps (PAL)</option>
              <option value={30}>30 fps (NTSC)</option>
              <option value={50}>50 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: 4,
              color: 'var(--aethel-text-tertiary)',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button type="button"
            onClick={() => {
              onCreate(name, {
                resolution: { width, height },
                frameRate
              })
              onClose()
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--aethel-info)',
              border: 'none',
              borderRadius: 4,
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
