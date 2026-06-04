'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import CreativeStudioShell, { CreativeStudioLoading } from './CreativeStudioShell'

type StudioGroupId = 'world' | 'character' | 'fx'

type StudioGroupedEditor = {
  id: string
  label: string
  description: string
  maturity: 'BETA' | 'ALPHA'
  render: () => JSX.Element
}

const LevelEditor = dynamic(() => import('@/components/engine/LevelEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Level Studio" />,
})
const SceneEditor = dynamic(() => import('@/components/scene-editor/SceneEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Scene Studio" />,
})
const MaterialEditor = dynamic(() => import('@/components/materials/MaterialEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Material Studio" />,
})
const TerrainEditor = dynamic(() => import('@/components/terrain/TerrainSculptingEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Terrain Studio" />,
})
const LandscapeEditor = dynamic(() => import('@/components/engine/LandscapeEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Landscape Studio" />,
})
const FoliageEditor = dynamic(() => import('@/components/environment/FoliagePainter'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Foliage Studio" />,
})
const WaterEditor = dynamic(() => import('@/components/environment/WaterEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Water Studio" />,
})
const AnimationBlueprint = dynamic(() => import('@/components/engine/AnimationBlueprint'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Animation Studio" />,
})
const RigEditor = dynamic(() => import('@/components/character/ControlRigEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Rig Studio" />,
})
const FacialEditor = dynamic(() => import('@/components/character/FacialAnimationEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Facial Studio" />,
})
const HairEditor = dynamic(() => import('@/components/character/HairFurEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Hair Studio" />,
})
const ClothEditor = dynamic(() => import('@/components/physics/ClothSimulationEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Cloth Studio" />,
})
const NiagaraVFX = dynamic(() => import('@/components/engine/NiagaraVFX'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="VFX Studio" />,
})
const FluidEditor = dynamic(() => import('@/components/physics/FluidSimulationEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Fluid Studio" />,
})
const SpriteEditor = dynamic(() => import('@/components/editors/SpriteEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Sprite Studio" />,
})

const GROUP_COPY: Record<StudioGroupId, { title: string; subtitle: string; activeHref: string }> = {
  world: {
    title: 'World Studio',
    subtitle: 'Levels, scenes, terrain, materials, foliage, and water in one focused workspace.',
    activeHref: '/studio/level',
  },
  character: {
    title: 'Character Studio',
    subtitle: 'Animation, rig, facial, hair, and cloth review without route sprawl.',
    activeHref: '/studio/animation',
  },
  fx: {
    title: 'FX Studio',
    subtitle: 'VFX, fluid, and sprite passes behind one compact production board.',
    activeHref: '/studio/vfx',
  },
}

const EDITORS: Record<StudioGroupId, StudioGroupedEditor[]> = {
  world: [
    { id: 'level', label: 'Level', description: 'Playable space, spawn points, streaming regions.', maturity: 'BETA', render: () => <Suspense fallback={<CreativeStudioLoading label="Level Studio" />}><LevelEditor /></Suspense> },
    { id: 'scene', label: 'Scene', description: 'Hierarchy, cameras, lights, transforms.', maturity: 'BETA', render: () => <Suspense fallback={<CreativeStudioLoading label="Scene Studio" />}><SceneEditor /></Suspense> },
    { id: 'material', label: 'Material', description: 'PBR surfaces and texture decisions.', maturity: 'BETA', render: () => <Suspense fallback={<CreativeStudioLoading label="Material Studio" />}><MaterialEditor /></Suspense> },
    { id: 'terrain', label: 'Terrain', description: 'Heightmaps, biome zones, erosion passes.', maturity: 'BETA', render: () => <Suspense fallback={<CreativeStudioLoading label="Terrain Studio" />}><TerrainEditor /></Suspense> },
    { id: 'landscape', label: 'Landscape', description: 'Open-world layers and streaming layout.', maturity: 'BETA', render: () => <Suspense fallback={<CreativeStudioLoading label="Landscape Studio" />}><LandscapeEditor /></Suspense> },
    { id: 'foliage', label: 'Foliage', description: 'Density, slope, LOD, collision, wind.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Foliage Studio" />}><FoliageEditor sceneId="studio-scene" /></Suspense> },
    { id: 'water', label: 'Water', description: 'Rivers, oceans, foam, flow maps, buoyancy.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Water Studio" />}><WaterEditor sceneId="studio-scene" /></Suspense> },
  ],
  character: [
    { id: 'animation', label: 'Animation', description: 'Blueprint planning, transitions, timing.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Animation Studio" />}><AnimationBlueprint /></Suspense> },
    { id: 'rig', label: 'Rig', description: 'IK/FK chains, constraints, control handoff.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Rig Studio" />}><RigEditor characterId="studio-character" /></Suspense> },
    { id: 'facial', label: 'Facial', description: 'FACS poses, visemes, emotions, continuity.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Facial Studio" />}><FacialEditor characterId="studio-character" /></Suspense> },
    { id: 'hair', label: 'Hair', description: 'Groom regions, strand physics, LODs.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Hair Studio" />}><HairEditor characterId="studio-character" /></Suspense> },
    { id: 'cloth', label: 'Cloth', description: 'Garments, wind, pinning, collisions.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Cloth Studio" />}><ClothEditor meshId="studio-cloth" /></Suspense> },
  ],
  fx: [
    { id: 'vfx', label: 'VFX', description: 'Particles, combat readability, cinematic cues.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="VFX Studio" />}><NiagaraVFX /></Suspense> },
    { id: 'fluid', label: 'Fluid', description: 'Liquids, SPH particles, simulation volumes.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Fluid Studio" />}><FluidEditor volumeId="studio-fluid" /></Suspense> },
    { id: 'sprite', label: 'Sprite', description: '2D sprites, animation frames, pixel passes.', maturity: 'ALPHA', render: () => <Suspense fallback={<CreativeStudioLoading label="Sprite Studio" />}><SpriteEditor /></Suspense> },
  ],
}

function tabClass(active: boolean) {
  return active
    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_44%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
    : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)]'
}

export default function StudioGroupedEditorClient({ group }: { group: StudioGroupId }) {
  const searchParams = useSearchParams()
  const editors = EDITORS[group]
  const copy = GROUP_COPY[group]
  const requestedTool = searchParams?.get('tool') ?? null
  const selected = editors.find((editor) => editor.id === requestedTool) || editors[0]

  return (
    <CreativeStudioShell title={copy.title} subtitle={copy.subtitle} activeHref={copy.activeHref}>
      <div className="flex h-full min-h-0 bg-[var(--aethel-surface-primary)]">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-3 lg:block">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            {copy.title}
          </p>
          <div className="space-y-2" data-studio-group-editor={group}>
            {editors.map((editor) => (
              <Link
                key={editor.id}
                href={`${copy.activeHref}?tool=${editor.id}`}
                className={`${tabClass(selected.id === editor.id)} block rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition-colors`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{editor.label}</span>
                  <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                    {editor.maturity}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 block text-[10px] font-normal leading-4 text-[var(--aethel-text-tertiary)]">
                  {editor.description}
                </span>
              </Link>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto" data-studio-group-editor={group}>
              {editors.map((editor) => (
                <Link
                  key={editor.id}
                  href={`${copy.activeHref}?tool=${editor.id}`}
                  className={`${tabClass(selected.id === editor.id)} inline-flex min-h-10 shrink-0 items-center rounded-xl border px-3 text-xs font-semibold`}
                >
                  {editor.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {selected.render()}
          </div>
        </div>
      </div>
    </CreativeStudioShell>
  )
}
