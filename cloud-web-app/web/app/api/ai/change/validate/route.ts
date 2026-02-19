import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { validateAiChange } from '@/lib/server/change-validation'
import { capabilityResponse } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

type ValidateBody = {
  original?: string
  modified?: string
  fullDocument?: string
  language?: string
  filePath?: string
}

const CAPABILITY = 'AI_CHANGE_VALIDATE'

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-change-validate-post',
      key: auth.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many AI change validation requests. Please try again later.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = (await req.json().catch(() => null)) as ValidateBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const original = typeof body.original === 'string' ? body.original : ''
    const modified = typeof body.modified === 'string' ? body.modified : ''
    const fullDocument = typeof body.fullDocument === 'string' ? body.fullDocument : undefined
    const language = typeof body.language === 'string' ? body.language : undefined
    const filePath = typeof body.filePath === 'string' ? body.filePath : undefined

    if (!modified.trim()) {
      return capabilityResponse({
        error: 'MISSING_MODIFIED_CONTENT',
        message: 'modified content is required.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
      })
    }

    const result = validateAiChange({
      original,
      modified,
      fullDocument,
      language,
      filePath,
    })

    return capabilityResponse({
      error: result.canApply ? 'NONE' : 'VALIDATION_BLOCKED',
      message: result.canApply ? 'Validation passed.' : 'Validation blocked apply.',
      status: 200,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      metadata: {
        canApply: result.canApply,
        verdict: result.verdict,
        checks: result.checks,
        dependencyImpact: result.dependencyImpact,
      },
    })
  } catch (error) {
    console.error('[AI Change Validate] Error:', error)
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to validate AI change',
      },
      { status: 500 }
    )
  }
}
