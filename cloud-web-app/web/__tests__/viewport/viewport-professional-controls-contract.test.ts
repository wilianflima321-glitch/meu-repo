import { readFileSync } from 'node:fs'

describe('viewport professional controls contract', () => {
  const source = readFileSync('components/viewport/AethelViewport3D.tsx', 'utf8')
  const cameraPresetSource = readFileSync('components/viewport/ViewportCameraPresetApplier.tsx', 'utf8')

  it('keeps DCC-grade transform hotkeys without hijacking editable fields', () => {
    expect(source).toContain('isEditableViewportKeyboardTarget')
    expect(source).toContain("event.code === 'KeyW'")
    expect(source).toContain("onTransformModeChange('translate')")
    expect(source).toContain("event.code === 'KeyE'")
    expect(source).toContain("onTransformModeChange('rotate')")
    expect(source).toContain("event.code === 'KeyR'")
    expect(source).toContain("onTransformModeChange('scale')")
    expect(source).toContain("event.code === 'Escape'")
    expect(source).toContain('onSelectionChange([])')
  })

  it('keeps camera presets for professional scene review', () => {
    expect(cameraPresetSource).toContain('ViewportCameraPreset')
    expect(source).toContain('CameraPresetApplier')
    expect(cameraPresetSource).toContain('perspective: [3.8, 2.4, 4.8]')
    expect(cameraPresetSource).toContain('top: [0, 8.5, 0.001]')
    expect(cameraPresetSource).toContain('front: [0, 1.6, 7.2]')
    expect(cameraPresetSource).toContain('side: [7.2, 1.6, 0]')
    expect(source).toContain('Use Top/Front/Side')
  })

  it('keeps asset intake in the viewport instead of adding another dashboard', () => {
    expect(source).toContain('onDragOver={handleAssetDragOver}')
    expect(source).toContain('onDrop={handleAssetDrop}')
    expect(source).toContain('Drop assets into the Scene Graph')
    expect(source).toContain('license review')
  })
})
