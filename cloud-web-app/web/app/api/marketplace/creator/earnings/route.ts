import { NextRequest, NextResponse } from 'next/server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { getCreatorEarningsSummary } from '@/lib/marketplace/payouts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const summary = await getCreatorEarningsSummary(user.userId)

    return NextResponse.json(summary)
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to load creator earnings summary')
  }
}
