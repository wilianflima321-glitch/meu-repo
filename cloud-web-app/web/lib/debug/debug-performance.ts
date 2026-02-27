import { EventEmitter } from 'events';
import type { PerformanceMetrics } from './debug-console.types';

export class PerformanceMonitor extends EventEmitter {
  private fps = 0;
  private frameTime = 0;
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private customMetrics: Map<string, number> = new Map();
  private enabled = true;

  constructor() {
    super();
    this.lastFrameTime = performance.now();
  }

  update(): void {
    if (!this.enabled) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    this.frameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = 1000 / this.frameTime;

    this.emit('update', this.getMetrics());
  }

  getMetrics(): PerformanceMetrics {
    const perf = window.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    return {
      fps: Math.round(this.fps),
      frameTime: this.frameTime,
      memory: perf.memory
        ? {
            usedJSHeapSize: perf.memory.usedJSHeapSize,
            totalJSHeapSize: perf.memory.totalJSHeapSize,
            jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
          }
        : {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0,
          },
      drawCalls: this.customMetrics.get('drawCalls') || 0,
      triangles: this.customMetrics.get('triangles') || 0,
      textures: this.customMetrics.get('textures') || 0,
      custom: new Map(this.customMetrics),
    };
  }

  setMetric(name: string, value: number): void {
    this.customMetrics.set(name, value);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export class StatsOverlay {
  private container: HTMLDivElement | null = null;
  private fpsElement: HTMLDivElement | null = null;
  private memoryElement: HTMLDivElement | null = null;
  private customElements: Map<string, HTMLDivElement> = new Map();
  private visible = false;

  create(parentElement?: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      z-index: 9999;
      min-width: 150px;
      display: none;
    `;

    this.fpsElement = document.createElement('div');
    this.container.appendChild(this.fpsElement);

    this.memoryElement = document.createElement('div');
    this.memoryElement.style.marginTop = '5px';
    this.container.appendChild(this.memoryElement);

    (parentElement || document.body).appendChild(this.container);
  }

  update(metrics: PerformanceMetrics): void {
    if (!this.container || !this.visible) return;

    if (this.fpsElement) {
      const color = metrics.fps >= 55 ? '#0f0' : metrics.fps >= 30 ? '#ff0' : '#f00';
      this.fpsElement.innerHTML = `FPS: <span style="color: ${color}">${metrics.fps}</span> (${metrics.frameTime.toFixed(1)}ms)`;
    }

    if (this.memoryElement && metrics.memory.usedJSHeapSize > 0) {
      const usedMB = (metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      const totalMB = (metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(1);
      this.memoryElement.textContent = `Memory: ${usedMB}/${totalMB} MB`;
    }

    for (const [name, value] of metrics.custom) {
      let element = this.customElements.get(name);
      if (!element) {
        element = document.createElement('div');
        element.style.marginTop = '2px';
        this.container?.appendChild(element);
        this.customElements.set(name, element);
      }
      element.textContent = `${name}: ${value}`;
    }
  }

  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.visible = true;
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.visible = false;
    }
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.fpsElement = null;
    this.memoryElement = null;
    this.customElements.clear();
  }
}
