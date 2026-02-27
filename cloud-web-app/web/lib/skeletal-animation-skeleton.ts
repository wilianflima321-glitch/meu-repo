import * as THREE from 'three';
import type { BoneData, SkeletonData } from './skeletal-animation-types';

export class Bone extends THREE.Object3D {
  public boneData: BoneData;
  public bindMatrix: THREE.Matrix4;
  public inverseBindMatrix: THREE.Matrix4;
  public boneIndex: number;
  public restPosition: THREE.Vector3;
  public restRotation: THREE.Quaternion;
  public restScale: THREE.Vector3;

  constructor(data: BoneData, index: number) {
    super();

    this.name = data.name;
    this.boneData = data;
    this.boneIndex = index;

    this.position.copy(data.localPosition);
    this.quaternion.copy(data.localRotation);
    this.scale.copy(data.localScale);

    this.restPosition = data.localPosition.clone();
    this.restRotation = data.localRotation.clone();
    this.restScale = data.localScale.clone();

    this.bindMatrix = new THREE.Matrix4();
    this.inverseBindMatrix = new THREE.Matrix4();
  }

  calculateBindMatrix(): void {
    this.updateWorldMatrix(true, false);
    this.bindMatrix.copy(this.matrixWorld);
    this.inverseBindMatrix.copy(this.bindMatrix).invert();
  }

  resetToRest(): void {
    this.position.copy(this.restPosition);
    this.quaternion.copy(this.restRotation);
    this.scale.copy(this.restScale);
  }
}

export class Skeleton {
  public bones: Bone[] = [];
  public boneMatrices: Float32Array;
  public boneTexture: THREE.DataTexture | null = null;
  private boneByName: Map<string, Bone> = new Map();

  constructor(data: SkeletonData) {
    this.buildSkeleton(data);
    this.boneMatrices = new Float32Array(this.bones.length * 16);
    this.createBoneTexture();
  }

  private buildSkeleton(data: SkeletonData): void {
    for (let i = 0; i < data.bones.length; i++) {
      const boneData = data.bones[i];
      const bone = new Bone(boneData, i);
      this.bones.push(bone);
      this.boneByName.set(boneData.name, bone);
    }

    for (let i = 0; i < data.bones.length; i++) {
      const boneData = data.bones[i];
      const bone = this.bones[i];

      if (boneData.parentIndex >= 0) {
        const parent = this.bones[boneData.parentIndex];
        parent.add(bone);
      }
    }

    for (const bone of this.bones) {
      bone.calculateBindMatrix();
    }
  }

  private createBoneTexture(): void {
    const size = Math.ceil(Math.sqrt(this.bones.length * 4));
    const textureData = new Float32Array(size * size * 4);

    this.boneTexture = new THREE.DataTexture(textureData, size, size, THREE.RGBAFormat, THREE.FloatType);
    this.boneTexture.needsUpdate = true;
  }

  getBone(name: string): Bone | undefined {
    return this.boneByName.get(name);
  }

  getBoneIndex(name: string): number {
    const bone = this.boneByName.get(name);
    return bone ? bone.boneIndex : -1;
  }

  updateMatrices(): void {
    const offsetMatrix = new THREE.Matrix4();

    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      bone.updateWorldMatrix(true, false);

      offsetMatrix.multiplyMatrices(bone.matrixWorld, bone.inverseBindMatrix);
      offsetMatrix.toArray(this.boneMatrices, i * 16);
    }

    if (this.boneTexture) {
      const data = this.boneTexture.image.data as unknown as Float32Array;

      for (let i = 0; i < this.bones.length; i++) {
        const matrixOffset = i * 16;
        const textureOffset = i * 16;

        for (let j = 0; j < 16; j++) {
          data[textureOffset + j] = this.boneMatrices[matrixOffset + j];
        }
      }

      this.boneTexture.needsUpdate = true;
    }
  }

  resetToBindPose(): void {
    for (const bone of this.bones) {
      bone.resetToRest();
    }
    this.updateMatrices();
  }

  clone(): Skeleton {
    const data: SkeletonData = {
      bones: this.bones.map(bone => ({
        ...bone.boneData,
        localPosition: bone.restPosition.clone(),
        localRotation: bone.restRotation.clone(),
        localScale: bone.restScale.clone(),
      })),
      rootBoneIndices: this.bones
        .filter(b => b.boneData.parentIndex < 0)
        .map(b => b.boneIndex),
    };

    return new Skeleton(data);
  }

  dispose(): void {
    if (this.boneTexture) {
      this.boneTexture.dispose();
    }
  }
}
