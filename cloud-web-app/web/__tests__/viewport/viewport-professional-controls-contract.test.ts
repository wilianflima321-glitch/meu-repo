import { readFileSync } from 'node:fs'

describe('viewport professional controls contract', () => {
  const source = readFileSync('components/viewport/AethelViewport3D.tsx', 'utf8')

  it('keeps DCC-grade transform hotkeys without hijacking editable fields', () => {
    expect(source).toContain('isEditableKeyboardTarget')
    expect(source).toContain("event.code === 'KeyW'")
    expect(source).toContain("onTransformModeChange('translate')")
    expect(source).toContain("event.code === 'KeyE'")
    expect(source).toContain("onTransformModeChange('rotate')")
    expect(source).toContain("event.code === 'KeyR'")
    expect(source).toContain("onTransformModeChange('scale')")
    expect(source).toContain("event.code === 'Escape'")
    expect(source).toContain('onSelectionChange([])')
  })

  it('keeps asset intake in the viewport instead of adding another dashboard', () => {
    expect(source).toContain('onDragOver={handleAssetDragOver}')
    expect(source).toContain('onDrop={handleAssetDrop}')
    expect(source).toContain('Drop assets into the Scene Graph')
    expect(source).toContain('license review')
  })
})
