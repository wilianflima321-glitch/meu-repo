'use client'

type DashboardToastProps = {
  message: string
  type: 'success' | 'error' | 'info'
}

export function DashboardToast({ message, type }: DashboardToastProps) {
  const colorClass =
    type === 'success' ? 'bg-[var(--aethel-success-dark)]' : type === 'error' ? 'bg-[var(--aethel-error-dark)]' : 'bg-[var(--aethel-primary-dark)]'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 px-4 py-2 aethel-rounded-lg aethel-shadow-lg z-50 animate-in slide-in-from-bottom-4 ${colorClass}`}
    >
      {message}
    </div>
  )
}
