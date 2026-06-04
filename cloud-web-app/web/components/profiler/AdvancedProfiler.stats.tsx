"use client";

import { useMemo } from "react";
import { categoryColors } from "./advanced-profiler-models";
import type { ProfilerCategory, ProfilerFrame, ProfilerMarker, ProfilerSession } from "./advanced-profiler-models";

// ============================================================================
// STATS PANEL COMPONENT
// ============================================================================

interface StatsPanelProps {
  frame: ProfilerFrame | null;
  session: ProfilerSession;
}

export function StatsPanel({ frame, session }: StatsPanelProps) {
  const currentFPS = frame ? 1000 / frame.duration : 0;

  return (
    <div
      style={{
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ color: "white", fontSize: "14px", marginBottom: "12px" }}>
        Statistics
      </h3>

      {/* FPS display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: `conic-gradient(
            ${currentFPS >= 60 ? "var(--aethel-success)" : currentFPS >= 30 ? "var(--aethel-warning)" : "var(--aethel-error)"} ${(currentFPS / 60) * 360}deg,
            var(--aethel-surface-tertiary) ${(currentFPS / 60) * 360}deg
          )`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "var(--aethel-surface-primary)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{ color: "white", fontSize: "24px", fontWeight: "bold" }}
            >
              {currentFPS.toFixed(0)}
            </span>
            <span
              style={{ color: "var(--aethel-text-muted)", fontSize: "10px" }}
            >
              FPS
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
      >
        <StatBox
          label="Frame Time"
          value={`${frame?.duration.toFixed(2) ?? 0}ms`}
        />
        <StatBox
          label="CPU Time"
          value={`${frame?.cpuTime.toFixed(2) ?? 0}ms`}
        />
        <StatBox
          label="GPU Time"
          value={`${frame?.gpuTime.toFixed(2) ?? 0}ms`}
        />
        <StatBox label="Draw Calls" value={`${frame?.drawCalls ?? 0}`} />
        <StatBox
          label="Triangles"
          value={`${((frame?.triangles ?? 0) / 1000).toFixed(1)}K`}
        />
        <StatBox
          label="Vertices"
          value={`${((frame?.vertices ?? 0) / 1000).toFixed(1)}K`}
        />
      </div>

      {/* Session stats */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid var(--aethel-border-primary)",
        }}
      >
        <div
          style={{
            color: "var(--aethel-text-muted)",
            fontSize: "11px",
            marginBottom: "8px",
          }}
        >
          Session Statistics
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
          }}
        >
          <StatBox
            label="Avg FPS"
            value={session.averageFPS.toFixed(0)}
            small
          />
          <StatBox
            label="Min FPS"
            value={session.minFPS.toFixed(0)}
            small
            warning={session.minFPS < 30}
          />
          <StatBox label="Max FPS" value={session.maxFPS.toFixed(0)} small />
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  small,
  warning,
}: {
  label: string;
  value: string;
  small?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        padding: small ? "6px" : "8px",
        background: "var(--aethel-surface-tertiary)",
        borderRadius: "4px",
        border: warning ? "1px solid var(--aethel-error)" : "none",
      }}
    >
      <div
        style={{
          color: "var(--aethel-text-muted)",
          fontSize: small ? "9px" : "10px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: warning ? "var(--aethel-error)" : "white",
          fontSize: small ? "12px" : "14px",
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY BREAKDOWN
// ============================================================================

interface CategoryBreakdownProps {
  markers: ProfilerMarker[];
  frameTime: number;
}

export function CategoryBreakdown({
  markers,
  frameTime,
}: CategoryBreakdownProps) {
  const categoryTimes = useMemo(() => {
    const times: Record<ProfilerCategory, number> = {
      render: 0,
      physics: 0,
      animation: 0,
      ai: 0,
      audio: 0,
      scripts: 0,
      ui: 0,
      network: 0,
      loading: 0,
      custom: 0,
    };

    const sumMarkers = (markers: ProfilerMarker[]) => {
      for (const marker of markers) {
        times[marker.category] =
          (times[marker.category] || 0) + marker.duration;
        if (marker.children) sumMarkers(marker.children);
      }
    };

    sumMarkers(markers);
    return times;
  }, [markers]);

  const sortedCategories = useMemo(() => {
    return Object.entries(categoryTimes)
      .filter(([_, time]) => time > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [categoryTimes]);

  return (
    <div
      style={{
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ color: "white", fontSize: "14px", marginBottom: "12px" }}>
        Category Breakdown
      </h3>

      {sortedCategories.map(([category, time]) => {
        const percent = (time / frameTime) * 100;

        return (
          <div key={category} style={{ marginBottom: "8px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: categoryColors[category as ProfilerCategory],
                  }}
                />
                <span
                  style={{
                    color: "var(--aethel-text-tertiary)",
                    fontSize: "12px",
                    textTransform: "capitalize",
                  }}
                >
                  {category}
                </span>
              </div>
              <span
                style={{ color: "var(--aethel-text-muted)", fontSize: "11px" }}
              >
                {time.toFixed(2)}ms ({percent.toFixed(1)}%)
              </span>
            </div>
            <div
              style={{
                height: "4px",
                background: "var(--aethel-surface-tertiary)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, percent)}%`,
                  height: "100%",
                  background: categoryColors[category as ProfilerCategory],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
