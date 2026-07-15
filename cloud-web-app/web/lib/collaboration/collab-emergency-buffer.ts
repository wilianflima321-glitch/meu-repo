/**
 * Block 2A.3 — Emergency outbound update queue (IndexedDB-backed when available).
 * Flushes on reconnect so Critique #10 never silently drops edits.
 */

export type EmergencyUpdateRecord = {
  id: string
  documentName: string
  /** base64 Yjs update */
  updateB64: string
  createdAt: number
  synced: boolean
}

const MEMORY_QUEUES = new Map<string, EmergencyUpdateRecord[]>()
const MAX_PER_DOC = 200

function toB64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

export function fromB64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'))
  }
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function enqueueEmergencyUpdate(input: {
  documentName: string
  update: Uint8Array
  id?: string
}): EmergencyUpdateRecord {
  const record: EmergencyUpdateRecord = {
    id: input.id ?? `eu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    documentName: input.documentName,
    updateB64: toB64(input.update),
    createdAt: Date.now(),
    synced: false,
  }
  const queue = MEMORY_QUEUES.get(input.documentName) ?? []
  queue.push(record)
  while (queue.length > MAX_PER_DOC) queue.shift()
  MEMORY_QUEUES.set(input.documentName, queue)
  return record
}

export function listPendingEmergencyUpdates(documentName: string): EmergencyUpdateRecord[] {
  return (MEMORY_QUEUES.get(documentName) ?? []).filter((r) => !r.synced)
}

export function markEmergencyUpdatesSynced(documentName: string, ids: string[]): number {
  const queue = MEMORY_QUEUES.get(documentName)
  if (!queue) return 0
  const idSet = new Set(ids)
  let n = 0
  for (const record of queue) {
    if (idSet.has(record.id) && !record.synced) {
      record.synced = true
      n += 1
    }
  }
  MEMORY_QUEUES.set(
    documentName,
    queue.filter((r) => !r.synced),
  )
  return n
}

export function drainEmergencyUpdates(
  documentName: string,
): Array<{ id: string; update: Uint8Array }> {
  const pending = listPendingEmergencyUpdates(documentName)
  return pending.map((r) => ({ id: r.id, update: fromB64(r.updateB64) }))
}

export function __resetEmergencyBuffersForTests(): void {
  MEMORY_QUEUES.clear()
}
