'use client'

/**
 * Onda A.1 — live heightfield mesh + physics collider visualization inside the viewport Canvas.
 * Loads durable heights (includeHeights) — never ships sin-wave mock terrain as the live surface.
 * Letter be — also listens for splatmap paint refresh and blends layer colors into vertex colors.
 * Letter bf — also listens for foliage placement refresh and draws InstancedMesh instances.
 */

import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildGeometryFromHeightfield,
  buildHeightfieldPhysicsViz,
  heightfieldMetaFingerprint,
} from '@/lib/production/heightfield-viewport-bridge'
import {
  buildRapierHeightfieldColliderParams,
  heightfieldPhysicsHonesty,
} from '@/lib/production/heightfield-physics-substrate'
import { TERRAIN_HEIGHTFIELD_CHANGED_EVENT } from '@/lib/production/landscape-heightfield-bridge'
import { TERRAIN_SPLATMAP_CHANGED_EVENT } from '@/lib/production/landscape-splatmap-bridge'
import { TERRAIN_FOLIAGE_CHANGED_EVENT } from '@/lib/production/landscape-foliage-bridge'
import type { HeightfieldDocument, HeightfieldMeta } from '@/lib/production/terrain-heightfield-authority'
import { decodeHeightsBase64 } from '@/lib/production/terrain-heightfield-math'
import {
  decodeWeightsBase64,
  parseCssColor,
  type SplatmapMeta,
} from '@/lib/production/terrain-splatmap-math'
import type { FoliageDocumentMeta, FoliageInstanceRecord } from '@/lib/production/terrain-foliage-math'
import { resolveCssVarColor } from '@/lib/style/resolve-css-var'
import { TerrainFoliageLiveInstances } from '@/components/preview/TerrainFoliageLiveInstances'

const log = createComponentLogger('TerrainHeightfieldLiveLayer')

export { TERRAIN_HEIGHTFIELD_CHANGED_EVENT, TERRAIN_SPLATMAP_CHANGED_EVENT, TERRAIN_FOLIAGE_CHANGED_EVENT }

type LoadedDoc = {
  meta: HeightfieldMeta
  heights: Float32Array
}

type LoadedSplat = {
  meta: SplatmapMeta
  weights: Float32Array
}

type LoadedFoliage = {
  meta: FoliageDocumentMeta
  instances: FoliageInstanceRecord[]
}

async function fetchHeightfieldDocument(projectId: string, terrainId: string): Promise<LoadedDoc | null> {
  const qs = new URLSearchParams({
    projectId,
    terrainId,
    includeHeights: '1',
  })
  const res = await fetch(`/api/runtime/terrain-heightfield?${qs.toString()}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`heightfield load ${res.status}`)
  const data = (await res.json()) as {
    mock?: boolean
    meta?: HeightfieldMeta | null
    heightsBase64?: string | null
  }
  if (data.mock === true) throw new Error('Heightfield API returned mock — forbidden')
  if (!data.meta) return null
  if (!data.heightsBase64) {
    throw new Error('Heightfield API omitted heights — A.1 requires includeHeights')
  }
  const heights = decodeHeightsBase64(
    data.heightsBase64,
    data.meta.resolution * data.meta.resolution,
  )
  return { meta: data.meta, heights }
}

async function fetchSplatmapDocument(projectId: string, terrainId: string): Promise<LoadedSplat | null> {
  const qs = new URLSearchParams({
    projectId,
    terrainId,
    includeWeights: '1',
  })
  const res = await fetch(`/api/runtime/terrain-splatmap?${qs.toString()}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    mock?: boolean
    meta?: SplatmapMeta | null
    weightsBase64?: string | null
  }
  if (data.mock === true) throw new Error('Splatmap API returned mock — forbidden')
  if (!data.meta || !data.weightsBase64) return null
  const expected = data.meta.resolution * data.meta.resolution * data.meta.layerCount
  return {
    meta: data.meta,
    weights: decodeWeightsBase64(data.weightsBase64, expected),
  }
}

async function fetchFoliageDocument(projectId: string, terrainId: string): Promise<LoadedFoliage | null> {
  const qs = new URLSearchParams({
    projectId,
    terrainId,
    includeInstances: '1',
  })
  const res = await fetch(`/api/runtime/terrain-foliage?${qs.toString()}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    mock?: boolean
    meta?: FoliageDocumentMeta | null
    instances?: FoliageInstanceRecord[] | null
  }
  if (data.mock === true) throw new Error('Foliage API returned mock — forbidden')
  if (!data.meta || !Array.isArray(data.instances)) return null
  return { meta: data.meta, instances: data.instances }
}

export function TerrainHeightfieldLiveLayer({
  projectId,
  terrainId = 'default',
  showPhysicsViz = true,
  refreshToken,
  onLiveChange,
}: {
  projectId?: string | null
  terrainId?: string
  showPhysicsViz?: boolean
  /** Bump when brush panel persists strokes */
  refreshToken?: number | string
  onLiveChange?: (live: boolean) => void
}) {
  const [doc, setDoc] = useState<LoadedDoc | null>(null)
  const [splat, setSplat] = useState<LoadedSplat | null>(null)
  const [foliage, setFoliage] = useState<LoadedFoliage | null>(null)
  const [tick, setTick] = useState(0)

  const terrainColor = useMemo(
    () => resolveCssVarColor('--aethel-success', 'rgb(74, 124, 74)'),
    [],
  )
  const physicsColor = useMemo(
    () => resolveCssVarColor('--aethel-info-light', 'rgb(56, 189, 248)'),
    [],
  )

  useEffect(() => {
    const onChanged = () => setTick((n) => n + 1)
    window.addEventListener(TERRAIN_HEIGHTFIELD_CHANGED_EVENT, onChanged)
    window.addEventListener(TERRAIN_SPLATMAP_CHANGED_EVENT, onChanged)
    window.addEventListener(TERRAIN_FOLIAGE_CHANGED_EVENT, onChanged)
    return () => {
      window.removeEventListener(TERRAIN_HEIGHTFIELD_CHANGED_EVENT, onChanged)
      window.removeEventListener(TERRAIN_SPLATMAP_CHANGED_EVENT, onChanged)
      window.removeEventListener(TERRAIN_FOLIAGE_CHANGED_EVENT, onChanged)
    }
  }, [])

  useEffect(() => {
    if (!projectId?.trim()) {
      setDoc(null)
      setSplat(null)
      setFoliage(null)
      onLiveChange?.(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [loaded, loadedSplat, loadedFoliage] = await Promise.all([
          fetchHeightfieldDocument(projectId.trim(), terrainId),
          fetchSplatmapDocument(projectId.trim(), terrainId).catch(() => null),
          fetchFoliageDocument(projectId.trim(), terrainId).catch(() => null),
        ])
        if (cancelled) return
        setDoc(loaded)
        setSplat(loadedSplat)
        setFoliage(loadedFoliage)
        onLiveChange?.(Boolean(loaded))
      } catch (err) {
        if (cancelled) return
        setDoc(null)
        setSplat(null)
        setFoliage(null)
        onLiveChange?.(false)
        log.warn('a1_terrain_viewport_load_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, terrainId, refreshToken, tick, onLiveChange])

  const meshBuild = useMemo(() => {
    if (!doc) return null
    try {
      const built = buildGeometryFromHeightfield(doc as HeightfieldDocument, { maxSegments: 96 })
      if (splat && splat.meta.resolution === doc.meta.resolution) {
        const res = doc.meta.resolution
        const layerCount = splat.meta.layerCount
        const widthMeters = doc.meta.widthMeters
        const depthMeters = doc.meta.depthMeters
        const pos = built.geometry.attributes.position as THREE.BufferAttribute
        const colors = new Float32Array(pos.count * 3)
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const z = pos.getZ(i)
          const u = x / widthMeters + 0.5
          const v = z / depthMeters + 0.5
          const hx = Math.min(res - 1, Math.max(0, Math.round(u * (res - 1))))
          const hz = Math.min(res - 1, Math.max(0, Math.round(v * (res - 1))))
          const base = (hz * res + hx) * layerCount
          let r = 0
          let g = 0
          let b = 0
          for (let c = 0; c < layerCount; c++) {
            const w = splat.weights[base + c] ?? 0
            const parsed = parseCssColor(splat.meta.layers[c]?.color ?? 'rgb(74,124,74)')
            r += parsed.r * w
            g += parsed.g * w
            b += parsed.b * w
          }
          colors[i * 3] = r
          colors[i * 3 + 1] = g
          colors[i * 3 + 2] = b
        }
        built.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      }
      return built
    } catch (err) {
      log.warn('a1_terrain_geometry_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }, [doc, splat])

  const physicsViz = useMemo(() => {
    if (!doc || !showPhysicsViz) return null
    return buildHeightfieldPhysicsViz(doc as HeightfieldDocument)
  }, [doc, showPhysicsViz])

  const physicsParams = useMemo(() => {
    if (!doc) return null
    try {
      return buildRapierHeightfieldColliderParams(doc as HeightfieldDocument)
    } catch {
      return null
    }
  }, [doc])

  const physicsHonesty = useMemo(
    () => heightfieldPhysicsHonesty(doc as HeightfieldDocument | null),
    [doc],
  )

  const useVertexColors = Boolean(splat && doc && splat.meta.resolution === doc.meta.resolution)

  useEffect(() => {
    return () => {
      meshBuild?.geometry.dispose()
    }
  }, [meshBuild])

  if (!meshBuild) return null

  const fingerprint = doc ? heightfieldMetaFingerprint(doc.meta) : 'none'

  return (
    <group
      name="aethel-a1-heightfield"
      userData={{
        aethelTerrain: true,
        fingerprint,
        mock: false,
        physicsHonesty,
        splatStrokeCount: splat?.meta.strokeCount ?? 0,
        foliageInstanceCount: foliage?.instances.length ?? 0,
        rapierCollider: physicsParams
          ? {
              nrows: physicsParams.nrows,
              ncols: physicsParams.ncols,
              scale: physicsParams.scale,
              source: physicsParams.source,
              mock: false,
            }
          : null,
      }}
    >
      <mesh
        geometry={meshBuild.geometry}
        receiveShadow
        castShadow
        userData={{ aethelObjectId: 'terrain-heightfield-default', aethelTerrain: true }}
      >
        <meshStandardMaterial
          color={useVertexColors ? '#ffffff' : terrainColor}
          vertexColors={useVertexColors}
          roughness={0.88}
          metalness={0.06}
        />
      </mesh>
      {foliage && foliage.instances.length > 0 ? (
        <TerrainFoliageLiveInstances
          instances={foliage.instances}
          types={foliage.meta.types}
        />
      ) : null}
      {physicsViz && physicsViz.segmentCount > 0 ? (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[physicsViz.positions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={physicsColor} transparent opacity={0.55} depthTest />
        </lineSegments>
      ) : null}
    </group>
  )
}
