'use client';

import { PRIMITIVE_GEOMETRY_TYPES } from './scene-editor-models';
import type { SceneObject } from './scene-editor-models';
import { ScrubbableInput, Vector3Input } from '@/components/ui/ScrubbableInput';

interface PropertiesPanelProps {
  object: SceneObject | null;
  onChange: (updates: Partial<SceneObject>) => void;
}

type RigidBodySettings = {
  type?: 'dynamic' | 'static' | 'kinematic' | string;
  mass?: number;
};

function asRigidBody(value: unknown): RigidBodySettings {
  return typeof value === 'object' && value !== null ? (value as RigidBodySettings) : {};
}

function radToDeg(value: number) {
  return (value * 180) / Math.PI;
}

function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

export function PropertiesPanel({ object, onChange }: PropertiesPanelProps) {
  if (!object) {
    return (
      <div className="w-72 border-l border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] p-6 text-center text-xs text-[var(--aethel-text-quaternary)]">
        Select an object in the scene or hierarchy to inspect and edit its properties.
      </div>
    );
  }

  const properties = object.properties;
  const rigidbody = asRigidBody(properties.rigidbody);

  return (
    <div className="flex w-72 flex-col overflow-y-auto border-l border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] text-xs text-[var(--aethel-text-secondary)]">
      {/* Header — Object Name */}
      <div className="border-b border-[var(--aethel-border-subtle)] p-3">
        <label className="block mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
          Actor Name
        </label>
        <input
          type="text"
          value={object.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)] transition-colors"
        />
      </div>

      {/* Transform Section */}
      <div className="border-b border-[var(--aethel-border-subtle)] p-3 space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          Transform
        </h4>

        {/* Position */}
        <div>
          <span className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
            Position
          </span>
          <Vector3Input
            value={object.position}
            defaultValue={[0, 0, 0]}
            step={0.05}
            precision={2}
            ariaLabelPrefix="Position"
            onChange={(next) => onChange({ position: next })}
          />
        </div>

        {/* Rotation */}
        <div>
          <span className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
            Rotation
          </span>
          <Vector3Input
            value={object.rotation.map(radToDeg) as [number, number, number]}
            defaultValue={[0, 0, 0]}
            step={1}
            precision={1}
            suffix="°"
            ariaLabelPrefix="Rotation"
            onChange={(next) => onChange({ rotation: next.map(degToRad) as [number, number, number] })}
          />
        </div>

        {/* Scale */}
        <div>
          <span className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
            Scale
          </span>
          <Vector3Input
            value={object.scale}
            defaultValue={[1, 1, 1]}
            step={0.05}
            precision={2}
            ariaLabelPrefix="Scale"
            onChange={(next) => onChange({ scale: next })}
          />
        </div>
      </div>

      {/* Type-specific: Mesh */}
      {object.type === 'mesh' && (
        <>
          <div className="border-b border-[var(--aethel-border-subtle)] p-3 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              Mesh Geometry
            </h4>
            <div>
              <label className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
                Primitive Type
              </label>
              <select
                value={(object.properties.geometry as string) || 'box'}
                onChange={(e) =>
                  onChange({
                    properties: { ...object.properties, geometry: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1.5 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)]"
              >
                {PRIMITIVE_GEOMETRY_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
                Tint Color
              </label>
              <input
                type="color"
                value={`#${((object.properties.color as number) || 0x4a90d9).toString(16).padStart(6, '0')}`}
                onChange={(e) =>
                  onChange({
                    properties: { ...object.properties, color: parseInt(e.target.value.slice(1), 16) },
                  })
                }
                className="h-8 w-full cursor-pointer rounded-lg border border-[var(--aethel-border-subtle)] bg-transparent p-0"
              />
            </div>
          </div>

          {/* Physics Section */}
          <div className="border-b border-[var(--aethel-border-subtle)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                RigidBody Physics
              </h4>
              <input
                type="checkbox"
                checked={Boolean(properties.rigidbody)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange({
                      properties: { ...properties, rigidbody: { mass: 1, type: 'dynamic' } },
                    });
                  } else {
                    const { rigidbody: _rigidbody, ...rest } = properties;
                    onChange({ properties: rest });
                  }
                }}
                className="rounded border-[var(--aethel-border-subtle)] accent-[var(--aethel-primary)] cursor-pointer"
              />
            </div>

            {Boolean(properties.rigidbody) && (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
                    Body Type
                  </label>
                  <select
                    value={rigidbody.type || 'dynamic'}
                    onChange={(e) => {
                      onChange({
                        properties: { ...properties, rigidbody: { ...rigidbody, type: e.target.value } },
                      });
                    }}
                    className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1.5 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)]"
                  >
                    <option value="dynamic">Dynamic (Full Simulation)</option>
                    <option value="static">Static (Environment / Floor)</option>
                    <option value="kinematic">Kinematic (Code Driven)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
                    Mass (kg)
                  </label>
                  <ScrubbableInput
                    value={rigidbody.mass || 1}
                    onChange={(v) => {
                      onChange({
                        properties: { ...properties, rigidbody: { ...rigidbody, mass: v } },
                      });
                    }}
                    min={0.01}
                    max={10000}
                    step={0.1}
                    precision={1}
                    suffix="kg"
                    ariaLabel="RigidBody Mass"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Type-specific: Light */}
      {object.type === 'light' && (
        <div className="border-b border-[var(--aethel-border-subtle)] p-3 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Light Source
          </h4>

          <div>
            <label className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
              Light Type
            </label>
            <select
              value={(object.properties.lightType as string) || 'point'}
              onChange={(e) =>
                onChange({
                  properties: { ...object.properties, lightType: e.target.value },
                })
              }
              className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1.5 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)]"
            >
              <option value="point">Point Light (Omni)</option>
              <option value="directional">Directional (Sun)</option>
              <option value="spot">Spot Light</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
              Intensity (Lumens)
            </label>
            <ScrubbableInput
              value={(object.properties.intensity as number) || 1}
              onChange={(v) =>
                onChange({
                  properties: { ...object.properties, intensity: v },
                })
              }
              min={0}
              max={100}
              step={0.1}
              precision={2}
              ariaLabel="Light Intensity"
            />
          </div>

          <div>
            <label className="block mb-1 text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
              Color Tint
            </label>
            <input
              type="color"
              value={`#${((object.properties.color as number) || 0xffffff).toString(16).padStart(6, '0')}`}
              onChange={(e) =>
                onChange({
                  properties: { ...object.properties, color: parseInt(e.target.value.slice(1), 16) },
                })
              }
              className="h-8 w-full cursor-pointer rounded-lg border border-[var(--aethel-border-subtle)] bg-transparent p-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
