import { describe, expect, it } from 'vitest'

import {
  buildBrowserOperatorRuntimePayload,
  getBrowserOperatorRuntimeBlock,
} from '@/lib/device/browser-operator-tool-guard'

describe('browser operator tool guard', () => {
  it('allows execution when no runtime context is provided', () => {
    expect(getBrowserOperatorRuntimeBlock(null)).toBeNull()
    expect(getBrowserOperatorRuntimeBlock(undefined)).toBeNull()
  })

  it('blocks browser operator work when the lane cannot start', () => {
    expect(
      getBrowserOperatorRuntimeBlock({
        canStart: false,
        placement: 'cloud-sandbox',
        mode: 'safe-mode',
        reason: 'Browser operator is at its concurrency limit.',
      }),
    ).toMatchObject({
      code: 'BROWSER_OPERATOR_LANE_BLOCKED',
      placement: 'cloud-sandbox',
      mode: 'safe-mode',
    })
  })

  it('requires explicit confirmation when the runtime policy asks for it', () => {
    expect(
      getBrowserOperatorRuntimeBlock({
        canStart: true,
        requiresConfirmation: true,
        approved: false,
        placement: 'cloud-sandbox',
        mode: 'cloud-isolated',
      }),
    ).toMatchObject({
      code: 'BROWSER_OPERATOR_CONFIRMATION_REQUIRED',
      placement: 'cloud-sandbox',
      mode: 'cloud-isolated',
    })
  })

  it('builds a runtime payload that preserves execution metadata', () => {
    expect(
      buildBrowserOperatorRuntimePayload({
        canStart: true,
        requiresConfirmation: true,
        approved: true,
        placement: 'cloud-sandbox',
        mode: 'cloud-isolated',
        reason: 'Browser operator can start in cloud sandbox.',
      }),
    ).toEqual({
      browserOperator: {
        canStart: true,
        requiresConfirmation: true,
        approved: true,
        placement: 'cloud-sandbox',
        mode: 'cloud-isolated',
        reason: 'Browser operator can start in cloud sandbox.',
      },
    })
  })
})
