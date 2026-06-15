'use client';

import dynamic from 'next/dynamic';
import { Outliner3D } from '@/components/ide/Outliner3D';
import { PropertiesPanel3D } from '@/components/ide/PropertiesPanel3D';
import { Timeline3D } from '@/components/ide/Timeline3D';
import { PreviewSkeleton } from '@/components/preview/PreviewLifecycleChrome';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';

const NexusCanvasV2 = ({ renderMode }: { renderMode: 'draft' | 'cinematic' }) => (
  <div className="flex h-full w-full items-center justify-center bg-[var(--aethel-surface-primary)]">
    <div className="text-center text-xs text-[var(--aethel-text-secondary)]">
      Canvas mode (Nexus) deprecated.
      <div className="mt-1 text-[10px] text-[var(--aethel-text-tertiary)]">Render Mode: {renderMode}</div>
    </div>
  </div>
);

export default function CanvasViewportSurface({ renderMode }: { renderMode: 'draft' | 'cinematic' }) {
  return (
    <ViewportWorkbenchShell
      mode="canvas"
      title="Aethel Canvas Mode"
      subtitle={`Canvas connected to the project to explore variants, visual research, and composition ${renderMode}.`}
      left={<Outliner3D />}
      center={<NexusCanvasV2 renderMode={renderMode} />}
      right={<PropertiesPanel3D />}
      bottom={<Timeline3D duration={8} />}
    />
  );
}
