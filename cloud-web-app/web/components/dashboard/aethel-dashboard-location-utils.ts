export function getProjectIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('projectId')
  return value && value.trim() ? value.trim() : null
}

export function getMissionFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('mission')
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getOnboardingFlagFromLocation(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('onboarding') === '1'
}

export function getSourceFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('source')
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = window.localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function extractApiContent(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    return (
      parsed?.message?.content ||
      parsed?.choices?.[0]?.message?.content ||
      parsed?.message ||
      parsed?.output?.text ||
      raw
    )
  } catch {
    return raw
  }
}
