/**
 * SWR Configuration - Elite Resilience Patterns
 * 
 * Implementa retry automático, backoff exponencial e optimistic UI
 * Padrão: Vercel, Linear, Cursor
 */

import { SWRConfiguration } from 'swr'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('swr-config')

type HttpError = Error & { status?: number }
type OptimisticEntity = { id?: string } & Record<string, unknown>
type OptimisticCache<TItem extends OptimisticEntity> = TItem[] | TItem | undefined
type OptimisticMutate<TItem extends OptimisticEntity> = (
  data?: OptimisticCache<TItem> | ((data?: OptimisticCache<TItem>) => OptimisticCache<TItem>),
  shouldRevalidate?: boolean
) => Promise<OptimisticCache<TItem>>

/**
 * Configuração padrão para SWR em todo o Studio
 * 
 * Características:
 * - Retry automático com backoff exponencial
 * - Deduplicação de requisições
 * - Revalidação inteligente
 * - Error handling robusto
 */
export const ELITE_SWR_CONFIG: SWRConfiguration = {
  // Revalidação
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: 2000, // 2s de deduplicação
  focusThrottleInterval: 300000, // 5min entre revalidações por foco

  // Retry automático com backoff exponencial
  onError: (error, key, config) => {
    const swrError = error as HttpError
    // Não fazer retry em erros de autenticação
    if (swrError.status === 401 || swrError.status === 403) {
      return
    }

    // Retry em erros de rede ou 5xx
    if (!swrError.status || swrError.status >= 500) {
      log.warn(`[SWR] Erro em ${key}, tentando novamente...`, swrError)
    }
  },

  // Configuração de retry
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000, // 1s inicial, depois backoff

  compare: (a, b) => {
    // Comparação customizada para evitar re-renders desnecessários
    return JSON.stringify(a) === JSON.stringify(b)
  },
}

/**
 * Função de retry com backoff exponencial
 * 
 * Padrão: Vercel, Linear
 * 
 * @param error - Erro capturado
 * @param key - Chave SWR
 * @param config - Configuração SWR
 * @param revalidate - Função de revalidação
 * @param retryCount - Contador de tentativas
 */
export function retryWithBackoff(
  _error: unknown,
  key: string | null,
  config: SWRConfiguration,
  revalidate: () => Promise<unknown>,
  retryCount: number = 0
): void {
  if (retryCount >= (config.errorRetryCount || 3)) {
    log.error(`[SWR] Máximo de tentativas atingido para ${key}`)
    return
  }

  // Backoff exponencial: 1s, 2s, 4s, 8s...
  const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)

  log.info(
    `[SWR] Retry ${retryCount + 1}/${config.errorRetryCount} para ${key} em ${delay}ms`
  )

  setTimeout(() => {
    revalidate()
  }, delay)
}

/**
 * Configuração para operações críticas (billing, deploy, etc.)
 * 
 * Mais agressivo em retry e com timeout menor
 */
export const CRITICAL_SWR_CONFIG: SWRConfiguration = {
  ...ELITE_SWR_CONFIG,
  errorRetryCount: 5, // Mais tentativas
  errorRetryInterval: 500, // Retry mais rápido
  dedupingInterval: 1000, // Deduplicação mais curta
}

/**
 * Configuração para dados não-críticos (analytics, etc.)
 * 
 * Menos agressivo em retry
 */
export const NON_CRITICAL_SWR_CONFIG: SWRConfiguration = {
  ...ELITE_SWR_CONFIG,
  errorRetryCount: 1, // Menos tentativas
  revalidateOnFocus: false,
  dedupingInterval: 5000, // Deduplicação mais longa
}

/**
 * Hook para usar SWR com configuração elite
 * 
 * Exemplo:
 * ```typescript
 * const { data, error, mutate } = useEliteSWR('/api/data', fetcher)
 * ```
 */
export function createEliteSWRConfig(
  overrides?: Partial<SWRConfiguration>
): SWRConfiguration {
  return {
    ...ELITE_SWR_CONFIG,
    ...overrides,
  }
}

/**
 * Fetcher com retry automático e timeout
 * 
 * @param url - URL para fazer fetch
 * @param options - Opções de fetch
 * @returns Promise com dados
 */
export async function eliteFetcher<TResponse = unknown>(
  url: string,
  options?: RequestInit
): Promise<TResponse> {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!response.ok) {
        const error: HttpError = new Error(`HTTP ${response.status}`)
        error.status = response.status
        throw error
      }

      return await response.json() as TResponse
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        // Backoff exponencial
        const delay = Math.min(1000 * Math.pow(2, i), 10000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}

/**
 * Padrão de Optimistic Update para SWR
 * 
 * Exemplo:
 * ```typescript
 * const { mutate } = useSWR(key, fetcher)
 * 
 * async function updateData(newData) {
 *   // Atualizar UI imediatamente
 *   mutate(newData, false)
 *   
 *   try {
 *     // Fazer requisição
 *     const result = await fetch('/api/update', { method: 'POST', body: JSON.stringify(newData) })
 *     
 *     // Revalidar com dados do servidor
 *     mutate()
 *   } catch (error) {
 *     // Reverter em caso de erro
 *     mutate()
 *   }
 * }
 * ```
 */
export const optimisticUpdatePattern = {
  /**
   * Padrão para operações de criação
   */
  create: async <TItem extends OptimisticEntity>(
    key: string,
    newItem: TItem,
    mutate: OptimisticMutate<TItem>,
    createFn: (item: TItem) => Promise<unknown>
  ) => {
    // Atualizar cache otimisticamente
    const previousData = await mutate(
      (data) => {
        if (Array.isArray(data)) {
          return [newItem, ...data]
        }
        return data
      },
      false
    )

    try {
      // Executar operação no servidor
      const result = await createFn(newItem)

      // Revalidar com dados do servidor
      await mutate()

      return result
    } catch (error) {
      // Reverter em caso de erro
      await mutate(previousData, false)
      throw error
    }
  },

  /**
   * Padrão para operações de atualização
   */
  update: async <TItem extends OptimisticEntity>(
    key: string,
    id: string,
    updates: Partial<TItem>,
    mutate: OptimisticMutate<TItem>,
    updateFn: (id: string, updates: Partial<TItem>) => Promise<unknown>
  ) => {
    // Atualizar cache otimisticamente
    const previousData = await mutate(
      (data) => {
        if (Array.isArray(data)) {
          return data.map((item) =>
            item.id === id ? ({ ...item, ...updates } as TItem) : item
          )
        }
        if (data?.id === id) {
          return { ...data, ...updates } as TItem
        }
        return data
      },
      false
    )

    try {
      // Executar operação no servidor
      const result = await updateFn(id, updates)

      // Revalidar com dados do servidor
      await mutate()

      return result
    } catch (error) {
      // Reverter em caso de erro
      await mutate(previousData, false)
      throw error
    }
  },

  /**
   * Padrão para operações de exclusão
   */
  delete: async <TItem extends OptimisticEntity>(
    key: string,
    id: string,
    mutate: OptimisticMutate<TItem>,
    deleteFn: (id: string) => Promise<unknown>
  ) => {
    // Atualizar cache otimisticamente
    const previousData = await mutate(
      (data) => {
        if (Array.isArray(data)) {
          return data.filter((item) => item.id !== id)
        }
        return data
      },
      false
    )

    try {
      // Executar operação no servidor
      const result = await deleteFn(id)

      // Revalidar com dados do servidor
      await mutate()

      return result
    } catch (error) {
      // Reverter em caso de erro
      await mutate(previousData, false)
      throw error
    }
  },
}
