import type { DrawCallData, MemoryData, SpanData } from './profiler-integrated-types';

export class HighResTimer {
  private static startTime = performance.now();

  static now(): number {
    return performance.now();
  }

  static elapsed(): number {
    return performance.now() - this.startTime;
  }

  static mark(name: string): void {
    performance.mark(name);
  }

  static measure(name: string, startMark: string, endMark: string): number {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      const duration = entries.length > 0 ? entries[entries.length - 1].duration : 0;
      performance.clearMeasures(name);
      return duration;
    } catch {
      return 0;
    }
  }
}

export class GPUProfiler {
  private gl: WebGL2RenderingContext | null = null;
  private ext: any = null; // EXT_disjoint_timer_query_webgl2
  private queries: WebGLQuery[] = [];
  private pendingQueries: { query: WebGLQuery; name: string }[] = [];
  private results: Map<string, number> = new Map();
  private available: boolean = false;

  initialize(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;

    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.available = !!this.ext;

    return this.available;
  }

  beginQuery(name: string): void {
    if (!this.available || !this.gl || !this.ext) return;

    const query = this.gl.createQuery();
    if (!query) return;

    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.queries.push(query);
    this.pendingQueries.push({ query, name });
  }

  endQuery(): void {
    if (!this.available || !this.gl || !this.ext) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
  }

  collectResults(): Map<string, number> {
    if (!this.available || !this.gl || !this.ext) {
      return new Map();
    }

    const completed: number[] = [];

    for (let i = 0; i < this.pendingQueries.length; i++) {
      const { query, name } = this.pendingQueries[i];

      const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);
      const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);

      if (available && !disjoint) {
        const timeElapsed = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
        this.results.set(name, timeElapsed / 1000000); // Convert to ms
        this.gl.deleteQuery(query);
        completed.push(i);
      }
    }

    for (let i = completed.length - 1; i >= 0; i--) {
      this.pendingQueries.splice(completed[i], 1);
    }

    return new Map(this.results);
  }

  isAvailable(): boolean {
    return this.available;
  }

  dispose(): void {
    if (this.gl) {
      for (const query of this.queries) {
        this.gl.deleteQuery(query);
      }
    }
    this.queries = [];
    this.pendingQueries = [];
    this.results.clear();
  }
}

export class MemoryProfiler {
  private lastHeapSize: number = 0;
  private allocations: { size: number; timestamp: number; stack?: string }[] = [];

  capture(): MemoryData {
    const memory = (performance as any).memory;

    if (memory) {
      this.lastHeapSize = memory.usedJSHeapSize;

      return {
        jsHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        jsHeapUsed: memory.usedJSHeapSize,
        arrayBuffers: 0,
        textures: 0,
        geometries: 0,
        programs: 0,
      };
    }

    return {
      jsHeapSize: 0,
      jsHeapSizeLimit: 0,
      jsHeapUsed: 0,
      arrayBuffers: 0,
      textures: 0,
      geometries: 0,
      programs: 0,
    };
  }

  trackAllocation(size: number): void {
    this.allocations.push({
      size,
      timestamp: HighResTimer.now(),
      stack: new Error().stack,
    });

    if (this.allocations.length > 1000) {
      this.allocations.shift();
    }
  }

  getRecentAllocations(ms: number = 1000): { size: number; timestamp: number }[] {
    const now = HighResTimer.now();
    return this.allocations.filter(a => now - a.timestamp < ms);
  }

  getAllocationRate(): number {
    const recent = this.getRecentAllocations(1000);
    return recent.reduce((sum, a) => sum + a.size, 0);
  }

  getHeapGrowth(): number {
    const memory = (performance as any).memory;
    if (memory) {
      const current = memory.usedJSHeapSize;
      const growth = current - this.lastHeapSize;
      this.lastHeapSize = current;
      return growth;
    }
    return 0;
  }
}

export class DrawCallTracker {
  private calls: DrawCallData = this.createEmpty();
  private frameStarted: boolean = false;

  private createEmpty(): DrawCallData {
    return {
      total: 0,
      triangles: 0,
      points: 0,
      lines: 0,
      indexed: 0,
      instanced: 0,
      batched: 0,
    };
  }

  beginFrame(): void {
    this.calls = this.createEmpty();
    this.frameStarted = true;
  }

  endFrame(): DrawCallData {
    this.frameStarted = false;
    return { ...this.calls };
  }

  recordDrawArrays(mode: number, count: number): void {
    if (!this.frameStarted) return;

    this.calls.total++;

    switch (mode) {
      case 0x0004:
        this.calls.triangles += Math.floor(count / 3);
        break;
      case 0x0000:
        this.calls.points += count;
        break;
      case 0x0001:
        this.calls.lines += Math.floor(count / 2);
        break;
    }
  }

  recordDrawElements(mode: number, count: number): void {
    if (!this.frameStarted) return;

    this.calls.total++;
    this.calls.indexed++;

    switch (mode) {
      case 0x0004:
        this.calls.triangles += Math.floor(count / 3);
        break;
      case 0x0000:
        this.calls.points += count;
        break;
      case 0x0001:
        this.calls.lines += Math.floor(count / 2);
        break;
    }
  }

  recordDrawInstanced(instanceCount: number): void {
    if (!this.frameStarted) return;
    this.calls.instanced += instanceCount;
  }

  recordBatch(): void {
    if (!this.frameStarted) return;
    this.calls.batched++;
  }
}

export class SpanRecorder {
  private activeSpans: Map<string, { startTime: number; category: string; color?: string; data?: Record<string, unknown> }> = new Map();
  private completedSpans: SpanData[] = [];
  private maxSpans: number = 1000;

  begin(name: string, category: string, color?: string, data?: Record<string, unknown>): void {
    this.activeSpans.set(name, {
      startTime: HighResTimer.now(),
      category,
      color,
      data,
    });
  }

  end(name: string): SpanData | null {
    const span = this.activeSpans.get(name);
    if (!span) return null;

    const endTime = HighResTimer.now();
    const completed: SpanData = {
      name,
      startTime: span.startTime,
      endTime,
      duration: endTime - span.startTime,
      category: span.category,
      color: span.color,
      data: span.data,
    };

    this.activeSpans.delete(name);
    this.completedSpans.push(completed);

    if (this.completedSpans.length > this.maxSpans) {
      this.completedSpans.shift();
    }

    return completed;
  }

  getCompleted(): SpanData[] {
    return [...this.completedSpans];
  }

  clear(): void {
    this.activeSpans.clear();
    this.completedSpans = [];
  }
}
