/**
 * Lightweight uptime monitor used by the health-check spine.
 */

// ============================================================================
// UPTIME MONITORING
// ============================================================================

export class UptimeMonitor {
  private checks: Map<string, {
    url: string;
    interval: number;
    timeout: number;
    lastStatus: boolean;
    uptime: number;
    totalChecks: number;
    lastCheck: Date;
  }> = new Map();

  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Adds a URL monitor
   */
  addMonitor(
    id: string,
    url: string,
    options: { interval?: number; timeout?: number } = {}
  ): void {
    const { interval = 60000, timeout = 10000 } = options;

    this.checks.set(id, {
      url,
      interval,
      timeout,
      lastStatus: true,
      uptime: 100,
      totalChecks: 0,
      lastCheck: new Date(),
    });

    const intervalId = setInterval(() => this.check(id), interval);
    this.intervals.set(id, intervalId);

    this.check(id);
  }

  /**
   * Removes a monitor
   */
  removeMonitor(id: string): void {
    this.checks.delete(id);
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  /**
   * Runs a monitor check
   */
  private async check(id: string): Promise<void> {
    const monitor = this.checks.get(id);
    if (!monitor) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), monitor.timeout);

      const response = await fetch(monitor.url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isUp = response.ok;
      monitor.totalChecks++;

      if (isUp) {
        monitor.uptime = ((monitor.uptime * (monitor.totalChecks - 1)) + 100) / monitor.totalChecks;
      } else {
        monitor.uptime = ((monitor.uptime * (monitor.totalChecks - 1)) + 0) / monitor.totalChecks;
      }

      monitor.lastStatus = isUp;
      monitor.lastCheck = new Date();
    } catch {
      monitor.totalChecks++;
      monitor.uptime = ((monitor.uptime * (monitor.totalChecks - 1)) + 0) / monitor.totalChecks;
      monitor.lastStatus = false;
      monitor.lastCheck = new Date();
    }
  }

  /**
   * Obtém status de um monitor
   */
  getStatus(id: string): typeof this.checks extends Map<string, infer V> ? V | undefined : never {
    return this.checks.get(id);
  }

  /**
   * Obtém todos os monitores
   */
  getAllStatus(): Record<string, ReturnType<typeof this.getStatus>> {
    const result: Record<string, ReturnType<typeof this.getStatus>> = {};
    this.checks.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
