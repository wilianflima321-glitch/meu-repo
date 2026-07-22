import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import {
  probeKernelRustFoundationHonesty,
  makeKernelRustFoundationInjectEvidence,
  type KernelRustFoundationDesktopSoakEvidence,
} from '@/lib/kernel/kernel-rust-foundation-honesty'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger(
  'api/runtime/kernel-rust-foundation-honesty/route',
)

export const dynamic = 'force-dynamic'

/**
 * Letter dn — Kernel Rust foundation (dc–dm) web honesty report.
 * Letter do — `kernelRustFoundationWebWireReady` (Tauri wire exists; distinct from ready).
 * Letter eg — `kernelRustExtendedSurfaceDocumented` (dq–ef catalog; distinct from ready).
 * Query flags are explicit probes only; defaults fail-closed.
 * `inject=1` is for maturity/dev probes — production clients omit it.
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const parseBool = (key: string): boolean | undefined => {
    const v = sp.get(key)
    if (v === null) return undefined
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
    return undefined
  }

  const forceDisabled = parseBool('forceDisabled') === true
  const inject = parseBool('inject') === true

  let evidence: KernelRustFoundationDesktopSoakEvidence | undefined
  if (inject) {
    evidence = makeKernelRustFoundationInjectEvidence({
      notes: [
        'letter dn — API maturity inject=1 (not production desktop soak)',
      ],
    })
  }

  const report = probeKernelRustFoundationHonesty({
    evidence,
    forceDisabled,
  })

  log.info('kernel_rust_foundation_honesty_api', {
    letter: report.letter,
    kernelRustFoundationReady: report.kernelRustFoundationReady,
    kernelRustExtendedSurfaceDocumented:
      report.kernelRustExtendedSurfaceDocumented,
    stamp: report.stamp,
    heldReason: report.heldReason,
    evidenceSource: report.evidenceSource,
  })

  return NextResponse.json({
    mock: false,
    letter: 'dn',
    webWireLetter: 'do',
    extendedSurfaceLetter: 'eg',
    focus: 'kernel-rust-foundation-web-honesty-bridge',
    report,
  })
}
