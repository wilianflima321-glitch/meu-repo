'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorCount: number
}

/**
 * Global Error Boundary for the Studio Shell
 *
 * Captura erros de renderização e oferece opções de recuperação:
 * - Retry (recarregar componente)
 * - Voltar para Dashboard
 * - Reportar erro (Sentry)
 *
 * Padrão: Vercel, Linear, Cursor
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log para console em dev
    console.error('Global Error Boundary caught:', error, errorInfo)

    // Incrementar contador de erros
    const errorCount = (this.state?.errorCount ?? 0) + 1

    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount,
    }))

    // Enviar para Sentry se disponível
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }

    // Se muitos erros, sugerir reload completo
    if (errorCount > 3) {
      console.warn('Múltiplos erros detectados. Sugerindo reload completo.')
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.href = '/dashboard'
  }

  handleReportError = () => {
    if (this.state.error) {
      const errorMessage = encodeURIComponent(
        `${this.state.error.message}\n\n${this.state.errorInfo?.componentStack || ''}`
      )
      window.location.href = `mailto:support@aethel.engine?subject=Error Report&body=${errorMessage}`
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-[var(--aethel-error)]/10 rounded-full border border-[var(--aethel-error)]/30">
                <AlertTriangle className="w-8 h-8 text-[var(--aethel-error)]" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-2">
              Algo deu errado
            </h1>

            {/* Description */}
            <p className="text-[var(--aethel-text-secondary)] text-center text-sm mb-6">
              Encontramos um erro inesperado. Tente recarregar ou volte para o início.
            </p>

            {/* Error Details (Dev Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-[var(--aethel-surface-secondary)] rounded-lg border border-[var(--aethel-border-primary)] overflow-auto max-h-40">
                <p className="text-xs font-mono text-[var(--aethel-text-tertiary)] whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <p className="text-xs font-mono text-[var(--aethel-text-quaternary)] mt-2 whitespace-pre-wrap break-words">
                    {this.state.errorInfo.componentStack}
                  </p>
                )}
              </div>
            )}

            {/* Error Count Warning */}
            {this.state.errorCount > 1 && (
              <div className="mb-6 p-3 bg-[var(--aethel-warning)]/10 rounded-lg border border-[var(--aethel-warning)]/30 text-xs text-[var(--aethel-warning-light)]">
                ⚠️ Múltiplos erros detectados ({this.state.errorCount}). Recarregamento completo recomendado.
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button type="button"
                onClick={this.handleRetry}
                className="w-full px-4 py-2.5 bg-[var(--aethel-primary)] hover:bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>

              <Link
                href="/dashboard"
                className="w-full px-4 py-2.5 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-[var(--aethel-border-primary)]"
              >
                <Home className="w-4 h-4" />
                Voltar para Dashboard
              </Link>

              {process.env.NODE_ENV === 'development' && (
                <button type="button"
                  onClick={this.handleReportError}
                  className="w-full px-4 py-2.5 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] font-medium rounded-lg transition-colors text-sm border border-[var(--aethel-border-primary)]"
                >
                  Report error
                </button>
              )}
            </div>

            {/* Footer */}
            <p className="text-xs text-[var(--aethel-text-quaternary)] text-center mt-6">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default GlobalErrorBoundary
