/**
 * Block 5 — GAS binary IPC honesty.
 * Rust GAS exists under apps/studio-local but is not wired as 60Hz binary IPC to web play.
 * Do not claim production GAS IPC until desktop play path ships.
 * In-process GasWorld effect evidence lives in gas-ability-evidence.ts (PARTIAL; AAA HELD).
 */
export const GAS_IPC_SHIP_STATUS = 'HELD' as const

export const GAS_IPC_BADGE =
  'GAS binary IPC [HELD] — no 60Hz desktop play wire; web GasWorld is ECS-local only'

export function evaluateGasIpcHonesty(): {
  shipStatus: 'HELD'
  badge: string
  canClaim60HzBinaryIpc: false
  unrealGasAaaReady: false
  marketingAllowed: false
} {
  return {
    shipStatus: GAS_IPC_SHIP_STATUS,
    badge: GAS_IPC_BADGE,
    canClaim60HzBinaryIpc: false,
    unrealGasAaaReady: false,
    marketingAllowed: false,
  }
}
