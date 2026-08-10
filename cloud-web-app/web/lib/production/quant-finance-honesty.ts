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
  defaultPaperManusDualMode,
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
import { probeDualModeExecutionReadiness } from '@/lib/server/quant/dual-mode-execution'
import { probeTickSpscRingReadiness } from '@/lib/server/quant/tick-spsc-ring'
import { probeMarketPatternDomainReadiness } from '@/lib/server/quant/market-pattern-domain'
import { probeMaestroFinancePulseReadiness } from '@/lib/server/quant/maestro-finance-pulse'
import { probeMathematicalEvidenceReadiness } from '@/lib/server/quant/mathematical-evidence'
import { probeQuantL14VaultPackReadiness } from '@/lib/server/quant/quant-l14-vault-pack'
import { probeHeadlessQuantRuntimeReadiness } from '@/lib/server/quant/headless-quant-runtime'
import { probeBlindBrainVaultReadiness } from '@/lib/server/quant/blind-brain-vault'
import { probeFinanceOnnxReadiness } from '@/lib/server/quant/finance-onnx-session'
import { probeFixGatewaySpikeReadiness } from '@/lib/server/quant/fix-gateway-spike'
import { probeSessionTapeReadiness } from '@/lib/production/unified-session-tape'
import { probeSignedWormReadiness } from '@/lib/production/signed-worm-evidence-store'
import { probeMonotonicTimebaseReadiness } from '@/lib/production/monotonic-timebase'

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
  id: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6' | 'N7' | 'N8' | 'N9'
  label: string
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  path: string
  ready: boolean
  note: string
}

export type SubstrateSfReadiness = {
  id: 'SF1' | 'SF2' | 'SF3' | 'SF4' | 'SF5' | 'SF6' | 'SF7'
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
  substrateSf3: SubstrateSfReadiness
  substrateSf4: SubstrateSfReadiness
  substrateSf5: SubstrateSfReadiness
  substrateSf6: SubstrateSfReadiness
  substrateSf7: SubstrateSfReadiness
  section23: {
    nonCustodial: ReturnType<typeof probeNonCustodialReadiness>
    eulaAcceptance: ReturnType<typeof probeEulaRiskAcceptanceReadiness>
    gpuPriorityMux: ReturnType<typeof probeGpuPriorityMux>
    shadowAuditTelemetry: ReturnType<typeof probeShadowAuditTelemetryReadiness>
    acceptanceAttestation: ReturnType<typeof probeAcceptanceAttestationReadiness>
  }
  dualModeExecution: ReturnType<typeof probeDualModeExecutionReadiness>
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
  const dualOk = defaultPaperManusDualMode()
  const dualBlocked = defaultPaperManusDualMode({
    frequency: 'hft',
    chartTimeframeMinutes: 1,
  })
  const n2RiskPass = n2Kernel.submitPaper(
    n2Session,
    { symbol: 'PROBE', side: 'buy', quantity: 1, limitPrice: 10 },
    { notionalUsd: 10, leverageX100: 100, currentDrawdownBps: 0 },
    dualOk,
  )
  const n2RiskReject = n2Kernel.submitPaper(
    n2Session,
    { symbol: 'PROBE', side: 'buy', quantity: 1, limitPrice: 10 },
    { notionalUsd: 10, leverageX100: 9999, currentDrawdownBps: 0 },
    dualOk,
  )
  const n2MaestroReject = n2Kernel.submitPaper(
    n2Session,
    { symbol: 'PROBE', side: 'buy', quantity: 1, limitPrice: 10 },
    { notionalUsd: 10, leverageX100: 100, currentDrawdownBps: 0 },
    dualBlocked,
  )
  const n2LiveIntentReject = n2Kernel.submitLive(
    n2Session,
    { symbol: 'PROBE', side: 'buy', quantity: 1, limitPrice: 10 },
    { notionalUsd: 10, leverageX100: 100, currentDrawdownBps: 0 },
    dualOk,
  )
  const n2RiskWired =
    n2RiskPass.ok === true &&
    n2RiskReject.ok === false &&
    n2MaestroReject.ok === false &&
    n2LiveIntentReject.ok === false
  const n2Ready = n2LiveBlocked && n2QuarantineWorks && n2RiskWired

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
      status: n2Ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: 'lib/server/quant/paper-trading-kernel.ts',
      ready: n2Ready,
      note: n2Ready
        ? 'live=false default; submitPaper requires Maestro(mode+timeframe)+N5 evaluateRisk; live intent fail-closed; quarantine PASS + EULA before live policy; no broker.'
        : 'Quarantine, Maestro, or N5 risk wire probe failed.',
    },
    {
      id: 'N3',
      label: 'Trade audit ledger (intent → risk → paper/live)',
      status: n3ChainValid ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: 'lib/server/quant/trade-audit-ledger.ts',
      ready: n3ChainValid,
      note: n3ChainValid
        ? 'Append-only hash chain with clockDriftMs; optional SF2 WORM sink (cloud consent-gated).'
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
        ? `${n5Probe.note} Wired into paper kernel submitPaper.`
        : 'Risk envelope probe failed.',
    },
    (() => {
      const ring = probeTickSpscRingReadiness()
      const pattern = probeMarketPatternDomainReadiness()
      const ready = ring.ready && pattern.ready
      return {
        id: 'N6' as const,
        label: 'Tick SPSC ring + VectorIndex market-pattern domain',
        status: ready ? ('PARTIAL' as const) : ('NOT_IMPLEMENTED' as const),
        path: 'lib/server/quant/tick-spsc-ring.ts + market-pattern-domain.ts',
        ready,
        note: ready
          ? `${ring.note} ${pattern.note}`
          : 'N6 tick ring or market-pattern domain probe failed.',
      }
    })(),
    (() => {
      const pulse = probeMaestroFinancePulseReadiness()
      const math = probeMathematicalEvidenceReadiness()
      const ready = pulse.ready && math.ready
      return {
        id: 'N7' as const,
        label: 'Maestro finance pulse + Mathematical Evidence schema',
        status: ready ? ('PARTIAL' as const) : ('NOT_IMPLEMENTED' as const),
        path: 'lib/server/quant/maestro-finance-pulse.ts + mathematical-evidence.ts',
        ready,
        note: ready
          ? `${pulse.note} ${math.note}`
          : 'N7 Maestro pulse or math evidence probe failed.',
      }
    })(),
    (() => {
      const n8 = probeFinanceOnnxReadiness()
      return {
        id: 'N8' as const,
        label: 'Finance ONNX Mini-IA probe (fail-closed; no fake predictions)',
        status: n8.status,
        path: n8.path,
        ready: n8.ready,
        note: n8.note,
      }
    })(),
    (() => {
      const n9 = probeFixGatewaySpikeReadiness()
      return {
        id: 'N9' as const,
        label: 'FIX gateway spike (Logon/Heartbeat framing; no live orders)',
        status: n9.status,
        path: n9.path,
        ready: n9.ready,
        note: n9.note,
      }
    })(),
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

function probeSubstrateSf3(): SubstrateSfReadiness {
  const tb = probeMonotonicTimebaseReadiness()
  return {
    id: 'SF3',
    label: 'Monotonic timebase (sim tick vs wall; optional exchange hook)',
    status: tb.status,
    path: tb.path,
    ready: tb.ready,
    note: tb.note,
  }
}

function probeSubstrateSf4(): SubstrateSfReadiness {
  const sf4 = probeQuantL14VaultPackReadiness()
  return {
    id: 'SF4',
    label: 'Quant L.14 vault pack (finance vs game surface isolation)',
    status: sf4.status,
    path: sf4.path,
    ready: sf4.ready,
    note: sf4.note,
  }
}

function probeSubstrateSf5(): SubstrateSfReadiness {
  const sf5 = probeHeadlessQuantRuntimeReadiness()
  return {
    id: 'SF5',
    label: 'Headless quant runtime (ticks without UI; no FIX)',
    status: sf5.status,
    path: sf5.path,
    ready: sf5.ready,
    note: sf5.note,
  }
}

function probeSubstrateSf6(): SubstrateSfReadiness {
  const sf6 = probeBlindBrainVaultReadiness()
  return {
    id: 'SF6',
    label: 'Blind Brain AES vault (local wrap; HSM HELD)',
    status: sf6.status,
    path: sf6.path,
    ready: sf6.ready,
    note: sf6.note,
  }
}

function probeSubstrateSf7(): SubstrateSfReadiness {
  const sf7 = probeFixGatewaySpikeReadiness()
  return {
    id: 'SF7',
    label: 'Institutional FIX framing spike (no licensed L2 / C2T)',
    status: sf7.status,
    path: sf7.path,
    ready: sf7.ready,
    note: sf7.note,
  }
}

/** Static capability matrix — paths verified absent from production tree (2026-08-10). */
function buildQuantFinanceCapabilities(ondaNCores: OndaNCoreReadiness[]): QuantFinanceCapabilityRow[] {
  const n1 = ondaNCores.find((c) => c.id === 'N1')
  const n2 = ondaNCores.find((c) => c.id === 'N2')
  const n3 = ondaNCores.find((c) => c.id === 'N3')
  const n4 = ondaNCores.find((c) => c.id === 'N4')
  const n5 = ondaNCores.find((c) => c.id === 'N5')
  const n6 = ondaNCores.find((c) => c.id === 'N6')
  const n7 = ondaNCores.find((c) => c.id === 'N7')
  const n8 = ondaNCores.find((c) => c.id === 'N8')
  const n9 = ondaNCores.find((c) => c.id === 'N9')

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
      path: 'lib/server/quant/headless-quant-runtime.ts',
      note: 'SF5 headless tick probe exists; no FIX/order router, C2T, or exchange adapter in production Rust.',
    },
    {
      id: 'fix-protocol-bridge',
      specSection: '§7 / §9.D',
      label: 'Binary FIX / SBE exchange gateway',
      status: n9?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n9?.path ?? 'lib/server/quant/fix-gateway-spike.ts',
      note: n9?.ready
        ? 'N9/SF7 FIX 4.4 Logon/Heartbeat framing + checksum; fixGatewayReady=false; SBE/licensed L2/live orders HELD.'
        : 'Spec claims FIX; FIX gateway spike probe not ready.',
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
      status: n6?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n6?.path ?? 'lib/server/quant/market-pattern-domain.ts',
      note: n6?.ready
        ? 'market-pattern domain tag + local-hash OHLCV slices — not licensed 20yr/<1ms investment recall.'
        : 'J.4 market-pattern domain not ready.',
    },
    {
      id: 'mini-ia-onnx-finance',
      specSection: '§2.B / §11',
      label: 'Local finance ONNX + GPU tick ring buffer',
      status: n8?.ready ? 'PARTIAL' : 'HELD',
      path: n8?.path ?? 'lib/server/quant/finance-onnx-session.ts',
      note: n8?.note ?? 'ORT fixture honesty HELD for text-to-3d; no finance Mini-IA probe.',
    },
    {
      id: 'maestro-pulse-orchestration',
      specSection: '§2.A / §10',
      label: 'Maestro cloud pulse + veto protocol',
      status: n7?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: n7?.path ?? 'lib/server/quant/maestro-finance-pulse.ts',
      note: n7?.note ?? 'Creative Maestro/MoA exists; finance pulse not wired.',
    },
    {
      id: 'mathematical-evidence-report',
      specSection: '§20',
      label: 'Cap\'n Proto / zero-copy Mathematical Evidence Report',
      status: n7?.ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      path: 'lib/server/quant/mathematical-evidence.ts',
      note: n7?.ready
        ? 'JSON Mathematical Evidence schema + fingerprint; Cap\'n Proto / FlatBuffers zero-copy bus HELD.'
        : 'No Cap\'n Proto schema or hot-loop evidence bus for quant signals.',
    },
    {
      id: 'blind-brain-key-vault',
      specSection: '§13',
      label: 'Blind Brain — AES-256 exchange key vault (Rust)',
      status: 'PARTIAL',
      path: 'lib/server/quant/blind-brain-vault.ts',
      note: 'SF6 AES-256-GCM local wrap/unwrap + kill-switch; HSM/production custody HELD — not Rust HSM.',
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
      note: 'Fail-closed reject of raw secrets; Blind Brain AES vault PARTIAL (HSM HELD).',
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
    {
      id: 'dual-mode-vanguard-hft',
      specSection: '§ Dual-Mode Execution',
      label: 'Vanguard HFT API mode (local key + N2 + EULA; live HELD)',
      status: 'PARTIAL',
      path: 'lib/server/quant/dual-mode-execution.ts',
      note: 'Policy gates wired; liveBrokerReady=false; ms claims forbidden without colocation.',
    },
    {
      id: 'dual-mode-manus-rpa',
      specSection: '§ Dual-Mode Execution',
      label: 'Manus RPA browser mode (swing/position ≥15m; HFT blocked)',
      status: 'PARTIAL',
      path: 'lib/server/quant/dual-mode-execution.ts',
      note: 'Maestro auto-blocks HFT/scalping; live ORT/CV RPA HELD; Broker ToS risk user-borne.',
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
      path: 'lib/server/quant/tick-spsc-ring.ts',
      note: 'N6 web SPSC tick ring (fe pattern) + kernel fe game intents — licensed L2 SAB multiplex HELD.',
    },
    {
      id: 'deterministic-sim',
      specSection: '§1',
      label: 'Deterministic fixed-point / rollback sim',
      status: 'PARTIAL',
      path: 'lib/production/monotonic-timebase.ts',
      note: 'SF3 monotonic timebase isolates sim tick vs wall; SF1 tape records anchors — not portfolio backtest replay.',
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
  const substrateSf3 = probeSubstrateSf3()
  const substrateSf4 = probeSubstrateSf4()
  const substrateSf5 = probeSubstrateSf5()
  const substrateSf6 = probeSubstrateSf6()
  const substrateSf7 = probeSubstrateSf7()
  const capabilities = buildQuantFinanceCapabilities(ondaNCores)
  const reusableInfra = buildReusableInfra()
  const section23 = {
    nonCustodial: probeNonCustodialReadiness(),
    eulaAcceptance: probeEulaRiskAcceptanceReadiness(),
    gpuPriorityMux: probeGpuPriorityMux(),
    shadowAuditTelemetry: probeShadowAuditTelemetryReadiness(),
    acceptanceAttestation: probeAcceptanceAttestationReadiness(),
  }
  const dualModeExecution = probeDualModeExecutionReadiness()

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
    'HFT-on-home-WiFi is not colocation — never claim ms arbitrage / spoofing-detect as shipped retail.',
    'Manus RPA/CV clicking risks Broker ToS + market-abuse exposure — live ORT RPA HELD; user-borne.',
    'Maestro multi-timeline in the same browser profile without isolation is unsafe for RPA click paths.',
  ]

  const notes = [
    `capabilities: ${capabilities.length} tracked; NOT_IMPLEMENTED=${notImplemented}.`,
    `onda N cores ready=${p0Ready}/9 (N1–N8 + N9 FIX framing spike).`,
    `SF1 session tape: ${substrateSf1.status} — ${substrateSf1.note}`,
    `SF2 signed WORM: ${substrateSf2.status} — ${substrateSf2.note}`,
    `SF3 monotonic timebase: ${substrateSf3.status} — ${substrateSf3.note}`,
    `SF4 quant L.14 vault pack: ${substrateSf4.status} — ${substrateSf4.note}`,
    `SF5 headless runtime: ${substrateSf5.status} — ${substrateSf5.note}`,
    `SF6 Blind Brain AES vault: ${substrateSf6.status} — ${substrateSf6.note}`,
    `SF7 FIX framing spike: ${substrateSf7.status} — ${substrateSf7.note}`,
    `§23 non-custodial: ${section23.nonCustodial.note}`,
    `§23 EULA: ${section23.eulaAcceptance.note}`,
    `§23 GPU mux: ${section23.gpuPriorityMux.note}`,
    `§23 shadow audit: ${section23.shadowAuditTelemetry.note}`,
    `§23 attestation store: ${section23.acceptanceAttestation.note}`,
    `Dual-Mode Vanguard HFT: ${dualModeExecution.vanguardHftApi.note}`,
    `Dual-Mode Manus RPA: ${dualModeExecution.manusRpaBrowser.note}`,
    'N1–N9 fail-closed cores — fixGatewayReady=false; no live broker, licensed L2, or SBE; investmentGrade=false.',
    'N5 Rust risk_envelope + web mirror — live trading hard-disabled; IPC probe_risk_envelope_cmd; paper/live-intent call Maestro then evaluateRisk.',
    'N6 SPSC tick ring + market-pattern VectorIndex domain — not 20yr/<1ms claim.',
    'N7 Maestro finance pulse veto-only — Mini-IA cannot submit; Cap\'n Proto math evidence HELD.',
    'N8 finance ONNX refuses inference without model bytes; financeOnnxReady=false; does not flip text-to-3d gate.',
    'N9 FIX Logon/Heartbeat framing only — socket send + NewOrderSingle hard-blocked; home Wi-Fi ≠ colocation.',
    'SF6 Blind Brain AES-256-GCM local wrap — HSM/production custody HELD.',
    'SF7 PARTIAL = N9 spike only — licensed L2 book / C2T / SBE / venue session HELD.',
    'N3 optional SF2 WORM sink — local durable OK; cloudMirror requires explicit consent (no silent telemetry).',
    'Legacy packages/aethel-cli-legacy/.../trading/ is dead code — do not import.',
    `onnx fixture wired=${ONNX_FIXTURE_HONESTY_WIRED} — text-to-3d da distinct from N8 financeOnnxReady.`,
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
    substrateSf3,
    substrateSf4,
    substrateSf5,
    substrateSf6,
    substrateSf7,
    section23,
    dualModeExecution,
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
