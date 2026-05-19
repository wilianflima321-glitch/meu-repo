import * as THREE from "three";
import type { DestructibleConfig } from "@/lib/destruction-system";

export type FracturePattern =
  | "voronoi"
  | "radial"
  | "directional"
  | "slice"
  | "shatter";

export type DestructionToolType = "view" | "impact" | "slice" | "configure";

export interface DestructionPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<DestructibleConfig>;
  pattern: FracturePattern;
}

export interface ImpactPoint {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  force: number;
}

// ============================================================================
// PRESETS
// ============================================================================

export const DESTRUCTION_PRESETS: DestructionPreset[] = [
  {
    id: "glass",
    name: "Vidro",
    description: "Fragmentation into many small pieces",
    pattern: "shatter",
    config: {
      maxHealth: 50,
      fractureLevels: 1,
      fragmentCount: 25,
      debrisLifetime: 3,
      impactPropagation: 3.0,
    },
  },
  {
    id: "wood",
    name: "Madeira",
    description: "Breaks into larger pieces",
    pattern: "directional",
    config: {
      maxHealth: 100,
      fractureLevels: 2,
      fragmentCount: 8,
      debrisLifetime: 10,
      impactPropagation: 1.5,
    },
  },
  {
    id: "concrete",
    name: "Concreto",
    description: "Heavy destruction with debris",
    pattern: "voronoi",
    config: {
      maxHealth: 200,
      fractureLevels: 3,
      fragmentCount: 15,
      debrisLifetime: 15,
      impactPropagation: 2.0,
    },
  },
  {
    id: "metal",
    name: "Metal",
    description: "High resistance, deforms before breaking",
    pattern: "slice",
    config: {
      maxHealth: 300,
      fractureLevels: 2,
      fragmentCount: 6,
      debrisLifetime: 20,
      impactPropagation: 1.0,
    },
  },
  {
    id: "ceramic",
    name: "Ceramic",
    description: "Breaks into irregular pieces",
    pattern: "radial",
    config: {
      maxHealth: 30,
      fractureLevels: 1,
      fragmentCount: 12,
      debrisLifetime: 5,
      impactPropagation: 2.5,
    },
  },
  {
    id: "ice",
    name: "Gelo",
    description: "Crystal fragmentation",
    pattern: "shatter",
    config: {
      maxHealth: 40,
      fractureLevels: 1,
      fragmentCount: 20,
      debrisLifetime: 8,
      impactPropagation: 4.0,
    },
  },
];
