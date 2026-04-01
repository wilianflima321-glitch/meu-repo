'use client';

import dynamic from 'next/dynamic';

// Dynamically import GameViewport to avoid SSR issues with Canvas/WebGL
const GameViewport = dynamic(() => import('./engine/GameViewport'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)]">
      Inicializando Engine 3D...
    </div>
  ),
});

export default function VRPreview() {
  return <GameViewport mode="edit" />;
}

