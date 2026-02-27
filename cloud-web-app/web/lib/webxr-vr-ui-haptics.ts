import * as THREE from 'three';

export class HapticsManager {
  private hapticActuators: Map<string, GamepadHapticActuator> = new Map();

  setActuator(hand: 'left' | 'right', actuator: GamepadHapticActuator): void {
    this.hapticActuators.set(hand, actuator);
  }

  pulse(hand: 'left' | 'right', intensity: number, duration: number): void {
    const actuator = this.hapticActuators.get(hand);
    if (actuator?.pulse) {
      actuator.pulse(Math.max(0, Math.min(1, intensity)), duration);
    }
  }

  click(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.6, 10);
  }

  grab(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.8, 30);
  }

  release(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.4, 20);
  }

  teleport(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.5, 50);
  }

  error(hand: 'left' | 'right'): void {
    this.pulse(hand, 1.0, 20);
    setTimeout(() => this.pulse(hand, 1.0, 20), 50);
  }

  heartbeat(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.3, 40);
    setTimeout(() => this.pulse(hand, 0.5, 60), 100);
  }
}

export class VRUIPanel {
  private mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  private width: number;
  private height: number;
  private pixelWidth: number;
  private pixelHeight: number;

  constructor(width = 1, height = 0.6, pixelDensity = 512) {
    this.width = width;
    this.height = height;
    this.pixelWidth = Math.floor(width * pixelDensity);
    this.pixelHeight = Math.floor(height * pixelDensity);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.pixelWidth;
    this.canvas.height = this.pixelHeight;
    this.context = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
  }

  clear(color = 'rgba(0, 0, 0, 0.8)'): void {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.pixelWidth, this.pixelHeight);
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: {
      font?: string;
      color?: string;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
    } = {}
  ): void {
    const { font = '32px Arial', color = '#ffffff', align = 'left', baseline = 'top' } = options;
    this.context.font = font;
    this.context.fillStyle = color;
    this.context.textAlign = align;
    this.context.textBaseline = baseline;
    this.context.fillText(text, x * this.pixelWidth, y * this.pixelHeight);
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color = '#ffffff',
    fill = true
  ): void {
    if (fill) {
      this.context.fillStyle = color;
      this.context.fillRect(
        x * this.pixelWidth,
        y * this.pixelHeight,
        width * this.pixelWidth,
        height * this.pixelHeight
      );
      return;
    }

    this.context.strokeStyle = color;
    this.context.strokeRect(
      x * this.pixelWidth,
      y * this.pixelHeight,
      width * this.pixelWidth,
      height * this.pixelHeight
    );
  }

  drawButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    highlighted = false
  ): void {
    const bgColor = highlighted ? '#4488ff' : '#333333';
    const borderColor = highlighted ? '#66aaff' : '#666666';

    this.drawRect(x, y, width, height, bgColor, true);
    this.drawRect(x, y, width, height, borderColor, false);
    this.drawText(label, x + width / 2, y + height / 2, {
      align: 'center',
      baseline: 'middle',
      font: '24px Arial',
    });
  }

  update(): void {
    this.texture.needsUpdate = true;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  raycast(origin: THREE.Vector3, direction: THREE.Vector3): THREE.Vector2 | null {
    const raycaster = new THREE.Raycaster(origin, direction);
    const intersects = raycaster.intersectObject(this.mesh);
    if (intersects.length > 0 && intersects[0].uv) {
      return intersects[0].uv;
    }
    return null;
  }
}
