/**
 * Letter dp — Studio IDE Kernel Rust foundation honesty badge model.
 * Letter eg — optional extended-surface chip (`kernelRustExtendedSurfaceDocumented`).
 *
 * Surfaces letter do wire vs letter dn ready (fail-closed). Does not invent green.
 * Calls do Tauri sync + dn probe; Zero-UI when probe unavailable.
 */

import {
  probeKernelRustFoundationHonesty,
  type KernelRustFoundationHonestyReport,
} from '@/lib/kernel/kernel-rust-foundation-honesty'
import {
  syncKernelRustFoundationDesktopSoakFromTauri,
  type TauriInvokeFn,
} from '@/lib/kernel/kernel-rust-foundation-tauri-bridge'

export const KERNEL_RUST_FOUNDATION_STUDIO_BADGE_LETTER = 'dp' as const
export const KERNEL_RUST_FOUNDATION_STUDIO_BADGE_WIRED = true as const

export type KernelRustFoundationStudioBadgeChipTone = 'success' | 'info' | 'warning'

export interface KernelRustFoundationStudioBadgeChip {
  id: 'wire' | 'ready' | 'extended'
  label: string
  tone: KernelRustFoundationStudioBadgeChipTone
  title: string
}

export interface KernelRustFoundationStudioBadgeModel {
  letter: typeof KERNEL_RUST_FOUNDATION_STUDIO_BADGE_LETTER
  /** False → component renders null (Zero-UI). */
  show: boolean
  kernelRustFoundationWebWireReady: boolean
  kernelRustFoundationReady: boolean
  kernelRustExtendedSurfaceDocumented: boolean
  stamp: 'IMPLEMENTED' | 'HELD'
  evidenceSource: KernelRustFoundationHonestyReport['evidenceSource']
  heldReason?: KernelRustFoundationHonestyReport['heldReason']
  chips: KernelRustFoundationStudioBadgeChip[]
  productLabel: string
  title: string
}

/**
 * Build Studio-visible chip model from a dn honesty report.
 * Wire chip reflects do `kernelRustFoundationWebWireReady`; ready stays HELD until soak.
 * Extended chip (eg) reflects dq–ef catalog docs — distinct from ready.
 */
export function buildKernelRustFoundationHonestyBadgeModel(
  report: KernelRustFoundationHonestyReport,
): KernelRustFoundationStudioBadgeModel {
  const wireReady = report.kernelRustFoundationWebWireReady === true
  const foundationReady = report.kernelRustFoundationReady === true
  const extendedDocumented =
    report.kernelRustExtendedSurfaceDocumented === true

  const wireChip: KernelRustFoundationStudioBadgeChip = wireReady
    ? {
        id: 'wire',
        label: 'Wire live',
        tone: 'info',
        title:
          'letter do — kernelRustFoundationWebWireReady (Tauri IPC wire exists; distinct from ready)',
      }
    : {
        id: 'wire',
        label: 'Wire [HELD]',
        tone: 'warning',
        title: 'letter do — Tauri↔web kernel soak wire unavailable',
      }

  const readyChip: KernelRustFoundationStudioBadgeChip = foundationReady
    ? {
        id: 'ready',
        label: 'Ready',
        tone: 'success',
        title:
          'letter dn — kernelRustFoundationReady IMPLEMENTED (desktop soak evidence + dc–dm gates)',
      }
    : {
        id: 'ready',
        label: 'Ready [HELD]',
        tone: 'warning',
        title:
          report.heldReason === 'kernel_rust_foundation_no_desktop_soak_evidence'
            ? 'letter dn — fail-closed without proven desktop soak evidence (plain browser / no Tauri host)'
            : 'letter dn — kernelRustFoundationReady HELD until soak gates proven',
      }

  const extendedChip: KernelRustFoundationStudioBadgeChip = extendedDocumented
    ? {
        id: 'extended',
        label: 'dq–ef catalog',
        tone: 'info',
        title:
          'letter eg — kernelRustExtendedSurfaceDocumented (dq–ef probe names cataloged; distinct from ready)',
      }
    : {
        id: 'extended',
        label: 'dq–ef [HELD]',
        tone: 'warning',
        title: 'letter eg — extended surface catalog incomplete',
      }

  return {
    letter: KERNEL_RUST_FOUNDATION_STUDIO_BADGE_LETTER,
    show: true,
    kernelRustFoundationWebWireReady: wireReady,
    kernelRustFoundationReady: foundationReady,
    kernelRustExtendedSurfaceDocumented: extendedDocumented,
    stamp: report.stamp,
    evidenceSource: report.evidenceSource,
    heldReason: report.heldReason,
    chips: [wireChip, readyChip, extendedChip],
    productLabel: foundationReady
      ? 'dc–dm soak proven · Studio Local'
      : extendedDocumented
        ? 'Wire ≠ ready · dq–ef cataloged'
        : 'Wire ≠ ready · soak HELD',
    title: foundationReady
      ? 'Kernel Rust foundation ready — desktop soak evidence proven'
      : extendedDocumented
        ? 'Kernel Rust foundation: Tauri wire live; dq–ef catalog documented; ready HELD without live soak evidence'
        : 'Kernel Rust foundation: Tauri wire live; ready HELD without live soak evidence',
  }
}

/** Zero-UI sentinel when sync/probe cannot run. */
export function kernelRustFoundationHonestyBadgeUnavailable(): KernelRustFoundationStudioBadgeModel {
  return {
    letter: KERNEL_RUST_FOUNDATION_STUDIO_BADGE_LETTER,
    show: false,
    kernelRustFoundationWebWireReady: false,
    kernelRustFoundationReady: false,
    kernelRustExtendedSurfaceDocumented: false,
    stamp: 'HELD',
    evidenceSource: 'none',
    chips: [],
    productLabel: '',
    title: 'Kernel Rust foundation honesty unavailable',
  }
}

/**
 * Sync do Tauri bridge (fail-closed plain browser) then build badge from dn probe.
 * Never invents green — ready flips only when do sync accepts proven soak evidence.
 */
export async function resolveKernelRustFoundationStudioBadge(options?: {
  invoke?: TauriInvokeFn
  forceInvoke?: boolean
}): Promise<KernelRustFoundationStudioBadgeModel> {
  try {
    await syncKernelRustFoundationDesktopSoakFromTauri({
      invoke: options?.invoke,
      forceInvoke: options?.forceInvoke,
    })
    const report = probeKernelRustFoundationHonesty()
    return buildKernelRustFoundationHonestyBadgeModel(report)
  } catch {
    return kernelRustFoundationHonestyBadgeUnavailable()
  }
}
