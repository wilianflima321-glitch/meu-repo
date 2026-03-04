import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { appendChangeRunLedgerEvent } from '@/lib/server/change-run-ledger'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'ADMIN_AI_CORE_LOOP_DRILL'
const DEFAULT_RUNS = 8
const MAX_RUNS = 100

function parseRuns(value: unknown): number {
  const parsed = typeof value === 'number' ? Math.floor(value) : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_RUNS
  return Math.max(1, Math.min(parsed, MAX_RUNS))
}

export const POST = withAdminAuth(
  async (request: NextRequest, { user }) => {
    const body = (await request.json().catch(() => null)) as { runs?: unknown; projectId?: unknown } | null
    const runs = parseRuns(body?.runs)
    const projectId = typeof body?.projectId === 'string' && body.projectId.trim()
      ? body.projectId.trim()
      : 'core-loop-drill'

    let applySuccess = 0
    let applyBlocked = 0
    let rollbackSuccess = 0
    const runIds: string[] = []

    for (let i = 0; i < runs; i += 1) {
      const runId = `drill_${Date.now().toString(36)}_${i.toString(36)}`
      const executionMode: 'sandbox' | 'workspace' = i % 2 === 0 ? 'sandbox' : 'workspace'
      const filePath = `/drill/${executionMode}/example-${i}.ts`
      runIds.push(runId)

      if (i % 5 === 0) {
        applyBlocked += 1
        await appendChangeRunLedgerEvent({
          eventType: 'apply_blocked',
          capability: 'AI_CHANGE_APPLY',
          userId: user.id,
          projectId,
          filePath,
          outcome: 'blocked',
          metadata: {
            runId,
            runSource: 'core_loop_drill',
            executionMode,
            reason: 'DEPENDENCY_GRAPH_APPROVAL_REQUIRED',
            drillScenario: 'approval_gate',
            initiatedBy: user.email,
          },
        })
        continue
      }

      applySuccess += 1
      const rollbackToken = `drill_rb_${runId}`
      await appendChangeRunLedgerEvent({
        eventType: 'apply',
        capability: 'AI_CHANGE_APPLY',
        userId: user.id,
        projectId,
        filePath,
        outcome: 'success',
        metadata: {
          runId,
          runSource: 'core_loop_drill',
          executionMode,
          dependencyGraphRisk: executionMode === 'sandbox' ? 'low' : 'medium',
          rollbackToken,
          drillScenario: 'deterministic_apply',
          initiatedBy: user.email,
        },
      })

      if (i % 3 === 0) {
        rollbackSuccess += 1
        await appendChangeRunLedgerEvent({
          eventType: 'rollback',
          capability: 'AI_CHANGE_ROLLBACK',
          userId: user.id,
          projectId,
          filePath,
          outcome: 'success',
          metadata: {
            runId,
            runSource: 'core_loop_drill',
            executionMode,
            rollbackToken,
            drillScenario: 'rollback_recovery',
            initiatedBy: user.email,
          },
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        message: 'Core-loop drill events were appended to the run ledger.',
        samplePolicy: 'core_loop_drill_is_rehearsal_only',
        totals: {
          runs,
          applySuccess,
          applyBlocked,
          rollbackSuccess,
        },
        runIds: runIds.slice(0, 20),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'x-aethel-capability': CAPABILITY,
          'x-aethel-capability-status': 'PARTIAL',
        },
      }
    )
  },
  'ops:agents:config'
)
