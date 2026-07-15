// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';

export class RigMath {
  private static readonly EPSILON = 1e-6;
  private static readonly tempVec = new THREE.Vector3();
  private static readonly tempQuat = new THREE.Quaternion();
  private static readonly tempMat = new THREE.Matrix4();

  /**
   * Calcula rotação para apontar de A para B
   */
  static lookRotation(forward: THREE.Vector3, up: THREE.Vector3 = new THREE.Vector3(0, 1, 0)): THREE.Quaternion {
    const fwd = forward.clone().normalize();
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const newUp = new THREE.Vector3().crossVectors(fwd, right);

    const mat = new THREE.Matrix4().makeBasis(right, newUp, fwd);
    return new THREE.Quaternion().setFromRotationMatrix(mat);
  }

  /**
   * Interpolação esférica de quaternion com peso
   */
  static slerpWeight(a: THREE.Quaternion, b: THREE.Quaternion, t: number): THREE.Quaternion {
    return a.clone().slerp(b, t);
  }

  /**
   * Clamp de ângulo
   */
  static clampAngle(angle: number, min: number, max: number): number {
    // Normaliza para -180 a 180
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return Math.max(min, Math.min(max, angle));
  }

  /**
   * Distância entre dois pontos
   */
  static distance(a: THREE.Vector3, b: THREE.Vector3): number {
    return a.distanceTo(b);
  }

  /**
   * Projeta vetor em plano
   */
  static projectOnPlane(vector: THREE.Vector3, planeNormal: THREE.Vector3): THREE.Vector3 {
    const dot = vector.dot(planeNormal);
    return vector.clone().sub(planeNormal.clone().multiplyScalar(dot));
  }

  /**
   * Ângulo entre dois vetores (em radianos)
   */
  static angleBetween(a: THREE.Vector3, b: THREE.Vector3): number {
    const dot = a.clone().normalize().dot(b.clone().normalize());
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  /**
   * Swing-Twist decomposition
   */
  static decomposeSwingTwist(
    rotation: THREE.Quaternion,
    twistAxis: THREE.Vector3
  ): { swing: THREE.Quaternion; twist: THREE.Quaternion } {
    const axis = twistAxis.clone().normalize();
    const ra = new THREE.Vector3(rotation.x, rotation.y, rotation.z);
    const projection = axis.clone().multiplyScalar(ra.dot(axis));

    const twist = new THREE.Quaternion(projection.x, projection.y, projection.z, rotation.w).normalize();
    const swing = rotation.clone().multiply(twist.clone().conjugate());

    return { swing, twist };
  }
}
