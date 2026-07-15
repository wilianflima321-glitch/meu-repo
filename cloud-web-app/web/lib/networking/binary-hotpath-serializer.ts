/**
 * Block 2B.1 — Versioned binary hot-path serializer (60Hz).
 * Forbidden on this path: JSON.parse / JSON.stringify of entity snapshots.
 */

export const BINARY_HOTPATH_MAGIC = 0x4145 // 'AE'
export const BINARY_HOTPATH_VERSION = 1

/** Fixed-layout entity used on the 60Hz wire (no variable JSON blobs). */
export interface HotpathEntity {
  id: number
  posX: number
  posY: number
  posZ: number
  rotX: number
  rotY: number
  rotZ: number
  rotW: number
  velX: number
  velY: number
  velZ: number
  flags: number
}

const ENTITY_STRIDE_BYTES = 4 + 11 * 4 // id u32 + 11 f32
const HEADER_BYTES = 2 + 2 + 4 // magic + version + count

export class BinaryHotpathCodecError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BinaryHotpathCodecError'
  }
}

/**
 * Encode up to N entities into a versioned little-endian buffer.
 * Pure floats/ints — zero JSON on the hot path.
 */
export function encodeHotpathEntities(entities: readonly HotpathEntity[]): ArrayBuffer {
  if (entities.length > 0xffff) {
    throw new BinaryHotpathCodecError('entity count exceeds u16 range')
  }
  const buffer = new ArrayBuffer(HEADER_BYTES + entities.length * ENTITY_STRIDE_BYTES)
  const view = new DataView(buffer)
  view.setUint16(0, BINARY_HOTPATH_MAGIC, true)
  view.setUint16(2, BINARY_HOTPATH_VERSION, true)
  view.setUint32(4, entities.length, true)
  let offset = HEADER_BYTES
  for (const e of entities) {
    view.setUint32(offset, e.id >>> 0, true)
    offset += 4
    view.setFloat32(offset, e.posX, true)
    offset += 4
    view.setFloat32(offset, e.posY, true)
    offset += 4
    view.setFloat32(offset, e.posZ, true)
    offset += 4
    view.setFloat32(offset, e.rotX, true)
    offset += 4
    view.setFloat32(offset, e.rotY, true)
    offset += 4
    view.setFloat32(offset, e.rotZ, true)
    offset += 4
    view.setFloat32(offset, e.rotW, true)
    offset += 4
    view.setFloat32(offset, e.velX, true)
    offset += 4
    view.setFloat32(offset, e.velY, true)
    offset += 4
    view.setFloat32(offset, e.velZ, true)
    offset += 4
    view.setUint32(offset, e.flags >>> 0, true)
    offset += 4
  }
  return buffer
}

export function decodeHotpathEntities(buffer: ArrayBuffer): HotpathEntity[] {
  if (buffer.byteLength < HEADER_BYTES) {
    throw new BinaryHotpathCodecError('buffer too short for header')
  }
  const view = new DataView(buffer)
  const magic = view.getUint16(0, true)
  if (magic !== BINARY_HOTPATH_MAGIC) {
    throw new BinaryHotpathCodecError(`bad magic 0x${magic.toString(16)}`)
  }
  const version = view.getUint16(2, true)
  if (version !== BINARY_HOTPATH_VERSION) {
    throw new BinaryHotpathCodecError(`unsupported version ${version}`)
  }
  const count = view.getUint32(4, true)
  const expected = HEADER_BYTES + count * ENTITY_STRIDE_BYTES
  if (buffer.byteLength < expected) {
    throw new BinaryHotpathCodecError(`buffer truncated: need ${expected}, got ${buffer.byteLength}`)
  }
  const out: HotpathEntity[] = new Array(count)
  let offset = HEADER_BYTES
  for (let i = 0; i < count; i++) {
    const id = view.getUint32(offset, true)
    offset += 4
    const posX = view.getFloat32(offset, true)
    offset += 4
    const posY = view.getFloat32(offset, true)
    offset += 4
    const posZ = view.getFloat32(offset, true)
    offset += 4
    const rotX = view.getFloat32(offset, true)
    offset += 4
    const rotY = view.getFloat32(offset, true)
    offset += 4
    const rotZ = view.getFloat32(offset, true)
    offset += 4
    const rotW = view.getFloat32(offset, true)
    offset += 4
    const velX = view.getFloat32(offset, true)
    offset += 4
    const velY = view.getFloat32(offset, true)
    offset += 4
    const velZ = view.getFloat32(offset, true)
    offset += 4
    const flags = view.getUint32(offset, true)
    offset += 4
    out[i] = { id, posX, posY, posZ, rotX, rotY, rotZ, rotW, velX, velY, velZ, flags }
  }
  return out
}

/** Build N deterministic entities for microbench / round-trip tests. */
export function makeHotpathFixture(count: number): HotpathEntity[] {
  const entities: HotpathEntity[] = new Array(count)
  for (let i = 0; i < count; i++) {
    entities[i] = {
      id: i + 1,
      posX: i * 0.1,
      posY: 1.5,
      posZ: -i * 0.05,
      rotX: 0,
      rotY: i * 0.01,
      rotZ: 0,
      rotW: 1,
      velX: 0.2,
      velY: 0,
      velZ: -0.1,
      flags: i & 0xff,
    }
  }
  return entities
}

/**
 * Microbench: encode+decode `count` entities. Returns elapsed ms (performance.now).
 * Acceptance: < 0.1ms for 64 entities on a healthy Node/V8 host.
 */
export function microbenchHotpathRoundTrip(count = 64, iterations = 200): number {
  const fixture = makeHotpathFixture(count)
  // Warmup
  for (let i = 0; i < 20; i++) {
    decodeHotpathEntities(encodeHotpathEntities(fixture))
  }
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    decodeHotpathEntities(encodeHotpathEntities(fixture))
  }
  const elapsed = performance.now() - t0
  return elapsed / iterations
}
