'use client'

type DashboardToastProps = {
  message: string
  type: 'success' | 'error' | 'info'
}

export function DashboardToast({ message, type }: DashboardToastProps) {
  const colorClass =
    type === 'success' ? 'aethel-bg-emerald-600' : type === 'error' ? 'aethel-bg-red-600' : 'aethel-bg-blue-600'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`aethel-fixed aethel-bottom-4 aethel-left-4 aethel-right-4 sm:aethel-left-auto sm:aethel-right-6 sm:aethel-bottom-6 aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-shadow-lg aethel-z-50 aethel-animate-in aethel-slide-in-from-bottom-4 ${colorClass}`}
    >
      {message}
    </div>
  )
}
