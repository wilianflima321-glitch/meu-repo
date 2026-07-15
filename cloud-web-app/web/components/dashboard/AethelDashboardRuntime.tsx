'use client'

import { DashboardShell } from './DashboardShell'
import { DashboardLoadingScreen } from './DashboardLoadingScreen'
import { useAethelDashboardRuntime } from './useAethelDashboardRuntime'

export default function AethelDashboardRuntime() {
  const { authReady, theme, dashboardShellProps } = useAethelDashboardRuntime()

  if (!authReady) {
    return <DashboardLoadingScreen theme={theme} />
  }

  return <DashboardShell {...dashboardShellProps} />
}
