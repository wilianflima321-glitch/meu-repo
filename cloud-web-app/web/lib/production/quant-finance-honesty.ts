/**
 * Onda N — Quantitative Finance honesty probe (Vanguard Quant).
 * Fail-closed: never claim HFT / investment-grade readiness without wired modules.
 * Distinct from admin finance aggregates (Block 6G) and Hub Coins (HELD).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { ONNX_FIXTURE_HONESTY_WIRED } from '@/lib/native-gen/onnx-fixture-honesty'
import {
  assertFinanceDomainIsolated,
  createFinanceProjectVault,
  createGameProjectScope,
} from '@/lib/server/quant/finance-domain-vault'
import {
  DEFAULT_LIVE_ENABLED,
  attemptEnableLive,
  createPaperTradingKernel,
  createPaperTradingSession,
  createQuarantineGate,
} from '@/lib/server/quant/paper-trading-kernel'
import {
  createTradeAuditLedger,
  verifyTradeAuditChain,
} from '@/lib/server/quant/trade-audit-ledger'
import { probeMarketDataIngestReadiness } from '@/lib/server/quant/market-data-ingest'
import { probeRiskEnvelopeReadiness } from '@/lib/server/quant/risk-envelope'
import { probeNonCustodialReadiness } from '@/lib/server/quant/non-custodial-invariants'
import { probeEulaRiskAcceptanceReadiness } from '@/lib/server/quant/eula-risk-acceptance'
import { probeGpuPriorityMux } from '@/lib/server/quant/gpu-priority-mux'
import { probeShadowAuditTelemetryReadiness } from '@/lib/server/quant/shadow-audit-telemetry'
import { probeAcceptanceAttestationReadiness } from '@/lib/server/quant/acceptance-attestation-store'
import { probeSessionTapeReadiness } from '@/lib/production/unified-session-tape'
import { probeSignedWormReadiness } from '@/lib/production/signed-worm-evidence-store'

const log = createComponentLogger('quant-finance-honesty')

/** Product gate — true only after paper-quarantine + risk kernel + audit trail soak. */
export const VANGUARD_QUANT_READY = false as const
export const QUANT_FINANCE_MARKETING_ALLOWED = false as const
export const QUANT_FINANCE_INVESTMENT_GRADE = false as const

export const QUANT_FINANCE_HONESTY_LETTER = 'nf' as const

export type QuantFinanceCapabilityStatus =
  | 'NOT_IMPLEMENTED'
  | 'PARTIAL'
  | 'HELD'
  | 'CONFLICT'

export type QuantFinanceCapabilityRow = {
  id: string
  specSection: string
  label: string
  status: QuantFinanceCapabilityStatus
  path: string | null
  note: string
}

export type OndaNCoreReadiness = {
  id: 'N1' | 'N2' | 'N3' | 'N4' | 'N5'
  label: string
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  path: string
  ready: boolean
  note: string
}

export type SubstrateSfReadiness = {
  id: 'SF1' | 'SF2'
  label: string
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  path: string
  ready: boolean
  note: string
}

export type QuantFinanceHonestyReport = {
  letter: typeof QUANT_FINANCE_HONESTY_LETTER
  vanguardQuantReady: typeof VANGUARD_QUANT_READY
  investmentGrade: typeof QUANT_FINANCE_INVESTMENT_GRADE
  marketingAllowed: typeof QUANT_FINANCE_MARKETING_ALLOWED
  stamp: 'NOT_IMPLEMENTED' | 'HELD'
  heldReason: 'onda_n_p0_cores_partial_no_investment_grade'
  ondaNCores: OndaNCoreReadiness[]
  substrateSf1: SubstrateSfReadiness
  substrateSf2: SubstrateSfReadiness
  section23: {
    nonCustodial: ReturnType<typeof probeNonCustodialReadiness>
    eulaAcceptance: ReturnType<typeof probeEulaRiskAcceptanceReadiness>
    gpuPriorityMux: ReturnType<typeof probeGpuPriorityMux>
    shadowAuditTelemetry: ReturnType<typeof probeShadowAuditTelemetryReadiness>
    acceptanceAttestation: ReturnType<typeof probeAcceptanceAttestationReadiness>
  }
  wedgeConflict: string[]
  capabilities: QuantFinanceCapabilityRow[]
  reusableInfra: QuantFinanceCapabilityRow[]
  deadCodeWarnings: string[]
  notes: string[]
}

function probeOndaNCores(): OndaNCoreReadiness[] {
  const n1Vault = createFinanceProjectVault({ projectId: 'probe-n1', strategyCapitalUsd: 1000 })
  const n1Game = createGameProjectScope('probe-n1')
  const n1Isolated = assertFinanceDomainIsolated(n1Vault, n1Game).ok

  const n2Session = createPaperTradingSession({ projectId: 'probe-n2', strategyId: 'probe-strat' })
  const n2Gate = createQuarantineGate('probe-strat')
  const n2LiveBlocked = !attemptEnableLive(n2Session, n2Gate).ok && n2Session.liveEnabled === DEFAULT_LIVE_ENABLED
  const n2Kernel = createPaperTradingKernel()
  const n2QuarantineWorks = n2Kernel.evaluateQuarantine('probe-strat', 5, 0.8).status === 'PASS'

  const n3Ledger = createTradeAuditLedger({ projectId: 'probe-n3' })
  const n3ChainValid = verifyTradeAuditChain(n3Ledger).valid

  const n4Probe = probeMarketDataIngestReadiness()
  const n4Ready = n4Probe.ready

  const n5Probe = probeRiskEnvelopeReadiness()
  const n5Ready = n5Probe.ready

  return [
    {
      id: 'N1',
      label: 'Finance domain + vault isolation',
      status: n1Isolated ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: 'lib/server/quant/finance-domain-vault.ts',
      ready: n1Isolated,
      note: n1Isolated
        ? 'Fail-closed vault type + capital pool gates wired; no Rust Blind Brain yet.'
        : 'Domain isolation probe failed.',
    },
    {
      id: 'N2',
      label: 'Paper-trading kernel + walk-forward quarantine',
      status: n2LiveBlocked && n2QuarantineWorks ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: 'lib/server/quant/paper-trading-kernel.ts',
      ready: n2LiveBlocked && n2QuarantineWorks,
      note: n2LiveBlocked
        ? 'live=false default; live enable blocked until quarantine PASS — no broker adapter.'
        : 'Quarantine gate probe failed.',
    },
    {
      id: 'N3',
      label: 'Trade audit ledger (intent → risk → paper/live)',
      status: n3ChainValid ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: 'lib/server/quant/trade-audit-ledger.ts',
      ready: n3ChainValid,
      note: n3ChainValid
        ? 'Append-only hash chain with clockDriftMs — distinct from AI task-evidence-ledger.'
        : 'Audit chain probe failed.',
    },
    {
      id: 'N4',
      label: 'Market-data ingest stub (read-only, Z-score outlier reject)',
      status: n4Ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: 'lib/server/quant/market-data-ingest.ts',
      ready: n4Ready,
      note: n4Ready
        ? 'Fail-closed without licensed feed; synthetic fixtures require explicit labels — no invented prices.'
        : 'Market ingest probe failed.',
    },
    {
      id: 'N5',
      label: 'Rust risk envelope (drawdown / leverage / kill-switch)',
      status: n5Ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n5Probe.rustPath,
      ready: n5Ready,
      note: n5Ready
        ? n5Probe.note
        : 'Risk envelope probe failed.',
    },
  ]
}

function probeSubstrateSf1(): SubstrateSfReadiness {
  const tape = probeSessionTapeReadiness()
  const ready = tape.ready && tape.chainValid
  return {
    id: 'SF1',
    label: 'Unified session tape (fixed-tick hash chain)',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    path: 'lib/production/unified-session-tape.ts',
    ready,
    note: ready
      ? `${tape.entryCount} entries @ ${tape.tickHz}Hz — sim + paper trade anchors; no full GameLoop wire.`
      : 'Session tape chain verify failed.',
  }
}

function probeSubstrateSf2(): SubstrateSfReadiness {
  const worm = probeSignedWormReadiness()
  return {
    id: 'SF2',
    label: 'Signed WORM evidence store (HMAC hash chain)',
    status: worm.status,
    path: worm.path,
    ready: worm.ready,
    note: worm.note,
  }
}

/** Static capability matrix — paths verified absent from production tree (2026-08-10). */
function buildQuantFinanceCapabilities(ondaNCores: OndaNCoreReadiness[]): QuantFinanceCapabilityRow[] {
  const n1 = ondaNCores.find((c) => c.id === 'N1')
  const n2 = ondaNCores.find((c) => c.id === 'N2')
  const n3 = ondaNCores.find((c) => c.id === 'N3')
  const n4 = ondaNCores.find((c) => c.id === 'N4')
  const n5 = ondaNCores.find((c) => c.id === 'N5')

  return [
    {
      id: 'domain-isolation-l14',
      specSection: '§5.1 / §13',
      label: 'Finance vs game project isolation (L.14 sealed vault)',
      status: n1?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n1?.path ?? null,
      note: n1?.note ?? 'No finance vault type.',
    },
    {
      id: 'market-data-feed',
      specSection: '§4 / §8 / §14',
      label: 'Level-2 order book + tick multiplex (SAB)',
      status: n4?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n4?.path ?? null,
      note: n4?.note ?? 'No WebSocket/FIX market-data bridge in cloud-web-app or studio-local.',
    },
    {
      id: 'order-execution-kernel',
      specSection: '§6 / §9 / §10',
      label: 'Rust headless order kernel (limit/FOK/iceberg/jitter)',
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'No order router, C2T counter, or exchange adapter in production Rust.',
    },
    {
      id: 'fix-protocol-bridge',
      specSection: '§7 / §9.D',
      label: 'Binary FIX / SBE exchange gateway',
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'Spec claims FIX; zero FIX parser or session manager in repo.',
    },
    {
      id: 'risk-limits-kernel',
      specSection: '§5 / §12 / §13.C',
      label: 'Max drawdown / leverage / kill-switch in kernel',
      status: n5?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n5?.path ?? null,
      note: n5?.note ?? 'Agent high-risk firewall blocks trading text; no numeric risk kernel.',
    },
    {
      id: 'paper-trading-quarantine',
      specSection: '§22.A',
      label: 'Paper-trading walk-forward quarantine gate',
      status: n2?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n2?.path ?? null,
      note: n2?.note ?? 'Legacy PaperExchange in packages/aethel-cli-legacy is dead code — not wired.',
    },
    {
      id: 'backtest-vector-index',
      specSection: '§4',
      label: '20yr pattern similarity backtest (<1ms claim)',
      status: 'PARTIAL',
      path: 'lib/server/vector-index/',
      note: 'J.4 vector index serves code/scene embeddings — not market OHLCV corpora.',
    },
    {
      id: 'mini-ia-onnx-finance',
      specSection: '§2.B / §11',
      label: 'Local finance ONNX + GPU tick ring buffer',
      status: 'HELD',
      path: 'lib/native-gen/onnx-ort-session.ts',
      note: 'ORT fixture honesty HELD for text-to-3d; no finance LoRA or tick ring in VRAM.',
    },
    {
      id: 'maestro-pulse-orchestration',
      specSection: '§2.A / §10',
      label: 'Maestro cloud pulse + veto protocol',
      status: 'PARTIAL',
      path: 'lib/production/maestro-delegation.ts',
      note: 'Creative Maestro/MoA exists; no finance pulse scheduler or VPIN veto wiring.',
    },
    {
      id: 'mathematical-evidence-report',
      specSection: '§20',
      label: 'Cap\'n Proto / zero-copy Mathematical Evidence Report',
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'No Cap\'n Proto schema or hot-loop evidence bus for quant signals.',
    },
    {
      id: 'blind-brain-key-vault',
      specSection: '§13',
      label: 'Blind Brain — AES-256 exchange key vault (Rust)',
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'BYOK stores LLM keys in browser; no exchange API secret vault in kernel.',
    },
    {
      id: 'p2p-market-data-mesh',
      specSection: '§14.B / §17.A',
      label: 'libp2p market-data mesh + ZK staking',
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'Red-team §17 marks P2P as unsafe; no libp2p market module exists.',
    },
    {
      id: 'regulatory-audit-trail',
      specSection: '§20 / §22 / §23',
      label: 'Investment-grade audit trail (orders, fills, clock drift)',
      status: n3?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n3?.path ?? null,
      note: n3?.note ?? 'Task evidence ledger covers AI patches — not trade lifecycle or MiFID-style audit.',
    },
    {
      id: 'non-custodial-invariants',
      specSection: '§23.B',
      label: 'Non-custodial — no exchange secret in platform DB',
      status: 'PARTIAL',
      path: 'lib/server/quant/non-custodial-invariants.ts',
      note: 'Fail-closed reject of raw secrets; Blind Brain vault still HELD.',
    },
    {
      id: 'eula-risk-acceptance',
      specSection: '§23.B/C',
      label: 'EULA exact-phrase risk acceptance + attestation hash',
      status: 'PARTIAL',
      path: 'lib/server/quant/eula-risk-acceptance.ts',
      note: 'Phrase gate + hash(phrase|hwid|account|ts); does not unlock live broker.',
    },
    {
      id: 'gpu-priority-mux',
      specSection: '§23.A',
      label: 'GPU Priority Mux (finance Ring-0 vs game Mini-IA)',
      status: 'HELD',
      path: 'lib/server/quant/gpu-priority-mux.ts',
      note: 'Honesty interface only — ORT/wgpu 50ms eviction unproven; hotSwapReady=false.',
    },
    {
      id: 'shadow-audit-consent',
      specSection: '§23.D',
      label: 'Consent-gated cloud shadow audit upload',
      status: 'PARTIAL',
      path: 'lib/server/quant/shadow-audit-telemetry.ts',
      note: 'Silent telemetry FORBIDDEN; consent≠true → upload fails; durable cloud WORM HELD.',
    },
  ]
}

function buildReusableInfra(): QuantFinanceCapabilityRow[] {
  return [
    {
      id: 'lockfree-tick-buffer',
      specSection: '§11.A',
      label: 'Lock-free ring buffer (game kernel fe)',
      status: 'PARTIAL',
      path: 'packages/aethel-kernel-rust/src/lockfree_ring_buffer.rs',
      note: 'SPSC ring exists for game intents — not wired to market ticks.',
    },
    {
      id: 'deterministic-sim',
      specSection: '§1',
      label: 'Deterministic fixed-point / rollback sim',
      status: 'PARTIAL',
      path: 'lib/production/unified-session-tape.ts',
      note: 'SF1 session tape records sim ticks + paper trades — not portfolio backtest replay.',
    },
    {
      id: 'high-risk-firewall',
      specSection: '§5 / §19',
      label: 'Agent investment/trading submit firewall',
      status: 'CONFLICT',
      path: 'lib/production/high-risk-action-firewall.ts',
      note: 'Blocks autonomous trade submit — aligns with veto doctrine but no execution path.',
    },
    {
      id: 'creative-cost-guard',
      specSection: 'Law XVI',
      label: 'CreativeCostGuard (AI credits)',
      status: 'CONFLICT',
      path: 'lib/production/creative-cost-guard.ts',
      note: 'Governs AI provider spend — not trading PnL, margin, or exchange fees.',
    },
  ]
}

/**
 * Probe Onda N / Vanguard Quant readiness — sync, no I/O.
 */
export function probeQuantFinanceHonesty(): QuantFinanceHonestyReport {
  const ondaNCores = probeOndaNCores()
  const substrateSf1 = probeSubstrateSf1()
  const substrateSf2 = probeSubstrateSf2()
  const capabilities = buildQuantFinanceCapabilities(ondaNCores)
  const reusableInfra = buildReusableInfra()
  const section23 = {
    nonCustodial: probeNonCustodialReadiness(),
    eulaAcceptance: probeEulaRiskAcceptanceReadiness(),
    gpuPriorityMux: probeGpuPriorityMux(),
    shadowAuditTelemetry: probeShadowAuditTelemetryReadiness(),
    acceptanceAttestation: probeAcceptanceAttestationReadiness(),
  }

  const notImplemented = capabilities.filter((c) => c.status === 'NOT_IMPLEMENTED').length
  const p0Ready = ondaNCores.filter((c) => c.ready).length
  const wedgeConflict = [
    '24-month wedge prioritizes game creation DX + Hub + Creative Fusion — Onda N is post-ship Vanguard.',
    'Hub Aethel Coins (H.0 HELD) must not be conflated with exchange margin or strategy PnL.',
    'Law XVI CostGuard settles AI creative credits — not broker order notional or drawdown limits.',
    'Spec §9 anti-detection / §14 P2P mesh conflict with regulated broker ToS and securities law.',
    '§23 silent shadow telemetry is GDPR/LGPD-illegal as default-ON — consent gate mandatory.',
    '§23 "empresa intocável" / untouchable-litigation claims are false — evidence ≠ legal invulnerability.',
    '§23 ~50ms invisible GPU hot-swap is unproven — mux reports HELD until ORT/wgpu eviction exists.',
  ]

  const notes = [
    `capabilities: ${capabilities.length} tracked; NOT_IMPLEMENTED=${notImplemented}.`,
    `onda N cores ready=${p0Ready}/5 (N1 vault, N2 paper quarantine, N3 trade audit, N4 ingest stub, N5 risk envelope).`,
    `SF1 session tape: ${substrateSf1.status} — ${substrateSf1.note}`,
    `SF2 signed WORM: ${substrateSf2.status} — ${substrateSf2.note}`,
    `§23 non-custodial: ${section23.nonCustodial.note}`,
    `§23 EULA: ${section23.eulaAcceptance.note}`,
    `§23 GPU mux: ${section23.gpuPriorityMux.note}`,
    `§23 shadow audit: ${section23.shadowAuditTelemetry.note}`,
    `§23 attestation store: ${section23.acceptanceAttestation.note}`,
    'N1–N5 fail-closed cores only — no FIX broker, licensed L2 feed, or live adapter.',
    'N5 Rust risk_envelope + web mirror — live trading hard-disabled; IPC probe_risk_envelope_cmd.',
    'Legacy packages/aethel-cli-legacy/.../trading/ is dead code — do not import.',
    `onnx fixture wired=${ONNX_FIXTURE_HONESTY_WIRED} — finance Mini-IA not started.`,
    'Investment-grade requires N2+N3+N5 paper soak + licensed market data + legal sign-off — HELD.',
  ]

  log.info('quant_finance_honesty_probed', {
    vanguardQuantReady: VANGUARD_QUANT_READY,
    notImplemented,
    stamp: 'HELD',
    gpuMuxReady: section23.gpuPriorityMux.hotSwapReady,
  })

  return {
    letter: QUANT_FINANCE_HONESTY_LETTER,
    vanguardQuantReady: VANGUARD_QUANT_READY,
    investmentGrade: QUANT_FINANCE_INVESTMENT_GRADE,
    marketingAllowed: QUANT_FINANCE_MARKETING_ALLOWED,
    stamp: 'HELD',
    heldReason: 'onda_n_p0_cores_partial_no_investment_grade',
    ondaNCores,
    substrateSf1,
    substrateSf2,
    section23,
    wedgeConflict,
    capabilities,
    reusableInfra,
    deadCodeWarnings: [
      'packages/aethel-cli-legacy/src/common/trading/core.ts — PaperExchange mock; not in @/ path.',
    ],
    notes,
  }
}

export function describeQuantFinanceHonestySync(): QuantFinanceHonestyReport {
  return probeQuantFinanceHonesty()
}
