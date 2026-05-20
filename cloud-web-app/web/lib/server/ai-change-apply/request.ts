import type { ApplyBody, ApplyChangeInput, ApplyExecutionMode } from './types'

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function asRawString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function getRequestedChanges(body: ApplyBody): ApplyChangeInput[] {
  if (Array.isArray(body.changes) && body.changes.length > 0) {
    return body.changes
  }
  return [body]
}

export function normalizeExecutionMode(value: unknown): ApplyExecutionMode {
  if (value === 'sandbox') return 'sandbox'
  return 'workspace'
}
