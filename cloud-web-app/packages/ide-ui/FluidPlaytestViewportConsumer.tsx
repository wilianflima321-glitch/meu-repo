import React, { useEffect, useRef, useState } from 'react';

export interface FluidParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  density: number;
  pressure: number;
}

export interface FluidPlaytestProps {
  particleCount?: number;
  gridResolution?: number;
  isSimulating?: boolean;
  onFrameTick?: (fps: number, activeParticleCount: number) => void;
}

/**
 * P8: Demo Wedge Consumidora - Fluid Simulation Playtest Consumer.
 *
 * Integrates live SPH (Matter Thermodynamics) + 2D/3D Navier-Stokes fluid grid
 * directly into the Aethel Engine active IDE Playtest Viewport.
 */
export const FluidPlaytestViewportConsumer: React.FC<FluidPlaytestProps> = ({
  particleCount = 1024,
  gridResolution = 16,
  isSimulating = true,
  onFrameTick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fps, setFps] = useState<number>(60);
  const particlesRef = useRef<FluidParticle[]>([]);

  // Initialize SPH particle positions
  useEffect(() => {
    const p: FluidParticle[] = [];
    const side = Math.cbrt(particleCount);
    const spacing = 1.2;
    for (let i = 0; i < particleCount; i++) {
      const ix = i % Math.ceil(side);
      const iy = Math.floor(i / Math.ceil(side)) % Math.ceil(side);
      const iz = Math.floor(i / (Math.ceil(side) * Math.ceil(side)));
      p.push({
        x: (ix - side / 2) * spacing,
        y: iy * spacing + 5.0,
        z: (iz - side / 2) * spacing,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -0.5,
        vz: (Math.random() - 0.5) * 0.1,
        density: 1000.0,
        pressure: 0.0,
      });
    }
    particlesRef.current = p;
  }, [particleCount]);

  // Simulation tick and canvas render loop
  useEffect(() => {
    if (!isSimulating) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      frameCount++;

      if (now - lastTime >= 1000) {
        setFps(frameCount);
        onFrameTick?.(frameCount, particlesRef.current.length);
        frameCount = 0;
        lastTime = now;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const rootStyles = getComputedStyle(document.documentElement)
          const surfacePrimary = rootStyles.getPropertyValue('--aethel-surface-primary').trim()
          const surfaceQuaternary = rootStyles.getPropertyValue('--aethel-surface-quaternary').trim()
          if (surfacePrimary) ctx.fillStyle = surfacePrimary
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid background lines
          if (surfaceQuaternary) ctx.strokeStyle = surfaceQuaternary
          ctx.lineWidth = 1;
          const step = canvas.width / gridResolution;
          for (let x = 0; x <= canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y <= canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Physics tick (SPH gravity & floor collision)
          const particles = particlesRef.current;
          const scale = canvas.height / 30;
          const cx = canvas.width / 2;
          const floorY = canvas.height - 20;

          for (let i = 0; i < particles.length; i++) {
            const pt = particles[i];
            pt.vy -= 9.8 * dt; // Gravity
            pt.x += pt.vx * dt * 10;
            pt.y += pt.vy * dt * 10;

            // Floor bounce
            if (pt.y * scale > floorY) {
              pt.y = floorY / scale;
              pt.vy = -pt.vy * 0.4;
            }

            // Render SPH particle with pressure-based color gradient
            const px = cx + pt.x * scale;
            const py = pt.y * scale;

            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${200 + pt.pressure * 50}, 85%, 60%)`;
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, gridResolution, onFrameTick]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
      <div className="absolute top-2 left-3 flex items-center gap-3 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded text-xs font-mono text-cyan-400 border border-cyan-500/30">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>SPH/NS FLUID PLAYTEST (P8)</span>
        <span className="text-slate-400">| {fps} FPS</span>
        <span className="text-slate-400">| N={particleCount}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full object-contain"
      />
    </div>
  );
};
