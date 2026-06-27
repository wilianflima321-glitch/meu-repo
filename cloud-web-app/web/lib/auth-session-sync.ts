import { saveToken } from './auth'
import { logger } from '@/lib/observability/logger'

export async function syncAuthFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
    if (!res.ok) return false
    
    const data = await res.json()
    if (data.token) {
      saveToken(data.token)
      return true
    }
    return false
  } catch (error) {
    logger.error('Failed to sync auth from server:', error)
    return false
  }
}
