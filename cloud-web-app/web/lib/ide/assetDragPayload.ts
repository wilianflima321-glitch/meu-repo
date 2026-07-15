/**
 * Universal Asset Drag Payload — the single shared contract for dragging an
 * asset (texture, material, ...) out of the File Explorer and dropping it
 * onto any compatible target: a mesh in the 3D viewport
 * (`SceneViewportStage.tsx`), a Visual Scripting node port
 * (`VisualScriptEditor.tsx`), or a PropertiesPanel3D input.
 *
 * Lives in `web/lib/` (not inside `ide-ui` or `visual-scripting`) on purpose:
 * those two packages intentionally avoid depending on each other directly
 * (see `CommandPalette.parts.tsx`'s "Golden Rule 1" doc comment) — the host
 * app is the one place both are already known to reach into freely, so this
 * is the neutral ground where the shared drag contract belongs.
 */

export const AETHEL_ASSET_DRAG_MIME = 'application/x-aethel-asset'

export type DraggableAssetKind = 'texture' | 'material'

export interface AssetDragPayload {
  path: string
  name: string
  kind: DraggableAssetKind
}

export function readAssetDragPayload(dataTransfer: DataTransfer): AssetDragPayload | null {
  if (!dataTransfer.types.includes(AETHEL_ASSET_DRAG_MIME)) return null
  try {
    const raw = dataTransfer.getData(AETHEL_ASSET_DRAG_MIME)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AssetDragPayload>
    if (typeof parsed.path !== 'string' || typeof parsed.name !== 'string') return null
    if (parsed.kind !== 'texture' && parsed.kind !== 'material') return null
    return { path: parsed.path, name: parsed.name, kind: parsed.kind }
  } catch {
    return null
  }
}
