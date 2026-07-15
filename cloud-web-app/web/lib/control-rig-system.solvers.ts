// @aethel-heavy-async-boundary Studio/control-rig solvers; do not import from public route shells.

import * as THREE from 'three';

import type {
  Bone,
  RigHierarchy,
  IKTarget,
  FABRIKSettings,
  TwoBoneIKSettings,
  SplineIKSettings,
  LookAtSettings,
  TwistCorrectiveSettings,
} from './control-rig-system.types';
import { RigMath } from './control-rig-system.math';

// ============================================================================
// FABRIK IK SOLVER
// ============================================================================

export class FABRIKSolver {
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

export class TwoBoneIKSolver {
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

export class SplineIKSolver {
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

export class LookAtConstraint {
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

export class TwistCorrective {
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
