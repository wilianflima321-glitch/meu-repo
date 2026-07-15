/**
 * Letter cw — GPU Mass Entity Component System SoA buffers.
 * Agents as data matrices on GPU — no per-NPC JS Update scripts.
 * 100k claim remains HELD until soak proven at that scale.
 */

export const MASS_SOA_LETTER = 'cw' as const
export const MASS_SOA_WIRED = true as const

/** Stride: vec4 = xyz + pad/radius */
export const MASS_POS_STRIDE = 4 as const
export const MASS_VEL_STRIDE = 4 as const
/** state: 0 inactive, 1 idle, 2 seek, 3 combat-stub */
export const MASS_STATE_STRIDE = 1 as const

export interface MassAgentSoaBuffers {
  capacity: number
  count: number
  positions: Float32Array
  velocities: Float32Array
  states: Uint32Array
}

export function createMassAgentSoaBuffers(capacity: number): MassAgentSoaBuffers {
  const cap = Math.max(1, Math.floor(capacity))
  return {
    capacity: cap,
    count: 0,
    positions: new Float32Array(cap * MASS_POS_STRIDE),
    velocities: new Float32Array(cap * MASS_VEL_STRIDE),
    states: new Uint32Array(cap * MASS_STATE_STRIDE),
  }
}

export function spawnMassAgents(
  buffers: MassAgentSoaBuffers,
  agents: Array<{
    x: number
    y: number
    z: number
    vx?: number
    vy?: number
    vz?: number
    state?: number
  }>,
): number {
  let spawned = 0
  for (const a of agents) {
    if (buffers.count >= buffers.capacity) break
    const i = buffers.count
    const o = i * MASS_POS_STRIDE
    buffers.positions[o] = a.x
    buffers.positions[o + 1] = a.y
    buffers.positions[o + 2] = a.z
    buffers.positions[o + 3] = 0.5
    buffers.velocities[o] = a.vx ?? 0
    buffers.velocities[o + 1] = a.vy ?? 0
    buffers.velocities[o + 2] = a.vz ?? 0
    buffers.velocities[o + 3] = 0
    buffers.states[i] = a.state ?? 2
    buffers.count += 1
    spawned += 1
  }
  return spawned
}

/** Fill synthetic crowd for soak / budget tests (grid spawn). */
export function fillSyntheticMassCrowd(
  buffers: MassAgentSoaBuffers,
  count: number,
  opts?: { spacing?: number; state?: number },
): number {
  const spacing = opts?.spacing ?? 1.5
  const state = opts?.state ?? 2
  const n = Math.min(count, buffers.capacity)
  const agents: Array<{ x: number; y: number; z: number; state: number }> = []
  const side = Math.ceil(Math.sqrt(n))
  for (let i = 0; i < n; i++) {
    const gx = i % side
    const gz = Math.floor(i / side)
    agents.push({
      x: (gx - side / 2) * spacing,
      y: 0,
      z: (gz - side / 2) * spacing,
      state,
    })
  }
  buffers.count = 0
  return spawnMassAgents(buffers, agents)
}
