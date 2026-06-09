// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.

export class FoveatedRenderingManager {
  private enabled: boolean = false;
  private foveationLevel: number = 0; // 0-4
  private dynamicFoveation: boolean = true;
  private gazePoint: [number, number] = [0.5, 0.5];
  private innerRadius: number = 0.2;
  private outerRadius: number = 0.6;
  constructor() {}
  enable(session: XRSession): boolean {
    const layer = session.renderState.baseLayer as any;
    if (layer?.fixedFoveation !== undefined) {
      this.enabled = true;
      this.setFoveationLevel(2);
      return true;
    }
    return false;
  }
  setFoveationLevel(level: number): void {
    this.foveationLevel = Math.max(0, Math.min(4, level));
  }
  updateGazePoint(x: number, y: number): void {
    this.gazePoint = [x, y];
  }
  applyToLayer(layer: XRWebGLLayer | any): void {
    if (!this.enabled) return;
    if (layer.fixedFoveation !== undefined) {
      layer.fixedFoveation = this.foveationLevel / 4;
    }
  }
  getShaderUniforms(): Record<string, any> {
    return {
      u_foveatedEnabled: this.enabled,
      u_gazePoint: this.gazePoint,
      u_innerRadius: this.innerRadius,
      u_outerRadius: this.outerRadius,
      u_foveationLevel: this.foveationLevel / 4,
    };
  }
  getShaderCode(): string {
    return `
      uniform bool u_foveatedEnabled;
      uniform vec2 u_gazePoint;
      uniform float u_innerRadius;
      uniform float u_outerRadius;
      uniform float u_foveationLevel;
      float getFoveationFactor(vec2 uv) {
        if (!u_foveatedEnabled) return 1.0;
        float dist = distance(uv, u_gazePoint);
        if (dist < u_innerRadius) {
          return 1.0; // Full resolution
        } else if (dist < u_outerRadius) {
          float t = (dist - u_innerRadius) / (u_outerRadius - u_innerRadius);
          return mix(1.0, 1.0 - u_foveationLevel, t);
        } else {
          return 1.0 - u_foveationLevel; // Reduced resolution
        }
      }
    `;
  }
  isEnabled(): boolean {
    return this.enabled;
  }
}
