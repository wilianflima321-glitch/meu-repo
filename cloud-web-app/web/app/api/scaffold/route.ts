import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, verifyProjectOwnership } from '@/lib/auth-server'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import { scaffoldAndPreviewProject } from '@/lib/production/fullstack-scaffold-engine'
import type { SupportedDevContainerTemplate } from '@/lib/production/devcontainer-manifest'
import { createCreativeWalletCostGuardAdapter } from '@/lib/production/creative-cost-guard-creative-wallet-adapter'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/scaffold')

const ScaffoldRequestSchema = z.object({
  projectId: z.string().uuid(),
  templateId: z.string(), // We will cast this to SupportedDevContainerTemplate
  preferredStrategy: z.enum(['inline', 'local-dev-server', 'e2b']).optional()
})

export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req)
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const parseResult = ScaffoldRequestSchema.safeParse(json)
    
    if (!parseResult.success) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    const { projectId, templateId, preferredStrategy } = parseResult.data

    // 1. Verify access to project workspace
    const isOwner = await verifyProjectOwnership(projectId, payload.userId)
    if (!isOwner) {
      return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 })
    }

    const { absolutePath: projectRootPath } = resolveScopedWorkspacePath({
      userId: payload.userId,
      projectId,
      requestedPath: '/',
    })

    // 2. Initialize Cost Guard
    const costAdapter = createCreativeWalletCostGuardAdapter({ hasByok: async () => false })

    // 3. Trigger FullStackScaffoldEngine
    const scaffoldResult = await scaffoldAndPreviewProject({
      userId: payload.userId,
      projectId,
      projectRootPath,
      templateId: templateId as SupportedDevContainerTemplate,
      preferredStrategy,
      costAdapter
    })

    if (!scaffoldResult.ok) {
      return NextResponse.json({ ok: false, error: scaffoldResult.message }, { status: 500 })
    }

    return NextResponse.json(scaffoldResult)
    
  } catch (error) {
    log.error('scaffold_route_unhandled', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
