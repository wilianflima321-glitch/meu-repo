"use client";

/**
 * ADVANCED PROFILER - Aethel Engine
 *
 * Profiler visual avançado no estilo Unreal Insights/Chrome DevTools.
 * Monitora performance em tempo real com visualizações detalhadas.
 *
 * FEATURES:
 * - Frame timeline visualization
 * - GPU/CPU flame graphs
 * - Memory profiling
 * - Network stats
 * - Asset loading tracker
 * - Draw call breakdown
 * - Physics stats
 * - Custom markers
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  createProfilerSession,
  generateMockProfilerFrame,
} from "./AdvancedProfiler.runtime";
import {
  CategoryBreakdown,
  FlameGraph,
  FrameTimeline,
  MemoryPanel,
  StatsPanel,
} from "./AdvancedProfiler.parts";
import type {
  MemoryStats,
  ProfilerFrame,
  ProfilerSession,
} from "./advanced-profiler-models";

export type {
  GPUStats,
  MemoryStats,
  ProfilerFrame,
  ProfilerSession,
} from "./advanced-profiler-models";

// ============================================================================
// FRAME TIMELINECOMPONENT
// ============================================================================

export interface AdvancedProfilerProps {
  onCapture?: () => ProfilerFrame;
  autoCapture?: boolean;
  maxFrames?: number;
}

export function AdvancedProfiler({
  onCapture,
  autoCapture = true,
  maxFrames = 300,
}: AdvancedProfilerProps) {
  // Session state
  const [session, setSession] = useState<ProfilerSession>(() =>
    createProfilerSession("Session 1"),
  );

  const [isRecording, setIsRecording] = useState(autoCapture);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [viewRange, setViewRange] = useState({ start: 0, end: 100 });
  const [activeTab, setActiveTab] = useState<"timeline" | "memory" | "gpu">(
    "timeline",
  );
  const [memoryHistory, setMemoryHistory] = useState<MemoryStats[]>([]);

  const generateMockFrame = useCallback((): ProfilerFrame => {
    return generateMockProfilerFrame(session.frames.length);
  }, [session.frames.length]);

  // Recording loop
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      const frame = onCapture?.() ?? generateMockFrame();

      setSession((prev) => {
        const frames = [...prev.frames, frame].slice(-maxFrames);
        const fps = 1000 / frame.duration;
        const totalFPS = frames.reduce((sum, f) => sum + 1000 / f.duration, 0);

        return {
          ...prev,
          frames,
          averageFPS: totalFPS / frames.length,
          minFPS: Math.min(prev.minFPS === Infinity ? fps : prev.minFPS, fps),
          maxFPS: Math.max(prev.maxFPS, fps),
        };
      });

      setMemoryHistory((prev) => [...prev.slice(-100), frame.memory]);

      // Auto-scroll
      setViewRange((prev) => {
        const frameCount = session.frames.length + 1;
        if (frameCount > prev.end) {
          const viewSize = prev.end - prev.start;
          return { start: frameCount - viewSize, end: frameCount };
        }
        return prev;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [
    isRecording,
    onCapture,
    generateMockFrame,
    maxFrames,
    session.frames.length,
  ]);

  const currentFrame =
    selectedFrame !== null
      ? session.frames.find((f) => f.frameId === selectedFrame)
      : session.frames[session.frames.length - 1];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "var(--aethel-surface-primary)",
      }}
    >
      {/* Main content */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ color: "white", fontSize: "18px" }}>
            📊 Advanced Profiler
          </h2>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              aria-label={
                isRecording
                  ? "Parar gravacao do profiler"
                  : "Iniciar gravacao do profiler"
              }
              aria-pressed={isRecording}
              style={{
                background: isRecording
                  ? "var(--aethel-error)"
                  : "var(--aethel-success)",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                color: "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
              }}
            >
              {isRecording ? "⏹ Stop" : "⏺ Record"}
            </button>

            <button
              type="button"
              aria-label="Iniciar nova sessao de profiler"
              onClick={() => {
                setSession(createProfilerSession(`Session ${Date.now()}`));
                setSelectedFrame(null);
              }}
              style={{
                background: "var(--aethel-surface-tertiary)",
                border: "1px solid var(--aethel-border-primary)",
                borderRadius: "6px",
                padding: "8px 16px",
                color: "white",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              🗑 Clear
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
          {(["timeline", "memory", "gpu"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-label={`Abrir aba ${tab}`}
              style={{
                background:
                  activeTab === tab
                    ? "var(--aethel-primary)"
                    : "var(--aethel-surface-tertiary)",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {activeTab === "timeline" && (
            <>
              <FrameTimeline
                frames={session.frames}
                selectedFrame={selectedFrame}
                onSelectFrame={setSelectedFrame}
                viewRange={viewRange}
                onViewRangeChange={setViewRange}
              />

              {currentFrame && (
                <FlameGraph
                  markers={currentFrame.markers}
                  frameTime={currentFrame.duration}
                  type="cpu"
                />
              )}
            </>
          )}

          {activeTab === "memory" && currentFrame && (
            <MemoryPanel stats={currentFrame.memory} history={memoryHistory} />
          )}

          {activeTab === "gpu" && currentFrame && (
            <FlameGraph
              markers={currentFrame.markers.filter(
                (m) => m.category === "render",
              )}
              frameTime={currentFrame.gpuTime}
              type="gpu"
            />
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div
        style={{
          width: "300px",
          borderLeft: "1px solid var(--aethel-surface-tertiary)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          overflowY: "auto",
        }}
      >
        <StatsPanel frame={currentFrame ?? null} session={session} />

        {currentFrame && (
          <CategoryBreakdown
            markers={currentFrame.markers}
            frameTime={currentFrame.duration}
          />
        )}
      </div>
    </div>
  );
}

export default AdvancedProfiler;
