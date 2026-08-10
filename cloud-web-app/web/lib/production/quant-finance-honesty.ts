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
  id: 'N1' | 'N2' | 'N3'
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
  ]
}

/** Static capability matrix — paths verified absent from production tree (2026-08-10). */
function buildQuantFinanceCapabilities(ondaNCores: OndaNCoreReadiness[]): QuantFinanceCapabilityRow[] {
  const n1 = ondaNCores.find((c) => c.id === 'N1')
  const n2 = ondaNCores.find((c) => c.id === 'N2')
  const n3 = ondaNCores.find((c) => c.id === 'N3')

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
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'No WebSocket/FIX market-data bridge in cloud-web-app or studio-local.',
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
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'Agent high-risk firewall blocks trading text; no numeric risk kernel.',
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
      specSection: '§20 / §22',
      label: 'Investment-grade audit trail (orders, fills, clock drift)',
      status: n3?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n3?.path ?? null,
      note: n3?.note ?? 'Task evidence ledger covers AI patches — not trade lifecycle or MiFID-style audit.',
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
      path: 'lib/netcode/deterministic-rollback-replay.ts',
      note: 'Game netcode determinism — not portfolio or backtest replay.',
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
  const capabilities = buildQuantFinanceCapabilities(ondaNCores)
  const reusableInfra = buildReusableInfra()

  const notImplemented = capabilities.filter((c) => c.status === 'NOT_IMPLEMENTED').length
  const p0Ready = ondaNCores.filter((c) => c.ready).length
  const wedgeConflict = [
    '24-month wedge prioritizes game creation DX + Hub + Creative Fusion — Onda N is post-ship Vanguard.',
    'Hub Aethel Coins (H.0 HELD) must not be conflated with exchange margin or strategy PnL.',
    'Law XVI CostGuard settles AI creative credits — not broker order notional or drawdown limits.',
    'Spec §9 anti-detection / §14 P2P mesh conflict with regulated broker ToS and securities law.',
  ]

  const notes = [
    `capabilities: ${capabilities.length} tracked; NOT_IMPLEMENTED=${notImplemented}.`,
    `onda N P0 cores ready=${p0Ready}/3 (N1 vault isolation, N2 paper quarantine, N3 trade audit).`,
    'N1–N3 are TypeScript fail-closed cores only — no FIX broker, L2 feed, or Rust risk kernel.',
    'Legacy packages/aethel-cli-legacy/.../trading/ is dead code — do not import.',
    `onnx fixture wired=${ONNX_FIXTURE_HONESTY_WIRED} — finance Mini-IA not started.`,
    'Investment-grade requires N2+N3+N5 paper soak + licensed market data + legal sign-off — HELD.',
  ]

  log.info('quant_finance_honesty_probed', {
    vanguardQuantReady: VANGUARD_QUANT_READY,
    notImplemented,
    stamp: 'HELD',
  })

  return {
    letter: QUANT_FINANCE_HONESTY_LETTER,
    vanguardQuantReady: VANGUARD_QUANT_READY,
    investmentGrade: QUANT_FINANCE_INVESTMENT_GRADE,
    marketingAllowed: QUANT_FINANCE_MARKETING_ALLOWED,
    stamp: 'HELD',
    heldReason: 'onda_n_p0_cores_partial_no_investment_grade',
    ondaNCores,
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
