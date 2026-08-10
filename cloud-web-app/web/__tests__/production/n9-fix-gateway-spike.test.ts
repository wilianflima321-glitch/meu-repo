/**
 * N9 / SF7 — FIX Logon/Heartbeat framing spike; fail-closed live orders.
 */

import { describe, expect, it } from 'vitest'

import {
  FIX_COLOCATION_READY,
  FIX_GATEWAY_READY,
  FIX_LICENSED_L2_READY,
  FIX_SBE_READY,
  attemptFixGatewaySend,
  attemptFixNewOrderSingle,
  buildFixHeartbeat,
  buildFixLogon,
  encodeFixMessage,
  parseFixMessage,
  probeFixGatewaySpikeReadiness,
} from '@/lib/server/quant/fix-gateway-spike'

describe('N9 FIX gateway spike', () => {
  it('roundtrips Logon + Heartbeat with valid checksum', () => {
    const logon = buildFixLogon({
      senderCompId: 'AETHEL',
      targetCompId: 'VENUE',
      msgSeqNum: 1,
      heartBtInt: 30,
      sendingTime: '20260810-15:00:00.000',
    })
    expect(logon.ok).toBe(true)
    if (!logon.ok) return

    const parsed = parseFixMessage(logon.value)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.msgType).toBe('A')
    expect(parsed.value.fields[49]).toBe('AETHEL')
    expect(parsed.value.fields[56]).toBe('VENUE')
    expect(parsed.value.fields[108]).toBe('30')

    const hb = buildFixHeartbeat({
      senderCompId: 'AETHEL',
      targetCompId: 'VENUE',
      msgSeqNum: 2,
      testReqId: 'TR1',
    })
    expect(hb.ok).toBe(true)
    if (!hb.ok) return
    const hbParsed = parseFixMessage(hb.value)
    expect(hbParsed.ok).toBe(true)
    if (!hbParsed.ok) return
    expect(hbParsed.value.msgType).toBe('0')
    expect(hbParsed.value.fields[112]).toBe('TR1')
  })

  it('rejects NewOrderSingle encode and live send paths', () => {
    const encode = encodeFixMessage({
      8: 'FIX.4.4',
      35: 'D',
      55: 'AAPL',
      54: '1',
      38: '1',
    })
    expect(encode.ok).toBe(false)
    if (!encode.ok) expect(encode.code).toBe('live_order_forbidden')

    const nos = attemptFixNewOrderSingle({
      symbol: 'AAPL',
      side: '1',
      orderQty: 1,
      networkProfile: 'colocation',
    })
    expect(nos.ok).toBe(false)
    if (!nos.ok) expect(nos.code).toBe('live_order_forbidden')
  })

  it('blocks home-WiFi microsecond claims and socket transmit', () => {
    const logon = buildFixLogon({
      senderCompId: 'AETHEL',
      targetCompId: 'VENUE',
      msgSeqNum: 1,
    })
    expect(logon.ok).toBe(true)
    if (!logon.ok) return

    const wifiUs = attemptFixGatewaySend({
      rawMessage: logon.value,
      networkProfile: 'home_wifi',
      claimMicrosecondOps: true,
    })
    expect(wifiUs.ok).toBe(false)
    if (!wifiUs.ok) expect(wifiUs.code).toBe('home_wifi_microsecond_ops_forbidden')

    const local = attemptFixGatewaySend({
      rawMessage: logon.value,
      networkProfile: 'home_wifi',
    })
    expect(local.ok).toBe(false)
    if (!local.ok) expect(local.code).toBe('socket_send_forbidden')

    const coloc = attemptFixGatewaySend({
      rawMessage: logon.value,
      networkProfile: 'colocation',
    })
    expect(coloc.ok).toBe(false)
    if (!coloc.ok) expect(coloc.code).toBe('colocation_not_proven')
  })

  it('keeps gateway / L2 / SBE / colocation readiness false', () => {
    expect(FIX_GATEWAY_READY).toBe(false)
    expect(FIX_LICENSED_L2_READY).toBe(false)
    expect(FIX_COLOCATION_READY).toBe(false)
    expect(FIX_SBE_READY).toBe(false)

    const probe = probeFixGatewaySpikeReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.fixGatewayReady).toBe(false)
    expect(probe.licensedL2Ready).toBe(false)
    expect(probe.colocationReady).toBe(false)
    expect(probe.investmentGrade).toBe(false)
    expect(probe.id).toBe('N9')
    expect(probe.sf7Id).toBe('SF7')
  })
})
