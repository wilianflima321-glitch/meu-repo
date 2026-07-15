import { createComponentLogger } from '@/lib/observability/logger'
import { clearDirectorAnalysisCache } from './service'
import type { DirectorActionPayload } from './types'

const log = createComponentLogger('server.ai-director.actions')

export async function handleDirectorAction(params: {
  userId: string
  projectId: string
  payload: DirectorActionPayload
}) {
  const { userId, projectId, payload } = params

  switch (payload.action) {
    case 'analyze':
      clearDirectorAnalysisCache(projectId)
      await logUserFeedback(userId, projectId, 'analysis', 'requested')
      return {
        success: true,
        message: 'Analysis refresh requested. The next Director read will run the configured AI provider or return an honest capability fallback.',
        estimatedTime: 15000,
        capabilityStatus: 'QUEUED_FOR_REAL_PROVIDER',
      }

    case 'dismiss':
      assertNoteId(payload.noteId)
      await logUserFeedback(userId, projectId, payload.noteId, 'dismissed')
      return { success: true, noteId: payload.noteId, status: 'dismissed' }

    case 'apply':
      assertNoteId(payload.noteId)
      await logUserFeedback(userId, projectId, payload.noteId, 'apply_requested')
      return {
        success: true,
        noteId: payload.noteId,
        status: 'applied',
        message: 'Apply request recorded for review. No automatic file changes were made by the Director endpoint.',
        safeApply: false,
      }

    case 'acknowledge':
      assertNoteId(payload.noteId)
      await logUserFeedback(userId, projectId, payload.noteId, 'acknowledged')
      return { success: true, noteId: payload.noteId, status: 'acknowledged' }

    default:
      return { error: 'Invalid action' }
  }
}

function assertNoteId(noteId: string | undefined): asserts noteId is string {
  if (!noteId) {
    const error = new Error('noteId required')
    ;(error as { code?: string }).code = 'INVALID_DIRECTOR_NOTE_ID'
    throw error
  }
}

async function logUserFeedback(userId: string, projectId: string, noteId: string, action: string) {
  log.info('Director feedback recorded', { userId, projectId, noteId, action })
}
