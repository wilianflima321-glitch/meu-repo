/**
 * L.4 — Forge terminal API (sandbox stream / duplex only).
 * Agents must use this path; host PTY create/execute remains human-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'
import { createCreativeWalletCostGuardAdapter } from '@/lib/production/creative-cost-guard-creative-wallet-adapter'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import {
  attachForgeTerminalDuplex,
  buildForgeTerminalDuplexReadyEvent,
  closeForgeTerminalSession,
  describeForgeTerminalDuplexHonesty,
  describeTerminalLaneSplit,
  detachForgeTerminalDuplex,
  detectAgentShellCaller,
  openForgeTerminalSession,
  resizeForgeTerminalDuplex,
  streamForgeTerminalCommand,
  writeForgeTerminalDuplexStdin,
  type ForgeTerminalDuplexServerEvent,
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

const AttachSchema = z.object({
  action: z.literal('attach'),
  sessionId: z.string().min(1),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  cols: z.number().int().min(2).max(500).optional(),
  rows: z.number().int().min(1).max(200).optional(),
})

const StdinSchema = z.object({
  action: z.literal('stdin'),
  duplexId: z.string().min(1),
  data: z.string(),
})

const ResizeSchema = z.object({
  action: z.literal('resize'),
  duplexId: z.string().min(1),
  cols: z.number().int().min(2).max(500),
  rows: z.number().int().min(1).max(200),
})

const DetachSchema = z.object({
  action: z.literal('detach'),
  duplexId: z.string().min(1),
})

const CloseSchema = z.object({
  action: z.literal('close'),
  sessionId: z.string().min(1),
})

function encodeNdjson(event: Record<string, unknown> | ForgeTerminalDuplexServerEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`)
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    laneSplit: describeTerminalLaneSplit(),
    duplex: describeForgeTerminalDuplexHonesty(),
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

  if (action === 'stdin') {
    const parsed = StdinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid stdin payload' }, { status: 400 })
    }
    const written = writeForgeTerminalDuplexStdin(parsed.data.duplexId, parsed.data.data)
    if (!written.ok) {
      return NextResponse.json(
        { ok: false, lane: 'forge-sandbox' as const, reason: written.reason },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true, lane: 'forge-sandbox' as const })
  }

  if (action === 'resize') {
    const parsed = ResizeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid resize payload' }, { status: 400 })
    }
    const resized = resizeForgeTerminalDuplex(
      parsed.data.duplexId,
      parsed.data.cols,
      parsed.data.rows,
    )
    if (!resized.ok) {
      return NextResponse.json(
        {
          ok: false,
          lane: 'forge-sandbox' as const,
          reason: resized.reason,
          ptyApplied: false,
          held: resized.held,
          duplex: describeForgeTerminalDuplexHonesty(),
        },
        { status: 404 },
      )
    }
    return NextResponse.json({
      ok: true,
      lane: 'forge-sandbox' as const,
      cols: resized.cols,
      rows: resized.rows,
      ptyApplied: false,
      held: resized.held,
      duplex: describeForgeTerminalDuplexHonesty(),
    })
  }

  if (action === 'detach') {
    const parsed = DetachSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid detach payload' }, { status: 400 })
    }
    const detached = detachForgeTerminalDuplex(parsed.data.duplexId)
    return NextResponse.json({ ok: detached, lane: 'forge-sandbox' as const })
  }

  if (action === 'attach') {
    const parsed = AttachSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid attach payload' }, { status: 400 })
    }

    const attached = await attachForgeTerminalDuplex({
      sessionId: parsed.data.sessionId,
      callerKind,
      command: parsed.data.command,
      args: parsed.data.args,
      cwd: parsed.data.cwd,
      cols: parsed.data.cols,
      rows: parsed.data.rows,
    })

    if (!attached.ok) {
      log.warn('forge_terminal_attach_denied', {
        reason: attached.reason,
        callerKind,
        sessionId: parsed.data.sessionId,
      })
      return NextResponse.json(
        {
          ok: false,
          lane: attached.lane,
          reason: attached.reason,
          error: attached.message,
          duplex: describeForgeTerminalDuplexHonesty(),
        },
        { status: attached.reason === 'agent_shell_blocked' ? 403 : 503 },
      )
    }

    const handle = attached.handle
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (event: ForgeTerminalDuplexServerEvent) => {
          controller.enqueue(encodeNdjson(event))
        }

        write(buildForgeTerminalDuplexReadyEvent(handle))

        handle.onStdout = (chunk) => {
          write({ type: 'stdout', data: chunk, duplexId: handle.duplexId })
        }
        handle.onStderr = (chunk) => {
          write({ type: 'stderr', data: chunk, duplexId: handle.duplexId })
        }
        handle.onExit = (code) => {
          write({
            type: 'exit',
            duplexId: handle.duplexId,
            ok: code === 0,
            exitCode: code,
            lane: 'forge-sandbox',
          })
          try {
            controller.close()
          } catch {
            /* already closed */
          }
        }

        if (handle.exited) {
          write({
            type: 'exit',
            duplexId: handle.duplexId,
            ok: handle.exitCode === 0,
            exitCode: handle.exitCode,
            lane: 'forge-sandbox',
          })
          controller.close()
        }
      },
      cancel() {
        detachForgeTerminalDuplex(handle.duplexId)
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Aethel-Terminal-Lane': 'forge-sandbox',
        'X-Aethel-Terminal-Mode': 'sandbox-exec-duplex',
        'X-Aethel-Terminal-Pty': 'false',
      },
    })
  }

  if (action === 'exec') {
    const parsed = ExecSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid exec payload' }, { status: 400 })
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (event: Record<string, unknown>) => {
          controller.enqueue(encodeNdjson(event))
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
        duplex: describeForgeTerminalDuplexHonesty(),
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
    duplex: describeForgeTerminalDuplexHonesty(),
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
