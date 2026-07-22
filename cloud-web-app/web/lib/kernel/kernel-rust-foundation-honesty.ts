/**
 * Letter dn — web/TS Kernel Rust foundation honesty bridge.
 * Letter do — Tauri IPC web wire deepen (`kernelRustFoundationWebWireReady`).
 * Letter eg — dq–ef extended surface catalog deepen (`kernelRustExtendedSurfaceDocumented`).
 *
 * Documents dc–dm + dq–ef Rust surfaces for product web. Fail-closed: does **not**
 * flip `kernelRustFoundationReady` without proven desktop soak evidence (Tauri IPC
 * path) or explicit Vitest inject. Extended catalog is documentation-only.
 * Distinct from cv/cw/cy mass/fracture probes.
 *
 * No invent Coins/Agones/Nanite/DLSS. J.11/J.12 STOPPED. Zero-MVP.
 */

import {
  KERNEL_RUST_EXTENDED_SURFACE,
  KERNEL_RUST_EXTENDED_SURFACE_DOCUMENTED,
  KERNEL_RUST_EXTENDED_SURFACE_LETTER,
  KERNEL_RUST_EXTENDED_SURFACE_LETTERS,
  KERNEL_RUST_FOUNDATION_SOAK_GATES,
  KERNEL_RUST_FOUNDATION_SURFACE,
  KERNEL_RUST_FOUNDATION_SURFACE_LETTERS,
  KERNEL_RUST_FOUNDATION_SURFACE_VERSION,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_READY,
  allKernelRustFoundationSoakGatesTrue,
  emptyKernelRustFoundationSoakGates,
  isKernelRustExtendedSurfaceDocumented,
  type KernelRustExtendedSurfaceEntry,
  type KernelRustExtendedSurfaceLetter,
  type KernelRustFoundationSoakGates,
  type KernelRustFoundationSurfaceEntry,
  type KernelRustFoundationSurfaceLetter,
} from '@/lib/kernel/kernel-rust-foundation-surface'

export const KERNEL_RUST_FOUNDATION_HONESTY_LETTER = 'dn' as const
export const KERNEL_RUST_FOUNDATION_HONESTY_WIRED = true as const
export const KERNEL_RUST_FOUNDATION_PRIOR_LETTERS =
  KERNEL_RUST_FOUNDATION_SURFACE_LETTERS

export {
  KERNEL_RUST_EXTENDED_SURFACE_DOCUMENTED,
  KERNEL_RUST_EXTENDED_SURFACE_LETTER,
  KERNEL_RUST_FOUNDATION_SURFACE_VERSION,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_READY,
  isKernelRustExtendedSurfaceDocumented,
}

export type KernelRustFoundationEvidenceSource =
  | 'none'
  | 'vitest-inject'
  | 'tauri-ipc'

export type KernelRustFoundationHeldReason =
  | 'kernel_rust_foundation_no_desktop_soak_evidence'
  | 'kernel_rust_foundation_soak_gates_incomplete'
  | 'kernel_rust_foundation_force_disabled'
  | 'kernel_rust_foundation_web_tauri_unavailable'

export interface KernelRustFoundationDesktopSoakEvidence {
  /** Explicit proof — Vitest inject or Tauri IPC bridge. Never invent from web alone. */
  proven: boolean
  source: KernelRustFoundationEvidenceSource
  gates: KernelRustFoundationSoakGates
  notes?: string[]
}

export interface KernelRustFoundationHonestyReport {
  letter: typeof KERNEL_RUST_FOUNDATION_HONESTY_LETTER
  /** Letter do — web/Tauri soak bridge (wire exists; distinct from ready). */
  webWireLetter: typeof KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER
  /** Letter eg — dq–ef catalog deepen letter. */
  extendedSurfaceLetter: typeof KERNEL_RUST_EXTENDED_SURFACE_LETTER
  wired: typeof KERNEL_RUST_FOUNDATION_HONESTY_WIRED
  priorLetters: readonly KernelRustFoundationSurfaceLetter[]
  extendedLetters: readonly KernelRustExtendedSurfaceLetter[]
  surface: readonly KernelRustFoundationSurfaceEntry[]
  /** dq–ef catalog entries (docs only — not soak evidence for ready). */
  extendedSurface: readonly KernelRustExtendedSurfaceEntry[]
  surfaceVersion: typeof KERNEL_RUST_FOUNDATION_SURFACE_VERSION
  /** Product gate — true only after desktop soak evidence + all soak gates. */
  kernelRustFoundationReady: boolean
  /**
   * Letter do — wire exists (TS bridge + Tauri probe cmds mapped).
   * Distinct from `kernelRustFoundationReady` (needs proven soak evidence).
   */
  kernelRustFoundationWebWireReady: typeof KERNEL_RUST_FOUNDATION_WEB_WIRE_READY
  /**
   * Letter eg — dq–ef probe names documented in web catalog.
   * Distinct from `kernelRustFoundationReady` (docs ≠ Tauri soak).
   */
  kernelRustExtendedSurfaceDocumented: boolean
  desktopSoakEvidenceProven: boolean
  evidenceSource: KernelRustFoundationEvidenceSource
  soakGates: KernelRustFoundationSoakGates
  /** Always false here — cv/cw/cy stay their own probes. */
  gpuFractureReady: false
  gpuMassEcsReady: false
  fractureMassPlaytestReady: false
  mmapSabProductionReady: false
  avx512KernelReady: false
  chaosParityReady: false
  mass100kClaimReady: false
  coinsReady: false
  agonesReady: false
  naniteReady: false
  dlssReady: false
  zeroUiWhenUnavailable: true
  stamp: 'IMPLEMENTED' | 'HELD'
  heldReason?: KernelRustFoundationHeldReason
  notes: string[]
}

export interface ProbeKernelRustFoundationHonestyOptions {
  /** Injected desktop soak evidence (Vitest / Tauri bridge). */
  evidence?: KernelRustFoundationDesktopSoakEvidence | null
  /** Force HELD even if inject claims ready. */
  forceDisabled?: boolean
}

let cachedEvidence: KernelRustFoundationDesktopSoakEvidence | null = null

function defaultEvidence(): KernelRustFoundationDesktopSoakEvidence {
  return {
    proven: false,
    source: 'none',
    gates: emptyKernelRustFoundationSoakGates(),
    notes: [
      'letter dn — no desktop soak evidence in web env (Tauri IPC unavailable / unproven)',
    ],
  }
}

function resolveHeldReason(input: {
  forceDisabled: boolean
  evidence: KernelRustFoundationDesktopSoakEvidence
  gatesComplete: boolean
  ready: boolean
}): KernelRustFoundationHeldReason | undefined {
  if (input.ready) return undefined
  if (input.forceDisabled) return 'kernel_rust_foundation_force_disabled'
  if (!input.evidence.proven || input.evidence.source === 'none') {
    return 'kernel_rust_foundation_no_desktop_soak_evidence'
  }
  if (!input.gatesComplete) {
    return 'kernel_rust_foundation_soak_gates_incomplete'
  }
  return 'kernel_rust_foundation_web_tauri_unavailable'
}

/**
 * Accept proven desktop soak evidence (Vitest inject or Tauri IPC adapter).
 * Production web must not call this without a real soak bridge.
 */
export function acceptKernelRustFoundationDesktopSoakEvidence(
  evidence: KernelRustFoundationDesktopSoakEvidence,
): void {
  if (
    evidence.proven === true &&
    (evidence.source === 'vitest-inject' || evidence.source === 'tauri-ipc') &&
    allKernelRustFoundationSoakGatesTrue(evidence.gates)
  ) {
    cachedEvidence = {
      proven: true,
      source: evidence.source,
      gates: { ...evidence.gates },
      notes: evidence.notes ? [...evidence.notes] : [],
    }
  } else {
    cachedEvidence = {
      proven: false,
      source: evidence.source === 'none' ? 'none' : evidence.source,
      gates: { ...evidence.gates },
      notes: [
        ...(evidence.notes ?? []),
        'letter dn — evidence rejected (incomplete gates or unproven source)',
      ],
    }
  }
}

export function getKernelRustFoundationDesktopSoakEvidence(): KernelRustFoundationDesktopSoakEvidence {
  return cachedEvidence ? { ...cachedEvidence, gates: { ...cachedEvidence.gates } } : defaultEvidence()
}

export function getKernelRustFoundationReady(): boolean {
  return probeKernelRustFoundationHonesty().kernelRustFoundationReady
}

export function kernelRustFoundationReady(): boolean {
  return getKernelRustFoundationReady()
}

export function getKernelRustFoundationWebWireReady(): boolean {
  return KERNEL_RUST_FOUNDATION_WEB_WIRE_READY
}

export function getKernelRustExtendedSurfaceDocumented(): boolean {
  return isKernelRustExtendedSurfaceDocumented()
}

/**
 * Honesty probe for web Kernel Rust foundation bridge.
 * Fail-closed: missing desktop soak evidence ≠ ready.
 * Letter do `kernelRustFoundationWebWireReady` is true when the Tauri wire exists
 * (distinct from ready flip).
 * Letter eg `kernelRustExtendedSurfaceDocumented` is true when dq–ef catalog is
 * complete (distinct from ready flip — docs ≠ Tauri soak).
 * Distinct from cv/cw/cy library/playtest soaks.
 */
export function probeKernelRustFoundationHonesty(
  options: ProbeKernelRustFoundationHonestyOptions = {},
): KernelRustFoundationHonestyReport {
  const evidence =
    options.evidence ??
    cachedEvidence ??
    defaultEvidence()

  const gatesComplete = allKernelRustFoundationSoakGatesTrue(evidence.gates)
  const forceDisabled = options.forceDisabled === true
  const ready =
    !forceDisabled &&
    evidence.proven === true &&
    (evidence.source === 'vitest-inject' || evidence.source === 'tauri-ipc') &&
    gatesComplete

  const extendedDocumented = isKernelRustExtendedSurfaceDocumented()

  const heldReason = resolveHeldReason({
    forceDisabled,
    evidence,
    gatesComplete,
    ready,
  })

  const notes: string[] = [
    'letter dn — web/TS Kernel Rust foundation honesty bridge (documents dc–dm)',
    'letter do — Tauri IPC web wire (kernelRustFoundationWebWireReady; distinct from ready)',
    'letter eg — dq–ef extended surface catalog (kernelRustExtendedSurfaceDocumented; distinct from ready)',
    `letter eg — surfaceVersion ${KERNEL_RUST_FOUNDATION_SURFACE_VERSION}`,
    'letter dn — distinct from cv gpuFractureReady / cw gpuMassEcsReady / cy fractureMassPlaytestReady',
    'letter dn — Rust dc–dm CLOSED on kernel + studio-local Tauri; web does not invent green',
    'letter eg — Rust dq–ef CLOSED on kernel + studio-local Tauri; catalog docs only (not ready flip)',
    ...KERNEL_RUST_FOUNDATION_SURFACE.map(
      (e) =>
        `surface ${e.letter}: ${e.gate} — ${e.summary}`,
    ),
    ...KERNEL_RUST_EXTENDED_SURFACE.map(
      (e) =>
        `extended ${e.letter}: ${e.gate} — ${e.summary}`,
    ),
    ...(evidence.notes ?? []),
  ]

  if (!ready) {
    notes.push(
      'letter dn/do — kernelRustFoundationReady HELD (fail-closed without proven desktop soak evidence)',
    )
  } else {
    notes.push(
      'letter dn/do — kernelRustFoundationReady IMPLEMENTED (desktop soak evidence + dc–dm soak gates proven)',
    )
  }

  if (extendedDocumented) {
    notes.push(
      'letter eg — kernelRustExtendedSurfaceDocumented CLOSED (dq–ef probe names cataloged; ready unchanged)',
    )
  } else {
    notes.push(
      'letter eg — kernelRustExtendedSurfaceDocumented HELD (catalog incomplete)',
    )
  }

  notes.push(
    'mmap/SAB production / AVX-512 / Chaos / 100k / ~140 wave stubs HELD',
    'Coins / Agones / Nanite / DLSS HELD',
    'Zero-UI when Tauri / desktop soak unavailable',
  )

  return {
    letter: KERNEL_RUST_FOUNDATION_HONESTY_LETTER,
    webWireLetter: KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER,
    extendedSurfaceLetter: KERNEL_RUST_EXTENDED_SURFACE_LETTER,
    wired: KERNEL_RUST_FOUNDATION_HONESTY_WIRED,
    priorLetters: KERNEL_RUST_FOUNDATION_PRIOR_LETTERS,
    extendedLetters: KERNEL_RUST_EXTENDED_SURFACE_LETTERS,
    surface: KERNEL_RUST_FOUNDATION_SURFACE,
    extendedSurface: KERNEL_RUST_EXTENDED_SURFACE,
    surfaceVersion: KERNEL_RUST_FOUNDATION_SURFACE_VERSION,
    kernelRustFoundationReady: ready,
    kernelRustFoundationWebWireReady: KERNEL_RUST_FOUNDATION_WEB_WIRE_READY,
    kernelRustExtendedSurfaceDocumented: extendedDocumented,
    desktopSoakEvidenceProven: evidence.proven === true,
    evidenceSource: evidence.source,
    soakGates: { ...evidence.gates },
    gpuFractureReady: false,
    gpuMassEcsReady: false,
    fractureMassPlaytestReady: false,
    mmapSabProductionReady: false,
    avx512KernelReady: false,
    chaosParityReady: false,
    mass100kClaimReady: false,
    coinsReady: false,
    agonesReady: false,
    naniteReady: false,
    dlssReady: false,
    zeroUiWhenUnavailable: true,
    stamp: ready ? 'IMPLEMENTED' : 'HELD',
    heldReason,
    notes,
  }
}

/** Production fail-closed assertion: default env never flips ready. */
export function assertKernelRustFoundationFailClosedDefault(): {
  kernelRustFoundationReady: boolean
  kernelRustFoundationWebWireReady: boolean
  stamp: 'HELD' | 'IMPLEMENTED'
  heldReason?: KernelRustFoundationHeldReason
} {
  const probe = probeKernelRustFoundationHonesty()
  return {
    kernelRustFoundationReady: probe.kernelRustFoundationReady,
    kernelRustFoundationWebWireReady: probe.kernelRustFoundationWebWireReady,
    stamp: probe.stamp,
    heldReason: probe.heldReason,
  }
}

/** Vitest helper — full dc–dm soak evidence inject (flip path only). */
export function makeKernelRustFoundationInjectEvidence(
  overrides?: Partial<KernelRustFoundationDesktopSoakEvidence>,
): KernelRustFoundationDesktopSoakEvidence {
  const gates = emptyKernelRustFoundationSoakGates()
  for (const k of KERNEL_RUST_FOUNDATION_SOAK_GATES) {
    gates[k] = true
  }
  return {
    proven: true,
    source: 'vitest-inject',
    gates,
    notes: ['letter dn — Vitest desktop soak evidence inject'],
    ...overrides,
    gates: overrides?.gates
      ? { ...gates, ...overrides.gates }
      : gates,
  }
}

/** Test helper — clear evidence cache between suites. */
export function resetKernelRustFoundationHonestyCache(): void {
  cachedEvidence = null
}

export function __resetKernelRustFoundationHonestyForTests(): void {
  resetKernelRustFoundationHonestyCache()
}
