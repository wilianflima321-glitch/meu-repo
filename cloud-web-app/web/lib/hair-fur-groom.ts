import * as THREE from 'three';
import type { GroomGuide, HairConfig, HairSegment, HairStrand } from './hair-fur-types';

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
      controlPoints: controlPoints.map((p) => p.clone()),
      influence: 1.0,
    };
    this.guides.push(guide);
    return guide;
  }

  removeGuide(id: number): void {
    this.guides = this.guides.filter((g) => g.id !== id);
  }

  updateGuide(id: number, controlPoints: THREE.Vector3[]): void {
    const guide = this.guides.find((g) => g.id === id);
    if (guide) {
      guide.controlPoints = controlPoints.map((p) => p.clone());
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

      const rootPos = p0
        .clone()
        .multiplyScalar(u)
        .add(p1.clone().multiplyScalar(v))
        .add(p2.clone().multiplyScalar(w));

      const rootNormal = n0
        .clone()
        .multiplyScalar(u)
        .add(n1.clone().multiplyScalar(v))
        .add(n2.clone().multiplyScalar(w))
        .normalize();

      const guidedDirection = this.getGuidedDirection(rootPos, rootNormal, config);
      const strand = this.createStrand(i, rootPos, guidedDirection, config);
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
        const dir = normal.clone().lerp(new THREE.Vector3(0, -1, 0), t * config.gravity).normalize();
        directions.push(dir.multiplyScalar(segmentLength));
      }

      return directions;
    }

    const sortedGuides = [...this.guides]
      .sort(
        (a, b) => a.rootPosition.distanceToSquared(position) - b.rootPosition.distanceToSquared(position)
      )
      .slice(0, 4);

    let totalWeight = 0;
    const weights = sortedGuides.map((g) => {
      const dist = g.rootPosition.distanceTo(position);
      const w = 1 / (dist * dist + 0.0001);
      totalWeight += w;
      return w;
    });

    const directions: THREE.Vector3[] = [];
    const maxPoints = Math.max(...sortedGuides.map((g) => g.controlPoints.length));

    for (let i = 0; i < maxPoints; i++) {
      const dir = new THREE.Vector3();

      for (let j = 0; j < sortedGuides.length; j++) {
        const guide = sortedGuides[j];
        const pointIndex = Math.min(i, guide.controlPoints.length - 1);
        const point = guide.controlPoints[pointIndex];

        const prevPoint = pointIndex > 0 ? guide.controlPoints[pointIndex - 1] : guide.rootPosition;

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
      const direction = directions[dirIndex].clone().multiplyScalar(lengthScale);

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
        direction.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * config.noise,
            (Math.random() - 0.5) * config.noise,
            (Math.random() - 0.5) * config.noise
          )
        );
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
