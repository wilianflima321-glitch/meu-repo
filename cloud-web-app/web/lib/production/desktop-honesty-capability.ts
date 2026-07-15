/**
 * Block 9 — Desktop / PTY path honesty.
 * Never market cloud-container node-pty as the user's local machine shell.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('desktop-honesty-capability')

export type DesktopCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'HELD' | 'NOT_IMPLEMENTED'

export type PtyPathKind =
  | 'desktop-native-portable-pty'
  | 'cloud-container-node-pty'
  | 'unknown'

export interface PtyPathReport {
  path: PtyPathKind
  status: DesktopCapabilityStatus
  label: string
  badge: string
  notes: string[]
  isUserLocalMachine: boolean
  heldReason?: string
}

export interface DesktopHonestyReport {
  generatedAt: string
  activePty: PtyPathReport
  desktopNativePty: PtyPathReport
  cloudContainerPty: PtyPathReport
  fsWatch: {
    status: DesktopCapabilityStatus
    emitsToUi: boolean
    latencyBudgetMs: 500
    latencyEvidenceStatus: 'measured' | 'held'
    notes: string[]
  }
  sidecarAi: {
    status: DesktopCapabilityStatus
    notes: string[]
  }
  electronTemplates: {
    status: 'quarantined'
    shipPath: false
    notes: string[]
  }
  marketingLocalShellAllowed: boolean
  claim: string
  productCopy: string
  badgeLabel: string
}

export interface DesktopHonestyInput {
  /** Running inside Tauri WebView with portable-pty bridge. */
  desktopNativeBridgePresent?: boolean
  /** Web IDE terminal backed by server node-pty / child_process. */
  cloudContainerPtyActive?: boolean
  /** fs_watch emits to WebView (DESK-003). */
  fsWatchEmitsToUi?: boolean
  /** Measured p95 fs_watch→UI latency in ms (omit = no evidence). */
  fsWatchLatencyP95Ms?: number | null
  /** Sidecar ONNX/AI health probe succeeded. */
  sidecarAiHealthOk?: boolean
}

function detectDesktopBridge(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window
}

/**
 * Produce an honest desktop/PTY capability report for terminal chrome + Critic gates.
 */
export function evaluateDesktopHonesty(input: DesktopHonestyInput = {}): DesktopHonestyReport {
  const desktopBridge =
    input.desktopNativeBridgePresent ?? detectDesktopBridge()
  const cloudActive =
    input.cloudContainerPtyActive ?? !desktopBridge
  const fsEmits = input.fsWatchEmitsToUi !== false
  const latencyMs = input.fsWatchLatencyP95Ms
  const latencyMeasured =
    typeof latencyMs === 'number' && Number.isFinite(latencyMs) && latencyMs >= 0
  const latencyUnderBudget = latencyMeasured && (latencyMs as number) < 500
  const sidecarOk = input.sidecarAiHealthOk === true

  const desktopNativePty: PtyPathReport = desktopBridge
    ? {
        path: 'desktop-native-portable-pty',
        status: 'IMPLEMENTED',
        label: 'Studio Local portable-pty',
        badge: 'Local shell · desktop PTY',
        notes: [
          'Tauri `terminal_create` spawns portable-pty (PowerShell/bash) on the user machine',
          'Evidence: apps/studio-local/src-tauri/src/desktop_commands.rs',
        ],
        isUserLocalMachine: true,
      }
    : {
        path: 'desktop-native-portable-pty',
        status: 'HELD',
        label: 'Studio Local portable-pty',
        badge: '[HELD] desktop PTY',
        notes: [
          'Desktop bridge not present in this runtime — open Studio Local for true local shell',
        ],
        isUserLocalMachine: false,
        heldReason: 'desktop_bridge_absent',
      }

  const cloudContainerPty: PtyPathReport = {
    path: 'cloud-container-node-pty',
    status: cloudActive || !desktopBridge ? 'IMPLEMENTED' : 'PARTIAL',
    label: 'Cloud / server node-pty',
    badge: 'Cloud container shell · not your PC',
    notes: [
      'Web terminal WS → node-pty / child_process runs on the Node host (cloud container or local Next), not the user OS',
      'DEBT-TERM-001 — never label this as local machine shell',
    ],
    isUserLocalMachine: false,
    heldReason: desktopBridge ? undefined : 'cloud_path_active',
  }

  const activePty: PtyPathReport = desktopBridge ? desktopNativePty : cloudContainerPty

  const fsWatch = {
    status: (fsEmits
      ? latencyUnderBudget
        ? 'IMPLEMENTED'
        : latencyMeasured
          ? 'PARTIAL'
          : 'PARTIAL'
      : 'HELD') as DesktopCapabilityStatus,
    emitsToUi: fsEmits,
    latencyBudgetMs: 500 as const,
    latencyEvidenceStatus: (latencyMeasured ? 'measured' : 'held') as 'measured' | 'held',
    notes: fsEmits
      ? [
          'Native notify watcher emits `fs_event` to WebView (DESK-003 emit path live)',
          latencyMeasured
            ? `Measured p95=${latencyMs}ms (budget <500ms)${latencyUnderBudget ? '' : ' — over budget'}`
            : 'Latency <500ms evidence [HELD] — use measureFsWatchLatencySample helper',
        ]
      : ['fs_watch emit to UI not confirmed'],
  }

  const sidecarAi = {
    status: (sidecarOk ? 'PARTIAL' : 'HELD') as DesktopCapabilityStatus,
    notes: sidecarOk
      ? ['Sidecar AI health probe returned ok — inference still governed by SIDECAR-001']
      : [
          'Local ONNX / ai_complete remains provider_unavailable until approved sidecar (DESK-004 / SIDECAR-001)',
        ],
  }

  const marketingLocalShellAllowed = activePty.isUserLocalMachine === true
  const claim = marketingLocalShellAllowed
    ? 'Desktop local shell via portable-pty'
    : 'Terminal = cloud-container PTY — local desktop shell [HELD] until Studio Local bridge'
  const productCopy = marketingLocalShellAllowed
    ? 'Shell runs on this machine through Studio Local portable-pty.'
    : 'This IDE terminal runs in the cloud/server container (node-pty). It is not your local OS shell. Open Studio Local for a true desktop PTY.'
  const badgeLabel = marketingLocalShellAllowed
    ? 'Local · desktop PTY'
    : '[HELD] local · cloud container shell'

  log.info('desktop_honesty_evaluated', {
    path: activePty.path,
    marketingLocalShellAllowed,
    fsLatency: fsWatch.latencyEvidenceStatus,
  })

  return {
    generatedAt: new Date().toISOString(),
    activePty,
    desktopNativePty,
    cloudContainerPty,
    fsWatch,
    sidecarAi,
    electronTemplates: {
      status: 'quarantined',
      shipPath: false,
      notes: [
        'runtime-templates/ Electron channel is quarantined — sole ship path is apps/studio-local/ (Tauri 2)',
      ],
    },
    marketingLocalShellAllowed,
    claim,
    productCopy,
    badgeLabel,
  }
}
