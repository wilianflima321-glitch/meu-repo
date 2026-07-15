/**
 * Studio State Management - Single Source of Truth
 * 
 * Gerenciamento centralizado de estado para eliminar duplicações
 * Padrão: Zustand-like Context API
 */

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'

/**
 * Tipos de estado do Studio
 */
export interface StudioState {
  // Autenticação
  user: {
    id: string
    email: string
    name: string
    avatar?: string
    plan: 'starter' | 'pro' | 'enterprise'
  } | null

  // Projeto Atual
  currentProject: {
    id: string
    name: string
    description?: string
    status: 'active' | 'archived' | 'deleted'
  } | null

  // UI State
  ui: {
    sidebarOpen: boolean
    theme: 'light' | 'dark' | 'auto'
    notifications: Array<{
      id: string
      type: 'success' | 'error' | 'warning' | 'info'
      message: string
      duration?: number
    }>
  }

  // Dados de Billing
  billing: {
    currentPlan: string
    usage: {
      tokens: number
      storage: number
      requests: number
    }
    limits: {
      tokens: number
      storage: number
      requests: number
    }
    nextBillingDate?: string
  }

  // Deploy Status
  deploy: {
    isDeploying: boolean
    currentVersion?: string
    lastDeployedAt?: string
    deployHistory: Array<{
      version: string
      status: 'success' | 'failed' | 'pending'
      timestamp: string
      url?: string
    }>
  }

  // Sincronização em Tempo Real
  realtime: {
    isConnected: boolean
    sessionId: string
    activeUsers: number
  }

  // Erros e Loading
  loading: {
    isLoading: boolean
    currentOperation?: string
  }
  error: {
    message?: string
    code?: string
    details?: Record<string, any>
  } | null
}

type DeployHistoryEntry = StudioState['deploy']['deployHistory'][number]

/**
 * Tipos de ações
 */
export type StudioAction =
  | { type: 'SET_USER'; payload: StudioState['user'] }
  | { type: 'LOGOUT' }
  | { type: 'SET_PROJECT'; payload: StudioState['currentProject'] }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'auto' }
  | { type: 'ADD_NOTIFICATION'; payload: StudioState['ui']['notifications'][0] }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'UPDATE_BILLING'; payload: Partial<StudioState['billing']> }
  | { type: 'START_DEPLOY'; payload: { version: string } }
  | { type: 'DEPLOY_SUCCESS'; payload: { url: string; timestamp: string } }
  | { type: 'DEPLOY_ERROR'; payload: { error: string } }
  | { type: 'SET_REALTIME_CONNECTED'; payload: boolean }
  | { type: 'SET_ACTIVE_USERS'; payload: number }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; operation?: string } }
  | { type: 'SET_ERROR'; payload: StudioState['error'] }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' }

/**
 * Estado inicial
 */
const initialState: StudioState = {
  user: null,
  currentProject: null,
  ui: {
    sidebarOpen: true,
    theme: 'auto',
    notifications: [],
  },
  billing: {
    currentPlan: 'starter',
    usage: {
      tokens: 0,
      storage: 0,
      requests: 0,
    },
    limits: {
      tokens: 10000,
      storage: 1000,
      requests: 100000,
    },
  },
  deploy: {
    isDeploying: false,
    deployHistory: [],
  },
  realtime: {
    isConnected: false,
    sessionId: '',
    activeUsers: 0,
  },
  loading: {
    isLoading: false,
  },
  error: null,
}

/**
 * Reducer
 */
function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload }

    case 'LOGOUT':
      return { ...state, user: null }

    case 'SET_PROJECT':
      return { ...state, currentProject: action.payload }

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
      }

    case 'SET_THEME':
      return {
        ...state,
        ui: { ...state.ui, theme: action.payload },
      }

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, action.payload],
        },
      }

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter((n) => n.id !== action.payload),
        },
      }

    case 'UPDATE_BILLING':
      return {
        ...state,
        billing: { ...state.billing, ...action.payload },
      }

    case 'START_DEPLOY':
      return {
        ...state,
        deploy: {
          ...state.deploy,
          isDeploying: true,
          currentVersion: action.payload.version,
        },
      }

    case 'DEPLOY_SUCCESS':
      const successHistory: DeployHistoryEntry[] = [
        {
          version: state.deploy.currentVersion || 'unknown',
          status: 'success',
          timestamp: action.payload.timestamp,
          url: action.payload.url,
        },
        ...state.deploy.deployHistory,
      ]
      const successHistoryTrimmed = successHistory.slice(0, 10)
      return {
        ...state,
        deploy: {
          ...state.deploy,
          isDeploying: false,
          lastDeployedAt: action.payload.timestamp,
          deployHistory: successHistoryTrimmed, // Manter últimos 10
        },
      }

    case 'DEPLOY_ERROR':
      const errorHistory: DeployHistoryEntry[] = [
        {
          version: state.deploy.currentVersion || 'unknown',
          status: 'failed',
          timestamp: new Date().toISOString(),
        },
        ...state.deploy.deployHistory,
      ]
      const errorHistoryTrimmed = errorHistory.slice(0, 10)
      return {
        ...state,
        deploy: {
          ...state.deploy,
          isDeploying: false,
          deployHistory: errorHistoryTrimmed,
        },
        error: {
          message: action.payload.error,
          code: 'DEPLOY_ERROR',
        },
      }

    case 'SET_REALTIME_CONNECTED':
      return {
        ...state,
        realtime: { ...state.realtime, isConnected: action.payload },
      }

    case 'SET_ACTIVE_USERS':
      return {
        ...state,
        realtime: { ...state.realtime, activeUsers: action.payload },
      }

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          isLoading: action.payload.isLoading,
          currentOperation: action.payload.operation,
        },
      }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'RESET_STATE':
      return initialState

    default:
      return state
  }
}

/**
 * Context
 */
interface StudioContextType {
  state: StudioState
  dispatch: React.Dispatch<StudioAction>
  // Helpers
  setUser: (user: StudioState['user']) => void
  logout: () => void
  setProject: (project: StudioState['currentProject']) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  addNotification: (notification: Omit<StudioState['ui']['notifications'][0], 'id'>) => void
  removeNotification: (id: string) => void
  updateBilling: (billing: Partial<StudioState['billing']>) => void
  startDeploy: (version: string) => void
  deploySuccess: (url: string) => void
  deployError: (error: string) => void
  setLoading: (isLoading: boolean, operation?: string) => void
  setError: (error: StudioState['error']) => void
  clearError: () => void
}

const StudioContext = createContext<StudioContextType | undefined>(undefined)

/**
 * Provider
 */
export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(studioReducer, initialState)

  const setUser = useCallback((user: StudioState['user']) => {
    dispatch({ type: 'SET_USER', payload: user })
  }, [])

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
  }, [])

  const setProject = useCallback((project: StudioState['currentProject']) => {
    dispatch({ type: 'SET_PROJECT', payload: project })
  }, [])

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [])

  const setTheme = useCallback((theme: 'light' | 'dark' | 'auto') => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }, [])

  const addNotification = useCallback(
    (notification: Omit<StudioState['ui']['notifications'][0], 'id'>) => {
      const id = `notif-${Date.now()}`
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { ...notification, id },
      })

      // Auto-remove após duration
      if (notification.duration) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
        }, notification.duration)
      }
    },
    []
  )

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  const updateBilling = useCallback((billing: Partial<StudioState['billing']>) => {
    dispatch({ type: 'UPDATE_BILLING', payload: billing })
  }, [])

  const startDeploy = useCallback((version: string) => {
    dispatch({ type: 'START_DEPLOY', payload: { version } })
  }, [])

  const deploySuccess = useCallback((url: string) => {
    dispatch({
      type: 'DEPLOY_SUCCESS',
      payload: { url, timestamp: new Date().toISOString() },
    })
  }, [])

  const deployError = useCallback((error: string) => {
    dispatch({ type: 'DEPLOY_ERROR', payload: { error } })
  }, [])

  const setLoading = useCallback((isLoading: boolean, operation?: string) => {
    dispatch({ type: 'SET_LOADING', payload: { isLoading, operation } })
  }, [])

  const setError = useCallback((error: StudioState['error']) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const value: StudioContextType = {
    state,
    dispatch,
    setUser,
    logout,
    setProject,
    toggleSidebar,
    setTheme,
    addNotification,
    removeNotification,
    updateBilling,
    startDeploy,
    deploySuccess,
    deployError,
    setLoading,
    setError,
    clearError,
  }

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

/**
 * Hook para usar Studio State
 */
export function useStudioState(): StudioContextType {
  const context = useContext(StudioContext)
  if (!context) {
    throw new Error('useStudioState deve ser usado dentro de StudioProvider')
  }
  return context
}

/**
 * Selectors para otimizar re-renders
 */
export const studioSelectors = {
  user: (state: StudioState) => state.user,
  currentProject: (state: StudioState) => state.currentProject,
  isAuthenticated: (state: StudioState) => state.user !== null,
  isSidebarOpen: (state: StudioState) => state.ui.sidebarOpen,
  theme: (state: StudioState) => state.ui.theme,
  notifications: (state: StudioState) => state.ui.notifications,
  billingUsage: (state: StudioState) => state.billing.usage,
  billingLimits: (state: StudioState) => state.billing.limits,
  isDeploying: (state: StudioState) => state.deploy.isDeploying,
  deployHistory: (state: StudioState) => state.deploy.deployHistory,
  isRealtimeConnected: (state: StudioState) => state.realtime.isConnected,
  activeUsers: (state: StudioState) => state.realtime.activeUsers,
  isLoading: (state: StudioState) => state.loading.isLoading,
  error: (state: StudioState) => state.error,
}
