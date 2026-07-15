// @aethel-heavy-async-boundary Studio/scene serialization runtime; do not import from public route shells.
/**
 * Scene Serializer - split runtime modules.
 *
 * Three.js scene serialization stays isolated from public route shells and can
 * be lazy-loaded by Studio scene/level tools when export/import is requested.
 */

import * as THREE from 'three';
import type { CameraSerialized, ColorSerialized, EmptySerialized, EnvironmentSerialized, EulerSerialized, GeometrySerialized, GroupSerialized, LightSerialized, MaterialSerialized, MeshSerialized, PhysicsSettingsSerialized, QuaternionSerialized, SceneObjectSerialized, SceneSerialized, SceneSettingsSerialized, TransformSerialized, Vector3Serialized } from './types';
import { getDefaultPhysicsSettings, getDefaultSceneSettings } from './serializer-defaults';
import { loadSceneJsonFromFile, saveSceneJsonToFile } from './serializer-file-io';
import { deserializeGeometry, serializeGeometry } from './serializer-geometry';
import { deserializeMaterial, serializeMaterial } from './serializer-material';

export class SceneSerializer {
  private static VERSION = '1.0.0';

  // Serialize a Three.js scene to JSON
  static serialize(scene: THREE.Scene, metadata?: Partial<SceneSerialized>): SceneSerialized {
    const now = new Date().toISOString();

    const serialized: SceneSerialized = {
      version: this.VERSION,
      id: scene.uuid,
      name: scene.name || 'Untitled Scene',
      createdAt: metadata?.createdAt || now,
      updatedAt: now,
      author: metadata?.author,
      description: metadata?.description,
      thumbnail: metadata?.thumbnail,
      settings: metadata?.settings || this.getDefaultSettings(),
      environment: this.serializeEnvironment(scene),
      physics: metadata?.physics || this.getDefaultPhysics(),
      objects: this.serializeChildren(scene),
      activeCamera: metadata?.activeCamera,
      assets: metadata?.assets || { textures: [], models: [], materials: [] },
      scripts: metadata?.scripts || [],
    };

    return serialized;
  }

  private static serializeChildren(parent: THREE.Object3D): SceneObjectSerialized[] {
    const objects: SceneObjectSerialized[] = [];

    for (const child of parent.children) {
      const serialized = this.serializeObject(child);
      if (serialized) {
        objects.push(serialized);
      }
    }

    return objects;
  }

  private static serializeObject(obj: THREE.Object3D): SceneObjectSerialized | null {
    const transform = this.serializeTransform(obj);
    const children = this.serializeChildren(obj);

    // Mesh
    if (obj instanceof THREE.Mesh) {
      return {
        id: obj.uuid,
        name: obj.name || 'Mesh',
        type: 'mesh',
        transform,
        geometry: this.serializeGeometry(obj.geometry),
        material: this.serializeMaterial(obj.material as THREE.Material),
        visible: obj.visible,
        castShadow: obj.castShadow,
        receiveShadow: obj.receiveShadow,
        userData: obj.userData,
        children,
        tags: (obj.userData.tags as string[]) || [],
        layer: obj.layers.mask,
      };
    }

    // Lights
    if (obj instanceof THREE.Light) {
      return this.serializeLight(obj, transform, children);
    }

    // Cameras
    if (obj instanceof THREE.Camera) {
      return this.serializeCamera(obj, transform, children);
    }

    // Group
    if (obj instanceof THREE.Group) {
      return {
        id: obj.uuid,
        name: obj.name || 'Group',
        type: 'group',
        transform,
        visible: obj.visible,
        userData: obj.userData,
        children,
      };
    }

    // Empty/Object3D
    if (obj instanceof THREE.Object3D) {
      return {
        id: obj.uuid,
        name: obj.name || 'Empty',
        type: 'empty',
        transform,
        visible: obj.visible,
        userData: obj.userData,
        children,
      };
    }

    return null;
  }

  private static serializeLight(light: THREE.Light, transform: TransformSerialized, children: SceneObjectSerialized[]): LightSerialized {
    const base: Partial<LightSerialized> = {
      id: light.uuid,
      name: light.name || 'Light',
      type: 'light',
      transform,
      color: this.serializeColor(light.color),
      intensity: light.intensity,
      visible: light.visible,
      castShadow: light.castShadow,
      userData: light.userData,
      children,
    };

    if (light instanceof THREE.PointLight) {
      return {
        ...base,
        lightType: 'point',
        distance: light.distance,
        decay: light.decay,
        shadow: light.castShadow ? this.serializeShadow(light.shadow) : undefined,
      } as LightSerialized;
    }

    if (light instanceof THREE.DirectionalLight) {
      return {
        ...base,
        lightType: 'directional',
        shadow: light.castShadow ? this.serializeShadow(light.shadow) : undefined,
      } as LightSerialized;
    }

    if (light instanceof THREE.SpotLight) {
      return {
        ...base,
        lightType: 'spot',
        distance: light.distance,
        decay: light.decay,
        angle: light.angle,
        penumbra: light.penumbra,
        shadow: light.castShadow ? this.serializeShadow(light.shadow) : undefined,
      } as LightSerialized;
    }

    if (light instanceof THREE.AmbientLight) {
      return {
        ...base,
        lightType: 'ambient',
      } as LightSerialized;
    }

    if (light instanceof THREE.HemisphereLight) {
      return {
        ...base,
        lightType: 'hemisphere',
        groundColor: this.serializeColor(light.groundColor),
      } as LightSerialized;
    }

    if (light instanceof THREE.RectAreaLight) {
      return {
        ...base,
        lightType: 'rectArea',
        width: light.width,
        height: light.height,
      } as LightSerialized;
    }

    return base as LightSerialized;
  }

  private static serializeShadow(shadow: THREE.LightShadow): LightSerialized['shadow'] {
    const result: LightSerialized['shadow'] = {
      mapSize: { width: shadow.mapSize.x, height: shadow.mapSize.y },
      bias: shadow.bias,
      normalBias: shadow.normalBias,
      radius: shadow.radius,
    };

    if (shadow.camera instanceof THREE.PerspectiveCamera) {
      result.camera = {
        near: shadow.camera.near,
        far: shadow.camera.far,
        fov: shadow.camera.fov,
      };
    } else if (shadow.camera instanceof THREE.OrthographicCamera) {
      result.camera = {
        near: shadow.camera.near,
        far: shadow.camera.far,
        left: shadow.camera.left,
        right: shadow.camera.right,
        top: shadow.camera.top,
        bottom: shadow.camera.bottom,
      };
    }

    return result;
  }

  private static serializeCamera(camera: THREE.Camera, transform: TransformSerialized, children: SceneObjectSerialized[]): CameraSerialized {
    const base: Partial<CameraSerialized> = {
      id: camera.uuid,
      name: camera.name || 'Camera',
      type: 'camera',
      transform,
      visible: camera.visible,
      userData: camera.userData,
      children,
    };

    if (camera instanceof THREE.PerspectiveCamera) {
      return {
        ...base,
        cameraType: 'perspective',
        fov: camera.fov,
        aspect: camera.aspect,
        near: camera.near,
        far: camera.far,
        zoom: camera.zoom,
      } as CameraSerialized;
    }

    if (camera instanceof THREE.OrthographicCamera) {
      return {
        ...base,
        cameraType: 'orthographic',
        left: camera.left,
        right: camera.right,
        top: camera.top,
        bottom: camera.bottom,
        near: camera.near,
        far: camera.far,
        zoom: camera.zoom,
      } as CameraSerialized;
    }

    // Default perspective
    return {
      ...base,
      cameraType: 'perspective',
      fov: 75,
      aspect: 1,
      near: 0.1,
      far: 1000,
      zoom: 1,
    } as CameraSerialized;
  }

  private static serializeTransform(obj: THREE.Object3D): TransformSerialized {
    return {
      position: this.serializeVector3(obj.position),
      rotation: this.serializeEuler(obj.rotation),
      scale: this.serializeVector3(obj.scale),
    };
  }

  private static serializeVector3(v: THREE.Vector3): Vector3Serialized {
    return { x: v.x, y: v.y, z: v.z };
  }

  private static serializeEuler(e: THREE.Euler): EulerSerialized {
    return { x: e.x, y: e.y, z: e.z, order: e.order };
  }

  private static serializeColor(c: THREE.Color): ColorSerialized {
    return { r: c.r, g: c.g, b: c.b };
  }

  private static serializeGeometry(geometry: THREE.BufferGeometry): GeometrySerialized {
    return serializeGeometry(geometry);
  }

  private static serializeMaterial(material: THREE.Material): MaterialSerialized {
    return serializeMaterial(material);
  }

  private static serializeEnvironment(scene: THREE.Scene): EnvironmentSerialized {
    const background: EnvironmentSerialized['background'] = {
      type: 'color',
      value: { r: 0, g: 0, b: 0 },
    };

    if (scene.background instanceof THREE.Color) {
      background.type = 'color';
      background.value = this.serializeColor(scene.background);
    }

    const env: EnvironmentSerialized = { background };

    if (scene.fog instanceof THREE.Fog) {
      env.fog = {
        type: 'linear',
        color: this.serializeColor(scene.fog.color),
        near: scene.fog.near,
        far: scene.fog.far,
      };
    } else if (scene.fog instanceof THREE.FogExp2) {
      env.fog = {
        type: 'exponential',
        color: this.serializeColor(scene.fog.color),
        density: scene.fog.density,
      };
    }

    return env;
  }

  private static getDefaultSettings(): SceneSettingsSerialized {
    return getDefaultSceneSettings();
  }

  private static getDefaultPhysics(): PhysicsSettingsSerialized {
    return getDefaultPhysicsSettings();
  }

  // ============================================================================
  // DESERIALIZER
  // ============================================================================

  static deserialize(data: SceneSerialized): THREE.Scene {
    const scene = new THREE.Scene();
    scene.uuid = data.id;
    scene.name = data.name;

    // Environment
    this.applyEnvironment(scene, data.environment);

    // Objects
    for (const objData of data.objects) {
      const obj = this.deserializeObject(objData);
      if (obj) {
        scene.add(obj);
      }
    }

    return scene;
  }

  private static applyEnvironment(scene: THREE.Scene, env: EnvironmentSerialized): void {
    if (env.background.type === 'color' && typeof env.background.value === 'object' && 'r' in env.background.value) {
      const c = env.background.value as ColorSerialized;
      scene.background = new THREE.Color(c.r, c.g, c.b);
    }

    if (env.fog) {
      const fogColor = new THREE.Color(env.fog.color.r, env.fog.color.g, env.fog.color.b);
      if (env.fog.type === 'linear') {
        scene.fog = new THREE.Fog(fogColor, env.fog.near!, env.fog.far!);
      } else {
        scene.fog = new THREE.FogExp2(fogColor, env.fog.density!);
      }
    }
  }

  private static deserializeObject(data: SceneObjectSerialized): THREE.Object3D | null {
    let obj: THREE.Object3D | null = null;

    switch (data.type) {
      case 'mesh':
        obj = this.deserializeMesh(data as MeshSerialized);
        break;
      case 'light':
        obj = this.deserializeLight(data as LightSerialized);
        break;
      case 'camera':
        obj = this.deserializeCamera(data as CameraSerialized);
        break;
      case 'group':
        obj = new THREE.Group();
        break;
      case 'empty':
        obj = new THREE.Object3D();
        break;
    }

    if (!obj) return null;

    // Apply common properties
    obj.uuid = data.id;
    obj.name = data.name;
    this.applyTransform(obj, data.transform);
    obj.visible = data.visible;
    obj.userData = data.userData;

    // Deserialize children
    for (const childData of data.children) {
      const child = this.deserializeObject(childData);
      if (child) {
        obj.add(child);
      }
    }

    return obj;
  }

  private static deserializeMesh(data: MeshSerialized): THREE.Mesh {
    const geometry = this.deserializeGeometry(data.geometry);
    const material = this.deserializeMaterial(data.material);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = data.castShadow;
    mesh.receiveShadow = data.receiveShadow;
    mesh.userData.tags = data.tags;
    mesh.layers.set(data.layer);

    return mesh;
  }

  private static deserializeLight(data: LightSerialized): THREE.Light {
    const color = new THREE.Color(data.color.r, data.color.g, data.color.b);
    let light: THREE.Light;

    switch (data.lightType) {
      case 'point':
        light = new THREE.PointLight(color, data.intensity, data.distance, data.decay);
        break;
      case 'directional':
        light = new THREE.DirectionalLight(color, data.intensity);
        break;
      case 'spot':
        light = new THREE.SpotLight(color, data.intensity, data.distance, data.angle, data.penumbra, data.decay);
        break;
      case 'ambient':
        light = new THREE.AmbientLight(color, data.intensity);
        break;
      case 'hemisphere':
        const groundColor = data.groundColor
          ? new THREE.Color(data.groundColor.r, data.groundColor.g, data.groundColor.b)
          : new THREE.Color(0x444444);
        light = new THREE.HemisphereLight(color, groundColor, data.intensity);
        break;
      case 'rectArea':
        light = new THREE.RectAreaLight(color, data.intensity, data.width, data.height);
        break;
      default:
        light = new THREE.PointLight(color, data.intensity);
    }

    light.castShadow = data.castShadow;

    // Apply shadow settings
    if (data.shadow && light.shadow) {
      light.shadow.mapSize.set(data.shadow.mapSize.width, data.shadow.mapSize.height);
      light.shadow.bias = data.shadow.bias;
      light.shadow.normalBias = data.shadow.normalBias;
      light.shadow.radius = data.shadow.radius;
    }

    return light;
  }

  private static deserializeCamera(data: CameraSerialized): THREE.Camera {
    let camera: THREE.Camera;

    if (data.cameraType === 'perspective') {
      camera = new THREE.PerspectiveCamera(
        data.fov || 75,
        data.aspect || 1,
        data.near,
        data.far
      );
      (camera as THREE.PerspectiveCamera).zoom = data.zoom;
    } else {
      camera = new THREE.OrthographicCamera(
        data.left || -1,
        data.right || 1,
        data.top || 1,
        data.bottom || -1,
        data.near,
        data.far
      );
      (camera as THREE.OrthographicCamera).zoom = data.zoom;
    }

    return camera;
  }

  private static deserializeGeometry(data: GeometrySerialized): THREE.BufferGeometry {
    return deserializeGeometry(data);
  }

  private static deserializeMaterial(data: MaterialSerialized): THREE.Material {
    return deserializeMaterial(data);
  }

  private static applyTransform(obj: THREE.Object3D, transform: TransformSerialized): void {
    obj.position.set(transform.position.x, transform.position.y, transform.position.z);
    obj.rotation.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
      transform.rotation.order as THREE.EulerOrder
    );
    obj.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  }

  // ============================================================================
  // FILE I/O
  // ============================================================================

  static toJSON(scene: THREE.Scene, metadata?: Partial<SceneSerialized>): string {
    const serialized = this.serialize(scene, metadata);
    return JSON.stringify(serialized, null, 2);
  }

  static fromJSON(json: string): THREE.Scene {
    const data = JSON.parse(json) as SceneSerialized;
    return this.deserialize(data);
  }

  static async saveToFile(scene: THREE.Scene, filename: string, metadata?: Partial<SceneSerialized>): Promise<boolean> {
    return saveSceneJsonToFile(this.toJSON(scene, metadata), filename);
  }

  static async loadFromFile(): Promise<{ scene: THREE.Scene; data: SceneSerialized } | null> {
    const data = await loadSceneJsonFromFile();
    if (!data) return null;
    return { scene: this.deserialize(data), data };
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================
