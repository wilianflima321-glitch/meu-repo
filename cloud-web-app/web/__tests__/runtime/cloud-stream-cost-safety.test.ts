import { describe, expect, it } from 'vitest'

import { buildCloudStreamSafetyPlan } from '@/lib/pixel-streaming/cloud-stream-safety'

describe('Cloud Stream cost safety', () => {
  it('keeps Cloud Stream held without signaling, session manager and teardown evidence', () => {
    const plan = buildCloudStreamSafetyPlan()

    expect(plan.status).toBe('held')
    expect(plan.publicUseAllowed).toBe(false)
    expect(plan.streamConnectAllowed).toBe(false)
    expect(plan.blockers.join(' ')).toContain('signaling URL')
    expect(plan.blockers.join(' ')).toContain('session manager')
    expect(plan.blockers.join(' ')).toContain('Idle teardown')
  })

  it('blocks unsafe URLs and runaway GPU spend', () => {
    const plan = buildCloudStreamSafetyPlan({
      signalingUrl: 'ws://unsafe.example.com',
      sessionManagerConfigured: true,
      teardownConfigured: true,
      idleTimeoutSeconds: 900,
      maxSessionMinutes: 60,
      costPerMinuteUsd: 0.08,
      costCapUsd: 1,
      humanReviewRequired: true,
      recordingEvidenceEnabled: true,
    })

    expect(plan.status).toBe('held')
    expect(plan.blockers.join(' ')).toContain('HTTPS/WSS')
    expect(plan.blockers.join(' ')).toContain('five minutes')
    expect(plan.blockers.join(' ')).toContain('cost cap')
  })

  it('allows explicit stream connection only with cost, teardown, receipts and human review', () => {
    const plan = buildCloudStreamSafetyPlan({
      signalingUrl: 'wss://stream.aethel.dev/signaling',
      sessionManagerConfigured: true,
      teardownConfigured: true,
      idleTimeoutSeconds: 240,
      maxSessionMinutes: 20,
      costPerMinuteUsd: 0.03,
      costCapUsd: 0.75,
      humanReviewRequired: true,
      recordingEvidenceEnabled: true,
    })

    expect(plan.status).toBe('available')
    expect(plan.publicUseAllowed).toBe(true)
    expect(plan.streamConnectAllowed).toBe(true)
    expect(plan.projectedMaxSessionUsd).toBeCloseTo(0.6)
    expect(plan.blockers).toEqual([])
  })
})
