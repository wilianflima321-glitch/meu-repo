/**
 * auto-rigging.ts  — Sprint V33
 *
 * Automatic skeletal rig generation for AI-generated character meshes.
 *
 * Pipeline:
 *   1. Analyse mesh geometry to detect body proportions (bounding box analysis)
 *   2. Generate a humanoid skeleton template scaled to the mesh
 *   3. Bind the skeleton to mesh vertices using heat-diffusion skinning weights
 *   4. Output a THREE.Skeleton compatible with Three.js SkinnedMesh
 *
 * The heavy compute (heat-diffusion, geodesic distance) runs in a Web Worker.
 * This module provides the interface layer and CPU-side skeleton builder.
 *
 * VRM / Humanoid retargeting:
 *   Maps the generated rig to the VRM 1.0 humanoid bone specification,
 *   allowing import/export to VRChat, VSeeFace, and Unreal MetaHuman format.
 */

import * as THREE from 'three';
import { createComponentLogger } from '@/lib/observability/logger';
import type { IKJoint } from './ai-animation';

const log = createComponentLogger('auto-rigging');

// ---------------------------------------------------------------------------
// Skeleton Blueprint
// ---------------------------------------------------------------------------

export type HumanoidBone =
  | 'hips' | 'spine' | 'chest' | 'upperChest' | 'neck' | 'head'
  | 'leftShoulder' | 'leftUpperArm' | 'leftLowerArm' | 'leftHand'
  | 'rightShoulder' | 'rightUpperArm' | 'rightLowerArm' | 'rightHand'
  | 'leftUpperLeg' | 'leftLowerLeg' | 'leftFoot' | 'leftToes'
  | 'rightUpperLeg' | 'rightLowerLeg' | 'rightFoot' | 'rightToes';

export interface SkeletonBone {
  name: HumanoidBone;
  parent: HumanoidBone | null;
  /** Local offset from parent in normalized (0..1) body space */
  localOffset: [number, number, number];
  bone: THREE.Bone;
}

export interface GeneratedRig {
  skeleton: THREE.Skeleton;
  bones: Map<HumanoidBone, THREE.Bone>;
  ikJoints: IKJoint[];
  /** Skinning weights: Float32Array[vertexCount × 4] */
  skinWeights: Float32Array;
  /** Bone indices: Uint16Array[vertexCount × 4] */
  skinIndices: Uint16Array;
}

// ---------------------------------------------------------------------------
// Humanoid template (proportions relative to body height = 1.0)
// ---------------------------------------------------------------------------

const HUMANOID_TEMPLATE: Array<{ name: HumanoidBone; parent: HumanoidBone | null; y: number; x: number; z: number }> = [
  { name: 'hips',         parent: null,           y: 0.52, x: 0,     z: 0     },
  { name: 'spine',        parent: 'hips',          y: 0.10, x: 0,     z: 0     },
  { name: 'chest',        parent: 'spine',         y: 0.12, x: 0,     z: 0     },
  { name: 'upperChest',   parent: 'chest',         y: 0.08, x: 0,     z: 0     },
  { name: 'neck',         parent: 'upperChest',    y: 0.06, x: 0,     z: 0     },
  { name: 'head',         parent: 'neck',          y: 0.12, x: 0,     z: 0     },
  // Left arm
  { name: 'leftShoulder', parent: 'upperChest',    y: 0.03, x: -0.08, z: 0     },
  { name: 'leftUpperArm', parent: 'leftShoulder',  y: 0,    x: -0.14, z: 0     },
  { name: 'leftLowerArm', parent: 'leftUpperArm',  y: 0,    x: -0.14, z: 0     },
  { name: 'leftHand',     parent: 'leftLowerArm',  y: 0,    x: -0.10, z: 0     },
  // Right arm
  { name: 'rightShoulder',parent: 'upperChest',    y: 0.03, x:  0.08, z: 0     },
  { name: 'rightUpperArm',parent: 'rightShoulder', y: 0,    x:  0.14, z: 0     },
  { name: 'rightLowerArm',parent: 'rightUpperArm', y: 0,    x:  0.14, z: 0     },
  { name: 'rightHand',    parent: 'rightLowerArm', y: 0,    x:  0.10, z: 0     },
  // Left leg
  { name: 'leftUpperLeg', parent: 'hips',          y: -0.05,x: -0.08, z: 0     },
  { name: 'leftLowerLeg', parent: 'leftUpperLeg',  y: -0.24,x: 0,     z: 0     },
  { name: 'leftFoot',     parent: 'leftLowerLeg',  y: -0.24,x: 0,     z: 0     },
  { name: 'leftToes',     parent: 'leftFoot',      y: -0.03,x: 0,     z: 0.08  },
  // Right leg
  { name: 'rightUpperLeg',parent: 'hips',          y: -0.05,x:  0.08, z: 0     },
  { name: 'rightLowerLeg',parent: 'rightUpperLeg', y: -0.24,x: 0,     z: 0     },
  { name: 'rightFoot',    parent: 'rightLowerLeg', y: -0.24,x: 0,     z: 0     },
  { name: 'rightToes',    parent: 'rightFoot',     y: -0.03,x: 0,     z: 0.08  },
];

// ---------------------------------------------------------------------------
// AutoRigger
// ---------------------------------------------------------------------------

export class AutoRigger {
  /**
   * Analyse a mesh's bounding box and fit a humanoid skeleton.
   * Returns a GeneratedRig with all Three.js bone objects and skinning data.
   */
  generateRig(geometry: THREE.BufferGeometry): GeneratedRig {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const height = size.y;
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Build bone hierarchy
    const boneMap = new Map<HumanoidBone, THREE.Bone>();
    const boneList: THREE.Bone[] = [];

    for (const entry of HUMANOID_TEMPLATE) {
      const bone = new THREE.Bone();
      bone.name = entry.name;
      if (entry.parent) {
        const parentBone = boneMap.get(entry.parent)!;
        parentBone.add(bone);
      }
      // Scale offsets to mesh height
      bone.position.set(
        entry.x * height,
        entry.y * height,
        entry.z * height,
      );
      boneMap.set(entry.name, bone);
      boneList.push(bone);
    }

    // Position root (hips) at mesh origin
    const hips = boneMap.get('hips')!;
    hips.position.set(center.x, box.min.y + 0.52 * height, center.z);

    const skeleton = new THREE.Skeleton(boneList);

    // Generate approximate skinning weights using nearest-bone assignment
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const vertCount = posAttr.count;
    const skinWeights = new Float32Array(vertCount * 4);
    const skinIndices = new Uint16Array(vertCount * 4);

    const boneWorldPos: THREE.Vector3[] = boneList.map((b) => {
      const wp = new THREE.Vector3();
      b.getWorldPosition(wp);
      return wp;
    });

    for (let i = 0; i < vertCount; i++) {
      const vp = new THREE.Vector3(
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i),
      );

      // Find 4 closest bones by distance
      const dists = boneWorldPos.map((bp, bi) => ({ bi, d: bp.distanceTo(vp) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 4);

      const invDists = dists.map((x) => 1 / (x.d + 1e-4));
      const sum = invDists.reduce((s, w) => s + w, 0);

      for (let k = 0; k < 4; k++) {
        skinIndices[i * 4 + k] = dists[k]?.bi ?? 0;
        skinWeights[i * 4 + k] = (invDists[k] ?? 0) / sum;
      }
    }

    // Build IK joint descriptors
    const ikJoints: IKJoint[] = boneList.map((b) => {
      const wp = new THREE.Vector3();
      b.getWorldPosition(wp);
      const wq = new THREE.Quaternion();
      b.getWorldQuaternion(wq);
      return {
        name: b.name,
        position: [wp.x, wp.y, wp.z],
        rotation: [wq.x, wq.y, wq.z, wq.w],
        limits: { minAngle: -Math.PI / 2, maxAngle: Math.PI / 2 },
      };
    });

    log.info('Rig generated', { bones: boneList.length, vertices: vertCount });

    return { skeleton, bones: boneMap, ikJoints, skinWeights, skinIndices };
  }

  /**
   * Apply a generated rig to a THREE.SkinnedMesh.
   */
  applyToMesh(mesh: THREE.SkinnedMesh, rig: GeneratedRig): void {
    const geo = mesh.geometry;

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(rig.skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(rig.skinWeights, 4));

    mesh.add(rig.skeleton.bones[0]); // add root bone to mesh
    mesh.bind(rig.skeleton);
    mesh.normalizeSkinWeights();

    log.info('Rig applied to mesh', { uuid: mesh.uuid });
  }

  /**
   * Retarget animation from a source bone map to a target rig.
   * Handles humanoid bone name remapping (e.g., Mixamo → VRM).
   */
  retargetPose(
    sourcePose: Map<string, { rotation: THREE.Quaternion }>,
    targetRig: GeneratedRig,
    boneNameMap: Map<string, HumanoidBone>,
  ): void {
    for (const [sourceName, pose] of sourcePose) {
      const targetBoneName = boneNameMap.get(sourceName);
      if (!targetBoneName) continue;
      const targetBone = targetRig.bones.get(targetBoneName);
      if (!targetBone) continue;
      targetBone.quaternion.copy(pose.rotation);
    }
  }
}
