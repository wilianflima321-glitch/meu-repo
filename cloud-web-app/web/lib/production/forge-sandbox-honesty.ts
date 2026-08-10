/**
 * L.1 / runtime-provision — Forge sandbox + Firecracker microVM honesty probe.
 * Fail-closed: never claim Firecracker/KVM ready without binary host integration.
 * Distinct from e2b env-gated path and local-isolated (real today).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  describeForgeSandboxNetworkHonesty,
  resolveForgeSandboxAvailability,
  type ForgeSandboxProvider,
} from '@/lib/production/forge-sandbox-executor'

const log = createComponentLogger('forge-sandbox-honesty')

export const FIRECRACKER_MICROVM_READY = false as const
export const RUNTIME_PROVISION_FIRECRACKER_SUPPORTED = false as const

export type ForgeSandboxProviderHonesty = {
  provider: ForgeSandboxProvider
  available: boolean
  reason: string
  kernelLevelIsolation: boolean
  mechanism: string
}

export type ForgeSandboxHonestyReport = {
  /** Always false — no Firecracker binary/API in this repo. */
  firecrackerMicroVmReady: typeof FIRECRACKER_MICROVM_READY
  /** Runtime-provision route does not ship Firecracker provisioning. */
  runtimeProvisionFirecrackerSupported: typeof RUNTIME_PROVISION_FIRECRACKER_SUPPORTED
  localIsolatedReady: boolean
  e2bModuleLoadable: boolean
  e2bApiKeyConfigured: boolean
  e2bReady: boolean
  autoSelectedProvider: ForgeSandboxProvider
  providers: ForgeSandboxProviderHonesty[]
  marketingAllowed: false
  stamp: 'PARTIAL' | 'HELD'
  heldReason?: 'firecracker_not_implemented' | 'e2b_env_gated'
  notes: string[]
}

function providerStamp(available: boolean): 'ready' | 'held' {
  return available ? 'ready' : 'held'
}

/**
 * Probe all Forge sandbox providers — async because e2b module load is real.
 */
export async function probeForgeSandboxHonesty(): Promise<ForgeSandboxHonestyReport> {
  const [localAvail, e2bAvail, firecrackerAvail, autoAvail] = await Promise.all([
    resolveForgeSandboxAvailability('local-isolated'),
    resolveForgeSandboxAvailability('e2b'),
    resolveForgeSandboxAvailability('firecracker'),
    resolveForgeSandboxAvailability(),
  ])

  const e2bApiKeyConfigured = String(process.env.E2B_API_KEY || '').trim().length > 0
  const e2bModuleLoadable = e2bAvail.reason !== 'e2b_module_load_failed'
  const e2bReady = e2bAvail.available === true

  const providers: ForgeSandboxProviderHonesty[] = [
    {
      provider: 'local-isolated',
      available: localAvail.available,
      reason: localAvail.reason,
      ...describeForgeSandboxNetworkHonesty('local-isolated'),
    },
    {
      provider: 'e2b',
      available: e2bAvail.available,
      reason: e2bAvail.reason,
      ...describeForgeSandboxNetworkHonesty('e2b'),
    },
    {
      provider: 'firecracker',
      available: firecrackerAvail.available,
      reason: firecrackerAvail.reason,
      ...describeForgeSandboxNetworkHonesty('firecracker'),
    },
  ]

  const notes: string[] = [
    'local-isolated: real allowlist + path confinement (no kernel network namespace).',
    'e2b: code path real; ready only when E2B_API_KEY + module load succeed.',
    'firecracker: HELD — Linux KVM host + Firecracker API not implemented in this repo.',
    'runtime-provision: managed providers are e2b | custom-endpoint | webcontainers only.',
  ]

  let heldReason: ForgeSandboxHonestyReport['heldReason']
  if (!firecrackerAvail.available) {
    heldReason = 'firecracker_not_implemented'
  } else if (!e2bReady) {
    heldReason = 'e2b_env_gated'
  }

  const stamp: ForgeSandboxHonestyReport['stamp'] =
    localAvail.available && !FIRECRACKER_MICROVM_READY ? 'PARTIAL' : 'HELD'

  log.info('forge_sandbox_honesty_probed', {
    local: providerStamp(localAvail.available),
    e2b: providerStamp(e2bReady),
    firecracker: 'held',
    auto: autoAvail.provider,
  })

  return {
    firecrackerMicroVmReady: FIRECRACKER_MICROVM_READY,
    runtimeProvisionFirecrackerSupported: RUNTIME_PROVISION_FIRECRACKER_SUPPORTED,
    localIsolatedReady: localAvail.available,
    e2bModuleLoadable,
    e2bApiKeyConfigured,
    e2bReady,
    autoSelectedProvider: autoAvail.provider,
    providers,
    marketingAllowed: false,
    stamp,
    heldReason,
    notes,
  }
}

/** Sync fail-closed constants for truth matrix / badges (no async e2b probe). */
export function describeForgeSandboxHonestySync(): Pick<
  ForgeSandboxHonestyReport,
  | 'firecrackerMicroVmReady'
  | 'runtimeProvisionFirecrackerSupported'
  | 'localIsolatedReady'
  | 'marketingAllowed'
> {
  return {
    firecrackerMicroVmReady: FIRECRACKER_MICROVM_READY,
    runtimeProvisionFirecrackerSupported: RUNTIME_PROVISION_FIRECRACKER_SUPPORTED,
    localIsolatedReady: true,
    marketingAllowed: false,
  }
}
