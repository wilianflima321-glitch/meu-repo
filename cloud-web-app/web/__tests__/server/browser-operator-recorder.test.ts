import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyBrowserOperatorAction,
  clearBrowserOperatorRunsForTests,
  getBrowserOperatorRun,
  listBrowserOperatorRuns,
  recordBrowserOperatorStep,
} from '@/lib/server/browser-operator-recorder'

describe('browser operator recorder', () => {
  beforeEach(() => {
    clearBrowserOperatorRunsForTests()
  })

  it('records replay evidence with deterministic hashes', () => {
    const run = recordBrowserOperatorStep({
      runId: 'run_001',
      actorId: 'user_001',
      mission: 'Research public pricing',
      tool: 'browser:navigate',
      targetUrl: 'https://linear.app/pricing',
      intent: 'navigate',
      params: { waitUntil: 'load' },
      screenshotUrl: 's3://evidence/step-1.png',
      domSnapshot: '<html><body>pricing</body></html>',
      allowedDomains: ['linear.app'],
    })

    expect(run.status).toBe('running')
    expect(run.steps).toHaveLength(1)
    expect(run.steps[0].evidenceRefs).toContain('screenshot:s3://evidence/step-1.png')
    expect(run.steps[0].domSnapshotHash).toHaveLength(64)
    expect(run.timelineHash).toHaveLength(64)
  })

  it('holds high-risk browser actions until approval', () => {
    const run = recordBrowserOperatorStep({
      runId: 'run_002',
      actorId: 'user_001',
      mission: 'Do not buy anything without approval',
      tool: 'browser:click',
      targetUrl: 'https://vendor.example/checkout',
      intent: 'purchase item',
      screenshotUrl: 's3://evidence/checkout.png',
      domSnapshot: '<button>Buy now</button>',
      amountUsd: 200,
    })

    expect(run.status).toBe('approval-required')
    expect(run.steps[0].requiresApproval).toBe(true)

    const approved = applyBrowserOperatorAction('run_002', 'approve')
    expect(approved?.status).toBe('running')
    expect(approved?.steps[0].approved).toBe(true)
  })

  it('supports pause, takeover, resume, cancel, and replay lookup', () => {
    recordBrowserOperatorStep({
      runId: 'run_003',
      actorId: 'user_001',
      mission: 'Read a public docs page',
      tool: 'browser:navigate',
      targetUrl: 'https://docs.example/start',
      intent: 'read docs',
      screenshotUrl: 's3://evidence/docs.png',
      domSnapshot: '<main>docs</main>',
    })

    expect(applyBrowserOperatorAction('run_003', 'pause')?.status).toBe('paused')
    expect(applyBrowserOperatorAction('run_003', 'takeover')?.status).toBe('paused')
    expect(applyBrowserOperatorAction('run_003', 'resume')?.status).toBe('running')
    expect(applyBrowserOperatorAction('run_003', 'cancel')?.status).toBe('cancelled')
    expect(getBrowserOperatorRun('run_003')?.steps).toHaveLength(1)
  })

  it('lists recent replay runs by project for cockpit discovery', () => {
    recordBrowserOperatorStep({
      runId: 'run_project_a',
      projectId: 'project-a',
      actorId: 'user_001',
      mission: 'Audit competitor pricing',
      tool: 'browser:navigate',
      targetUrl: 'https://example.com/pricing',
      intent: 'read pricing',
      domSnapshot: '<main>pricing</main>',
    })
    recordBrowserOperatorStep({
      runId: 'run_project_b',
      projectId: 'project-b',
      actorId: 'user_001',
      mission: 'Audit docs',
      tool: 'browser:navigate',
      targetUrl: 'https://example.com/docs',
      intent: 'read docs',
      domSnapshot: '<main>docs</main>',
    })

    const projectRuns = listBrowserOperatorRuns({ projectId: 'project-a' })
    expect(projectRuns.map((run) => run.runId)).toEqual(['run_project_a'])
    expect(listBrowserOperatorRuns({ limit: 1 })).toHaveLength(1)
  })
})
