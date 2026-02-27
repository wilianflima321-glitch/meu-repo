import * as THREE from 'three';
import type { FurConfig } from './hair-fur-types';

export class ShellFurSystem {
  private config: FurConfig;
  private shells: THREE.Mesh[] = [];
  private furTexture: THREE.DataTexture | null = null;

  constructor(config: Partial<FurConfig> = {}) {
    this.config = {
      shellCount: 16,
      density: 100,
      length: 0.1,
      lengthVariation: 0.3,
      thickness: 0.002,
      curvature: 0.2,
      gravity: 0.3,
      windResponse: 0.5,
      baseColor: new THREE.Color(0.3, 0.2, 0.1),
      tipColor: new THREE.Color(0.5, 0.4, 0.3),
      occlusionStrength: 0.5,
      ...config,
    };
  }

  generateFurTexture(resolution: number = 512): THREE.DataTexture {
    const data = new Uint8Array(resolution * resolution * 4);
    const points = this.poissonDiskSampling(resolution, this.config.density);

    for (const point of points) {
      const x = Math.floor(point.x);
      const y = Math.floor(point.y);

      if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
        const idx = (y * resolution + x) * 4;

        const length = 1 - Math.random() * this.config.lengthVariation;
        const direction = Math.random() * Math.PI * 2;

        data[idx] = Math.floor(length * 255);
        data[idx + 1] = Math.floor((Math.sin(direction) * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor((Math.cos(direction) * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    this.furTexture = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat);
    this.furTexture.needsUpdate = true;
    return this.furTexture;
  }

  private poissonDiskSampling(size: number, density: number): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    const minDist = size / Math.sqrt(density * 2);
    const cellSize = minDist / Math.SQRT2;
    const gridSize = Math.ceil(size / cellSize);
    const grid: (THREE.Vector2 | null)[][] = [];

    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = null;
      }
    }

    const active: THREE.Vector2[] = [];

    const first = new THREE.Vector2(Math.random() * size, Math.random() * size);
    points.push(first);
    active.push(first);

    const gridX = Math.floor(first.x / cellSize);
    const gridY = Math.floor(first.y / cellSize);
    if (grid[gridX]) grid[gridX][gridY] = first;

    while (active.length > 0 && points.length < (density * size * size) / 10000) {
      const idx = Math.floor(Math.random() * active.length);
      const point = active[idx];
      let found = false;

      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = minDist + Math.random() * minDist;
        const newPoint = new THREE.Vector2(
          point.x + Math.cos(angle) * dist,
          point.y + Math.sin(angle) * dist
        );

        if (newPoint.x < 0 || newPoint.x >= size || newPoint.y < 0 || newPoint.y >= size) continue;

        const gx = Math.floor(newPoint.x / cellSize);
        const gy = Math.floor(newPoint.y / cellSize);

        let valid = true;
        for (let dx = -2; dx <= 2 && valid; dx++) {
          for (let dy = -2; dy <= 2 && valid; dy++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              const neighbor = grid[nx]?.[ny];
              if (neighbor && neighbor.distanceTo(newPoint) < minDist) {
                valid = false;
              }
            }
          }
        }

        if (valid) {
          points.push(newPoint);
          active.push(newPoint);
          if (grid[gx]) grid[gx][gy] = newPoint;
          found = true;
          break;
        }
      }

      if (!found) {
        active.splice(idx, 1);
      }
    }

    return points;
  }

  createShells(baseMesh: THREE.Mesh): THREE.Group {
    const group = new THREE.Group();
    this.shells = [];

    if (!this.furTexture) {
      this.generateFurTexture();
    }

    for (let i = 0; i < this.config.shellCount; i++) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          furTexture: { value: this.furTexture },
          shellIndex: { value: i },
          shellCount: { value: this.config.shellCount },
          furLength: { value: this.config.length },
          furThickness: { value: this.config.thickness },
          curvature: { value: this.config.curvature },
          gravity: { value: this.config.gravity },
          baseColor: { value: this.config.baseColor },
          tipColor: { value: this.config.tipColor },
          occlusionStrength: { value: this.config.occlusionStrength },
          time: { value: 0 },
          windDirection: { value: new THREE.Vector3(1, 0, 0) },
          windStrength: { value: 0 },
        },
        vertexShader: this.getVertexShader(),
        fragmentShader: this.getFragmentShader(),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: i === 0,
      });

      const shell = new THREE.Mesh(baseMesh.geometry.clone(), material);
      shell.position.copy(baseMesh.position);
      shell.rotation.copy(baseMesh.rotation);
      shell.scale.copy(baseMesh.scale);

      this.shells.push(shell);
      group.add(shell);
    }

    return group;
  }

  private getVertexShader(): string {
    return `
      uniform float shellIndex;
      uniform float shellCount;
      uniform float furLength;
      uniform float curvature;
      uniform float gravity;
      uniform float time;
      uniform vec3 windDirection;
      uniform float windStrength;

      varying vec2 vUv;
      varying float vShellHeight;

      void main() {
        vUv = uv;
        vShellHeight = shellIndex / shellCount;

        vec3 pos = position;
        vec3 norm = normalize(normal);

        float displacement = furLength * vShellHeight;
        vec3 curveOffset = vec3(0.0, -1.0, 0.0) * curvature * vShellHeight * vShellHeight;
        vec3 gravityOffset = vec3(0.0, -gravity * vShellHeight * vShellHeight, 0.0);
        float windNoise = sin(time + position.x * 5.0) * 0.5 + 0.5;
        vec3 windOffset = windDirection * windStrength * vShellHeight * windNoise;

        pos += norm * displacement + curveOffset + gravityOffset + windOffset;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      uniform sampler2D furTexture;
      uniform float shellIndex;
      uniform float shellCount;
      uniform float furThickness;
      uniform vec3 baseColor;
      uniform vec3 tipColor;
      uniform float occlusionStrength;

      varying vec2 vUv;
      varying float vShellHeight;

      void main() {
        vec4 furData = texture2D(furTexture, vUv);
        float strandLength = furData.r;

        if (vShellHeight > strandLength) {
          discard;
        }

        float thickness = furThickness * (1.0 - vShellHeight);
        float strandMask = step(0.5 - thickness, furData.a);
        if (strandMask < 0.5) {
          discard;
        }

        vec3 color = mix(baseColor, tipColor, vShellHeight);
        float ao = 1.0 - (1.0 - vShellHeight) * occlusionStrength;
        color *= ao;
        float alpha = 1.0 - vShellHeight * 0.5;
        gl_FragColor = vec4(color, alpha);
      }
    `;
  }

  update(deltaTime: number, wind?: THREE.Vector3): void {
    for (const shell of this.shells) {
      const material = shell.material as THREE.ShaderMaterial;
      material.uniforms['time'].value += deltaTime;

      if (wind) {
        material.uniforms['windDirection'].value.copy(wind.clone().normalize());
        material.uniforms['windStrength'].value = wind.length() * this.config.windResponse;
      }
    }
  }

  setConfig(config: Partial<FurConfig>): void {
    this.config = { ...this.config, ...config };

    for (const shell of this.shells) {
      const material = shell.material as THREE.ShaderMaterial;
      material.uniforms['furLength'].value = this.config.length;
      material.uniforms['curvature'].value = this.config.curvature;
      material.uniforms['gravity'].value = this.config.gravity;
      material.uniforms['baseColor'].value = this.config.baseColor;
      material.uniforms['tipColor'].value = this.config.tipColor;
      material.uniforms['occlusionStrength'].value = this.config.occlusionStrength;
    }
  }

  dispose(): void {
    for (const shell of this.shells) {
      shell.geometry.dispose();
      (shell.material as THREE.Material).dispose();
    }

    if (this.furTexture) {
      this.furTexture.dispose();
    }

    this.shells = [];
  }
}
