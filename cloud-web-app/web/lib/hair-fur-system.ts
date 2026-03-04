
import * as THREE from 'three';
export interface HairConfig {
  strandCount: number;
  segmentsPerStrand: number;
  rootWidth: number;
  tipWidth: number;
  length: number;
  lengthVariation: number;
  curl: number;
  curlFrequency: number;
  clumpSize: number;
  clumpStrength: number;
  noise: number;
  gravity: number;
  stiffness: number;
  damping: number;
  color: THREE.Color;
  colorVariation: number;
  specularColor: THREE.Color;
  specularPower: number;
  shadowDensity: number;
}

export interface FurConfig {
  shellCount: number;
  density: number;
  length: number;
  lengthVariation: number;
  thickness: number;
  curvature: number;
  gravity: number;
  windResponse: number;
  baseColor: THREE.Color;
  tipColor: THREE.Color;
  occlusionStrength: number;
}

export interface HairStrand {
  id: number;
  rootPosition: THREE.Vector3;
  rootNormal: THREE.Vector3;
  segments: HairSegment[];
  clumpId: number;
  lengthScale: number;
  colorVariation: THREE.Color;
}

export interface HairSegment {
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  restLength: number;
  width: number;
}

export interface HairClump {
  id: number;
  center: THREE.Vector3;
  strands: number[];
  guideStrand: number;
}

export interface HairCollider {
  type: 'sphere' | 'capsule' | 'mesh';
  position: THREE.Vector3;
  radius?: number;
  height?: number;
  direction?: THREE.Vector3;
}

export interface GroomGuide {
  id: number;
  rootPosition: THREE.Vector3;
  controlPoints: THREE.Vector3[];
  influence: number;
}
export class MarschnerHairShader {
  private longitudinalWidth: number = 10; // degrees
  private azimuthalWidth: number = 25; // degrees
  private scaleAngle: number = 2.5; // degrees

  private ior: number = 1.55; // Index of refraction
  private absorption: THREE.Color = new THREE.Color(0.8, 0.4, 0.2);

  calculateR(
    lightDir: THREE.Vector3,
    viewDir: THREE.Vector3,
    tangent: THREE.Vector3
  ): number {
    const sinThetaI = lightDir.dot(tangent);
    const sinThetaR = viewDir.dot(tangent);

    const cosThetaI = Math.sqrt(1 - sinThetaI * sinThetaI);
    const cosThetaR = Math.sqrt(1 - sinThetaR * sinThetaR);

    const thetaH = (Math.asin(sinThetaI) + Math.asin(sinThetaR)) / 2;
    const thetaD = (Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2;

    const alpha = this.scaleAngle * Math.PI / 180;
    const betaM = this.longitudinalWidth * Math.PI / 180;

    const M = this.gaussian(betaM, thetaH - alpha);

    const phi = Math.acos(Math.max(-1, Math.min(1, lightDir.clone().sub(tangent.clone().multiplyScalar(sinThetaI)).normalize().dot(
      viewDir.clone().sub(tangent.clone().multiplyScalar(sinThetaR)).normalize()
    ))));

    const betaN = this.azimuthalWidth * Math.PI / 180;
    const N = this.gaussian(betaN, phi);

    const cosHalfAngle = Math.cos((Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2);
    const F = this.fresnel(cosHalfAngle, this.ior);

    return M * N * F;
  }

  calculateTT(
    lightDir: THREE.Vector3,
    viewDir: THREE.Vector3,
    tangent: THREE.Vector3,
    color: THREE.Color
  ): THREE.Color {
    const sinThetaI = lightDir.dot(tangent);
    const sinThetaR = viewDir.dot(tangent);

    const thetaH = (Math.asin(sinThetaI) + Math.asin(sinThetaR)) / 2;
    const alpha = -this.scaleAngle * Math.PI / 180 / 2;
    const betaM = this.longitudinalWidth * Math.PI / 180 / 2;

    const M = this.gaussian(betaM, thetaH - alpha);

    const absorption = new THREE.Color().copy(this.absorption).multiplyScalar(
      1 / Math.cos(Math.asin(sinThetaI * 0.5))
    );

    const transmittance = new THREE.Color(
      Math.exp(-absorption.r),
      Math.exp(-absorption.g),
      Math.exp(-absorption.b)
    );

    const cosHalfAngle = Math.cos((Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2);
    const F = 1 - this.fresnel(cosHalfAngle, this.ior);

    return color.clone().multiply(transmittance).multiplyScalar(M * F * F);
  }

  calculateTRT(
    lightDir: THREE.Vector3,
    viewDir: THREE.Vector3,
    tangent: THREE.Vector3,
    color: THREE.Color
  ): THREE.Color {
    const sinThetaI = lightDir.dot(tangent);
    const sinThetaR = viewDir.dot(tangent);

    const thetaH = (Math.asin(sinThetaI) + Math.asin(sinThetaR)) / 2;
    const alpha = -3 * this.scaleAngle * Math.PI / 180 / 2;
    const betaM = 2 * this.longitudinalWidth * Math.PI / 180;

    const M = this.gaussian(betaM, thetaH - alpha);

    const absorption = new THREE.Color().copy(this.absorption).multiplyScalar(2);
    const transmittance = new THREE.Color(
      Math.exp(-absorption.r),
      Math.exp(-absorption.g),
      Math.exp(-absorption.b)
    );

    const cosHalfAngle = Math.cos((Math.asin(sinThetaI) - Math.asin(sinThetaR)) / 2);
    const F = this.fresnel(cosHalfAngle, this.ior);

    return color.clone().multiply(transmittance).multiplyScalar(M * F * (1 - F) * (1 - F));
  }

  private gaussian(width: number, x: number): number {
    return Math.exp(-x * x / (2 * width * width)) / (width * Math.sqrt(2 * Math.PI));
  }

  private fresnel(cosTheta: number, ior: number): number {
    const r0 = ((1 - ior) / (1 + ior)) ** 2;
    return r0 + (1 - r0) * Math.pow(1 - cosTheta, 5);
  }

  setAbsorption(color: THREE.Color): void {
    this.absorption.copy(color);
  }

  setIOR(ior: number): void {
    this.ior = ior;
  }
}
export class HairPhysicsSimulation {
  private strands: HairStrand[] = [];
  private colliders: HairCollider[] = [];

  private gravity: THREE.Vector3 = new THREE.Vector3(0, -9.81, 0);
  private wind: THREE.Vector3 = new THREE.Vector3();
  private windTurbulence: number = 0;

  private stiffness: number = 0.8;
  private damping: number = 0.95;
  private iterations: number = 3;

  constructor(stiffness: number = 0.8, damping: number = 0.95) {
    this.stiffness = stiffness;
    this.damping = damping;
  }

  addStrand(strand: HairStrand): void {
    this.strands.push(strand);
  }

  addCollider(collider: HairCollider): void {
    this.colliders.push(collider);
  }

  setWind(direction: THREE.Vector3, turbulence: number = 0): void {
    this.wind.copy(direction);
    this.windTurbulence = turbulence;
  }

  simulate(deltaTime: number, rootTransform?: THREE.Matrix4): void {
    const dt = Math.min(deltaTime, 1 / 30); // Cap timestep

    for (const strand of this.strands) {
      this.simulateStrand(strand, dt, rootTransform);
    }
  }

  private simulateStrand(strand: HairStrand, dt: number, rootTransform?: THREE.Matrix4): void {
    const segments = strand.segments;

    if (rootTransform) {
      const newRootPos = strand.rootPosition.clone().applyMatrix4(rootTransform);
      segments[0].position.copy(newRootPos);
    }

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];

      const force = this.gravity.clone();

      if (this.wind.lengthSq() > 0) {
        const windNoise = this.wind.clone().multiplyScalar(
          1 + (Math.random() - 0.5) * this.windTurbulence
        );
        force.add(windNoise);
      }

      const acceleration = force.clone().multiplyScalar(dt * dt);
      const newPosition = seg.position.clone()
        .multiplyScalar(2)
        .sub(seg.previousPosition)
        .add(acceleration);

      const velocity = newPosition.clone().sub(seg.position);
      velocity.multiplyScalar(this.damping);

      seg.previousPosition.copy(seg.position);
      seg.position.add(velocity);
    }

    for (let iter = 0; iter < this.iterations; iter++) {
      for (let i = 1; i < segments.length; i++) {
        const segPrev = segments[i - 1];
        const seg = segments[i];

        const diff = seg.position.clone().sub(segPrev.position);
        const dist = diff.length();

        if (dist > 0.0001) {
          const correction = diff.multiplyScalar((dist - seg.restLength) / dist);

          if (i === 1) {
            seg.position.sub(correction);
          } else {
            correction.multiplyScalar(0.5);
            segPrev.position.add(correction);
            seg.position.sub(correction);
          }
        }
      }

      for (let i = 2; i < segments.length; i++) {
        const seg0 = segments[i - 2];
        const seg1 = segments[i - 1];
        const seg2 = segments[i];

        const dir1 = seg1.position.clone().sub(seg0.position).normalize();
        const dir2 = seg2.position.clone().sub(seg1.position).normalize();

        const targetDir = dir1.clone().lerp(dir2, 1 - this.stiffness);
        const targetPos = seg1.position.clone().add(
          targetDir.multiplyScalar(seg2.restLength)
        );

        seg2.position.lerp(targetPos, this.stiffness * 0.5);
      }

      for (const collider of this.colliders) {
        for (let i = 1; i < segments.length; i++) {
          this.resolveCollision(segments[i], collider);
        }
      }
    }
  }

  private resolveCollision(segment: HairSegment, collider: HairCollider): void {
    if (collider.type === 'sphere' && collider.radius) {
      const diff = segment.position.clone().sub(collider.position);
      const dist = diff.length();

      if (dist < collider.radius) {
        const normal = diff.normalize();
        segment.position.copy(collider.position).add(
          normal.multiplyScalar(collider.radius + 0.001)
        );
      }
    } else if (collider.type === 'capsule' && collider.radius && collider.height && collider.direction) {
      const axis = collider.direction.clone().normalize();
      const p1 = collider.position.clone();
      const p2 = collider.position.clone().add(axis.multiplyScalar(collider.height));

      const d = segment.position.clone().sub(p1);
      let t = d.dot(axis) / collider.height;
      t = Math.max(0, Math.min(1, t));

      const closestPoint = p1.clone().lerp(p2, t);
      const diff = segment.position.clone().sub(closestPoint);
      const dist = diff.length();

      if (dist < collider.radius) {
        const normal = diff.normalize();
        segment.position.copy(closestPoint).add(
          normal.multiplyScalar(collider.radius + 0.001)
        );
      }
    }
  }

  getStrands(): HairStrand[] {
    return this.strands;
  }

  clear(): void {
    this.strands = [];
    this.colliders = [];
  }
}
export class HairGroomSystem {
  private guides: GroomGuide[] = [];
  private mesh: THREE.Mesh | null = null;

  setMesh(mesh: THREE.Mesh): void {
    this.mesh = mesh;
  }

  addGuide(position: THREE.Vector3, controlPoints: THREE.Vector3[]): GroomGuide {
    const guide: GroomGuide = {
      id: this.guides.length,
      rootPosition: position.clone(),
      controlPoints: controlPoints.map(p => p.clone()),
      influence: 1.0,
    };
    this.guides.push(guide);
    return guide;
  }

  removeGuide(id: number): void {
    this.guides = this.guides.filter(g => g.id !== id);
  }

  updateGuide(id: number, controlPoints: THREE.Vector3[]): void {
    const guide = this.guides.find(g => g.id === id);
    if (guide) {
      guide.controlPoints = controlPoints.map(p => p.clone());
    }
  }

  generateStrands(config: HairConfig): HairStrand[] {
    if (!this.mesh) return [];

    const strands: HairStrand[] = [];
    const geometry = this.mesh.geometry;

    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');

    if (!positions || !normals) return [];

    for (let i = 0; i < config.strandCount; i++) {
      const faceIndex = Math.floor(Math.random() * (positions.count / 3));
      const u = Math.random();
      const v = Math.random() * (1 - u);
      const w = 1 - u - v;

      const i0 = faceIndex * 3;
      const i1 = faceIndex * 3 + 1;
      const i2 = faceIndex * 3 + 2;

      const p0 = new THREE.Vector3().fromBufferAttribute(positions, i0);
      const p1 = new THREE.Vector3().fromBufferAttribute(positions, i1);
      const p2 = new THREE.Vector3().fromBufferAttribute(positions, i2);

      const n0 = new THREE.Vector3().fromBufferAttribute(normals, i0);
      const n1 = new THREE.Vector3().fromBufferAttribute(normals, i1);
      const n2 = new THREE.Vector3().fromBufferAttribute(normals, i2);

      const rootPos = p0.clone().multiplyScalar(u)
        .add(p1.clone().multiplyScalar(v))
        .add(p2.clone().multiplyScalar(w));

      const rootNormal = n0.clone().multiplyScalar(u)
        .add(n1.clone().multiplyScalar(v))
        .add(n2.clone().multiplyScalar(w))
        .normalize();

      const guidedDirection = this.getGuidedDirection(rootPos, rootNormal, config);

      const strand = this.createStrand(
        i,
        rootPos,
        guidedDirection,
        config
      );

      strands.push(strand);
    }

    return strands;
  }

  private getGuidedDirection(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    config: HairConfig
  ): THREE.Vector3[] {
    if (this.guides.length === 0) {
      const directions: THREE.Vector3[] = [];
      const segmentLength = config.length / config.segmentsPerStrand;

      for (let i = 0; i < config.segmentsPerStrand; i++) {
        const t = i / config.segmentsPerStrand;
        const dir = normal.clone()
          .lerp(new THREE.Vector3(0, -1, 0), t * config.gravity)
          .normalize();
        directions.push(dir.multiplyScalar(segmentLength));
      }

      return directions;
    }

    const sortedGuides = [...this.guides].sort((a, b) =>
      a.rootPosition.distanceToSquared(position) - b.rootPosition.distanceToSquared(position)
    ).slice(0, 4);

    let totalWeight = 0;
    const weights = sortedGuides.map(g => {
      const dist = g.rootPosition.distanceTo(position);
      const w = 1 / (dist * dist + 0.0001);
      totalWeight += w;
      return w;
    });

    const directions: THREE.Vector3[] = [];
    const maxPoints = Math.max(...sortedGuides.map(g => g.controlPoints.length));

    for (let i = 0; i < maxPoints; i++) {
      const dir = new THREE.Vector3();

      for (let j = 0; j < sortedGuides.length; j++) {
        const guide = sortedGuides[j];
        const pointIndex = Math.min(i, guide.controlPoints.length - 1);
        const point = guide.controlPoints[pointIndex];

        const prevPoint = pointIndex > 0
          ? guide.controlPoints[pointIndex - 1]
          : guide.rootPosition;

        const segmentDir = point.clone().sub(prevPoint);
        dir.add(segmentDir.multiplyScalar(weights[j] / totalWeight));
      }

      directions.push(dir);
    }

    return directions;
  }

  private createStrand(
    id: number,
    rootPosition: THREE.Vector3,
    directions: THREE.Vector3[],
    config: HairConfig
  ): HairStrand {
    const lengthScale = 1 + (Math.random() - 0.5) * config.lengthVariation;
    const segments: HairSegment[] = [];

    let currentPos = rootPosition.clone();

    for (let i = 0; i < config.segmentsPerStrand; i++) {
      const t = i / (config.segmentsPerStrand - 1);
      const width = config.rootWidth + (config.tipWidth - config.rootWidth) * t;

      const dirIndex = Math.min(i, directions.length - 1);
      let direction = directions[dirIndex].clone().multiplyScalar(lengthScale);

      if (config.curl > 0) {
        const curlAngle = i * config.curlFrequency * Math.PI * 2;
        const curlOffset = new THREE.Vector3(
          Math.cos(curlAngle) * config.curl,
          0,
          Math.sin(curlAngle) * config.curl
        );
        direction.add(curlOffset.multiplyScalar(t));
      }

      if (config.noise > 0) {
        const noise = new THREE.Vector3(
          (Math.random() - 0.5) * config.noise,
          (Math.random() - 0.5) * config.noise,
          (Math.random() - 0.5) * config.noise
        );
        direction.add(noise);
      }

      const segmentLength = direction.length();
      const nextPos = currentPos.clone().add(direction);

      segments.push({
        position: nextPos.clone(),
        previousPosition: nextPos.clone(),
        velocity: new THREE.Vector3(),
        restLength: segmentLength,
        width,
      });

      currentPos = nextPos;
    }

    const colorVariation = new THREE.Color().copy(config.color);
    if (config.colorVariation > 0) {
      colorVariation.offsetHSL(
        (Math.random() - 0.5) * config.colorVariation * 0.1,
        (Math.random() - 0.5) * config.colorVariation * 0.2,
        (Math.random() - 0.5) * config.colorVariation * 0.3
      );
    }

    return {
      id,
      rootPosition,
      rootNormal: new THREE.Vector3(0, 1, 0),
      segments,
      clumpId: Math.floor(Math.random() * Math.ceil(config.strandCount / config.clumpSize)),
      lengthScale,
      colorVariation,
    };
  }

  getGuides(): GroomGuide[] {
    return this.guides;
  }
}
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

        data[idx] = Math.floor(length * 255); // Length
        data[idx + 1] = Math.floor((Math.sin(direction) * 0.5 + 0.5) * 255); // Direction X
        data[idx + 2] = Math.floor((Math.cos(direction) * 0.5 + 0.5) * 255); // Direction Y
        data[idx + 3] = 255; // Alpha
      }
    }

    this.furTexture = new THREE.DataTexture(
      data,
      resolution,
      resolution,
      THREE.RGBAFormat
    );
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

    const first = new THREE.Vector2(
      Math.random() * size,
      Math.random() * size
    );
    points.push(first);
    active.push(first);

    const gridX = Math.floor(first.x / cellSize);
    const gridY = Math.floor(first.y / cellSize);
    if (grid[gridX]) grid[gridX][gridY] = first;

    while (active.length > 0 && points.length < density * size * size / 10000) {
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

        if (newPoint.x < 0 || newPoint.x >= size ||
            newPoint.y < 0 || newPoint.y >= size) continue;

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
      const t = i / (this.config.shellCount - 1);

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
export class HairFurSystem {
  private hairConfig: HairConfig;
  private groomSystem: HairGroomSystem;
  private physicsSimulation: HairPhysicsSimulation;
  private shader: MarschnerHairShader;

  private strands: HairStrand[] = [];
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh | null = null;

  constructor(config: Partial<HairConfig> = {}) {
    this.hairConfig = {
      strandCount: 10000,
      segmentsPerStrand: 8,
      rootWidth: 0.002,
      tipWidth: 0.0005,
      length: 0.3,
      lengthVariation: 0.2,
      curl: 0.05,
      curlFrequency: 2,
      clumpSize: 10,
      clumpStrength: 0.5,
      noise: 0.01,
      gravity: 0.5,
      stiffness: 0.8,
      damping: 0.95,
      color: new THREE.Color(0.2, 0.1, 0.05),
      colorVariation: 0.1,
      specularColor: new THREE.Color(1, 1, 1),
      specularPower: 64,
      shadowDensity: 0.7,
      ...config,
    };

    this.groomSystem = new HairGroomSystem();
    this.physicsSimulation = new HairPhysicsSimulation(
      this.hairConfig.stiffness,
      this.hairConfig.damping
    );
    this.shader = new MarschnerHairShader();
  }

  setScalpMesh(mesh: THREE.Mesh): void {
    this.groomSystem.setMesh(mesh);
  }

  addGroomGuide(position: THREE.Vector3, controlPoints: THREE.Vector3[]): void {
    this.groomSystem.addGuide(position, controlPoints);
  }

  generateHair(): void {
    this.strands = this.groomSystem.generateStrands(this.hairConfig);

    this.physicsSimulation.clear();
    for (const strand of this.strands) {
      this.physicsSimulation.addStrand(strand);
    }

    this.buildGeometry();
    this.createMaterial();
  }

  private buildGeometry(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }

    const totalSegments = this.strands.reduce((sum, s) => sum + s.segments.length - 1, 0);
    const verticesPerSegment = 4; // Quad per segment
    const totalVertices = totalSegments * verticesPerSegment;

    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);
    const colors = new Float32Array(totalVertices * 3);
    const indices: number[] = [];

    let vertexIndex = 0;
    let indexOffset = 0;

    for (const strand of this.strands) {
      for (let i = 0; i < strand.segments.length - 1; i++) {
        const seg0 = strand.segments[i];
        const seg1 = strand.segments[i + 1];

        const t0 = i / (strand.segments.length - 1);
        const t1 = (i + 1) / (strand.segments.length - 1);

        const tangent = seg1.position.clone().sub(seg0.position).normalize();
        const viewDir = new THREE.Vector3(0, 0, 1); // Simplified
        const bitangent = tangent.clone().cross(viewDir).normalize();

        const p0Left = seg0.position.clone().add(bitangent.clone().multiplyScalar(seg0.width));
        const p0Right = seg0.position.clone().sub(bitangent.clone().multiplyScalar(seg0.width));
        const p1Left = seg1.position.clone().add(bitangent.clone().multiplyScalar(seg1.width));
        const p1Right = seg1.position.clone().sub(bitangent.clone().multiplyScalar(seg1.width));

        positions[vertexIndex * 3] = p0Left.x;
        positions[vertexIndex * 3 + 1] = p0Left.y;
        positions[vertexIndex * 3 + 2] = p0Left.z;

        positions[(vertexIndex + 1) * 3] = p0Right.x;
        positions[(vertexIndex + 1) * 3 + 1] = p0Right.y;
        positions[(vertexIndex + 1) * 3 + 2] = p0Right.z;

        positions[(vertexIndex + 2) * 3] = p1Left.x;
        positions[(vertexIndex + 2) * 3 + 1] = p1Left.y;
        positions[(vertexIndex + 2) * 3 + 2] = p1Left.z;

        positions[(vertexIndex + 3) * 3] = p1Right.x;
        positions[(vertexIndex + 3) * 3 + 1] = p1Right.y;
        positions[(vertexIndex + 3) * 3 + 2] = p1Right.z;

        for (let j = 0; j < 4; j++) {
          normals[(vertexIndex + j) * 3] = tangent.x;
          normals[(vertexIndex + j) * 3 + 1] = tangent.y;
          normals[(vertexIndex + j) * 3 + 2] = tangent.z;
        }

        uvs[vertexIndex * 2] = 0;
        uvs[vertexIndex * 2 + 1] = t0;

        uvs[(vertexIndex + 1) * 2] = 1;
        uvs[(vertexIndex + 1) * 2 + 1] = t0;

        uvs[(vertexIndex + 2) * 2] = 0;
        uvs[(vertexIndex + 2) * 2 + 1] = t1;

        uvs[(vertexIndex + 3) * 2] = 1;
        uvs[(vertexIndex + 3) * 2 + 1] = t1;

        for (let j = 0; j < 4; j++) {
          colors[(vertexIndex + j) * 3] = strand.colorVariation.r;
          colors[(vertexIndex + j) * 3 + 1] = strand.colorVariation.g;
          colors[(vertexIndex + j) * 3 + 2] = strand.colorVariation.b;
        }

        indices.push(
          indexOffset, indexOffset + 1, indexOffset + 2,
          indexOffset + 2, indexOffset + 1, indexOffset + 3
        );

        vertexIndex += 4;
        indexOffset += 4;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);
  }

  private createMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        hairColor: { value: this.hairConfig.color },
        specularColor: { value: this.hairConfig.specularColor },
        specularPower: { value: this.hairConfig.specularPower },
        shadowDensity: { value: this.hairConfig.shadowDensity },
        lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vColor = color;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 hairColor;
        uniform vec3 specularColor;
        uniform float specularPower;
        uniform float shadowDensity;
        uniform vec3 lightDirection;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          vec3 lightDir = normalize(lightDirection);

          float sinTL = sqrt(1.0 - pow(dot(lightDir, normal), 2.0));
          float diffuse = sinTL;

          vec3 H = normalize(lightDir + viewDir);
          float sinTH = sqrt(1.0 - pow(dot(H, normal), 2.0));
          float spec = pow(sinTH, specularPower);

          float shadow = mix(shadowDensity, 1.0, vUv.y);

          vec3 color = vColor * hairColor * diffuse * shadow;
          color += specularColor * spec;

          float alpha = 1.0 - vUv.y * 0.3;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  getMesh(): THREE.Mesh | null {
    if (!this.geometry || !this.material) return null;

    if (!this.mesh) {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    return this.mesh;
  }

  update(deltaTime: number, rootTransform?: THREE.Matrix4): void {
    this.physicsSimulation.simulate(deltaTime, rootTransform);
    this.updateGeometry();
  }

  private updateGeometry(): void {
    if (!this.geometry) return;

    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    let vertexIndex = 0;

    for (const strand of this.strands) {
      for (let i = 0; i < strand.segments.length - 1; i++) {
        const seg0 = strand.segments[i];
        const seg1 = strand.segments[i + 1];

        const tangent = seg1.position.clone().sub(seg0.position).normalize();
        const viewDir = new THREE.Vector3(0, 0, 1);
        const bitangent = tangent.clone().cross(viewDir).normalize();

        const p0Left = seg0.position.clone().add(bitangent.clone().multiplyScalar(seg0.width));
        const p0Right = seg0.position.clone().sub(bitangent.clone().multiplyScalar(seg0.width));
        const p1Left = seg1.position.clone().add(bitangent.clone().multiplyScalar(seg1.width));
        const p1Right = seg1.position.clone().sub(bitangent.clone().multiplyScalar(seg1.width));

        posArray[vertexIndex * 3] = p0Left.x;
        posArray[vertexIndex * 3 + 1] = p0Left.y;
        posArray[vertexIndex * 3 + 2] = p0Left.z;

        posArray[(vertexIndex + 1) * 3] = p0Right.x;
        posArray[(vertexIndex + 1) * 3 + 1] = p0Right.y;
        posArray[(vertexIndex + 1) * 3 + 2] = p0Right.z;

        posArray[(vertexIndex + 2) * 3] = p1Left.x;
        posArray[(vertexIndex + 2) * 3 + 1] = p1Left.y;
        posArray[(vertexIndex + 2) * 3 + 2] = p1Left.z;

        posArray[(vertexIndex + 3) * 3] = p1Right.x;
        posArray[(vertexIndex + 3) * 3 + 1] = p1Right.y;
        posArray[(vertexIndex + 3) * 3 + 2] = p1Right.z;

        vertexIndex += 4;
      }
    }

    positions.needsUpdate = true;
  }

  setWind(direction: THREE.Vector3, turbulence: number = 0): void {
    this.physicsSimulation.setWind(direction, turbulence);
  }

  addCollider(collider: HairCollider): void {
    this.physicsSimulation.addCollider(collider);
  }

  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
  }
}
export const createHairSystem = (config?: Partial<HairConfig>): HairFurSystem => {
  return new HairFurSystem(config);
};

export const createFurSystem = (config?: Partial<FurConfig>): ShellFurSystem => {
  return new ShellFurSystem(config);
};
