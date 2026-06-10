import type { SystemConfig as BaseSystemConfig, SystemId } from './ecs-dots-contracts';
import type { World } from './ecs-dots-system';

export type SystemConfig = BaseSystemConfig<World>;

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
      this.dirtyOrder = true;
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

