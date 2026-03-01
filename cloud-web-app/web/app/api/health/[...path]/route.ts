import { NextRequest } from 'next/server'
import { catchallNotImplemented } from '@/app/api/_lib/catchall-gate'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { path: string[] } }

const handle = (request: NextRequest, context: RouteContext) =>
  catchallNotImplemented({ request, params: context.params, namespace: 'health' })

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
