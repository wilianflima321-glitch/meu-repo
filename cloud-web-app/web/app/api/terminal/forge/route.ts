/**
 * L.4 — Forge terminal API (sandbox stream only).
 * Agents must use this path; host PTY create/execute remains human-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'
import { createCreativeWalletCostGuardAdapter } from '@/lib/production/creative-cost-guard-creative-wallet-adapter'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import {
  closeForgeTerminalSession,
  detectAgentShellCaller,
  describeTerminalLaneSplit,
  openForgeTerminalSession,
  streamForgeTerminalCommand,
} from '@/lib/server/forge-terminal-bridge'

const log = createComponentLogger('api/terminal/forge')

const OpenSchema = z.object({
  action: z.literal('open').optional(),
  projectId: z.string().min(1),
  projectRootPath: z.string().optional(),
  existingSandboxSessionId: z.string().optional(),
  planId: z.string().optional(),
})

const ExecSchema = z.object({
  action: z.literal('exec'),
  sessionId: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
})

const CloseSchema = z.object({
  action: z.literal('close'),
  sessionId: z.string().min(1),
})

export async function GET() {
  return NextResponse.json({
    ok: true,
    laneSplit: describeTerminalLaneSplit(),
    claim: 'Agent shell = forge-sandbox only; human-host-pty is separate',
  })
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = requireAuth(req)
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const callerKind = detectAgentShellCaller(req.headers)
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const action =
    typeof body === 'object' && body !== null && 'action' in body
      ? String((body as { action?: string }).action ?? 'open')
      : 'open'

  if (action === 'close') {
    const parsed = CloseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid close payload' }, { status: 400 })
    }
    const closed = await closeForgeTerminalSession(parsed.data.sessionId)
    return NextResponse.json({ ok: closed, lane: 'forge-sandbox' as const })
  }

  if (action === 'exec') {
    const parsed = ExecSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid exec payload' }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        }
        try {
          const result = await streamForgeTerminalCommand({
            sessionId: parsed.data.sessionId,
            command: parsed.data.command,
            args: parsed.data.args,
            cwd: parsed.data.cwd,
            callerKind,
            onStdout: (chunk) => write({ type: 'stdout', data: chunk }),
            onStderr: (chunk) => write({ type: 'stderr', data: chunk }),
          })
          write({
            type: 'exit',
            ok: result.ok,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
            deniedReason: result.deniedReason,
            deniedMessage: result.deniedMessage,
            lane: result.lane,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          log.error('forge_terminal_exec_stream_failed', { message })
          write({ type: 'error', message })
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Aethel-Terminal-Lane': 'forge-sandbox',
      },
    })
  }

  const parsed = OpenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid open payload' }, { status: 400 })
  }

  let projectRootPath = parsed.data.projectRootPath
  if (!projectRootPath) {
    try {
      projectRootPath = resolveScopedWorkspacePath({
        userId: user.userId,
        projectId: parsed.data.projectId,
        requestedPath: '/',
      }).absolutePath
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { ok: false, error: `Unable to resolve project root: ${message}` },
        { status: 400 },
      )
    }
  }

  const costAdapter = createCreativeWalletCostGuardAdapter({
    hasByok: async () => false,
  })

  const opened = await openForgeTerminalSession({
    userId: user.userId,
    projectId: parsed.data.projectId,
    projectRootPath,
    callerKind,
    costAdapter,
    existingSandboxSessionId: parsed.data.existingSandboxSessionId,
    planId: parsed.data.planId,
  })

  if (!opened.ok) {
    log.warn('forge_terminal_open_denied', {
      reason: opened.reason,
      callerKind,
      projectId: parsed.data.projectId,
    })
    return NextResponse.json(
      {
        ok: false,
        lane: opened.lane,
        reason: opened.reason,
        error: opened.message,
        policy: opened.policy,
        laneSplit: describeTerminalLaneSplit(),
      },
      { status: opened.policy.status === 'blocked' ? 403 : 503 },
    )
  }

  return NextResponse.json({
    ok: true,
    lane: opened.lane,
    sessionId: opened.session.sessionId,
    provider: opened.session.provider,
    policy: opened.policy,
    laneSplit: describeTerminalLaneSplit(),
  })
}

export async function DELETE(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sessionId = new URL(req.url).searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Missing sessionId' }, { status: 400 })
  }

  const closed = await closeForgeTerminalSession(sessionId)
  return NextResponse.json({ ok: closed, lane: 'forge-sandbox' as const })
}
