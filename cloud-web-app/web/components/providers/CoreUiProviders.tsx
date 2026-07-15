'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AethelContextProvider } from '@/contexts/AethelContextRegistry'
import { ToastProvider } from '@/components/ui/toast-system'
import { AiPoolThresholdWatcher } from '@/components/billing/AiPoolThresholdWatcher'
import { AiQuotaModal } from '@/components/billing/AiQuotaModal'

export default function CoreUiProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AethelContextProvider>
        <ToastProvider>
          <AiPoolThresholdWatcher />
          <AiQuotaModal />
          {children}
        </ToastProvider>
      </AethelContextProvider>
    </ThemeProvider>
  )
}
