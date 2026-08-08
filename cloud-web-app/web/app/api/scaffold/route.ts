import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, verifyProjectOwnership } from '@/lib/auth-server'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import { scaffoldAndPreviewProject } from '@/lib/production/fullstack-scaffold-engine'
import {
  SUPPORTED_DEVCONTAINER_TEMPLATES,
  isSupportedDevContainerTemplate,
} from '@/lib/production/devcontainer-template-catalog'
import { createCreativeWalletCostGuardAdapter } from '@/lib/production/creative-cost-guard-creative-wallet-adapter'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/scaffold')

const ScaffoldRequestSchema = z.object({
  projectId: z.string().uuid(),
  templateId: z.enum(SUPPORTED_DEVCONTAINER_TEMPLATES),
  preferredStrategy: z.enum(['inline', 'local-dev-server', 'e2b']).optional(),
})

export async function GET() {
  return NextResponse.json({
    capability: 'forge.scaffold',
    route: '/api/scaffold',
    templates: SUPPORTED_DEVCONTAINER_TEMPLATES,
    post: 'POST { projectId, templateId, preferredStrategy? } — L.9 FullStackScaffold + L.2 persist + L.8 preview + commit gate',
  })
}

export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req)
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const parseResult = ScaffoldRequestSchema.safeParse(json)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid payload',
          details: parseResult.error.flatten(),
          templates: SUPPORTED_DEVCONTAINER_TEMPLATES,
        },
        { status: 400 },
      )
    }

    const { projectId, templateId, preferredStrategy } = parseResult.data

    if (!isSupportedDevContainerTemplate(templateId)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported DevContainer template: ${templateId}` },
        { status: 400 },
      )
    }

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
      templateId,
      preferredStrategy,
      costAdapter,
    })

    if (!scaffoldResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: scaffoldResult.message || 'Scaffold failed',
          commitGate: scaffoldResult.commitGate,
          blockedReasons: scaffoldResult.commitGate?.blockedReasons,
          preview: scaffoldResult.preview,
          devContainerPersist: scaffoldResult.devContainerPersist,
          marketingAllowed: false,
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      ok: true,
      preview: scaffoldResult.preview,
      commitGate: scaffoldResult.commitGate,
      devContainerPersist: scaffoldResult.devContainerPersist,
      marketingAllowed: false,
    })
  } catch (error) {
    log.error('scaffold_route_unhandled', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
