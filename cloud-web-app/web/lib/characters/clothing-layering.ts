/**
 * clothing-layering.ts
 *
 * Dynamic equipment fitting system that respects custom body topology,
 * weight parameters, and physical cloth simulation.
 *
 * Features:
 *  - Equipment layer stacking (base → armor → cloak → accessories)
 *  - Body-topology-aware mesh deformation
 *  - Cloth physics integration hooks
 *  - UV offset blending for shared texture atlases
 */

import type { SkinVertex } from './creature-rigging';

// ─────────────────────────────────────────────────────────────────────────────
// Equipment Types
// ─────────────────────────────────────────────────────────────────────────────

export type EquipmentSlot =
  | 'head' | 'chest' | 'back' | 'hands' | 'legs' | 'feet'
  | 'belt' | 'shoulder' | 'neck' | 'ring_l' | 'ring_r' | 'main_hand' | 'off_hand';

export type ClothSimMode = 'rigid' | 'semi_rigid' | 'cloth' | 'fluid_cape';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  meshUri: string;
  textureUri?: string;
  /** 0..1 scale relative to base body */
  scale?: number;
  /** Override skin joints for equipment-specific bones */
  additionalBones?: string[];
  clothSim: ClothSimMode;
  /** Which vertex groups are dynamic (cloth) vs pinned */
  clothPinnedGroupName?: string;
  /** Layer order — higher renders on top */
  layer: number;
  /** Material tint (RGBA) */
  tint?: [number, number, number, number];
  /** UV atlas offset [u, v] for texture atlasing */
  uvOffset?: [number, number];
  /** Body compatibility constraints */
  compatibilityTags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Body Topology Descriptor
// ─────────────────────────────────────────────────────────────────────────────

export interface BodyTopology {
  /** Named morph targets for body shape params */
  morphTargets: Record<string, number>;
  /** Height scale (1.0 = default) */
  heightScale: number;
  /** Width scale */
  widthScale: number;
  /** Muscle mass 0..1 */
  muscleMass: number;
  /** Body fat 0..1 */
  bodyFat: number;
  /** Species tag — equipment filters by this */
  speciesTag: string;
}

export function defaultHumanoidBody(): BodyTopology {
  return {
    morphTargets: { chest: 0, waist: 0, hips: 0, shoulders: 0 },
    heightScale: 1.0,
    widthScale: 1.0,
    muscleMass: 0.5,
    bodyFat: 0.2,
    speciesTag: 'humanoid',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipment Stack (per character)
// ─────────────────────────────────────────────────────────────────────────────

export interface EquipmentLayerResult {
  slot: EquipmentSlot;
  item: EquipmentItem;
  /** Final mesh vertices after body fitting */
  fittedVertices: SkinVertex[];
  /** Cloth simulation enabled */
  isCloth: boolean;
  /** Cloth particle count for PBD sim */
  clothParticleCount: number;
  /** Pinned vertex mask */
  pinnedMask: boolean[];
}

export class ClothingLayerSystem {
  private equipped = new Map<EquipmentSlot, EquipmentItem>();

  equip(item: EquipmentItem, bodyTopo: BodyTopology): void {
    if (!item.compatibilityTags.includes(bodyTopo.speciesTag) &&
        !item.compatibilityTags.includes('universal')) {
      console.warn(`Equipment ${item.id} is not compatible with species: ${bodyTopo.speciesTag}`);
      return;
    }
    this.equipped.set(item.slot, item);
  }

  unequip(slot: EquipmentSlot): void {
    this.equipped.delete(slot);
  }

  getEquipped(): EquipmentItem[] {
    return Array.from(this.equipped.values()).sort((a, b) => a.layer - b.layer);
  }

  /**
   * Compute fitted mesh for an equipment item given the body topology.
   * Applies body scale and morph target deformations.
   */
  fitEquipmentToBody(
    item: EquipmentItem,
    baseMeshVertices: Float32Array,
    bodyTopo: BodyTopology
  ): EquipmentLayerResult {
    const vertexCount = baseMeshVertices.length / 3;
    const fittedPositions = new Float32Array(baseMeshVertices);

    // Apply height and width scaling from body topology
    for (let i = 0; i < fittedPositions.length; i += 3) {
      fittedPositions[i] *= bodyTopo.widthScale * (item.scale ?? 1);    // X
      fittedPositions[i + 1] *= bodyTopo.heightScale * (item.scale ?? 1); // Y
      fittedPositions[i + 2] *= bodyTopo.widthScale * (item.scale ?? 1);  // Z
    }

    // Apply morph target influence (linear blend)
    const chestScale = 1 + (bodyTopo.morphTargets.chest ?? 0) * 0.15;
    const hipScale = 1 + (bodyTopo.morphTargets.hips ?? 0) * 0.1;
    for (let i = 0; i < fittedPositions.length; i += 3) {
      const y = fittedPositions[i + 1];
      if (y > 0.5) { // Chest region
        fittedPositions[i] *= chestScale;
        fittedPositions[i + 2] *= chestScale;
      } else { // Hip region
        fittedPositions[i] *= hipScale;
        fittedPositions[i + 2] *= hipScale;
      }
    }

    // Build SkinVertex array (simple 1-bone-per-vertex for rigid equipment)
    const fittedVertices: SkinVertex[] = [];
    const pinnedMask: boolean[] = [];

    for (let vi = 0; vi < vertexCount; vi++) {
      const px = fittedPositions[vi * 3];
      const py = fittedPositions[vi * 3 + 1];
      const pz = fittedPositions[vi * 3 + 2];

      // Cloth: pin vertices at the "attach" region (top of mesh by Y)
      const isPinned = item.clothSim !== 'rigid' && py > 0.8;
      pinnedMask.push(isPinned);

      fittedVertices.push({
        position: [px, py, pz],
        jointIndices: [0, 0, 0, 0],
        weights: [1, 0, 0, 0],
      });
    }

    const isCloth = item.clothSim === 'cloth' || item.clothSim === 'fluid_cape';
    const clothParticleCount = isCloth ? Math.min(vertexCount, 256) : 0;

    return {
      slot: item.slot,
      item,
      fittedVertices,
      isCloth,
      clothParticleCount,
      pinnedMask,
    };
  }

  /**
   * Generate a complete outfit fitting result for all equipped items.
   */
  buildOutfit(baseMeshVertices: Float32Array, bodyTopo: BodyTopology): EquipmentLayerResult[] {
    return this.getEquipped().map(item =>
      this.fitEquipmentToBody(item, baseMeshVertices, bodyTopo)
    );
  }

  /**
   * Check for equipment conflicts (two items competing for same slot region).
   */
  getConflicts(): Array<{ slotA: EquipmentSlot; slotB: EquipmentSlot; reason: string }> {
    const conflicts: Array<{ slotA: EquipmentSlot; slotB: EquipmentSlot; reason: string }> = [];
    const items = this.getEquipped();

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;
        if (a.layer === b.layer && a.slot !== b.slot) {
          conflicts.push({ slotA: a.slot, slotB: b.slot, reason: `Layer conflict: both at layer ${a.layer}` });
        }
      }
    }

    return conflicts;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset Equipment Templates
// ─────────────────────────────────────────────────────────────────────────────

export function createCloakEquipment(id: string): EquipmentItem {
  return {
    id,
    name: 'Flowing Cloak',
    slot: 'back',
    meshUri: `/assets/equipment/cloak.glb`,
    clothSim: 'fluid_cape',
    clothPinnedGroupName: 'shoulder_attach',
    layer: 3,
    compatibilityTags: ['humanoid', 'universal'],
  };
}

export function createArmorEquipment(id: string, slot: EquipmentSlot): EquipmentItem {
  return {
    id,
    name: `${slot.charAt(0).toUpperCase() + slot.slice(1)} Armor`,
    slot,
    meshUri: `/assets/equipment/armor_${slot}.glb`,
    clothSim: 'rigid',
    layer: 2,
    compatibilityTags: ['humanoid'],
  };
}
