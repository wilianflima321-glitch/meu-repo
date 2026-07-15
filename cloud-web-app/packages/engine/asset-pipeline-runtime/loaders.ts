/**
 * Engine Asset Pipeline - split runtime modules.
 *
 * Asset loaders, cache, manager, manifest, and importer are split so Studio
 * asset flows can lazy-load heavy browser/Three.js loader code safely.
 */

// @aethel-heavy-async-boundary Studio/asset loaders runtime; do not import from public route shells.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetLoadOptions, AssetLoader, AssetType, AudioData, ModelData, ShaderData, TextureData } from './types';

export class TextureLoader implements AssetLoader<TextureData> {
  type: AssetType = 'texture';
  extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];

  async load(path: string, options?: AssetLoadOptions): Promise<TextureData> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      
      if (options?.timeout) {
        setTimeout(() => {
          reject(new Error(`Texture load timeout: ${path}`));
        }, options.timeout);
      }

      image.onload = () => {
        resolve({
          image,
          width: image.width,
          height: image.height,
          format: path.split('.').pop() || 'unknown',
        });
      };

      image.onerror = () => {
        reject(new Error(`Failed to load texture: ${path}`));
      };

      image.crossOrigin = 'anonymous';
      image.src = path;
    });
  }

  unload(data: TextureData): void {
    // Cleanup
    if ('close' in data.image) {
      (data.image as ImageBitmap).close();
    }
  }
}

export class ModelLoader implements AssetLoader<ModelData> {
  type: AssetType = 'model';
  extensions = ['.obj', '.gltf', '.glb'];

  async load(path: string): Promise<ModelData> {
    const response = await fetch(path);
    const ext = path.split('.').pop()?.toLowerCase();

    if (ext === 'obj') {
      return this.parseOBJ(await response.text());
    } else if (ext === 'gltf') {
      return await this.parseGLTF(await response.text(), this.getBasePath(path));
    } else if (ext === 'glb') {
      return await this.parseGLTF(await response.arrayBuffer(), this.getBasePath(path));
    }
    throw new Error(`Unsupported model format: ${ext}`);
  }

  private getBasePath(path: string): string {
    const idx = path.lastIndexOf('/');
    if (idx >= 0) return path.slice(0, idx + 1);
    return '';
  }

  private parseOBJ(text: string): ModelData {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const vertexData: number[] = [];
    const normalData: number[] = [];
    const uvData: number[] = [];
    const indexData: number[] = [];

    const lines = text.split('\n');

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const type = parts[0];

      switch (type) {
        case 'v':
          positions.push(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          );
          break;
        case 'vn':
          normals.push(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          );
          break;
        case 'vt':
          uvs.push(parseFloat(parts[1]), parseFloat(parts[2]));
          break;
        case 'f':
          // Parse face (triangulate if needed)
          const vertices = parts.slice(1);
          for (let i = 0; i < vertices.length - 2; i++) {
            this.parseFaceVertex(vertices[0], positions, normals, uvs, vertexData, normalData, uvData, indexData);
            this.parseFaceVertex(vertices[i + 1], positions, normals, uvs, vertexData, normalData, uvData, indexData);
            this.parseFaceVertex(vertices[i + 2], positions, normals, uvs, vertexData, normalData, uvData, indexData);
          }
          break;
      }
    }

    return {
      vertices: new Float32Array(vertexData),
      indices: new Uint16Array(indexData),
      normals: normalData.length > 0 ? new Float32Array(normalData) : undefined,
      uvs: uvData.length > 0 ? new Float32Array(uvData) : undefined,
    };
  }

  private parseFaceVertex(
    vertex: string,
    positions: number[],
    normals: number[],
    uvs: number[],
    vertexData: number[],
    normalData: number[],
    uvData: number[],
    indexData: number[]
  ): void {
    const indices = vertex.split('/').map(v => parseInt(v, 10) - 1);
    const vIdx = indices[0];
    const uvIdx = indices[1];
    const nIdx = indices[2];

    if (vIdx >= 0) {
      vertexData.push(
        positions[vIdx * 3],
        positions[vIdx * 3 + 1],
        positions[vIdx * 3 + 2]
      );
      indexData.push(indexData.length);
    }

    if (uvIdx >= 0 && uvs.length > 0) {
      uvData.push(uvs[uvIdx * 2], uvs[uvIdx * 2 + 1]);
    }

    if (nIdx >= 0 && normals.length > 0) {
      normalData.push(
        normals[nIdx * 3],
        normals[nIdx * 3 + 1],
        normals[nIdx * 3 + 2]
      );
    }
  }

  private async parseGLTF(data: ArrayBuffer | string, basePath: string): Promise<ModelData> {
    // GLTF parsing real via Three.js GLTFLoader
    // Extrai geometria (positions/indices/normals/uvs) em buffers planos.

    // GLTFLoader depende de APIs de browser. Se este loader for chamado no servidor, falhar explicitamente.
    if (typeof window === 'undefined') {
      throw new Error('GLTF parsing requires browser runtime (window undefined).');
    }

    const loader = new GLTFLoader();

    const gltf = await new Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>((resolve, reject) => {
      loader.parse(
        data as any,
        basePath,
        (parsed) => resolve(parsed),
        (err) => reject(err instanceof Error ? err : new Error('Failed to parse GLTF'))
      );
    });

    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let vertexOffset = 0;

    gltf.scene.updateMatrixWorld(true);
    const normalMatrix = new THREE.Matrix3();

    gltf.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mesh = obj as THREE.Mesh;
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (!geom) return;

      const positionAttr = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!positionAttr) return;

      const normalAttr = geom.getAttribute('normal') as THREE.BufferAttribute | undefined;
      const uvAttr = geom.getAttribute('uv') as THREE.BufferAttribute | undefined;

      mesh.updateWorldMatrix(true, false);
      normalMatrix.getNormalMatrix(mesh.matrixWorld);

      for (let i = 0; i < positionAttr.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(positionAttr, i).applyMatrix4(mesh.matrixWorld);
        vertices.push(v.x, v.y, v.z);

        if (normalAttr) {
          const n = new THREE.Vector3().fromBufferAttribute(normalAttr, i).applyMatrix3(normalMatrix).normalize();
          normals.push(n.x, n.y, n.z);
        }

        if (uvAttr) {
          const u = new THREE.Vector2().fromBufferAttribute(uvAttr, i);
          uvs.push(u.x, u.y);
        }
      }

      if (geom.index) {
        const idx = geom.index;
        for (let i = 0; i < idx.count; i++) {
          indices.push(vertexOffset + idx.getX(i));
        }
      } else {
        // Non-indexed: cria triângulos sequenciais
        for (let i = 0; i < positionAttr.count; i++) {
          indices.push(vertexOffset + i);
        }
      }

      vertexOffset += positionAttr.count;
    });

    const vertexArray = new Float32Array(vertices);
    const normalArray = normals.length ? new Float32Array(normals) : undefined;
    const uvArray = uvs.length ? new Float32Array(uvs) : undefined;

    const useUint32 = vertexOffset > 65535;
    const indexArray = useUint32 ? new Uint32Array(indices) : new Uint16Array(indices);

    return {
      vertices: vertexArray,
      indices: indexArray,
      normals: normalArray,
      uvs: uvArray,
    };
  }
}

export class AudioLoader implements AssetLoader<AudioData> {
  type: AssetType = 'audio';
  extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.webm'];

  private audioContext: AudioContext | null = null;

  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx;
  }

  async load(path: string): Promise<AudioData> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

    return {
      buffer,
      duration: buffer.duration,
      channels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
    };
  }
}

export class ShaderLoader implements AssetLoader<ShaderData> {
  type: AssetType = 'shader';
  extensions = ['.glsl', '.vert', '.frag', '.shader'];

  async load(path: string): Promise<ShaderData> {
    const response = await fetch(path);
    const text = await response.text();

    // Parse shader source
    const vertexMatch = text.match(/#ifdef\s+VERTEX[\s\S]*?#endif|\/\/\s*VERTEX[\s\S]*?\/\/\s*END_VERTEX/);
    const fragmentMatch = text.match(/#ifdef\s+FRAGMENT[\s\S]*?#endif|\/\/\s*FRAGMENT[\s\S]*?\/\/\s*END_FRAGMENT/);

    return {
      vertexSource: vertexMatch ? vertexMatch[0] : text,
      fragmentSource: fragmentMatch ? fragmentMatch[0] : text,
    };
  }
}

export class JSONLoader implements AssetLoader<unknown> {
  type: AssetType = 'json';
  extensions = ['.json'];

  async load(path: string): Promise<unknown> {
    const response = await fetch(path);
    return response.json();
  }
}

export class BinaryLoader implements AssetLoader<ArrayBuffer> {
  type: AssetType = 'binary';
  extensions = ['.bin', '.dat', '.bytes'];

  async load(path: string): Promise<ArrayBuffer> {
    const response = await fetch(path);
    return response.arrayBuffer();
  }
}

export class FontLoader implements AssetLoader<FontFace> {
  type: AssetType = 'font';
  extensions = ['.ttf', '.otf', '.woff', '.woff2'];

  async load(path: string): Promise<FontFace> {
    const name = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'CustomFont';
    const font = new FontFace(name, `url(${path})`);
    await font.load();
    document.fonts.add(font);
    return font;
  }

  unload(data: FontFace): void {
    document.fonts.delete(data);
  }
}

// ============================================================================
// Asset Cache
// ============================================================================
