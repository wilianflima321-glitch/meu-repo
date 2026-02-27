import * as THREE from 'three';

import { Component } from './scene-graph';

export class MeshRenderer extends Component {
  public geometry: THREE.BufferGeometry | null = null;
  public material: THREE.Material | null = null;
  public castShadow = true;
  public receiveShadow = true;

  private _mesh: THREE.Mesh | null = null;

  onAwake(): void {
    this.createMesh();
  }

  private createMesh(): void {
    if (!this.geometry || !this.material) return;

    this._mesh = new THREE.Mesh(this.geometry, this.material);
    this._mesh.castShadow = this.castShadow;
    this._mesh.receiveShadow = this.receiveShadow;
    this.node.threeObject = this._mesh;

    if (this.scene) {
      this.scene.threeScene.add(this._mesh);
    }
  }

  onUpdate(): void {
    if (this._mesh) {
      const worldMatrix = this.transform.worldMatrix;
      this._mesh.matrix.copy(worldMatrix);
      this._mesh.matrixAutoUpdate = false;
    }
  }

  onDestroy(): void {
    if (this._mesh && this.scene) {
      this.scene.threeScene.remove(this._mesh);
    }
  }

  serialize(): Record<string, unknown> {
    return {
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.castShadow = (data.castShadow as boolean) ?? true;
    this.receiveShadow = (data.receiveShadow as boolean) ?? true;
  }
}

export class LightComponent extends Component {
  public type: 'directional' | 'point' | 'spot' | 'ambient' = 'point';
  public color: THREE.Color = new THREE.Color(0xffffff);
  public intensity = 1;
  public castShadow = false;
  public range = 10;
  public angle = Math.PI / 4;
  public penumbra = 0.1;

  private _light: THREE.Light | null = null;

  onAwake(): void {
    this.createLight();
  }

  private createLight(): void {
    switch (this.type) {
      case 'directional':
        this._light = new THREE.DirectionalLight(this.color, this.intensity);
        break;
      case 'point':
        this._light = new THREE.PointLight(this.color, this.intensity, this.range);
        break;
      case 'spot':
        this._light = new THREE.SpotLight(this.color, this.intensity, this.range, this.angle, this.penumbra);
        break;
      case 'ambient':
        this._light = new THREE.AmbientLight(this.color, this.intensity);
        break;
    }

    if (this._light) {
      this._light.castShadow = this.castShadow;
      this.node.threeObject = this._light;

      if (this.scene) {
        this.scene.threeScene.add(this._light);
      }
    }
  }

  onUpdate(): void {
    if (this._light) {
      const pos = this.transform.worldPosition;
      this._light.position.copy(pos);

      if (this._light instanceof THREE.DirectionalLight || this._light instanceof THREE.SpotLight) {
        const target = pos.clone().add(this.transform.forward);
        this._light.target.position.copy(target);
      }
    }
  }

  onDestroy(): void {
    if (this._light && this.scene) {
      this.scene.threeScene.remove(this._light);
    }
  }
}

export class CameraComponent extends Component {
  public fov = 60;
  public near = 0.1;
  public far = 1000;
  public isMain = false;

  private _camera: THREE.PerspectiveCamera | null = null;

  get camera(): THREE.PerspectiveCamera | null {
    return this._camera;
  }

  onAwake(): void {
    this._camera = new THREE.PerspectiveCamera(this.fov, 16 / 9, this.near, this.far);
    this.node.threeObject = this._camera;

    if (this.isMain && this.scene) {
      this.scene.activeCamera = this.node;
    }
  }

  onUpdate(): void {
    if (this._camera) {
      const worldMatrix = this.transform.worldMatrix;
      this._camera.matrix.copy(worldMatrix);
      this._camera.matrixAutoUpdate = false;
      this._camera.matrixWorldNeedsUpdate = true;
    }
  }

  setAspect(aspect: number): void {
    if (this._camera) {
      this._camera.aspect = aspect;
      this._camera.updateProjectionMatrix();
    }
  }
}
