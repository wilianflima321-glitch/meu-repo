'use client';

import dynamic from 'next/dynamic';
import { Outliner3D } from '@/components/ide/Outliner3D';
import { PropertiesPanel3D } from '@/components/ide/PropertiesPanel3D';
import { Timeline3D } from '@/components/ide/Timeline3D';
import { PreviewSkeleton } from '@/components/preview/PreviewLifecycleChrome';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';

const NexusCanvasV2 = dynamic(
  () => import('@/components/nexus/NexusCanvasV2').then((mod) => mod.NexusCanvasV2),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

export default function CanvasViewportSurface({ renderMode }: { renderMode: 'draft' | 'cinematic' }) {
  return (
    <ViewportWorkbenchShell
      mode="canvas"
      title="Aethel Canvas Mode"
      subtitle={`Canvas conectado ao projeto para explorar variantes, research visual e composicao ${renderMode}.`}
      left={<Outliner3D />}
      center={<NexusCanvasV2 renderMode={renderMode} />}
      right={<PropertiesPanel3D />}
      bottom={<Timeline3D duration={8} />}
    />
  );
}
