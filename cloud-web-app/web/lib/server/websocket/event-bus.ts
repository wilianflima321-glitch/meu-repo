import { EventEmitter } from 'events'

class ServiceEventBus extends EventEmitter {
  private static instance: ServiceEventBus

  private constructor() {
    super()
    this.setMaxListeners(100)
  }

  static getInstance(): ServiceEventBus {
    if (!ServiceEventBus.instance) {
      ServiceEventBus.instance = new ServiceEventBus()
    }
    return ServiceEventBus.instance
  }
}

export const eventBus = ServiceEventBus.getInstance()
