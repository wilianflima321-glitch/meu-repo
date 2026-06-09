// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
/**
 * CONTROL RIG SYSTEM - Aethel Engine
 *
 * Sistema de Control Rig no estilo Unreal Engine para procedural animation.
 * Permite criar rigs complexos com IK, FK, constraints e expressões.
 *
 * FEATURES:
 * - Full Body IK (FABRIK, CCD, Analytical)
 * - Two-bone IK
 * - Spline IK
 * - Look at / Aim constraints
 * - Parent/Position/Rotation constraints
 * - Twist bone chains
 * - Rig variables and expressions
 * - Runtime evaluation
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

import type {
  Bone,
  RigHierarchy,
  RigControl,
  RigVariable,
  IKTarget,
  FABRIKSettings,
  TwoBoneIKSettings,
  SplineIKSettings,
  LookAtSettings,
  TwistCorrectiveSettings,
} from './control-rig-system.types';
export type {
  Bone,
  RigHierarchy,
  ControlType,
  RigControl,
  RigVariable,
  IKTarget,
  FABRIKSettings,
  TwoBoneIKSettings,
  SplineIKSettings,
  LookAtSettings,
  TwistCorrectiveSettings,
  RigControlSettings,
} from './control-rig-system.types';

import { FABRIKSolver, LookAtConstraint, SplineIKSolver, TwistCorrective, TwoBoneIKSolver } from './control-rig-system.solvers';

// ============================================================================
// CONTROL RIG MAIN CLASS
// ============================================================================

export interface ControlRigConfig {
  skeleton: THREE.Skeleton;
  controls: RigControl[];
  variables: RigVariable[];
}

export class ControlRig {
  private hierarchy: RigHierarchy;
  private controls: Map<string, RigControl> = new Map();
  private variables: Map<string, RigVariable> = new Map();

  // Solvers
  private fabrikSolvers: Map<string, FABRIKSolver> = new Map();
  private twoBoneSolvers: Map<string, TwoBoneIKSolver> = new Map();
  private splineSolvers: Map<string, SplineIKSolver> = new Map();
  private lookAtConstraints: Map<string, LookAtConstraint> = new Map();
  private twistCorrectives: Map<string, TwistCorrective> = new Map();

  // IK targets
  private ikTargets: Map<string, IKTarget> = new Map();

  constructor(config: ControlRigConfig) {
    this.hierarchy = this.buildHierarchy(config.skeleton);

    // Inicializar controles
    for (const control of config.controls) {
      this.addControl(control);
    }

    // Inicializar variáveis
    for (const variable of config.variables) {
      this.variables.set(variable.id, variable);
    }
  }

  private buildHierarchy(skeleton: THREE.Skeleton): RigHierarchy {
    const bones: Bone[] = [];
    const boneNameToIndex = new Map<string, number>();
    const rootBones: number[] = [];

    skeleton.bones.forEach((bone, index) => {
      boneNameToIndex.set(bone.name, index);

      const parentIndex = skeleton.bones.findIndex(b => b === bone.parent);
      if (parentIndex === -1) rootBones.push(index);

      // Calcular comprimento do osso
      let length = 0;
      if (bone.children.length > 0) {
        const child = bone.children[0] as THREE.Bone;
        length = bone.position.distanceTo(child.position);
      }

      bones.push({
        name: bone.name,
        index,
        parent: parentIndex,
        position: bone.position.clone(),
        rotation: bone.quaternion.clone(),
        scale: bone.scale.clone(),
        length,
        bindPose: skeleton.boneInverses[index].clone(),
        worldMatrix: bone.matrixWorld.clone(),
      });
    });

    return { bones, boneNameToIndex, rootBones };
  }

  addControl(control: RigControl): void {
    this.controls.set(control.id, control);

    // Inicializar solver apropriado
    switch (control.type) {
      case 'ik_fabrik':
        this.initFABRIK(control);
        break;
      case 'ik_two_bone':
        this.initTwoBoneIK(control);
        break;
      case 'ik_spline':
        this.initSplineIK(control);
        break;
      case 'look_at':
        this.initLookAt(control);
        break;
      case 'twist_corrective':
        this.initTwistCorrective(control);
        break;
    }
  }

  private initFABRIK(control: RigControl): void {
    const settings = control.settings as FABRIKSettings;
    const bones = settings.chainBones.map(name => {
      const index = this.hierarchy.boneNameToIndex.get(name);
      if (index === undefined) throw new Error(`Bone not found: ${name}`);
      return this.hierarchy.bones[index];
    });

    this.fabrikSolvers.set(control.id, new FABRIKSolver(bones, settings));
  }

  private initTwoBoneIK(control: RigControl): void {
    const settings = control.settings as TwoBoneIKSettings;
    this.twoBoneSolvers.set(control.id, new TwoBoneIKSolver(this.hierarchy, settings));
  }

  private initSplineIK(control: RigControl): void {
    const settings = control.settings as SplineIKSettings;
    this.splineSolvers.set(control.id, new SplineIKSolver(this.hierarchy, settings));
  }

  private initLookAt(control: RigControl): void {
    const settings = control.settings as LookAtSettings;
    this.lookAtConstraints.set(control.id, new LookAtConstraint(this.hierarchy, settings));
  }

  private initTwistCorrective(control: RigControl): void {
    const settings = control.settings as TwistCorrectiveSettings;
    this.twistCorrectives.set(control.id, new TwistCorrective(this.hierarchy, settings));
  }

  // ========== PUBLIC API ==========

  /**
   * Define target para IK
   */
  setIKTarget(controlId: string, target: IKTarget): void {
    this.ikTargets.set(controlId, target);
  }

  /**
   * Obtém posição de um osso
   */
  getBonePosition(boneName: string): THREE.Vector3 | null {
    const index = this.hierarchy.boneNameToIndex.get(boneName);
    if (index === undefined) return null;
    return this.hierarchy.bones[index].position.clone();
  }

  /**
   * Define posição de um osso (FK)
   */
  setBonePosition(boneName: string, position: THREE.Vector3): void {
    const index = this.hierarchy.boneNameToIndex.get(boneName);
    if (index === undefined) return;
    this.hierarchy.bones[index].position.copy(position);
  }

  /**
   * Define rotação de um osso (FK)
   */
  setBoneRotation(boneName: string, rotation: THREE.Quaternion): void {
    const index = this.hierarchy.boneNameToIndex.get(boneName);
    if (index === undefined) return;
    this.hierarchy.bones[index].rotation.copy(rotation);
  }

  /**
   * Define valor de variável
   */
  setVariable(id: string, value: number | THREE.Vector3 | THREE.Quaternion | boolean): void {
    const variable = this.variables.get(id);
    if (!variable) return;
    variable.value = value;
  }

  /**
   * Obtém valor de variável
   */
  getVariable(id: string): unknown {
    return this.variables.get(id)?.value;
  }

  /**
   * Habilita/desabilita controle
   */
  setControlEnabled(controlId: string, enabled: boolean): void {
    const control = this.controls.get(controlId);
    if (control) control.enabled = enabled;
  }

  /**
   * Define peso de um controle
   */
  setControlWeight(controlId: string, weight: number): void {
    const control = this.controls.get(controlId);
    if (control) control.weight = Math.max(0, Math.min(1, weight));
  }

  /**
   * Avalia o rig - deve ser chamado todo frame
   */
  evaluate(deltaTime: number): void {
    // Avaliar controles em ordem de prioridade
    for (const [id, control] of this.controls) {
      if (!control.enabled || control.weight === 0) continue;

      switch (control.type) {
        case 'ik_fabrik': {
          const solver = this.fabrikSolvers.get(id);
          const target = this.ikTargets.get(id);
          if (solver && target) {
            solver.solve(target);
            solver.applyToBones();
          }
          break;
        }

        case 'ik_two_bone': {
          const solver = this.twoBoneSolvers.get(id);
          const target = this.ikTargets.get(id);
          if (solver && target) {
            solver.solve(target);
          }
          break;
        }

        case 'ik_spline': {
          const solver = this.splineSolvers.get(id);
          if (solver) {
            solver.solve();
          }
          break;
        }

        case 'look_at': {
          const constraint = this.lookAtConstraints.get(id);
          const settings = control.settings as LookAtSettings;
          if (constraint) {
            constraint.update(settings.target, deltaTime);
          }
          break;
        }

        case 'twist_corrective': {
          const corrective = this.twistCorrectives.get(id);
          if (corrective) {
            corrective.update();
          }
          break;
        }
      }
    }

    // Atualizar matrizes world
    this.updateWorldMatrices();
  }

  private updateWorldMatrices(): void {
    // Atualizar em ordem hierárquica (root first)
    for (const rootIndex of this.hierarchy.rootBones) {
      this.updateBoneWorldMatrix(rootIndex, new THREE.Matrix4());
    }
  }

  private updateBoneWorldMatrix(boneIndex: number, parentWorld: THREE.Matrix4): void {
    const bone = this.hierarchy.bones[boneIndex];

    // Local matrix
    const localMatrix = new THREE.Matrix4().compose(bone.position, bone.rotation, bone.scale);

    // World matrix
    bone.worldMatrix.copy(parentWorld).multiply(localMatrix);

    // Update children
    for (const otherBone of this.hierarchy.bones) {
      if (otherBone.parent === boneIndex) {
        this.updateBoneWorldMatrix(otherBone.index, bone.worldMatrix);
      }
    }
  }

  /**
   * Aplica resultado ao skeleton THREE.js
   */
  applyToSkeleton(skeleton: THREE.Skeleton): void {
    for (const bone of this.hierarchy.bones) {
      const threeBone = skeleton.bones[bone.index];
      if (threeBone) {
        threeBone.position.copy(bone.position);
        threeBone.quaternion.copy(bone.rotation);
        threeBone.scale.copy(bone.scale);
        threeBone.updateMatrix();
      }
    }
  }

  /**
   * Serializa rig para JSON
   */
  serialize(): string {
    return JSON.stringify({
      controls: Array.from(this.controls.values()),
      variables: Array.from(this.variables.values()),
    });
  }

  /**
   * Lista todos os ossos
   */
  getBoneNames(): string[] {
    return this.hierarchy.bones.map(b => b.name);
  }

  /**
   * Lista todos os controles
   */
  getControls(): RigControl[] {
    return Array.from(this.controls.values());
  }

  /**
   * Lista todas as variáveis
   */
  getVariables(): RigVariable[] {
    return Array.from(this.variables.values());
  }
}

export {
  createArmIKSetup,
  createLegIKSetup,
  createSpineIKSetup,
  createHeadLookAtSetup,
} from './control-rig-system.factories';

export default ControlRig;
