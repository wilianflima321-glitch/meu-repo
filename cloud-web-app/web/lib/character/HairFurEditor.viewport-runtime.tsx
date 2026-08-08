import { tokenColor } from '@/lib/design-system/DesignTokenSync'
'use client';
// @aethel-heavy-async-boundary
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type {
  BrushSettings,
  ClumpingSettings,
  CurlSettings,
  GradientStop,
  HairPreset,
  HairRegion,
  LODSettings,
  PhysicsSettings,
} from '@/components/character/hair-fur-model';
import { BrushPreview, HairStrands3D, HeadMesh, LODPreview, readOrbitDistance } from './HairFurEditor.parts-runtime';

export interface HairFurViewportProps {
  strandCount: number;
  regions: HairRegion[];
  clumping: ClumpingSettings;
  curl: CurlSettings;
  gradient: GradientStop[];
  physics: PhysicsSettings;
  lod: LODSettings;
  preset: HairPreset;
  brush: BrushSettings;
  brushActive: boolean;
  animatePhysics: boolean;
  cameraDistance: number;
  onBrushInactive: () => void;
  onCameraDistanceChange: (distance: number) => void;
  onAnimatePhysicsChange: (enabled: boolean) => void;
}

export function HairFurViewport({
  strandCount,
  regions,
  clumping,
  curl,
  gradient,
  physics,
  lod,
  preset,
  brush,
  brushActive,
  animatePhysics,
  cameraDistance,
  onBrushInactive,
  onCameraDistanceChange,
  onAnimatePhysicsChange,
}: HairFurViewportProps) {
  return (
    <div className="flex-1 relative">
      <Canvas
        camera={{ position: [0, 1, 3], fov: 50 }}
        onPointerMissed={onBrushInactive}
        className="w-full h-full"
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />
        <pointLight position={[0, 2, 0]} intensity={0.5} color={tokenColor("--aethel-hair-light")} />
        <HeadMesh />
        <HairStrands3D
          strandCount={strandCount}
          regions={regions}
          clumping={clumping}
          curl={curl}
          gradient={gradient}
          physics={physics}
          animatePhysics={animatePhysics}
        />
        <BrushPreview brush={brush} active={brushActive} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={1}
          maxDistance={10}
          onChange={(event: any) => {
            if (event?.target) {
              onCameraDistanceChange(readOrbitDistance(event.target));
            }
          }}
        />
        <gridHelper args={[10, 10, tokenColor('--aethel-grid-major'), tokenColor('--aethel-grid-minor')]} position={[0, -0.5, 0]} />
      </Canvas>
      <div className="absolute top-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] backdrop-blur-sm rounded-lg p-3 text-sm space-y-1">
        <div className="text-[var(--aethel-text-tertiary)]">
          Strands: <span className="text-[var(--aethel-info-light)] font-mono">{strandCount.toLocaleString()}</span>
        </div>
        <div className="text-[var(--aethel-text-tertiary)]">
          Preset: <span className="text-[var(--aethel-info-light)] capitalize">{preset}</span>
        </div>
        <div className="text-[var(--aethel-text-tertiary)]">
          Physics: <span className={animatePhysics ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]'}>{animatePhysics ? 'Active' : 'Paused'}</span>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          type="button"
          aria-label={animatePhysics ? 'Pause hair physics simulation' : 'Resume hair physics simulation'}
          onClick={() => onAnimatePhysicsChange(!animatePhysics)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            animatePhysics
              ? 'bg-[var(--aethel-success)] hover:brightness-110 text-[var(--aethel-text-primary)]'
              : 'bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
          }`}
        >
          {animatePhysics ? 'Pause physics' : 'Animate physics'}
        </button>
      </div>
      <div className="absolute bottom-4 right-4 w-64">
        <LODPreview lod={lod} currentDistance={cameraDistance} />
      </div>
    </div>
  );
}
