import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  appendEulaAttestation,
  getOrCreateDefaultAttestationStore,
  listAttestationsForAccount,
  verifyAttestationChain,
} from '@/lib/server/quant/acceptance-attestation-store'
import {
  QUANT_RISK_ACCEPTANCE_PHRASE,
  recordEulaRiskAcceptance,
} from '@/lib/server/quant/eula-risk-acceptance'

const log = createComponentLogger('api/runtime/quant-eula-attestation/route')

export const dynamic = 'force-dynamic'

/**
 * §23.C — Admin-bound EULA acceptance attestation (append-only).
 * Evidence for disputes — not legal invulnerability.
 */
export async function POST(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized', mock: false }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body', mock: false }, { status: 400 })
  }

  const accountId = typeof body.accountId === 'string' ? body.accountId : ''
  const hwid = typeof body.hwid === 'string' ? body.hwid : ''
  const typedPhrase = typeof body.typedPhrase === 'string' ? body.typedPhrase : ''
  const forwarded = req.headers.get('x-forwarded-for')
  const ipAddress =
    (typeof body.ipAddress === 'string' && body.ipAddress.trim()) ||
    (forwarded ? forwarded.split(',')[0]!.trim() : '') ||
    '0.0.0.0'

  const eula = recordEulaRiskAcceptance({
    accountId,
    hwid,
    ipAddress,
    typedPhrase,
  })

  if (!eula.ok) {
    log.info('eula_attestation_rejected', { code: eula.code })
    return NextResponse.json(
      {
        mock: false,
        accepted: false,
        code: eula.code,
        message: eula.message,
        requiredPhraseHint: 'exact risk-acceptance sentence required',
        investmentGrade: false,
        liveBrokerUnlocked: false,
      },
      { status: 400 },
    )
  }

  const store = getOrCreateDefaultAttestationStore()
  const appended = appendEulaAttestation(store, eula.value)
  if (!appended.ok) {
    return NextResponse.json(
      { mock: false, accepted: false, code: appended.code, message: appended.message },
      { status: 500 },
    )
  }

  const chain = verifyAttestationChain(appended.value.store)
  log.info('eula_attestation_recorded', {
    acceptanceId: eula.value.acceptanceId,
    sequence: appended.value.entry.sequence,
  })

  return NextResponse.json({
    mock: false,
    accepted: true,
    record: {
      acceptanceId: eula.value.acceptanceId,
      attestationHash: eula.value.attestationHash,
      antiFraudBindingHash: eula.value.antiFraudBindingHash,
      acceptedAt: eula.value.acceptedAt,
      liveBrokerUnlocked: false,
    },
    entry: appended.value.entry,
    chainValid: chain.valid,
    phraseVersionLength: QUANT_RISK_ACCEPTANCE_PHRASE.length,
    investmentGrade: false,
    note: 'Attestation evidence only — does not make Aethel litigation-proof',
  })
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized', mock: false }, { status: 401 })
  }

  const accountId = req.nextUrl.searchParams.get('accountId') ?? ''
  const store = getOrCreateDefaultAttestationStore()
  const chain = verifyAttestationChain(store)
  const entries = accountId ? listAttestationsForAccount(store, accountId) : []

  return NextResponse.json({
    mock: false,
    storeId: store.storeId,
    chainValid: chain.valid,
    entryCount: store.entries.length,
    accountEntries: entries,
    investmentGrade: false,
  })
}
