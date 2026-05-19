'use client'

import { useState } from 'react'
import { Monitor, Smartphone, Tablet, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

type Device = 'desktop' | 'tablet' | 'mobile'

interface DevicePreviewProps {
  children: React.ReactNode
  defaultDevice?: Device
}

const DEVICE_CONFIGS: Record<Device, { width: number; height: number; label: string }> = {
  desktop: { width: 1920, height: 1080, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 667, label: 'Mobile' },
}

export function DevicePreview({ children, defaultDevice = 'desktop' }: DevicePreviewProps) {
  const [device, setDevice] = useState<Device>(defaultDevice)
  const [zoom, setZoom] = useState(100)
  const [isRotated, setIsRotated] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const config = DEVICE_CONFIGS[device]
  const effectiveWidth = isRotated ? config.height : config.width
  const effectiveHeight = isRotated ? config.width : config.height

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50))
  const handleResetZoom = () => setZoom(100)

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Device Controls */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`p-2 rounded-lg transition-colors ${
              device === 'desktop' ?
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
            }`}
            title="Desktop"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`p-2 rounded-lg transition-colors ${
              device === 'tablet' ?
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
            }`}
            title="Tablet"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`p-2 rounded-lg transition-colors ${
              device === 'mobile' ?
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
            }`}
            title="Mobile"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{config.label}</span>
          <button
            type="button"
            onClick={() => setIsRotated(!isRotated)}
            className={`p-2 rounded-lg transition-colors ${
              isRotated ?
                 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
            }`}
            title="Rotacionar dispositivo"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[var(--aethel-text-secondary)] w-12 text-center">{zoom}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] px-2 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-lg transition-colors ${
              isFullscreen ?
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
            }`}
            title="Tela cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Device Frame */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]">
        <div
          className="relative bg-[var(--aethel-text-primary)] shadow-2xl transition-transform duration-200"
          style={{
            width: `${effectiveWidth * (zoom / 100)}px`,
            height: `${effectiveHeight * (zoom / 100)}px`,
            transform: isFullscreen ? 'scale(1)' : 'scale(1)',
          }}
        >
          {/* Device Frame Styling */}
          <div className="absolute inset-0 pointer-events-none border-4 border-[var(--aethel-border-primary)] rounded-lg" />
          
          {/* Device Notch (for mobile) */}
          {device === 'mobile' && !isRotated && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[var(--aethel-border-primary)] rounded-b-xl" />
          )}

          {/* Content */}
          <div className="w-full h-full overflow-auto bg-[var(--aethel-text-primary)]">
            {children}
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
          <span>{effectiveWidth} x {effectiveHeight}px</span>
          <span>{zoom}% zoom</span>
        </div>
      </div>
    </div>
  )
}
