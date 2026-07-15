import type { RuntimeJobReceiptKind } from '@/lib/production/runtime-job-receipts'

export const RELEASE_APPROVAL_PATTERNS = [
  /human[-_ ]?approval/i,
  /release[-_ ]?approval/i,
  /approval[-_: ]?record/i,
  /approved[-_: ]?release/i,
]

export const ASSET_FINAL_EVIDENCE_GROUPS = [
  {
    label: 'provenance/license receipt',
    patterns: [/provenance/i, /license/i, /rights[-_ ]?clearance/i],
  },
  {
    label: 'LOD/PBR material evidence',
    patterns: [/LOD[0-3]/i, /\blod\b/i, /PBR/i, /material[-_ ]?audit/i],
  },
  {
    label: 'collision/navmesh/rig proxy evidence',
    patterns: [/collision/i, /navmesh/i, /rig/i, /skeleton/i, /retopo/i],
  },
  {
    label: 'viewport performance trace',
    patterns: [/performance[-_ ]?trace/i, /frame[-_ ]?time/i, /perf[-_ ]?budget/i, /render[-_ ]?trace/i],
  },
  {
    label: 'human art-direction approval',
    patterns: [/human[-_ ]?(review|approval)/i, /art[-_ ]?direction[-_ ]?approval/i, /asset[-_ ]?approval/i],
  },
]

export const PLAYTEST_EVIDENCE_GROUPS = [
  {
    label: 'bot/human playtest run',
    patterns: [/playtest/i, /bot[-_ ]?run/i, /human[-_ ]?feel[-_ ]?review/i],
  },
  {
    label: 'input replay evidence',
    patterns: [/input[-_ ]?replay/i, /replay:/i, /session[-_ ]?capture/i],
  },
  {
    label: 'performance trace',
    patterns: [/performance[-_ ]?trace/i, /frame[-_ ]?time/i, /latency[-_ ]?trace/i],
  },
  {
    label: 'bug/blocker ledger',
    patterns: [/bug[-_ ]?ledger/i, /blocker[-_ ]?ledger/i, /softlock/i, /crash[-_ ]?report/i],
  },
]

export const BASE_RUNTIME_RECEIPT_KINDS: RuntimeJobReceiptKind[] = [
  'dispatch',
  'capability-probe',
  'artifact',
  'validation',
]
