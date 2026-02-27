/**
 * ECS execution runtime (system scheduler + parallel jobs).
 */
import type { SystemConfig, SystemId } from './ecs-dots-system';

export class SystemScheduler {
  private systems: SystemConfig[] = [];
  private systemOrder: SystemId[] = [];
  private dirtyOrder: boolean = true;
  
  registerSystem(config: SystemConfig): void {
    this.systems.push({
      ...config,
      priority: config.priority ?? 0,
      enabled: config.enabled ?? true,
      runInParallel: config.runInParallel ?? false,
    });
    this.dirtyOrder = true;
  }
  
  unregisterSystem(id: SystemId): boolean {
    const index = this.systems.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.systems.splice(index, 1);
    this.dirtyOrder = true;
    return true;
  }
  
  enableSystem(id: SystemId, enabled: boolean): void {
    const system = this.systems.find(s => s.id === id);
    if (system) {
      system.enabled = enabled;
    }
  }
  
  private updateOrder(): void {
    if (!this.dirtyOrder) return;
    
    // Ordenar por prioridade (maior primeiro)
    this.systemOrder = this.systems
      .filter(s => s.enabled)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map(s => s.id);
    
    this.dirtyOrder = false;
  }
  
  getSystems(): SystemConfig[] {
    this.updateOrder();
    return this.systemOrder.map(id => this.systems.find(s => s.id === id)!);
  }
}

// ============================================================================
// JOB SYSTEM (Web Workers)
// ============================================================================

export class JobSystem {
  private workers: Worker[] = [];
  private workerCount: number;
  private pendingJobs: Map<number, { resolve: (result: unknown) => void; reject: (err: Error) => void }> = new Map();
  private nextJobId: number = 0;
  private availableWorkers: Worker[] = [];
  
  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    this.workerCount = workerCount;
  }
  
  initialize(): void {
    // Criar worker inline
    const workerCode = `
      self.onmessage = function(e) {
        const { jobId, fn, data } = e.data;
        try {
          // Executar função serializada
          const result = new Function('data', fn)(data);
          self.postMessage({ jobId, result, error: null });
        } catch (error) {
          self.postMessage({ jobId, result: null, error: error.message });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(workerUrl);
      worker.onmessage = (e) => this.handleWorkerMessage(e);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }
  
  /**
   * Executa um job em um worker
   */
  async schedule<T>(fn: (data: unknown) => T, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const jobId = this.nextJobId++;
      this.pendingJobs.set(jobId, { resolve: resolve as (r: unknown) => void, reject });
      
      // Aguardar worker disponível
      const trySchedule = () => {
        if (this.availableWorkers.length > 0) {
          const worker = this.availableWorkers.pop()!;
          worker.postMessage({
            jobId,
            fn: fn.toString(),
            data,
          });
        } else {
          // Tentar novamente em breve
          setTimeout(trySchedule, 1);
        }
      };
      
      trySchedule();
    });
  }
  
  /**
   * Executa jobs em paralelo
   */
  async parallel<T>(jobs: Array<{ fn: (data: unknown) => T; data: unknown }>): Promise<T[]> {
    return Promise.all(jobs.map(job => this.schedule(job.fn, job.data)));
  }
  
  private handleWorkerMessage(e: MessageEvent): void {
    const { jobId, result, error } = e.data;
    const job = this.pendingJobs.get(jobId);
    
    if (job) {
      this.pendingJobs.delete(jobId);
      
      // Devolver worker para pool
      const workerIndex = this.workers.findIndex(w => w === e.target);
      if (workerIndex !== -1) {
        this.availableWorkers.push(this.workers[workerIndex]);
      }
      
      if (error) {
        job.reject(new Error(error));
      } else {
        job.resolve(result);
      }
    }
  }
  
  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.availableWorkers = [];
  }
}
