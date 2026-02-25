/**
 * Performance metrics runtime used by cache and tooling surfaces.
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private maxMetrics = 1000;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Marca inÃ­cio de mediÃ§Ã£o
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * Mede desde mark atÃ© agora
   */
  measure(name: string, startMark?: string): number {
    const start = startMark ? this.marks.get(startMark) : this.marks.get(name);
    if (start === undefined) {
      console.warn(`[Performance] Mark "${startMark || name}" not found`);
      return 0;
    }

    const duration = performance.now() - start;

    this.addMetric({
      name,
      duration,
      timestamp: Date.now(),
    });

    this.marks.delete(startMark || name);

    return duration;
  }

  /**
   * Mede tempo de funÃ§Ã£o async
   */
  async time<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.addMetric({
        name: `${name}_error`,
        duration,
        timestamp: Date.now(),
        metadata: { error: true },
      });

      throw error;
    }
  }

  /**
   * Adiciona mÃ©trica
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * ObtÃ©m mÃ©tricas
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * ObtÃ©m estatÃ­sticas de uma mÃ©trica
   */
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.metrics.filter((m) => m.name === name);

    if (metrics.length === 0) return null;

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const count = durations.length;

    return {
      count,
      min: durations[0],
      max: durations[count - 1],
      avg: durations.reduce((a, b) => a + b, 0) / count,
      p50: durations[Math.floor(count * 0.5)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  /**
   * Limpa mÃ©tricas
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Web Vitals
   */
  collectWebVitals(): Record<string, number> {
    if (typeof window === 'undefined') return {};

    const vitals: Record<string, number> = {};

    // First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');
    if (fcp) vitals.FCP = fcp.startTime;

    // DOM Content Loaded
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      vitals.TTFB = nav.responseStart;
      vitals.DCL = nav.domContentLoadedEventEnd;
      vitals.Load = nav.loadEventEnd;
    }

    return vitals;
  }
}
