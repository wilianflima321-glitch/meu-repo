'use client';

import dynamic from 'next/dynamic';

// Dynamically import GameViewport to avoid SSR issues with Canvas/WebGL
const GameViewport = dynamic(() => import('./engine/GameViewport'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
      Inicializando Engine 3D...
    </div>
  ),
});

export default function VRPreview() {
  return <GameViewport mode="edit" />;
}
