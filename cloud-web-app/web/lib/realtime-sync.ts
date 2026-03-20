/**
 * Real-time Sync System - WebSocket Simulation
 * 
 * Implementa sincronização em tempo real para Deploy, Billing e Colaboração
 * Padrão: Linear, Figma, Vercel
 */

import { EventEmitter } from 'events'

/**
 * Tipos de eventos em tempo real
 */
export enum RealtimeEventType {
  // Deploy
  DEPLOY_START = 'deploy:start',
  DEPLOY_PROGRESS = 'deploy:progress',
  DEPLOY_SUCCESS = 'deploy:success',
  DEPLOY_ERROR = 'deploy:error',

  // Billing
  BILLING_UPDATE = 'billing:update',
  USAGE_UPDATE = 'usage:update',
  QUOTA_WARNING = 'quota:warning',

  // Colaboração
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  CURSOR_MOVED = 'cursor:moved',
  CONTENT_CHANGED = 'content:changed',

  // Sistema
  HEALTH_CHECK = 'system:health',
  ERROR = 'system:error',
  RECONNECT = 'system:reconnect',
}

/**
 * Interface de evento em tempo real
 */
export interface RealtimeEvent {
  type: RealtimeEventType
  data: Record<string, any>
  timestamp: number
  userId?: string
  sessionId?: string
}

/**
 * Manager de Sincronização em Tempo Real
 */
export class RealtimeSyncManager extends EventEmitter {
  private static instance: RealtimeSyncManager
  private isConnected = false
  private sessionId: string
  private userId?: string
  private eventQueue: RealtimeEvent[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval?: NodeJS.Timeout
  private simulationInterval?: NodeJS.Timeout

  private constructor() {
    super()
    this.sessionId = this.generateSessionId()
    this.simulateConnection()
  }

  /**
   * Obter instância singleton
   */
  static getInstance(): RealtimeSyncManager {
    if (!RealtimeSyncManager.instance) {
      RealtimeSyncManager.instance = new RealtimeSyncManager()
    }
    return RealtimeSyncManager.instance
  }

  /**
   * Gerar ID de sessão único
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Simular conexão WebSocket (para desenvolvimento/demo)
   */
  private simulateConnection(): void {
    // Simular conexão bem-sucedida após 500ms
    setTimeout(() => {
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('connected', { sessionId: this.sessionId })
      console.log('[RealtimeSync] Conectado', this.sessionId)

      // Iniciar heartbeat
      this.startHeartbeat()

      // Iniciar simulação de eventos
      this.startEventSimulation()
    }, 500)
  }

  /**
   * Iniciar heartbeat para manter conexão viva
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.emit(RealtimeEventType.HEALTH_CHECK, {
          timestamp: Date.now(),
          sessionId: this.sessionId,
        })
      }
    }, 30000) // A cada 30 segundos
  }

  /**
   * Iniciar simulação de eventos em tempo real
   */
  private startEventSimulation(): void {
    // Simular eventos aleatoriamente para demo
    this.simulationInterval = setInterval(() => {
      if (this.isConnected && Math.random() > 0.7) {
        const events = [
          {
            type: RealtimeEventType.USAGE_UPDATE,
            data: {
              tokensUsed: Math.floor(Math.random() * 1000),
              storageUsed: Math.floor(Math.random() * 100),
            },
          },
          {
            type: RealtimeEventType.USER_JOINED,
            data: {
              userId: `user-${Math.random().toString(36).substr(2, 5)}`,
              username: `Collaborator ${Math.floor(Math.random() * 100)}`,
            },
          },
        ]

        const randomEvent = events[Math.floor(Math.random() * events.length)]
        this.handleIncomingEvent({
          ...randomEvent,
          timestamp: Date.now(),
          sessionId: this.sessionId,
        })
      }
    }, 5000)
  }

  /**
   * Conectar ao servidor em tempo real
   */
  async connect(userId: string): Promise<void> {
    if (this.isConnected) {
      console.warn('[RealtimeSync] Já conectado')
      return
    }

    this.userId = userId
    this.simulateConnection()
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    this.isConnected = false
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    if (this.simulationInterval) clearInterval(this.simulationInterval)
    this.emit('disconnected')
    console.log('[RealtimeSync] Desconectado')
  }

  /**
   * Enviar evento para servidor
   */
  async sendEvent(type: RealtimeEventType, data: Record<string, any>): Promise<void> {
    const event: RealtimeEvent = {
      type,
      data,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
    }

    if (!this.isConnected) {
      // Adicionar à fila se desconectado
      this.eventQueue.push(event)
      console.warn('[RealtimeSync] Desconectado, adicionando à fila', type)
      return
    }

    // Simular envio bem-sucedido
    console.log('[RealtimeSync] Evento enviado', type, data)
    this.emit('event:sent', event)
  }

  /**
   * Lidar com evento recebido do servidor
   */
  private handleIncomingEvent(event: RealtimeEvent): void {
    console.log('[RealtimeSync] Evento recebido', event.type, event.data)
    this.emit(event.type, event.data)
    this.emit('event:received', event)
  }

  /**
   * Tentar reconectar
   */
  private async tryReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeSync] Máximo de tentativas de reconexão atingido')
      this.emit('reconnect:failed')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(
      `[RealtimeSync] Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`
    )

    await new Promise((resolve) => setTimeout(resolve, delay))
    this.simulateConnection()
  }

  /**
   * Simular Deploy em Tempo Real
   */
  async simulateDeploy(projectId: string, version: string): Promise<void> {
    await this.sendEvent(RealtimeEventType.DEPLOY_START, {
      projectId,
      version,
      startedAt: new Date().toISOString(),
    })

    // Simular progresso
    const steps = [
      { step: 'Building', progress: 25 },
      { step: 'Testing', progress: 50 },
      { step: 'Deploying', progress: 75 },
      { step: 'Finalizing', progress: 90 },
    ]

    for (const { step, progress } of steps) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await this.sendEvent(RealtimeEventType.DEPLOY_PROGRESS, {
        projectId,
        step,
        progress,
      })
    }

    // Simular sucesso
    await new Promise((resolve) => setTimeout(resolve, 500))
    await this.sendEvent(RealtimeEventType.DEPLOY_SUCCESS, {
      projectId,
      version,
      deployedAt: new Date().toISOString(),
      url: `https://${projectId}-${version}.aethel.app`,
    })
  }

  /**
   * Simular Atualização de Billing
   */
  async simulateBillingUpdate(planId: string, amount: number): Promise<void> {
    await this.sendEvent(RealtimeEventType.BILLING_UPDATE, {
      planId,
      amount,
      currency: 'USD',
      status: 'success',
      transactionId: `txn-${Date.now()}`,
    })

    // Simular atualização de uso
    await new Promise((resolve) => setTimeout(resolve, 500))
    await this.sendEvent(RealtimeEventType.USAGE_UPDATE, {
      tokensUsed: Math.floor(Math.random() * 5000),
      storageUsed: Math.floor(Math.random() * 500),
      requestsUsed: Math.floor(Math.random() * 10000),
    })
  }

  /**
   * Simular Notificação de Quota
   */
  async simulateQuotaWarning(resource: string, percentage: number): Promise<void> {
    await this.sendEvent(RealtimeEventType.QUOTA_WARNING, {
      resource,
      percentage,
      limit: 1000,
      current: Math.floor(1000 * (percentage / 100)),
    })
  }

  /**
   * Obter status da conexão
   */
  getStatus(): {
    isConnected: boolean
    sessionId: string
    userId?: string
    queuedEvents: number
  } {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      userId: this.userId,
      queuedEvents: this.eventQueue.length,
    }
  }

  /**
   * Obter fila de eventos
   */
  getEventQueue(): RealtimeEvent[] {
    return [...this.eventQueue]
  }

  /**
   * Limpar fila de eventos
   */
  clearEventQueue(): void {
    this.eventQueue = []
  }

  /**
   * Processar fila de eventos (quando reconectar)
   */
  async processEventQueue(): Promise<void> {
    if (!this.isConnected) return

    console.log(`[RealtimeSync] Processando ${this.eventQueue.length} eventos da fila`)

    for (const event of this.eventQueue) {
      await this.sendEvent(event.type, event.data)
    }

    this.clearEventQueue()
  }
}

/**
 * Instância global de sincronização em tempo real
 */
export const realtimeSync = RealtimeSyncManager.getInstance()

/**
 * Hook para usar sincronização em tempo real
 */
export function useRealtimeSync() {
  const [isConnected, setIsConnected] = React.useState(false)
  const [lastEvent, setLastEvent] = React.useState<RealtimeEvent | null>(null)

  React.useEffect(() => {
    const manager = RealtimeSyncManager.getInstance()

    const handleConnected = () => setIsConnected(true)
    const handleDisconnected = () => setIsConnected(false)
    const handleEvent = (event: RealtimeEvent) => setLastEvent(event)

    manager.on('connected', handleConnected)
    manager.on('disconnected', handleDisconnected)
    manager.on('event:received', handleEvent)

    return () => {
      manager.off('connected', handleConnected)
      manager.off('disconnected', handleDisconnected)
      manager.off('event:received', handleEvent)
    }
  }, [])

  return {
    isConnected,
    lastEvent,
    sendEvent: (type: RealtimeEventType, data: Record<string, any>) =>
      realtimeSync.sendEvent(type, data),
    simulateDeploy: (projectId: string, version: string) =>
      realtimeSync.simulateDeploy(projectId, version),
    simulateBillingUpdate: (planId: string, amount: number) =>
      realtimeSync.simulateBillingUpdate(planId, amount),
  }
}

// Importar React para o hook
import React from 'react'
