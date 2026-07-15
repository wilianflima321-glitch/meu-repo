'use client'

import type { ToastType } from './aethel-dashboard-model'

type DashboardToastProps = {
  message: string
  type: ToastType
}

export function DashboardToast({ message, type }: DashboardToastProps) {
  const colorClass =
    type === 'success'
      ? 'bg-[var(--aethel-success-dark)]'
      : type === 'error'
        ? 'bg-[var(--aethel-error-dark)]'
        : type === 'warning'
          ? 'bg-[var(--aethel-warning-dark)] text-[var(--aethel-bg)]'
          : 'bg-[var(--aethel-primary-dark)]'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 rounded-2xl px-4 py-2 shadow-lg sm:bottom-6 sm:left-auto sm:right-6 ${colorClass}`}
    >
      {message}
    </div>
  )
}
