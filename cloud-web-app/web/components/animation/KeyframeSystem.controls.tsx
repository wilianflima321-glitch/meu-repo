"use client";

import React from "react";
import {
  interpolateValue,
  type AnimatedProperty,
  type KeyframeValue,
} from "./KeyframeSystem.model";

export interface KeyframeControlsProps {
  property: AnimatedProperty;
  currentTime: number;
  onAdd: (value: KeyframeValue) => void;
  onRemove: (keyframeId: string) => void;
  onValueChange: (keyframeId: string, value: KeyframeValue) => void;
}

export function KeyframeControls({
  property,
  currentTime,
  onAdd,
  onRemove,
  onValueChange,
}: KeyframeControlsProps) {
  const currentKeyframe = property.keyframes.find(
    (kf) => Math.abs(kf.time - currentTime) < 0.05,
  );
  const currentValue = interpolateValue(
    property.keyframes,
    currentTime,
    property.defaultValue,
  );

  const hasKeyframeAtTime = !!currentKeyframe;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          color: "var(--aethel-text-tertiary)",
          fontSize: 11,
          minWidth: 80,
        }}
      >
        {property.name}
      </span>

      {/* Keyframe toggle button */}
      <button
        type="button"
        aria-label={
          hasKeyframeAtTime
            ? `Remove keyframe de ${property.name} no tempo atual`
            : `Add keyframe de ${property.name} no tempo atual`
        }
        onClick={() => {
          if (hasKeyframeAtTime && currentKeyframe) {
            onRemove(currentKeyframe.id);
          } else {
            onAdd(currentValue);
          }
        }}
        style={{
          background: hasKeyframeAtTime
            ? "var(--aethel-primary)"
            : "transparent",
          border: "1px solid var(--aethel-primary)",
          borderRadius: 2,
          width: 16,
          height: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(45deg)",
        }}
        title={hasKeyframeAtTime ? "Remove keyframe" : "Add keyframe"}
      >
        <span
          style={{
            transform: "rotate(-45deg)",
            color: hasKeyframeAtTime
              ? "var(--aethel-text-primary)"
              : "var(--aethel-primary)",
            fontSize: 10,
          }}
        >
          {hasKeyframeAtTime ? "v" : "+"}
        </span>
      </button>

      {/* Value input */}
      {typeof currentValue === "number" && (
        <input
          type="number"
          value={Number(currentValue).toFixed(2)}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue) && currentKeyframe) {
              onValueChange(currentKeyframe.id, newValue);
            }
          }}
          min={property.min}
          max={property.max}
          step={property.step ?? 0.01}
          style={{
            background: "var(--aethel-surface-tertiary)",
            border: "1px solid var(--aethel-border-primary)",
            borderRadius: 3,
            color: "var(--aethel-text-secondary)",
            padding: "2px 6px",
            width: 60,
            fontSize: 11,
          }}
        />
      )}

      {property.unit && (
        <span style={{ color: "var(--aethel-text-tertiary)", fontSize: 10 }}>
          {property.unit}
        </span>
      )}

      {/* Navigation to prev/next keyframe */}
      <button
        type="button"
        aria-label={`Ir para o keyframe anterior de ${property.name}`}
        onClick={() => {
          const prevKf = [...property.keyframes]
            .filter((kf) => kf.time < currentTime - 0.01)
            .sort((a, b) => b.time - a.time)[0];
          // Would need a callback to seek to keyframe time
        }}
        disabled={
          !property.keyframes.some((kf) => kf.time < currentTime - 0.01)
        }
        style={{
          background: "transparent",
          border: "none",
          color: "var(--aethel-text-quaternary)",
          cursor: "pointer",
          fontSize: 10,
        }}
        title="Previous keyframe"
      >
        &lt;
      </button>
      <button
        type="button"
        aria-label={`Ir para o proximo keyframe de ${property.name}`}
        onClick={() => {
          const nextKf = [...property.keyframes]
            .filter((kf) => kf.time > currentTime + 0.01)
            .sort((a, b) => a.time - b.time)[0];
          // Would need a callback to seek to keyframe time
        }}
        disabled={
          !property.keyframes.some((kf) => kf.time > currentTime + 0.01)
        }
        style={{
          background: "transparent",
          border: "none",
          color: "var(--aethel-text-quaternary)",
          cursor: "pointer",
          fontSize: 10,
        }}
        title="Next keyframe"
      >
        &gt;
      </button>
    </div>
  );
}
