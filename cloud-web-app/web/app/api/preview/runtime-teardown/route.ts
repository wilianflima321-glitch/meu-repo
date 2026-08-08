import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { capabilityResponse } from '@/lib/server/capability-response'
import { teardownPreviewSession } from '@/lib/production/preview-orchestrator'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_TEARDOWN'

export const dynamic = 'force-dynamic'

const TeardownBodySchema = z.object({
  sandboxSessionId: z.string().min(1).optional(),
  sandboxId: z.string().min(1).optional(),
  actualMinutes: z.number().int().min(1).max(240).optional(),
})

export async function POST(request: NextRequest) {
  try {
    requireAuth(request)
    const json = await request.json().catch(() => null)
    const parsed = TeardownBodySchema.safeParse(json)
    if (!parsed.success) {
      return capabilityResponse({
        error: 'RUNTIME_TEARDOWN_INVALID_BODY',
        status: 400,
        message: 'sandboxSessionId or sandboxId is required',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
      })
    }

    const sessionId = parsed.data.sandboxSessionId || parsed.data.sandboxId
    if (!sessionId) {
      return capabilityResponse({
        error: 'RUNTIME_TEARDOWN_INVALID_BODY',
        status: 400,
        message: 'sandboxSessionId or sandboxId is required',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
      })
    }

    const result = await teardownPreviewSession(sessionId, parsed.data.actualMinutes ?? 1)
    if (!result.ok) {
      return capabilityResponse({
        error: 'RUNTIME_TEARDOWN_FAILED',
        status: 404,
        message: result.message || 'Failed to tear down preview session',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { sandboxSessionId: sessionId },
      })
    }

    return NextResponse.json(
      {
        success: true,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        sandboxSessionId: sessionId,
        sandboxId: sessionId,
        message: result.message ?? 'Preview session torn down',
      },
      {
        headers: {
          'x-aethel-capability': CAPABILITY,
          'x-aethel-capability-status': 'PARTIAL',
        },
      },
    )
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return capabilityResponse({
      error: 'RUNTIME_TEARDOWN_EXCEPTION',
      status: 500,
      message: error instanceof Error ? error.message : 'Failed to tear down preview session',
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }
}
