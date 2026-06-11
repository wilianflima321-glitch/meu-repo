// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import THREE from './webxr-vr-runtime';
import type { TeleportTarget } from './webxr-vr-contracts';

export class TeleportationSystem {
  private enabled: boolean = true;
  private maxDistance: number = 10;
  private arcResolution: number = 30;
  private arcVelocity: number = 5;
  private gravity: number = -9.81;
  private targetMesh: THREE.Mesh | null = null;
  private arcLine: THREE.Line | null = null;
  private validColor: THREE.Color = new THREE.Color(0x00ff00);
  private invalidColor: THREE.Color = new THREE.Color(0xff0000);
  private raycaster: THREE.Raycaster;
  private floorMeshes: THREE.Object3D[] = [];
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.createVisuals();
  }
  private createVisuals(): void {
    const targetGeometry = new THREE.RingGeometry(0.3, 0.4, 32);
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: this.validColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
    this.targetMesh.rotation.x = -Math.PI / 2;
    this.targetMesh.visible = false;
    const arcGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.arcResolution * 3);
    arcGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const arcMaterial = new THREE.LineBasicMaterial({
      color: this.validColor,
      transparent: true,
      opacity: 0.8,
    });
    this.arcLine = new THREE.Line(arcGeometry, arcMaterial);
    this.arcLine.visible = false;
  }
  setFloorMeshes(meshes: THREE.Object3D[]): void {
    this.floorMeshes = meshes;
  }
  calculateTarget(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): TeleportTarget | null {
    if (!this.enabled) return null;
    const arcPoints: THREE.Vector3[] = [];
    const velocity = direction.clone().multiplyScalar(this.arcVelocity);
    const position = origin.clone();
    const dt = this.maxDistance / (this.arcResolution * this.arcVelocity);
    for (let i = 0; i < this.arcResolution; i++) {
      arcPoints.push(position.clone());
      velocity.y += this.gravity * dt;
      position.add(velocity.clone().multiplyScalar(dt));
      this.raycaster.set(
        arcPoints[arcPoints.length - 1],
        velocity.clone().normalize()
      );
      const intersects = this.raycaster.intersectObjects(this.floorMeshes, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance < velocity.length() * dt) {
          this.updateArcVisual(arcPoints, true);
          this.updateTargetVisual(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), true);
          return {
            position: hit.point,
            valid: true,
            normal: hit.face?.normal || new THREE.Vector3(0, 1, 0),
          };
        }
      }
      if (position.y < -10) {
        break;
      }
    }
    this.updateArcVisual(arcPoints, false);
    this.hideVisuals();
    return null;
  }
  private updateArcVisual(points: THREE.Vector3[], valid: boolean): void {
    if (!this.arcLine) return;
    const positions = this.arcLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    for (let i = 0; i < points.length && i < this.arcResolution; i++) {
      array[i * 3] = points[i].x;
      array[i * 3 + 1] = points[i].y;
      array[i * 3 + 2] = points[i].z;
    }
    const last = points[points.length - 1];
    for (let i = points.length; i < this.arcResolution; i++) {
      array[i * 3] = last.x;
      array[i * 3 + 1] = last.y;
      array[i * 3 + 2] = last.z;
    }
    positions.needsUpdate = true;
    const material = this.arcLine.material as THREE.LineBasicMaterial;
    material.color = valid ? this.validColor : this.invalidColor;
    this.arcLine.visible = true;
  }
  private updateTargetVisual(position: THREE.Vector3, normal: THREE.Vector3, valid: boolean): void {
    if (!this.targetMesh) return;
    this.targetMesh.position.copy(position);
    this.targetMesh.position.y += 0.01; // Slight offset to prevent z-fighting
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, normal);
    this.targetMesh.quaternion.copy(quaternion);
    this.targetMesh.rotateX(-Math.PI / 2);
    const material = this.targetMesh.material as THREE.MeshBasicMaterial;
    material.color = valid ? this.validColor : this.invalidColor;
    this.targetMesh.visible = true;
  }
  hideVisuals(): void {
    if (this.targetMesh) this.targetMesh.visible = false;
    if (this.arcLine) this.arcLine.visible = false;
  }
  getVisuals(): THREE.Object3D[] {
    const visuals: THREE.Object3D[] = [];
    if (this.targetMesh) visuals.push(this.targetMesh);
    if (this.arcLine) visuals.push(this.arcLine);
    return visuals;
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.hideVisuals();
  }
}
