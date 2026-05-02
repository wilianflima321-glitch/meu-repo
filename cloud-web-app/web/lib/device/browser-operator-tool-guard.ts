export interface BrowserOperatorRuntimeContext {
  canStart?: boolean
  requiresConfirmation?: boolean
  approved?: boolean
  placement?: string | null
  target?: string | null
  mode?: string | null
  reason?: string | null
}

export interface BrowserOperatorRuntimeBlock {
  code: 'BROWSER_OPERATOR_LANE_BLOCKED' | 'BROWSER_OPERATOR_CONFIRMATION_REQUIRED'
  message: string
  placement: string | null
  target: string | null
  mode: string | null
}

export type BrowserOperatorRuntimePayload = {
  browserOperator: BrowserOperatorRuntimeContext
}

export function getBrowserOperatorRuntimeBlock(
  context: BrowserOperatorRuntimeContext | null | undefined
): BrowserOperatorRuntimeBlock | null {
  if (!context) {
    return null
  }

  if (context.canStart === false) {
    return {
      code: 'BROWSER_OPERATOR_LANE_BLOCKED',
      message:
        context.reason ||
        'Browser operator is currently held by runtime policy for this device profile.',
      placement: context.placement ?? null,
      target: context.target ?? context.placement ?? null,
      mode: context.mode ?? null,
    }
  }

  if (context.requiresConfirmation && context.approved !== true) {
    return {
      code: 'BROWSER_OPERATOR_CONFIRMATION_REQUIRED',
      message:
        context.reason ||
        'Browser operator requires explicit confirmation before this web step can run.',
      placement: context.placement ?? null,
      target: context.target ?? context.placement ?? null,
      mode: context.mode ?? null,
    }
  }

  return null
}

export function buildBrowserOperatorRuntimePayload(
  context: BrowserOperatorRuntimeContext
): BrowserOperatorRuntimePayload {
  return {
    browserOperator: {
      canStart: context.canStart,
      requiresConfirmation: context.requiresConfirmation,
      approved: context.approved,
      placement: context.placement ?? null,
      target: context.target ?? context.placement ?? null,
      mode: context.mode ?? null,
      reason: context.reason ?? null,
    },
  }
}
