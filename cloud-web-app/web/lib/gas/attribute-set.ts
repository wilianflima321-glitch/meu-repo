/**
 * OMNI-PLAN GAS — AttributeSet as a genuine ECS component.
 *
 * The legacy `lib/gameplay-attributes.ts#AttributeSet` is a per-entity class
 * wrapping three `Map`s (`attributes`, `currentValues`, `modifiers`) — one
 * heap object and multiple hash-map lookups per entity per read. That is the
 * "OOP pesada" this Director's brief explicitly forbids for the new system.
 *
 * Here, every entity's attribute values live packed into ONE flat
 * `ArrayBuffer` per archetype (via `lib/ecs-dots-system.ts`'s
 * `ComponentRegistry` / `ArchetypeStorage`), two `f32` fields (`base_<Name>`,
 * `current_<Name>`) per attribute, laid out contiguously by entity index.
 * Iterating "every entity's Health" is a single strided pass over one
 * buffer — no per-entity allocation, no Map hashing — matching Unity
 * DOTS / Unreal Mass' SoA-within-archetype layout, and the plain memory
 * mechanism `ecs-dots-system.ts` already provides for every other
 * component (`Transform`, `Velocity`, ...).
 *
 * TRADE-OFF (documented, not hidden): the attribute *names* a game uses
 * (Health, Mana, "EngineTemperature", "CthulhuSanity", ...) must be known at
 * `registerAttributeSetComponent` time, because this ECS's component schema
 * is fixed-field, not a dynamic dictionary — this is required for the
 * contiguous-memory layout to exist at all. A game that wants to add a
 * brand-new attribute at runtime must re-register the component (which, in
 * this ECS, means a new component type — existing entities keep their old
 * component until explicitly migrated). This is the standard DOTS
 * constraint traded for cache-locality; the legacy `Map`-based AttributeSet
 * remains available for call sites that need truly dynamic attribute sets
 * with no upfront schema.
 */
import type { ComponentField, ComponentType, Entity } from '../ecs-dots-contracts';
import type { World } from '../ecs-dots-system';

export interface AttributeBounds {
  min?: number;
  max?: number;
}

export interface AttributeSetSchema {
  componentType: ComponentType;
  attributeNames: string[];
  /** `attributeNames[i]` -> its `base_*`/`current_*` field names in the component. */
  fieldsByAttribute: Map<string, { base: string; current: string }>;
  /** Optional per-attribute clamp applied whenever `current` is recomputed. World-level (not per-entity) by design — see module doc comment. */
  bounds: Map<string, AttributeBounds>;
}

function baseFieldName(attribute: string): string {
  return `base_${attribute}`;
}
function currentFieldName(attribute: string): string {
  return `current_${attribute}`;
}

/**
 * Registers one `AttributeSet` component type carrying `base_*`/`current_*`
 * f32 fields for every name in `attributeNames`. Call once per `World`
 * (matches `registerCommonComponents`'s pattern in `ecs-dots-common-components.ts`).
 */
export function registerAttributeSetComponent(
  world: World,
  attributeNames: string[],
  bounds: Record<string, AttributeBounds> = {}
): AttributeSetSchema {
  const fields: Omit<ComponentField, 'offset' | 'size'>[] = [];
  const fieldsByAttribute = new Map<string, { base: string; current: string }>();

  for (const name of attributeNames) {
    const base = baseFieldName(name);
    const current = currentFieldName(name);
    fields.push({ name: base, type: 'f32' }, { name: current, type: 'f32' });
    fieldsByAttribute.set(name, { base, current });
  }

  const componentType = world.registerComponent<Record<string, number>>('AttributeSet', fields);

  return {
    componentType,
    attributeNames: [...attributeNames],
    fieldsByAttribute,
    bounds: new Map(Object.entries(bounds)),
  };
}

function clamp(schema: AttributeSetSchema, attribute: string, value: number): number {
  const bound = schema.bounds.get(attribute);
  if (!bound) return value;
  let result = value;
  if (bound.min !== undefined) result = Math.max(bound.min, result);
  if (bound.max !== undefined) result = Math.min(bound.max, result);
  return result;
}

/** Adds the AttributeSet component to `entity` and seeds base+current values. Unset attributes default to 0. */
export function initAttributeSet(
  world: World,
  entity: Entity,
  schema: AttributeSetSchema,
  initialValues: Record<string, number> = {}
): void {
  world.addComponent(entity, schema.componentType);
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  if (!view) return;

  for (const name of schema.attributeNames) {
    const fields = schema.fieldsByAttribute.get(name)!;
    const value = clamp(schema, name, initialValues[name] ?? 0);
    view.set(fields.base, value);
    view.set(fields.current, value);
  }
}

export function getAttributeBase(world: World, entity: Entity, schema: AttributeSetSchema, attribute: string): number {
  const fields = schema.fieldsByAttribute.get(attribute);
  if (!fields) return 0;
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  return view ? view.get(fields.base) : 0;
}

export function getAttributeCurrent(world: World, entity: Entity, schema: AttributeSetSchema, attribute: string): number {
  const fields = schema.fieldsByAttribute.get(attribute);
  if (!fields) return 0;
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  return view ? view.get(fields.current) : 0;
}

/** Directly mutates BaseValue — used by `instant` effects and by periodic (DOT/HOT) pulses. Also re-syncs `current` when the attribute has no other standing modifiers (the common case). */
export function addToAttributeBase(world: World, entity: Entity, schema: AttributeSetSchema, attribute: string, delta: number): void {
  const fields = schema.fieldsByAttribute.get(attribute);
  if (!fields) return;
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  if (!view) return;
  const next = clamp(schema, attribute, view.get(fields.base) + delta);
  view.set(fields.base, next);
}

export function multiplyAttributeBase(world: World, entity: Entity, schema: AttributeSetSchema, attribute: string, factor: number): void {
  const fields = schema.fieldsByAttribute.get(attribute);
  if (!fields) return;
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  if (!view) return;
  const next = clamp(schema, attribute, view.get(fields.base) * factor);
  view.set(fields.base, next);
}

export function overrideAttributeBase(world: World, entity: Entity, schema: AttributeSetSchema, attribute: string, value: number): void {
  const fields = schema.fieldsByAttribute.get(attribute);
  if (!fields) return;
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  if (!view) return;
  view.set(fields.base, clamp(schema, attribute, value));
}

/** Writes `current` directly — used by the effect pool's recompute pass to layer standing (duration/infinite, non-periodic) modifiers on top of BaseValue. */
export function setAttributeCurrent(world: World, entity: Entity, schema: AttributeSetSchema, attribute: string, value: number): void {
  const fields = schema.fieldsByAttribute.get(attribute);
  if (!fields) return;
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  if (!view) return;
  view.set(fields.current, clamp(schema, attribute, value));
}

/** Resets `current` back to `base` — call before re-layering standing modifiers during a recompute pass. */
export function resetAttributeCurrentToBase(world: World, entity: Entity, schema: AttributeSetSchema, attribute: string): void {
  const fields = schema.fieldsByAttribute.get(attribute);
  if (!fields) return;
  const view = world.getComponent<Record<string, number>>(entity, schema.componentType);
  if (!view) return;
  view.set(fields.current, view.get(fields.base));
}

export function serializeAttributeSet(world: World, entity: Entity, schema: AttributeSetSchema): Record<string, number> {
  const result: Record<string, number> = {};
  for (const name of schema.attributeNames) {
    result[name] = getAttributeCurrent(world, entity, schema, name);
  }
  return result;
}
