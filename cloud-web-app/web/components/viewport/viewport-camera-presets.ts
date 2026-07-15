export type ViewportCameraPreset = 'perspective' | 'top' | 'front' | 'side'

export const VIEWPORT_CAMERA_PRESETS: ReadonlyArray<{
  id: ViewportCameraPreset
  label: string
}> = [
  { id: 'perspective', label: 'Persp' },
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
]
