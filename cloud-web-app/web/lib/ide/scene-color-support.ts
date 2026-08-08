/**
 * Live viewport color-channel honesty for ISceneService.setColor.
 * Mirrors ViewportSceneObjectMesh: primitives/lights/cameras paint `object.color`;
 * imported meshUrl assets and PBR textureMaps do not.
 */

export type SceneColorSupportProbe = {
  type: string
  locked?: boolean
  meshUrl?: string
  textureMaps?: unknown
  asset?: { format?: string; viewerStatus?: string } | null
}

/** True when mutating `color` changes R3F pixels for this object. */
export function viewportObjectSupportsLiveColor(obj: SceneColorSupportProbe): boolean {
  if (obj.type === 'group' || obj.type === 'empty') return false
  if (!(obj.type === 'mesh' || obj.type === 'light' || obj.type === 'camera' || obj.type === 'generated-mesh')) {
    return false
  }
  // ViewportSceneObjectMesh routes meshUrl + live asset format away from object.color.
  if (obj.meshUrl && obj.asset?.format && obj.asset.viewerStatus !== 'held') {
    return false
  }
  // PBR maps force material color to white — DTO color would not paint.
  if (obj.textureMaps) return false
  return true
}

/** Accept only concrete CSS color literals Three.js materials can consume. */
export function isValidSceneColorLiteral(color: string): boolean {
  const t = color.trim()
  if (t.length === 0 || t.length > 64) return false
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) return true
  if (/^rgba?\(\s*[\d.]+\s*[,/\s]\s*[\d.]+\s*[,/\s]\s*[\d.]+/i.test(t)) return true
  return false
}
