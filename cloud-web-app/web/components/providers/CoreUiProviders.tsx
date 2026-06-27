'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AethelContextProvider } from '@/contexts/AethelContextRegistry'
import { ToastProvider } from '@/components/ui/toast-system'

export default function CoreUiProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AethelContextProvider>
        <ToastProvider>{children}</ToastProvider>
      </AethelContextProvider>
    </ThemeProvider>
  )
}
