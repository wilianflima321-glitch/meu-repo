/**
 * Onda N — Quantitative Finance honesty probe (Vanguard Quant).
 * Fail-closed: never claim HFT / investment-grade readiness without wired modules.
 * Distinct from admin finance aggregates (Block 6G) and Hub Coins (HELD).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { ONNX_FIXTURE_HONESTY_WIRED } from '@/lib/native-gen/onnx-fixture-honesty'

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

export type QuantFinanceHonestyReport = {
  letter: typeof QUANT_FINANCE_HONESTY_LETTER
  vanguardQuantReady: typeof VANGUARD_QUANT_READY
  investmentGrade: typeof QUANT_FINANCE_INVESTMENT_GRADE
  marketingAllowed: typeof QUANT_FINANCE_MARKETING_ALLOWED
  stamp: 'NOT_IMPLEMENTED' | 'HELD'
  heldReason: 'onda_n_zero_production_modules'
  wedgeConflict: string[]
  capabilities: QuantFinanceCapabilityRow[]
  reusableInfra: QuantFinanceCapabilityRow[]
  deadCodeWarnings: string[]
  notes: string[]
}

/** Static capability matrix — paths verified absent from production tree (2026-08-10). */
function buildQuantFinanceCapabilities(): QuantFinanceCapabilityRow[] {
  return [
    {
      id: 'domain-isolation-l14',
      specSection: '§5.1 / §13',
      label: 'Finance vs game project isolation (L.14 sealed vault)',
      status: 'PARTIAL',
      path: 'lib/production/multi-surface-context-pack.ts',
      note: 'Multi-surface context exists for IDE; no finance-specific vault or trading project type.',
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
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'Legacy PaperExchange in packages/aethel-cli-legacy is dead code — not wired.',
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
      status: 'NOT_IMPLEMENTED',
      path: null,
      note: 'Task evidence ledger covers AI patches — not trade lifecycle or MiFID-style audit.',
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
  const capabilities = buildQuantFinanceCapabilities()
  const reusableInfra = buildReusableInfra()

  const notImplemented = capabilities.filter((c) => c.status === 'NOT_IMPLEMENTED').length
  const wedgeConflict = [
    '24-month wedge prioritizes game creation DX + Hub + Creative Fusion — Onda N is post-ship Vanguard.',
    'Hub Aethel Coins (H.0 HELD) must not be conflated with exchange margin or strategy PnL.',
    'Law XVI CostGuard settles AI creative credits — not broker order notional or drawdown limits.',
    'Spec §9 anti-detection / §14 P2P mesh conflict with regulated broker ToS and securities law.',
  ]

  const notes = [
    `capabilities: ${capabilities.length} tracked; NOT_IMPLEMENTED=${notImplemented}.`,
    'Production tree has zero quant-finance modules under cloud-web-app/web/lib/**.',
    'Legacy packages/aethel-cli-legacy/.../trading/ is dead code — do not import.',
    `onnx fixture wired=${ONNX_FIXTURE_HONESTY_WIRED} — finance Mini-IA not started.`,
    'Investment-grade requires paper quarantine + audit trail + licensed market data — all HELD.',
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
    heldReason: 'onda_n_zero_production_modules',
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
