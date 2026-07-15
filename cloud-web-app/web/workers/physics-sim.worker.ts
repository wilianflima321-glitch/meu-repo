/**
 * Law I — Physics simulation module Worker (letter bm).
 *
 * Consumes bk shared-transform SAB / fallback buffer via bindSharedTransforms.
 * Step path writes transforms + Atomics epoch — no structured-clone body map.
 */

import {
  handlePhysicsWorkerRequest,
  isPhysicsWorkerRequest,
  PhysicsWorkerSimState,
  type PhysicsWorkerResponse,
} from '../lib/runtime/physics-worker-protocol'

const state = new PhysicsWorkerSimState()

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data
  if (!isPhysicsWorkerRequest(data)) {
    const bad: PhysicsWorkerResponse = {
      type: 'error',
      id: typeof (data as { id?: string })?.id === 'string' ? (data as { id: string }).id : 'unknown',
      success: false,
      error: 'Invalid physics worker request',
    }
    self.postMessage(bad)
    return
  }

  const response = handlePhysicsWorkerRequest(state, data)
  self.postMessage(response)
}

self.postMessage({
  type: 'ready',
  id: 'init',
  success: true,
} satisfies PhysicsWorkerResponse)

export {}
