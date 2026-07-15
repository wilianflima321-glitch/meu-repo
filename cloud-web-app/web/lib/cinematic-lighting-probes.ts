// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import * as THREE from 'three';

// ============================================================================
// LIGHT PROBE SYSTEM
// ============================================================================

export class LightProbeSystem {
  private probes: THREE.LightProbe[] = [];
  private probePositions: THREE.Vector3[] = [];
  private probeSpacing: number = 5;

  constructor(spacing: number = 5) {
    this.probeSpacing = spacing;
  }

  generateProbeGrid(bounds: THREE.Box3, scene: THREE.Scene): void {
    const min = bounds.min;
    const max = bounds.max;

    for (let x = min.x; x <= max.x; x += this.probeSpacing) {
      for (let y = min.y; y <= max.y; y += this.probeSpacing) {
        for (let z = min.z; z <= max.z; z += this.probeSpacing) {
          const position = new THREE.Vector3(x, y, z);
          const probe = this.createProbe(position, scene);
          this.probes.push(probe);
          this.probePositions.push(position);
          scene.add(probe);
        }
      }
    }
  }

  private createProbe(position: THREE.Vector3, scene: THREE.Scene): THREE.LightProbe {
    const probe = new THREE.LightProbe();
    probe.position.copy(position);

    // Render cubemap at probe position to capture environment
    // This is simplified - real implementation would render 6 faces
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);

    return probe;
  }

  getProbes(): THREE.LightProbe[] {
    return this.probes;
  }

  getNearestProbe(position: THREE.Vector3): THREE.LightProbe | null {
    if (this.probes.length === 0) return null;

    let nearest = this.probes[0];
    let minDist = position.distanceTo(this.probePositions[0]);

    for (let i = 1; i < this.probes.length; i++) {
      const dist = position.distanceTo(this.probePositions[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = this.probes[i];
      }
    }

    return nearest;
  }

  // Trilinear interpolation of probes
  getInterpolatedProbe(position: THREE.Vector3): THREE.SphericalHarmonics3 | null {
    // Find 8 surrounding probes and interpolate
    // Simplified implementation
    const nearest = this.getNearestProbe(position);
    return nearest ? (nearest as any).sh : null;
  }
}

