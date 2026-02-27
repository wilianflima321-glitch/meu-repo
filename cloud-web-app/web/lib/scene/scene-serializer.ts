/**
 * Scene Serializer - Sistema de Serialização de Cenas
 * 
 * Sistema completo para salvar e carregar cenas 3D.
 * Suporta todos os tipos de objetos, luzes, câmeras e configurações.
 * 
 * @module lib/scene/scene-serializer
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

import type {
  CameraSerialized,
  ColorSerialized,
  EmptySerialized,
  EnvironmentSerialized,
  EulerSerialized,
  GeometrySerialized,
  GroupSerialized,
  LightSerialized,
  MaterialSerialized,
  MeshSerialized,
  PhysicsSettingsSerialized,
  QuaternionSerialized,
  SceneObjectSerialized,
  SceneSerialized,
  SceneSettingsSerialized,
  TransformSerialized,
  Vector3Serialized,
} from './scene-serializer.types';

export type {
  CameraSerialized,
  ColorSerialized,
  EmptySerialized,
  EnvironmentSerialized,
  EulerSerialized,
  GeometrySerialized,
  GroupSerialized,
  LightSerialized,
  MaterialSerialized,
  MeshSerialized,
  PhysicsSettingsSerialized,
  QuaternionSerialized,
  SceneObjectSerialized,
  SceneSerialized,
  SceneSettingsSerialized,
  TransformSerialized,
  Vector3Serialized,
} from './scene-serializer.types';


// ============================================================================
// SERIALIZER
// ============================================================================

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
    // Detect geometry type from parameters
    const params = (geometry as unknown as { parameters?: Record<string, number> }).parameters || {};
    
    // Box
    if ('width' in params && 'height' in params && 'depth' in params) {
      return { type: 'box', parameters: params };
    }
    
    // Sphere
    if ('radius' in params && 'widthSegments' in params && 'heightSegments' in params) {
      return { type: 'sphere', parameters: params };
    }
    
    // Cylinder
    if ('radiusTop' in params && 'radiusBottom' in params && 'height' in params) {
      return { type: 'cylinder', parameters: params };
    }
    
    // Cone
    if ('radius' in params && 'height' in params && 'radialSegments' in params && !('widthSegments' in params)) {
      return { type: 'cone', parameters: params };
    }
    
    // Torus
    if ('radius' in params && 'tube' in params && 'radialSegments' in params) {
      return { type: 'torus', parameters: params };
    }
    
    // Plane
    if ('width' in params && 'height' in params && !('depth' in params)) {
      return { type: 'plane', parameters: params };
    }
    
    // Custom geometry - serialize vertices
    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const uvAttr = geometry.getAttribute('uv');
    const indexAttr = geometry.getIndex();
    
    return {
      type: 'custom',
      parameters: {},
      vertices: positionAttr ? Array.from(positionAttr.array) : undefined,
      normals: normalAttr ? Array.from(normalAttr.array) : undefined,
      uvs: uvAttr ? Array.from(uvAttr.array) : undefined,
      indices: indexAttr ? Array.from(indexAttr.array) : undefined,
    };
  }
  
  private static serializeMaterial(material: THREE.Material): MaterialSerialized {
    const base: Partial<MaterialSerialized> = {
      opacity: material.opacity,
      transparent: material.transparent,
      wireframe: (material as THREE.MeshBasicMaterial).wireframe || false,
      side: material.side === THREE.FrontSide ? 'front' : material.side === THREE.BackSide ? 'back' : 'double',
    };
    
    if (material instanceof THREE.MeshStandardMaterial) {
      return {
        ...base,
        type: 'standard',
        color: this.serializeColor(material.color),
        metalness: material.metalness,
        roughness: material.roughness,
        emissive: this.serializeColor(material.emissive),
        emissiveIntensity: material.emissiveIntensity,
        envMapIntensity: material.envMapIntensity,
        flatShading: material.flatShading,
      } as MaterialSerialized;
    }
    
    if (material instanceof THREE.MeshPhysicalMaterial) {
      return {
        ...base,
        type: 'physical',
        color: this.serializeColor(material.color),
        metalness: material.metalness,
        roughness: material.roughness,
        emissive: this.serializeColor(material.emissive),
        emissiveIntensity: material.emissiveIntensity,
        envMapIntensity: material.envMapIntensity,
        flatShading: material.flatShading,
      } as MaterialSerialized;
    }
    
    if (material instanceof THREE.MeshPhongMaterial) {
      return {
        ...base,
        type: 'phong',
        color: this.serializeColor(material.color),
        emissive: this.serializeColor(material.emissive),
        emissiveIntensity: material.emissiveIntensity,
        flatShading: material.flatShading,
      } as MaterialSerialized;
    }
    
    if (material instanceof THREE.MeshLambertMaterial) {
      return {
        ...base,
        type: 'lambert',
        color: this.serializeColor(material.color),
        emissive: this.serializeColor(material.emissive),
        emissiveIntensity: material.emissiveIntensity,
      } as MaterialSerialized;
    }
    
    if (material instanceof THREE.MeshBasicMaterial) {
      return {
        ...base,
        type: 'basic',
        color: this.serializeColor(material.color),
      } as MaterialSerialized;
    }
    
    // Default
    return {
      ...base,
      type: 'standard',
      color: { r: 0.5, g: 0.5, b: 0.5 },
      metalness: 0,
      roughness: 0.5,
    } as MaterialSerialized;
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
    return {
      name: 'Untitled Scene',
      renderer: {
        antialias: true,
        shadowMap: true,
        shadowMapType: 'pcfSoft',
        toneMapping: 'aces',
        toneMappingExposure: 1,
        outputColorSpace: 'srgb',
      },
    };
  }
  
  private static getDefaultPhysics(): PhysicsSettingsSerialized {
    return {
      enabled: true,
      gravity: { x: 0, y: -9.81, z: 0 },
      defaultFriction: 0.5,
      defaultRestitution: 0.3,
      solver: 'sequential',
      iterations: 10,
    };
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
    switch (data.type) {
      case 'box':
        return new THREE.BoxGeometry(
          data.parameters.width || 1,
          data.parameters.height || 1,
          data.parameters.depth || 1,
          data.parameters.widthSegments || 1,
          data.parameters.heightSegments || 1,
          data.parameters.depthSegments || 1
        );
      case 'sphere':
        return new THREE.SphereGeometry(
          data.parameters.radius || 1,
          data.parameters.widthSegments || 32,
          data.parameters.heightSegments || 16
        );
      case 'cylinder':
        return new THREE.CylinderGeometry(
          data.parameters.radiusTop || 1,
          data.parameters.radiusBottom || 1,
          data.parameters.height || 1,
          data.parameters.radialSegments || 32
        );
      case 'cone':
        return new THREE.ConeGeometry(
          data.parameters.radius || 1,
          data.parameters.height || 1,
          data.parameters.radialSegments || 32
        );
      case 'torus':
        return new THREE.TorusGeometry(
          data.parameters.radius || 1,
          data.parameters.tube || 0.4,
          data.parameters.radialSegments || 16,
          data.parameters.tubularSegments || 48
        );
      case 'plane':
        return new THREE.PlaneGeometry(
          data.parameters.width || 1,
          data.parameters.height || 1
        );
      case 'capsule':
        return new THREE.CapsuleGeometry(
          data.parameters.radius || 0.5,
          data.parameters.length || 1,
          data.parameters.capSegments || 4,
          data.parameters.radialSegments || 8
        );
      case 'custom':
        const geometry = new THREE.BufferGeometry();
        if (data.vertices) {
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices, 3));
        }
        if (data.normals) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
        }
        if (data.uvs) {
          geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
        }
        if (data.indices) {
          geometry.setIndex(data.indices);
        }
        return geometry;
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }
  
  private static deserializeMaterial(data: MaterialSerialized): THREE.Material {
    const color = new THREE.Color(data.color.r, data.color.g, data.color.b);
    const emissive = data.emissive 
      ? new THREE.Color(data.emissive.r, data.emissive.g, data.emissive.b) 
      : new THREE.Color(0, 0, 0);
    
    const side = data.side === 'front' ? THREE.FrontSide 
      : data.side === 'back' ? THREE.BackSide 
      : THREE.DoubleSide;
    
    switch (data.type) {
      case 'standard':
        return new THREE.MeshStandardMaterial({
          color,
          metalness: data.metalness ?? 0,
          roughness: data.roughness ?? 0.5,
          emissive,
          emissiveIntensity: data.emissiveIntensity ?? 0,
          envMapIntensity: data.envMapIntensity ?? 1,
          opacity: data.opacity,
          transparent: data.transparent,
          wireframe: data.wireframe ?? false,
          side,
          flatShading: data.flatShading ?? false,
        });
      case 'physical':
        return new THREE.MeshPhysicalMaterial({
          color,
          metalness: data.metalness ?? 0,
          roughness: data.roughness ?? 0.5,
          emissive,
          emissiveIntensity: data.emissiveIntensity ?? 0,
          envMapIntensity: data.envMapIntensity ?? 1,
          opacity: data.opacity,
          transparent: data.transparent,
          wireframe: data.wireframe ?? false,
          side,
          flatShading: data.flatShading ?? false,
        });
      case 'phong':
        return new THREE.MeshPhongMaterial({
          color,
          emissive,
          emissiveIntensity: data.emissiveIntensity ?? 0,
          opacity: data.opacity,
          transparent: data.transparent,
          wireframe: data.wireframe ?? false,
          side,
          flatShading: data.flatShading ?? false,
        });
      case 'lambert':
        return new THREE.MeshLambertMaterial({
          color,
          emissive,
          emissiveIntensity: data.emissiveIntensity ?? 0,
          opacity: data.opacity,
          transparent: data.transparent,
          wireframe: data.wireframe ?? false,
          side,
        });
      case 'basic':
        return new THREE.MeshBasicMaterial({
          color,
          opacity: data.opacity,
          transparent: data.transparent,
          wireframe: data.wireframe ?? false,
          side,
        });
      default:
        return new THREE.MeshStandardMaterial({ color });
    }
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
    const json = this.toJSON(scene, metadata);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.aethel') ? filename : `${filename}.aethel`;
    a.click();
    
    URL.revokeObjectURL(url);
    return true;
  }
  
  static async loadFromFile(): Promise<{ scene: THREE.Scene; data: SceneSerialized } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.aethel,.json';
      
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        const text = await file.text();
        const data = JSON.parse(text) as SceneSerialized;
        const scene = this.deserialize(data);
        resolve({ scene, data });
      };
      
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback } from 'react';

export function useSceneSerializer() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const save = useCallback(async (
    scene: THREE.Scene,
    filename: string,
    metadata?: Partial<SceneSerialized>
  ): Promise<boolean> => {
    setIsSaving(true);
    setLastError(null);
    
    try {
      await SceneSerializer.saveToFile(scene, filename, metadata);
      return true;
    } catch (error) {
      setLastError(error as Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);
  
  const load = useCallback(async (): Promise<{ scene: THREE.Scene; data: SceneSerialized } | null> => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      return await SceneSerializer.loadFromFile();
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const serialize = useCallback((scene: THREE.Scene, metadata?: Partial<SceneSerialized>): SceneSerialized => {
    return SceneSerializer.serialize(scene, metadata);
  }, []);
  
  const deserialize = useCallback((data: SceneSerialized): THREE.Scene => {
    return SceneSerializer.deserialize(data);
  }, []);
  
  return {
    save,
    load,
    serialize,
    deserialize,
    isSaving,
    isLoading,
    lastError,
  };
}

export default SceneSerializer;
