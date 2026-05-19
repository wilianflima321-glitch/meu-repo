import { categoryColors } from "./advanced-profiler-models";
import type {
  ProfilerFrame,
  ProfilerSession,
} from "./advanced-profiler-models";

function createId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createProfilerSession(name: string): ProfilerSession {
  return {
    id: createId("profiler-session"),
    name,
    startTime: Date.now(),
    frames: [],
    averageFPS: 0,
    minFPS: Infinity,
    maxFPS: 0,
  };
}

export function generateMockProfilerFrame(frameId: number): ProfilerFrame {
  const baseTime = 10 + Math.random() * 10;
  const spike = Math.random() > 0.95 ? 20 : 0;
  const duration = baseTime + spike;

  return {
    frameId,
    timestamp: Date.now(),
    duration,
    cpuTime: duration * 0.7,
    gpuTime: duration * 0.3,
    markers: [
      {
        id: createId("marker-render"),
        name: "Render",
        category: "render",
        startTime: 0,
        duration: duration * 0.4,
        depth: 0,
        color: categoryColors.render,
        children: [
          {
            id: createId("marker-shadow"),
            name: "Shadow Pass",
            category: "render",
            startTime: 0,
            duration: duration * 0.15,
            depth: 1,
            color: categoryColors.render,
          },
          {
            id: createId("marker-main"),
            name: "Main Pass",
            category: "render",
            startTime: duration * 0.15,
            duration: duration * 0.2,
            depth: 1,
            color: categoryColors.render,
          },
        ],
      },
      {
        id: createId("marker-physics"),
        name: "Physics",
        category: "physics",
        startTime: duration * 0.4,
        duration: duration * 0.2,
        depth: 0,
        color: categoryColors.physics,
      },
      {
        id: createId("marker-animation"),
        name: "Animation",
        category: "animation",
        startTime: duration * 0.6,
        duration: duration * 0.15,
        depth: 0,
        color: categoryColors.animation,
      },
      {
        id: createId("marker-scripts"),
        name: "Scripts",
        category: "scripts",
        startTime: duration * 0.75,
        duration: duration * 0.1,
        depth: 0,
        color: categoryColors.scripts,
      },
      {
        id: createId("marker-ui"),
        name: "UI",
        category: "ui",
        startTime: duration * 0.85,
        duration: duration * 0.1,
        depth: 0,
        color: categoryColors.ui,
      },
    ],
    memory: {
      totalHeap: 256 * 1024 * 1024,
      usedHeap: (128 + Math.random() * 64) * 1024 * 1024,
      textures: 64 * 1024 * 1024,
      geometries: 32 * 1024 * 1024,
      materials: 8 * 1024 * 1024,
      shaders: 4 * 1024 * 1024,
    },
    drawCalls: 500 + Math.floor(Math.random() * 200),
    triangles: 500000 + Math.floor(Math.random() * 200000),
    vertices: 250000 + Math.floor(Math.random() * 100000),
  };
}
