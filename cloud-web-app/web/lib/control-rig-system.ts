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
import { RigMath } from './control-rig-system.math';
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

// ============================================================================
// FABRIK IK SOLVER
// ============================================================================

class FABRIKSolver {
  private positions: THREE.Vector3[] = [];
  private lengths: number[] = [];
  private totalLength = 0;

  constructor(
    private bones: Bone[],
    private settings: FABRIKSettings
  ) {
    this.initialize();
  }

  private initialize() {
    this.positions = this.bones.map(b => b.position.clone());
    this.lengths = [];
    this.totalLength = 0;

    for (let i = 0; i < this.bones.length - 1; i++) {
      const length = this.positions[i].distanceTo(this.positions[i + 1]);
      this.lengths.push(length);
      this.totalLength += length;
    }
  }

  solve(target: IKTarget): void {
    const targetPos = target.position.clone();
    const rootPos = this.positions[0].clone();
    const distToTarget = rootPos.distanceTo(targetPos);

    // Verificar se alvo está alcançável
    if (distToTarget > this.totalLength) {
      // Esticar em direção ao alvo
      const direction = targetPos.clone().sub(rootPos).normalize();
      for (let i = 0; i < this.positions.length - 1; i++) {
        this.positions[i + 1].copy(this.positions[i]).add(direction.clone().multiplyScalar(this.lengths[i]));
      }
      return;
    }

    // FABRIK iterations
    let iteration = 0;
    let error = Infinity;

    while (iteration < this.settings.maxIterations && error > this.settings.tolerance) {
      // Backward pass (from end to root)
      this.positions[this.positions.length - 1].copy(targetPos);
      for (let i = this.positions.length - 2; i >= 0; i--) {
        const dir = this.positions[i].clone().sub(this.positions[i + 1]).normalize();
        this.positions[i].copy(this.positions[i + 1]).add(dir.multiplyScalar(this.lengths[i]));
      }

      // Forward pass (from root to end)
      this.positions[0].copy(rootPos);
      for (let i = 0; i < this.positions.length - 1; i++) {
        const dir = this.positions[i + 1].clone().sub(this.positions[i]).normalize();
        this.positions[i + 1].copy(this.positions[i]).add(dir.multiplyScalar(this.lengths[i]));
      }

      error = this.positions[this.positions.length - 1].distanceTo(targetPos);
      iteration++;
    }
  }

  getPositions(): THREE.Vector3[] {
    return this.positions;
  }

  applyToBones(): void {
    for (let i = 0; i < this.bones.length - 1; i++) {
      const bone = this.bones[i];
      const nextPos = this.positions[i + 1];
      const currentPos = this.positions[i];

      // Calcular rotação para apontar para próximo osso
      const direction = nextPos.clone().sub(currentPos).normalize();
      const rotation = RigMath.lookRotation(direction);

      bone.position.copy(currentPos);
      bone.rotation.copy(rotation);
    }

    // Último osso
    const lastBone = this.bones[this.bones.length - 1];
    lastBone.position.copy(this.positions[this.positions.length - 1]);
  }
}

// ============================================================================
// TWO BONE IK SOLVER
// ============================================================================

class TwoBoneIKSolver {
  private rootBone: Bone;
  private midBone: Bone;
  private endBone: Bone;

  constructor(
    private hierarchy: RigHierarchy,
    private settings: TwoBoneIKSettings
  ) {
    this.rootBone = this.getBone(settings.rootBone);
    this.midBone = this.getBone(settings.midBone);
    this.endBone = this.getBone(settings.endBone);
  }

  private getBone(name: string): Bone {
    const index = this.hierarchy.boneNameToIndex.get(name);
    if (index === undefined) throw new Error(`Bone not found: ${name}`);
    return this.hierarchy.bones[index];
  }

  solve(target: IKTarget): void {
    const rootPos = this.rootBone.position.clone();
    const midPos = this.midBone.position.clone();
    const endPos = this.endBone.position.clone();
    const targetPos = target.position.clone();
    const poleVector = target.poleVector || this.settings.poleVector.clone();

    // Comprimentos dos ossos
    const upperLength = rootPos.distanceTo(midPos);
    const lowerLength = midPos.distanceTo(endPos);
    const totalLength = upperLength + lowerLength;

    // Distância ao alvo
    const targetDist = Math.min(rootPos.distanceTo(targetPos), totalLength * 0.999);

    // Lei dos cossenos para encontrar o ângulo do cotovelo
    const cosAngle = (upperLength * upperLength + targetDist * targetDist - lowerLength * lowerLength)
                   / (2 * upperLength * targetDist);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    // Direção do root para o target
    const rootToTarget = targetPos.clone().sub(rootPos).normalize();

    // Calcular plano de referência usando pole vector
    const poleDir = poleVector.clone().sub(rootPos).normalize();
    const polePlaneNormal = new THREE.Vector3().crossVectors(rootToTarget, poleDir).normalize();

    // Rotação do primeiro osso (upper arm)
    const upperRotationAxis = polePlaneNormal;
    const upperRotation = new THREE.Quaternion().setFromAxisAngle(upperRotationAxis, angle);
    const upperDir = rootToTarget.clone().applyQuaternion(upperRotation);

    // Nova posição do mid bone
    const newMidPos = rootPos.clone().add(upperDir.multiplyScalar(upperLength));

    // Direção do mid para o target
    const midToTarget = targetPos.clone().sub(newMidPos).normalize();

    // Aplicar rotações
    this.rootBone.rotation.copy(RigMath.lookRotation(upperDir));
    this.midBone.position.copy(newMidPos);
    this.midBone.rotation.copy(RigMath.lookRotation(midToTarget));
    this.endBone.position.copy(targetPos);

    // Aplicar twist se especificado
    if (target.twist !== undefined && target.twist !== 0) {
      const twistQuat = new THREE.Quaternion().setFromAxisAngle(upperDir, target.twist);
      this.rootBone.rotation.premultiply(twistQuat);
    }
  }
}

// ============================================================================
// SPLINE IK SOLVER
// ============================================================================

class SplineIKSolver {
  private bones: Bone[];
  private curve: THREE.CatmullRomCurve3;

  constructor(
    private hierarchy: RigHierarchy,
    private settings: SplineIKSettings
  ) {
    this.bones = settings.chainBones.map(name => {
      const index = hierarchy.boneNameToIndex.get(name);
      if (index === undefined) throw new Error(`Bone not found: ${name}`);
      return hierarchy.bones[index];
    });

    this.curve = new THREE.CatmullRomCurve3(settings.splinePoints);
  }

  updateSpline(points: THREE.Vector3[]): void {
    this.curve = new THREE.CatmullRomCurve3(points);
  }

  solve(): void {
    const boneCount = this.bones.length;
    const curveLength = this.curve.getLength();

    // Calcular comprimento total dos ossos
    let totalBoneLength = 0;
    for (let i = 0; i < boneCount - 1; i++) {
      totalBoneLength += this.bones[i].length;
    }

    // Fator de stretch
    const stretchFactor = this.settings.stretch > 0
      ? 1 + (curveLength / totalBoneLength - 1) * this.settings.stretch
      : 1;

    // Posicionar ossos ao longo da spline
    let currentLength = 0;

    for (let i = 0; i < boneCount; i++) {
      const t = currentLength / curveLength;
      const position = this.curve.getPointAt(Math.min(1, t));
      const tangent = this.curve.getTangentAt(Math.min(1, t));

      // Calcular twist interpolado
      const twistAmount = THREE.MathUtils.lerp(
        this.settings.twistStart,
        this.settings.twistEnd,
        t
      );

      // Rotação base (apontando na direção da tangente)
      let rotation = RigMath.lookRotation(tangent, new THREE.Vector3(0, 1, 0));

      // Aplicar twist
      if (twistAmount !== 0) {
        const twistQuat = new THREE.Quaternion().setFromAxisAngle(tangent, twistAmount);
        rotation.premultiply(twistQuat);
      }

      this.bones[i].position.copy(position);
      this.bones[i].rotation.copy(rotation);

      if (i < boneCount - 1) {
        currentLength += this.bones[i].length * stretchFactor;
      }
    }
  }
}

// ============================================================================
// LOOK AT CONSTRAINT
// ============================================================================

class LookAtConstraint {
  private bone: Bone;
  private currentYaw = 0;
  private currentPitch = 0;

  constructor(
    private hierarchy: RigHierarchy,
    private settings: LookAtSettings
  ) {
    const index = hierarchy.boneNameToIndex.get(settings.headBone);
    if (index === undefined) throw new Error(`Bone not found: ${settings.headBone}`);
    this.bone = hierarchy.bones[index];
  }

  update(target: THREE.Vector3, deltaTime: number): void {
    const bonePos = this.bone.position.clone();
    const direction = target.clone().sub(bonePos).normalize();

    // Calcular yaw e pitch desejados
    const targetYaw = Math.atan2(direction.x, direction.z) * THREE.MathUtils.RAD2DEG;
    const targetPitch = Math.asin(-direction.y) * THREE.MathUtils.RAD2DEG;

    // Aplicar limites
    const clampedYaw = RigMath.clampAngle(targetYaw, this.settings.limits.yawMin, this.settings.limits.yawMax);
    const clampedPitch = RigMath.clampAngle(targetPitch, this.settings.limits.pitchMin, this.settings.limits.pitchMax);

    // Interpolação suave
    const lerpSpeed = this.settings.speed * deltaTime;
    this.currentYaw += (clampedYaw - this.currentYaw) * lerpSpeed;
    this.currentPitch += (clampedPitch - this.currentPitch) * lerpSpeed;

    // Criar rotação
    const yawRad = this.currentYaw * THREE.MathUtils.DEG2RAD;
    const pitchRad = this.currentPitch * THREE.MathUtils.DEG2RAD;

    const euler = new THREE.Euler(pitchRad, yawRad, 0, 'YXZ');
    this.bone.rotation.setFromEuler(euler);
  }

  setTarget(target: THREE.Vector3): void {
    this.settings.target.copy(target);
  }
}

// ============================================================================
// TWIST CORRECTIVE
// ============================================================================

class TwistCorrective {
  private sourceBone: Bone;
  private twistBones: Bone[];
  private baseRotation: THREE.Quaternion;

  constructor(
    private hierarchy: RigHierarchy,
    private settings: TwistCorrectiveSettings
  ) {
    const sourceIndex = hierarchy.boneNameToIndex.get(settings.sourceBone);
    if (sourceIndex === undefined) throw new Error(`Source bone not found: ${settings.sourceBone}`);
    this.sourceBone = hierarchy.bones[sourceIndex];

    this.twistBones = settings.twistBones.map(name => {
      const index = hierarchy.boneNameToIndex.get(name);
      if (index === undefined) throw new Error(`Twist bone not found: ${name}`);
      return hierarchy.bones[index];
    });

    this.baseRotation = this.sourceBone.rotation.clone();
  }

  update(): void {
    // Extrair componente de twist da rotação fonte
    const currentRotation = this.sourceBone.rotation.clone();
    const relativeRotation = currentRotation.clone().multiply(this.baseRotation.clone().conjugate());

    const { twist } = RigMath.decomposeSwingTwist(relativeRotation, this.settings.twistAxis);

    // Distribuir twist pelos ossos de correção
    for (let i = 0; i < this.twistBones.length; i++) {
      const weight = this.settings.distribution[i] ?? (1 / this.twistBones.length);
      const partialTwist = new THREE.Quaternion().slerp(twist, weight);

      this.twistBones[i].rotation.multiply(partialTwist);
    }
  }
}

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
