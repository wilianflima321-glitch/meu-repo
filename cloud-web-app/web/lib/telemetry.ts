import {createComponentLogger, logger} from '@/lib/observability/logger'

const log = createComponentLogger('telemetry')

type TelemetryData = Record<string, unknown>

type BrowserSentry = {
  Replay?: new (options: { maskAllText: boolean; blockAllMedia: boolean }) => unknown
  init(options: TelemetryData): void
  setUser(user: TelemetryData | null): void
  captureException(error: Error, options?: TelemetryData): void
  captureMessage(message: string, options?: TelemetryData): void
}

type BrowserTelemetryWindow = Window & {
  Sentry?: BrowserSentry
  gtag?: (command: string, eventName: string, params: TelemetryData) => void
}

function getBrowserTelemetryWindow(): BrowserTelemetryWindow | null {
  return typeof window === 'undefined' ? null : (window as BrowserTelemetryWindow)
}

function getRuntimeEnvironment(): TelemetryContext['environment'] {
  if (process.env.NODE_ENV === 'production') return 'production'
  if (process.env.NODE_ENV === 'test') return 'staging'
  return 'development'
}

/**
 * Telemetry & Observability - Enterprise Grade Monitoring
 *
 * Integração com Sentry, OpenTelemetry e métricas de performance
 * Padrão: Vercel, Linear, Cursor
 */

/**
 * Tipos de eventos de telemetria
 */
export enum TelemetryEventType {
  // Navegação
  PAGE_VIEW = 'page_view',
  NAVIGATION = 'navigation',

  // Interação
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  SEARCH = 'search',

  // Performance
  API_CALL = 'api_call',
  API_ERROR = 'api_error',
  LOAD_TIME = 'load_time',

  // Erro
  ERROR = 'error',
  CRASH = 'crash',

  // Billing
  BILLING_ACTION = 'billing_action',
  SUBSCRIPTION_CHANGE = 'subscription_change',

  // Autenticação
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',

  // Features
  FEATURE_USAGE = 'feature_usage',
  FEATURE_ERROR = 'feature_error',
}

/**
 * Contexto de telemetria
 */
export interface TelemetryContext {
  userId?: string
  sessionId?: string
  timestamp: number
  userAgent?: string
  url?: string
  referrer?: string
  environment?: 'development' | 'staging' | 'production'
}

/**
 * Evento de telemetria
 */
export interface TelemetryEvent {
  type: TelemetryEventType
  name: string
  data?: TelemetryData
  duration?: number
  error?: {
    message: string
    stack?: string
    code?: string
  }
  context?: Partial<TelemetryContext>
}

/**
 * Classe de Telemetry Manager
 */
export class TelemetryManager {
  private static instance: TelemetryManager
  private context: TelemetryContext
  private queue: TelemetryEvent[] = []
  private isEnabled: boolean = true

  private constructor() {
    this.context = {
      timestamp: Date.now(),
      environment: getRuntimeEnvironment(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    // Inicializar Sentry se disponível
    this.initializeSentry()
  }

  /**
   * Obter instância singleton
   */
  static getInstance(): TelemetryManager {
    if (!TelemetryManager.instance) {
      TelemetryManager.instance = new TelemetryManager()
    }
    return TelemetryManager.instance
  }

  /**
   * Inicializar Sentry
   */
  private initializeSentry(): void {
    const browserWindow = getBrowserTelemetryWindow()
    if (browserWindow?.Sentry) {
      const Sentry = browserWindow.Sentry
      const replay = Sentry.Replay
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0,
        integrations: replay
          ? [
          new replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ]
          : [],
        replaySessionSampleRate: 0.1,
        replayOnErrorSampleRate: 1.0,
      })
    }
  }

  /**
   * Definir contexto do usuário
   */
  setUserContext(userId: string, metadata?: TelemetryData): void {
    this.context.userId = userId

    const browserWindow = getBrowserTelemetryWindow()
    if (browserWindow?.Sentry) {
      browserWindow.Sentry.setUser({
        id: userId,
        ...metadata,
      })
    }
  }

  /**
   * Limpar contexto do usuário
   */
  clearUserContext(): void {
    delete this.context.userId

    const browserWindow = getBrowserTelemetryWindow()
    if (browserWindow?.Sentry) {
      browserWindow.Sentry.setUser(null)
    }
  }

  /**
   * Rastrear evento
   */
  trackEvent(event: TelemetryEvent): void {
    if (!this.isEnabled) return

    const enrichedEvent: TelemetryEvent = {
      ...event,
      context: {
        ...this.context,
        ...event.context,
      },
    }

    // Adicionar à fila
    this.queue.push(enrichedEvent)

    // Enviar para Sentry se for erro
    if (event.type === TelemetryEventType.ERROR || event.type === TelemetryEventType.CRASH) {
      this.sendToSentry(enrichedEvent)
    }

    // Enviar para analytics
    this.sendToAnalytics(enrichedEvent)

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      log.info('[Telemetry]', enrichedEvent)
    }
  }

  /**
   * Rastrear erro
   */
  trackError(error: Error, context?: TelemetryData): void {
    this.trackEvent({
      type: TelemetryEventType.ERROR,
      name: error.name,
      error: {
        message: error.message,
        stack: error.stack,
      },
      data: context,
    })

    // Enviar para Sentry
    const browserWindow = getBrowserTelemetryWindow()
    if (browserWindow?.Sentry) {
      browserWindow.Sentry.captureException(error, {
        contexts: {
          custom: context,
        },
      })
    }
  }

  /**
   * Rastrear chamada de API
   */
  trackApiCall(
    method: string,
    url: string,
    duration: number,
    status: number,
    error?: Error
  ): void {
    this.trackEvent({
      type: error ? TelemetryEventType.API_ERROR : TelemetryEventType.API_CALL,
      name: `${method} ${url}`,
      duration,
      data: {
        method,
        url,
        status,
      },
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    })
  }

  /**
   * Rastrear tempo de carregamento
   */
  trackLoadTime(pageName: string, duration: number): void {
    this.trackEvent({
      type: TelemetryEventType.LOAD_TIME,
      name: pageName,
      duration,
      data: {
        pageName,
      },
    })
  }

  /**
   * Rastrear visualização de página
   */
  trackPageView(pageName: string): void {
    this.trackEvent({
      type: TelemetryEventType.PAGE_VIEW,
      name: pageName,
      data: {
        pageName,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    })
  }

  /**
   * Rastrear clique de botão
   */
  trackButtonClick(buttonName: string, metadata?: TelemetryData): void {
    this.trackEvent({
      type: TelemetryEventType.BUTTON_CLICK,
      name: buttonName,
      data: metadata,
    })
  }

  /**
   * Rastrear envio de formulário
   */
  trackFormSubmit(formName: string, success: boolean, metadata?: TelemetryData): void {
    this.trackEvent({
      type: TelemetryEventType.FORM_SUBMIT,
      name: formName,
      data: {
        success,
        ...metadata,
      },
    })
  }

  /**
   * Rastrear uso de feature
   */
  trackFeatureUsage(featureName: string, metadata?: TelemetryData): void {
    this.trackEvent({
      type: TelemetryEventType.FEATURE_USAGE,
      name: featureName,
      data: metadata,
    })
  }

  /**
   * Rastrear ação de billing
   */
  trackBillingAction(action: string, planId: string, amount?: number): void {
    this.trackEvent({
      type: TelemetryEventType.BILLING_ACTION,
      name: action,
      data: {
        planId,
        amount,
      },
    })
  }

  /**
   * Enviar para Sentry
   */
  private sendToSentry(event: TelemetryEvent): void {
    const browserWindow = getBrowserTelemetryWindow()
    if (browserWindow?.Sentry) {
      browserWindow.Sentry.captureMessage(event.name, {
        level: event.type === TelemetryEventType.CRASH ? 'fatal' : 'error',
        contexts: {
          telemetry: event,
        },
      })
    }
  }

  /**
   * Enviar para analytics (Google Analytics, Mixpanel, etc.)
   */
  private sendToAnalytics(event: TelemetryEvent): void {
    const browserWindow = getBrowserTelemetryWindow()
    if (browserWindow?.gtag) {
      browserWindow.gtag('event', event.name, {
        event_category: event.type,
        event_label: event.name,
        ...event.data,
      })
    }
  }

  /**
   * Habilitar/desabilitar telemetria
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Obter fila de eventos
   */
  getQueue(): TelemetryEvent[] {
    return [...this.queue]
  }

  /**
   * Limpar fila
   */
  clearQueue(): void {
    this.queue = []
  }

  /**
   * Enviar fila para servidor
   */
  async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return

    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: this.queue }),
      })
      this.clearQueue()
    } catch (error) {
      logger.error('[Telemetry] Falha ao enviar fila:', error)
    }
  }
}

/**
 * Instância global de telemetria
 */
export const telemetry = TelemetryManager.getInstance()

/**
 * Hook para rastrear performance de componente
 */
export function useComponentTelemetry(componentName: string) {
  const startTime = Date.now()

  return {
    trackInteraction: (name: string, metadata?: Record<string, unknown>) => {
      telemetry.trackEvent({
        type: TelemetryEventType.FEATURE_USAGE,
        name: `${componentName}:${name}`,
        data: metadata,
      })
    },
    trackError: (error: Error) => {
      telemetry.trackError(error, { component: componentName })
    },
    trackLoadTime: () => {
      const duration = Date.now() - startTime
      telemetry.trackLoadTime(componentName, duration)
    },
  }
}

/**
 * Decorator para rastrear chamadas de função
 */
export function trackFunction(functionName: string) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now()
      try {
        const result = await originalMethod.apply(this, args)
        const duration = Date.now() - startTime
        telemetry.trackEvent({
          type: TelemetryEventType.FEATURE_USAGE,
          name: `${functionName}:${propertyKey}`,
          duration,
        })
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        telemetry.trackEvent({
          type: TelemetryEventType.FEATURE_ERROR,
          name: `${functionName}:${propertyKey}`,
          duration,
          error: {
            message: (error as Error).message,
            stack: (error as Error).stack,
          },
        })
        throw error
      }
    }

    return descriptor
  }
}
