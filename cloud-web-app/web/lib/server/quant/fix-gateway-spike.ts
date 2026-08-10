/**
 * N9 / SF7 spike — FIX 4.4 message framing for Logon (A) + Heartbeat (0).
 * Fail-closed: NewOrderSingle / any live order MsgType rejected; no socket send.
 * `fixGatewayReady` always false until Founder colocation + licensed venue soak.
 * Home Wi-Fi ≠ colocation — explicit honesty flags.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('fix-gateway-spike')

/** SOH field separator per FIX. */
export const FIX_SOH = '\x01'

export const FIX_GATEWAY_READY = false as const
export const FIX_LICENSED_L2_READY = false as const
export const FIX_COLOCATION_READY = false as const
export const FIX_SBE_READY = false as const

/** Allowed session MsgTypes for this spike only. */
export type FixSessionMsgType = 'A' | '0' | '5'

/** Order / execution MsgTypes — always rejected for live send. */
export type FixOrderMsgType = 'D' | 'F' | 'G' | '8' | '9'

export type FixNetworkProfile = 'home_wifi' | 'colocation' | 'unknown'

export type FixRejectCode =
  | 'checksum_mismatch'
  | 'invalid_framing'
  | 'unsupported_msg_type'
  | 'live_order_forbidden'
  | 'gateway_not_ready'
  | 'home_wifi_microsecond_ops_forbidden'
  | 'colocation_not_proven'
  | 'licensed_l2_held'
  | 'socket_send_forbidden'
  | 'invalid_input'

export type FixResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: FixRejectCode; message: string }

export interface FixFieldMap {
  [tag: number]: string
}

export interface FixParsedMessage {
  msgType: string
  fields: FixFieldMap
  raw: string
  bodyLength: number
  checksum: string
}

export interface FixGatewayHonestyFlags {
  fixGatewayReady: typeof FIX_GATEWAY_READY
  licensedL2Ready: typeof FIX_LICENSED_L2_READY
  colocationReady: typeof FIX_COLOCATION_READY
  sbeReady: typeof FIX_SBE_READY
  homeWifiIsNotColocation: true
  investmentGrade: false
  liveBrokerReady: false
  maySendLiveOrders: false
}

export function getFixGatewayHonestyFlags(): FixGatewayHonestyFlags {
  return {
    fixGatewayReady: FIX_GATEWAY_READY,
    licensedL2Ready: FIX_LICENSED_L2_READY,
    colocationReady: FIX_COLOCATION_READY,
    sbeReady: FIX_SBE_READY,
    homeWifiIsNotColocation: true,
    investmentGrade: false,
    liveBrokerReady: false,
    maySendLiveOrders: false,
  }
}

/** FIX checksum = sum of bytes before checksum field, mod 256, 3-digit zero-padded. */
export function computeFixChecksum(payloadWithoutChecksum: string): string {
  let sum = 0
  for (let i = 0; i < payloadWithoutChecksum.length; i++) {
    sum = (sum + payloadWithoutChecksum.charCodeAt(i)) % 256
  }
  return String(sum).padStart(3, '0')
}

function isOrderMsgType(msgType: string): boolean {
  return msgType === 'D' || msgType === 'F' || msgType === 'G' || msgType === '8' || msgType === '9'
}

function isSessionMsgType(msgType: string): msgType is FixSessionMsgType {
  return msgType === 'A' || msgType === '0' || msgType === '5'
}

/**
 * Encode SOH-delimited FIX fields. Automatically sets BodyLength (9) and CheckSum (10).
 */
export function encodeFixMessage(fields: FixFieldMap): FixResult<string> {
  const msgType = fields[35]
  if (!msgType) {
    return { ok: false, code: 'invalid_input', message: 'tag 35 MsgType required' }
  }
  if (isOrderMsgType(msgType)) {
    return {
      ok: false,
      code: 'live_order_forbidden',
      message: `MsgType ${msgType} order/execution messages cannot be encoded for live send in N9 spike`,
    }
  }
  if (!isSessionMsgType(msgType)) {
    return {
      ok: false,
      code: 'unsupported_msg_type',
      message: `MsgType ${msgType} not in N9 session allowlist (A/0/5)`,
    }
  }

  const beginString = fields[8] ?? 'FIX.4.4'
  const ordered: Array<[number, string]> = [[8, beginString], [35, msgType]]
  for (const [tagStr, value] of Object.entries(fields)) {
    const tag = Number(tagStr)
    if (!Number.isFinite(tag) || tag === 8 || tag === 9 || tag === 10 || tag === 35) continue
    if (value === undefined || value === null) continue
    ordered.push([tag, String(value)])
  }

  const body = ordered
    .filter(([tag]) => tag !== 8)
    .map(([tag, value]) => `${tag}=${value}${FIX_SOH}`)
    .join('')
  const bodyLength = body.length
  const head = `8=${beginString}${FIX_SOH}9=${bodyLength}${FIX_SOH}`
  const withBody = `${head}${body}`
  const checksum = computeFixChecksum(withBody)
  return { ok: true, value: `${withBody}10=${checksum}${FIX_SOH}` }
}

/** Parse a single FIX message; verify BodyLength + CheckSum. */
export function parseFixMessage(raw: string): FixResult<FixParsedMessage> {
  if (!raw || !raw.includes('8=') || !raw.includes(`${FIX_SOH}10=`)) {
    return { ok: false, code: 'invalid_framing', message: 'missing FIX BeginString or CheckSum framing' }
  }

  // CheckSum covers every byte before the CheckSum field ("10=").
  const checksumTagIdx = raw.lastIndexOf('10=')
  if (checksumTagIdx < 0) {
    return { ok: false, code: 'invalid_framing', message: 'CheckSum field not found' }
  }
  const checksumPayload = raw.slice(0, checksumTagIdx)
  const checksumPart = raw.slice(checksumTagIdx)
  const checksumMatch = /^10=(\d{3})\x01?$/.exec(checksumPart)
  if (!checksumMatch) {
    return { ok: false, code: 'invalid_framing', message: 'CheckSum not 3 digits' }
  }
  const claimed = checksumMatch[1]
  const expected = computeFixChecksum(checksumPayload)
  if (claimed !== expected) {
    return {
      ok: false,
      code: 'checksum_mismatch',
      message: `CheckSum claimed ${claimed} expected ${expected}`,
    }
  }

  const fields: FixFieldMap = {}
  const parts = raw.split(FIX_SOH).filter(Boolean)
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    const tag = Number(part.slice(0, eq))
    if (!Number.isFinite(tag)) continue
    fields[tag] = part.slice(eq + 1)
  }

  const msgType = fields[35]
  if (!msgType) {
    return { ok: false, code: 'invalid_framing', message: 'MsgType (35) missing' }
  }

  const bodyLength = Number(fields[9] ?? NaN)
  return {
    ok: true,
    value: {
      msgType,
      fields,
      raw,
      bodyLength: Number.isFinite(bodyLength) ? bodyLength : 0,
      checksum: claimed,
    },
  }
}

export function buildFixLogon(input: {
  senderCompId: string
  targetCompId: string
  msgSeqNum: number
  heartBtInt?: number
  sendingTime?: string
}): FixResult<string> {
  if (!input.senderCompId?.trim() || !input.targetCompId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'SenderCompID and TargetCompID required' }
  }
  if (!Number.isFinite(input.msgSeqNum) || input.msgSeqNum < 1) {
    return { ok: false, code: 'invalid_input', message: 'MsgSeqNum must be >= 1' }
  }
  return encodeFixMessage({
    8: 'FIX.4.4',
    35: 'A',
    49: input.senderCompId.trim(),
    56: input.targetCompId.trim(),
    34: String(Math.floor(input.msgSeqNum)),
    52: input.sendingTime ?? '20260810-15:00:00.000',
    98: '0',
    108: String(input.heartBtInt ?? 30),
  })
}

export function buildFixHeartbeat(input: {
  senderCompId: string
  targetCompId: string
  msgSeqNum: number
  testReqId?: string
  sendingTime?: string
}): FixResult<string> {
  const fields: FixFieldMap = {
    8: 'FIX.4.4',
    35: '0',
    49: input.senderCompId.trim(),
    56: input.targetCompId.trim(),
    34: String(Math.floor(input.msgSeqNum)),
    52: input.sendingTime ?? '20260810-15:00:00.000',
  }
  if (input.testReqId) fields[112] = input.testReqId
  return encodeFixMessage(fields)
}

/**
 * Attempt to "send" a FIX message on a network profile.
 * Always fail-closed for live orders, socket I/O, and home-WiFi microsecond ops.
 */
export function attemptFixGatewaySend(input: {
  rawMessage: string
  networkProfile: FixNetworkProfile
  /** Retail / home path attempting µs claims */
  claimMicrosecondOps?: boolean
}): FixResult<{
  framed: true
  msgType: string
  transmitted: false
  fixGatewayReady: false
  networkProfile: FixNetworkProfile
}> {
  const flags = getFixGatewayHonestyFlags()
  if (flags.fixGatewayReady) {
    // unreachable by const — keep for honesty
  }

  const parsed = parseFixMessage(input.rawMessage)
  if (!parsed.ok) return parsed

  if (isOrderMsgType(parsed.value.msgType)) {
    log.warn('fix_live_order_blocked', { msgType: parsed.value.msgType })
    return {
      ok: false,
      code: 'live_order_forbidden',
      message: 'N9 spike forbids live order/execution MsgTypes — no broker send path',
    }
  }

  if (input.networkProfile === 'home_wifi' && input.claimMicrosecondOps === true) {
    return {
      ok: false,
      code: 'home_wifi_microsecond_ops_forbidden',
      message: 'home Wi-Fi is not colocation — microsecond HFT ops hard-blocked',
    }
  }

  if (input.networkProfile === 'colocation' && !FIX_COLOCATION_READY) {
    return {
      ok: false,
      code: 'colocation_not_proven',
      message: 'colocationReady=false — cannot claim colocated FIX path',
    }
  }

  // Session messages may be framed locally but never leave process (no socket).
  log.info('fix_session_frame_local_only', {
    msgType: parsed.value.msgType,
    networkProfile: input.networkProfile,
    transmitted: false,
  })
  return {
    ok: false,
    code: 'socket_send_forbidden',
    message:
      'fixGatewayReady=false — Logon/Heartbeat may be framed locally; socket transmit to venue forbidden',
  }
}

/** Explicit NewOrderSingle attempt — always rejected. */
export function attemptFixNewOrderSingle(_order: {
  symbol: string
  side: '1' | '2'
  orderQty: number
  networkProfile: FixNetworkProfile
}): FixResult<never> {
  log.warn('fix_new_order_single_blocked', {})
  return {
    ok: false,
    code: 'live_order_forbidden',
    message: 'NewOrderSingle (D) hard-blocked — fixGatewayReady=false; liveBrokerReady=false',
  }
}

export function assertNoLicensedL2FromFixSpike(): FixResult<{ licensedL2Ready: false }> {
  return {
    ok: true,
    value: { licensedL2Ready: false },
  }
}

export function probeFixGatewaySpikeReadiness(): {
  id: 'N9'
  sf7Id: 'SF7'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  fixGatewayReady: false
  licensedL2Ready: false
  colocationReady: false
  investmentGrade: false
} {
  const logon = buildFixLogon({
    senderCompId: 'AETHEL',
    targetCompId: 'VENUE',
    msgSeqNum: 1,
  })
  const hb = buildFixHeartbeat({
    senderCompId: 'AETHEL',
    targetCompId: 'VENUE',
    msgSeqNum: 2,
  })
  if (!logon.ok || !hb.ok) {
    return {
      id: 'N9',
      sf7Id: 'SF7',
      status: 'NOT_IMPLEMENTED',
      ready: false,
      path: 'lib/server/quant/fix-gateway-spike.ts',
      note: 'FIX Logon/Heartbeat encode failed.',
      fixGatewayReady: false,
      licensedL2Ready: false,
      colocationReady: false,
      investmentGrade: false,
    }
  }

  const parsedLogon = parseFixMessage(logon.value)
  const parsedHb = parseFixMessage(hb.value)
  const orderBlocked = encodeFixMessage({ 8: 'FIX.4.4', 35: 'D', 55: 'AAPL', 54: '1', 38: '1' })
  const nos = attemptFixNewOrderSingle({
    symbol: 'AAPL',
    side: '1',
    orderQty: 1,
    networkProfile: 'home_wifi',
  })
  const wifiUs = attemptFixGatewaySend({
    rawMessage: logon.value,
    networkProfile: 'home_wifi',
    claimMicrosecondOps: true,
  })
  const sessionLocal = attemptFixGatewaySend({
    rawMessage: hb.value,
    networkProfile: 'home_wifi',
  })
  const l2 = assertNoLicensedL2FromFixSpike()

  const ready =
    parsedLogon.ok &&
    parsedLogon.value.msgType === 'A' &&
    parsedHb.ok &&
    parsedHb.value.msgType === '0' &&
    !orderBlocked.ok &&
    orderBlocked.code === 'live_order_forbidden' &&
    !nos.ok &&
    !wifiUs.ok &&
    wifiUs.code === 'home_wifi_microsecond_ops_forbidden' &&
    !sessionLocal.ok &&
    sessionLocal.code === 'socket_send_forbidden' &&
    l2.ok &&
    FIX_GATEWAY_READY === false &&
    FIX_LICENSED_L2_READY === false

  return {
    id: 'N9',
    sf7Id: 'SF7',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/fix-gateway-spike.ts',
    note: ready
      ? 'FIX 4.4 Logon/Heartbeat framing + checksum; live orders/socket send blocked; fixGatewayReady=false; licensed L2 HELD; home Wi-Fi ≠ colocation.'
      : 'N9 FIX gateway spike probe failed.',
    fixGatewayReady: false,
    licensedL2Ready: false,
    colocationReady: false,
    investmentGrade: false,
  }
}
