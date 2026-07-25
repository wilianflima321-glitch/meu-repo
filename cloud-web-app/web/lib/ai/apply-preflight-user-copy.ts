/**
 * Calm EN user copy for apply / creative deny codes (Focus C1).
 * Fail-closed — never map deny → success.
 */

export type ApplyPreflightUserCopy = {
  code: string
  title: string
  detail: string
  /** Show Full Access CTA when high-risk override is required */
  needsFullAccess: boolean
  runId?: string
  receiptHint?: string
}

type DenyInput = {
  error?: string | null
  message?: string | null
  blockedReason?: string | null
  metadata?: Record<string, unknown> | null
  status?: number
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Map server deny payload → calm English UX (no PT-BR, no fake success).
 */
export function mapApplyPreflightDeny(input: DenyInput): ApplyPreflightUserCopy {
  const code = (input.error || 'APPLY_REJECTED').trim() || 'APPLY_REJECTED'
  const runId = asString(input.metadata?.runId)
  const blockedReason = asString(input.blockedReason)
  const serverMessage = asString(input.message)

  const base: Omit<ApplyPreflightUserCopy, 'code' | 'title' | 'detail' | 'needsFullAccess'> = {
    runId,
    receiptHint: runId ? `Evidence run ${runId}` : undefined,
  }

  switch (code) {
    case 'LAZY_INSPECTOR_REJECT':
      return {
        ...base,
        code,
        title: 'Patch rejected — incomplete change',
        detail:
          serverMessage ||
          'The change looked truncated or lazy. Refine the edit and apply again. Nothing was written.',
        needsFullAccess: false,
      }
    case 'L5_PROJECT_TYPECHECK_FAIL':
      return {
        ...base,
        code,
        title: 'Patch rejected — project typecheck failed',
        detail:
          serverMessage ||
          'L.5 typecheck failed for this patch. Fix the types before applying. Nothing was written.',
        needsFullAccess: false,
      }
    case 'AST_SYNTAX_FAIL':
      return {
        ...base,
        code,
        title: 'Patch rejected — syntax/AST errors',
        detail:
          serverMessage ||
          'AST syntax validation failed for this patch. Fix parse errors before applying. Nothing was written.',
        needsFullAccess: false,
      }
    case 'MULTI_FILE_VALIDATION_DENIED':
    case 'PATH_DISJOINT_FAIL':
      return {
        ...base,
        code,
        title: 'Multi-file apply blocked — validation swarm',
        detail:
          serverMessage ||
          'AST/L.5 validation denied one or more files in the batch. Nothing was written.',
        needsFullAccess: false,
      }
    case 'CREATIVE_COST_GUARD_DENIED':
      return {
        ...base,
        code,
        title: 'Creative request blocked — cost guard',
        detail:
          blockedReason ||
          serverMessage ||
          'Add BYOK or credits before running paid creative tools. Nothing was charged on the free path.',
        needsFullAccess: false,
      }
    case 'FULL_ACCESS_GRANT_REQUIRED':
    case 'HIGH_RISK_APPROVAL_REQUIRED':
      return {
        ...base,
        code,
        title: 'High-risk change needs Full Access',
        detail:
          serverMessage ||
          'Enable temporary Full Access to override this high-risk apply. Nothing was written yet.',
        needsFullAccess: true,
      }
    case 'TOOL_BUS_BLOCKED':
    case 'QA_GATE_BLOCKED':
      return {
        ...base,
        code,
        title: 'Apply blocked by safety gate',
        detail: serverMessage || 'A production gate blocked this apply. Nothing was written.',
        needsFullAccess: false,
      }
    default:
      return {
        ...base,
        code,
        title: 'Apply blocked',
        detail:
          blockedReason ||
          serverMessage ||
          (input.status ? `Apply failed with status ${input.status}.` : 'Apply was rejected. Nothing was written.'),
        needsFullAccess: false,
      }
  }
}

export function formatApplyPreflightBanner(copy: ApplyPreflightUserCopy): string {
  const receipt = copy.receiptHint ? ` (${copy.receiptHint})` : ''
  return `${copy.title}: ${copy.detail}${receipt}`
}
