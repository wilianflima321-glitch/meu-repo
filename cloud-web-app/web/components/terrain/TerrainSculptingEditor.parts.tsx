"use client";

// @aethel-heavy-async-boundary: transitive runtime chunk loaded through TerrainSculptingEditor.

import { toolCategories } from "./terrain-sculpting-models";
import type {
  ErosionSettings,
  TerrainLayer,
  TerrainToolType,
} from "./terrain-sculpting-models";

export { ViewportScene } from "./TerrainSculptingEditor.scene";

interface ToolbarProps {
  selectedTool: TerrainToolType;
  onToolChange: (tool: TerrainToolType) => void;
}
export function Toolbar({ selectedTool, onToolChange }: ToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      {toolCategories.map((category) => (
        <div key={category.name}>
          <h4
            style={{
              color: "var(--aethel-text-quaternary)",
              fontSize: "11px",
              marginBottom: "8px",
              textTransform: "uppercase",
            }}
          >
            {category.name}
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {category.tools.map((tool) => (
              <button
                type="button"
                key={tool.id}
                onClick={() => onToolChange(tool.id as TerrainToolType)}
                title={tool.label}
                style={{
                  width: "36px",
                  height: "36px",
                  background:
                    selectedTool === tool.id
                      ? "var(--aethel-primary)"
                      : "var(--aethel-surface-tertiary)",
                  border:
                    selectedTool === tool.id
                      ? "2px solid var(--aethel-primary-light)"
                      : "1px solid var(--aethel-border-primary)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
interface LayersPanelProps {
  layers: TerrainLayer[];
  selectedLayer: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (layer: TerrainLayer) => void;
}
export function LayersPanel({
  layers,
  selectedLayer,
  onSelect,
  onAdd,
  onRemove,
  onUpdate,
}: LayersPanelProps) {
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ color: "white", fontSize: "14px" }}>Terrain Layers</h3>
        <button
          type="button"
          onClick={onAdd}
          style={{
            background: "var(--aethel-primary)",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            color: "white",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          + Add
        </button>
      </div>
      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => onSelect(layer.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              background:
                selectedLayer === layer.id
                  ? "color-mix(in_srgb,var(--aethel-primary)_20%,var(--aethel-surface-tertiary))"
                  : "var(--aethel-surface-tertiary)",
              border:
                selectedLayer === layer.id
                  ? "1px solid var(--aethel-primary)"
                  : "1px solid transparent",
              borderRadius: "4px",
              marginBottom: "4px",
              cursor: "pointer",
            }}
          >
            {/* Layer preview */}
            <div
              style={{
                width: "32px",
                height: "32px",
                background: `linear-gradient(135deg, var(--aethel-success), color-mix(in_srgb,var(--aethel-success)_60%,var(--aethel-surface-primary)))`,
                borderRadius: "4px",
                flexShrink: 0,
              }}
            />
            {/* Layer info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ color: "white", fontSize: "12px", fontWeight: 500 }}
              >
                {layer.name}
              </div>
              <div
                style={{
                  color: "var(--aethel-text-quaternary)",
                  fontSize: "10px",
                }}
              >
                Tiling: {layer.tiling.x}x{layer.tiling.y}
              </div>
            </div>
            {/* Index */}
            <div
              style={{
                width: "20px",
                height: "20px",
                background: "var(--aethel-border-primary)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--aethel-text-tertiary)",
                fontSize: "10px",
              }}
            >
              {index + 1}
            </div>
            {/* Delete */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(layer.id);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--aethel-error)",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {/* Layer settings for selected */}
      {selectedLayer &&
        (() => {
          const layer = layers.find((l) => l.id === selectedLayer);
          if (!layer) return null;
          return (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "var(--aethel-surface-tertiary)",
                borderRadius: "4px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <label
                  style={{
                    color: "var(--aethel-text-tertiary)",
                    fontSize: "11px",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Height Blend
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={layer.heightBlend}
                  onChange={(e) =>
                    onUpdate({
                      ...layer,
                      heightBlend: parseFloat(e.target.value),
                    })
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      color: "var(--aethel-text-tertiary)",
                      fontSize: "11px",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Tiling X
                  </label>
                  <input
                    type="number"
                    value={layer.tiling.x}
                    onChange={(e) =>
                      onUpdate({
                        ...layer,
                        tiling: {
                          ...layer.tiling,
                          x: parseFloat(e.target.value),
                        },
                      })
                    }
                    style={{
                      width: "100%",
                      background: "var(--aethel-surface-primary)",
                      border: "1px solid var(--aethel-border-primary)",
                      borderRadius: "4px",
                      padding: "4px",
                      color: "white",
                      fontSize: "11px",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      color: "var(--aethel-text-tertiary)",
                      fontSize: "11px",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Tiling Y
                  </label>
                  <input
                    type="number"
                    value={layer.tiling.y}
                    onChange={(e) =>
                      onUpdate({
                        ...layer,
                        tiling: {
                          ...layer.tiling,
                          y: parseFloat(e.target.value),
                        },
                      })
                    }
                    style={{
                      width: "100%",
                      background: "var(--aethel-surface-primary)",
                      border: "1px solid var(--aethel-border-primary)",
                      borderRadius: "4px",
                      padding: "4px",
                      color: "white",
                      fontSize: "11px",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
interface ErosionPanelProps {
  settings: ErosionSettings;
  onChange: (settings: ErosionSettings) => void;
  onApply: () => void;
}
export function ErosionPanel({
  settings,
  onChange,
  onApply,
}: ErosionPanelProps) {
  const update = <K extends keyof ErosionSettings>(
    key: K,
    value: ErosionSettings[K],
  ) => {
    onChange({ ...settings, [key]: value });
  };
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ color: "white", fontSize: "14px", marginBottom: "12px" }}>
        Erosion Settings
      </h3>
      {/* Type */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            color: "var(--aethel-text-tertiary)",
            fontSize: "12px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Type
        </label>
        <select
          value={settings.type}
          onChange={(e) =>
            update("type", e.target.value as ErosionSettings["type"])
          }
          style={{
            width: "100%",
            background: "var(--aethel-surface-tertiary)",
            border: "1px solid var(--aethel-border-primary)",
            borderRadius: "4px",
            padding: "6px",
            color: "white",
            fontSize: "12px",
          }}
        >
          <option value="hydraulic">Hydraulic (Water)</option>
          <option value="thermal">Thermal (Gravity)</option>
          <option value="wind">Wind</option>
        </select>
      </div>
      {/* Iterations */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <label
            style={{ color: "var(--aethel-text-tertiary)", fontSize: "12px" }}
          >
            Iterations
          </label>
          <span
            style={{ color: "var(--aethel-text-quaternary)", fontSize: "11px" }}
          >
            {settings.iterations}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={500}
          step={1}
          value={settings.iterations}
          onChange={(e) => update("iterations", parseInt(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
      {/* Strength */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <label
            style={{ color: "var(--aethel-text-tertiary)", fontSize: "12px" }}
          >
            Strength
          </label>
          <span
            style={{ color: "var(--aethel-text-quaternary)", fontSize: "11px" }}
          >
            {(settings.strength * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.strength}
          onChange={(e) => update("strength", parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
      {/* Type-specific settings */}
      {settings.type === "hydraulic" && (
        <>
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                color: "var(--aethel-text-tertiary)",
                fontSize: "11px",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Rain Amount
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.rainAmount ?? 0.5}
              onChange={(e) => update("rainAmount", parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                color: "var(--aethel-text-tertiary)",
                fontSize: "11px",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Sediment Capacity
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.sedimentCapacity ?? 0.5}
              onChange={(e) =>
                update("sedimentCapacity", parseFloat(e.target.value))
              }
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}
      {settings.type === "thermal" && (
        <div style={{ marginBottom: "8px" }}>
          <label
            style={{
              color: "var(--aethel-text-tertiary)",
              fontSize: "11px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Talus Angle: {settings.talusAngle ?? 45}°
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={settings.talusAngle ?? 45}
            onChange={(e) => update("talusAngle", parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onApply}
        style={{
          width: "100%",
          background: "var(--aethel-primary)",
          border: "none",
          borderRadius: "6px",
          padding: "10px",
          color: "white",
          cursor: "pointer",
          fontSize: "13px",
          marginTop: "8px",
        }}
      >
        Apply Erosion
      </button>
    </div>
  );
}
