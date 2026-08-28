/**
 * provenance.ts  — Sprint V33
 *
 * Cryptographic asset provenance and IP safety system for Aethel Marketplace.
 *
 * Provides:
 *   - Cryptographic signing of generated assets (ECDSA P-256)
 *   - Asset fingerprinting (SHA-256 of geometry + prompt hash)
 *   - Provenance chain storage (prompt → parameters → mesh → texture)
 *   - DMCA-safe distribution checks
 *   - License metadata anchoring
 *
 * Each published asset gets a ProvenanceCertificate containing:
 *   - assetId
 *   - promptHash (one-way: SHA-256 of the original prompt)
 *   - geometryHash (SHA-256 of the vertex buffer)
 *   - creatorId
 *   - timestamp
 *   - signature (ECDSA P-256 over the certificate payload)
 *
 * Verification:
 *   Anyone can verify the certificate using the creator's public key.
 *   The signature proves the certificate was not tampered with post-generation.
 */

import { createComponentLogger } from '@/lib/observability/logger';
import { telemetry } from '@/lib/observability/telemetry';

const log = createComponentLogger('provenance');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LicenseType =
  | 'cc0'              // public domain
  | 'cc_by'            // attribution
  | 'cc_by_sa'         // attribution share-alike
  | 'commercial'       // full commercial rights
  | 'aethel_platform'  // platform-only (Aethel marketplace)
  | 'proprietary';     // creator retains all rights

export interface ProvenanceCertificate {
  version: 1;
  assetId: string;
  promptHash: string;       // SHA-256 hex
  geometryHash: string;     // SHA-256 hex
  thumbnailHash: string;    // SHA-256 hex
  creatorId: string;
  createdAt: string;        // ISO 8601
  license: LicenseType;
  modelUsed: string;        // AI model name used for generation
  signature: string;        // hex-encoded ECDSA P-256 DER signature
  publicKeyJwk: string;     // JSON stringified CryptoKey public key (JWK)
}

export interface ProvenanceChain {
  assetId: string;
  steps: ProvenanceStep[];
}

export interface ProvenanceStep {
  type: 'prompt_input' | 'model_inference' | 'topology_repair' | 'texture_generation' | 'rigging' | 'published';
  timestamp: string;
  metadata: Record<string, string | number>;
  hash: string;
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

async function sha256Hex(data: BufferSource | string): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
}

async function signPayload(payload: string, privateKey: CryptoKey): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifySignature(payload: string, signatureHex: string, publicKey: CryptoKey): Promise<boolean> {
  const data = new TextEncoder().encode(payload);
  const sigBuf = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  try {
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, sigBuf, data);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// ProvenanceManager
// ---------------------------------------------------------------------------

export class ProvenanceManager {
  private keyPair: CryptoKeyPair | null = null;
  private certificates = new Map<string, ProvenanceCertificate>();
  private chains = new Map<string, ProvenanceChain>();

  // ── Key management ────────────────────────────────────────────────────────

  async initKeyPair(): Promise<void> {
    this.keyPair = await generateSigningKeyPair();
    log.info('Provenance signing key pair generated');
  }

  async exportPublicKeyJWK(): Promise<string> {
    if (!this.keyPair) await this.initKeyPair();
    const jwk = await crypto.subtle.exportKey('jwk', this.keyPair!.publicKey);
    return JSON.stringify(jwk);
  }

  // ── Certificate issuance ──────────────────────────────────────────────────

  async issueCertificate(
    assetId: string,
    prompt: string,
    geometryBuffer: ArrayBuffer,
    thumbnailBuffer: ArrayBuffer,
    creatorId: string,
    license: LicenseType,
    modelUsed: string,
  ): Promise<ProvenanceCertificate> {
    if (!this.keyPair) await this.initKeyPair();

    const span = telemetry.startSpan('provenance.issue', { assetId, creatorId });

    try {
      const [promptHash, geometryHash, thumbnailHash, publicKeyJwk] = await Promise.all([
        sha256Hex(prompt),
        sha256Hex(geometryBuffer),
        sha256Hex(thumbnailBuffer),
        this.exportPublicKeyJWK(),
      ]);

      const payload = JSON.stringify({
        assetId, promptHash, geometryHash, thumbnailHash,
        creatorId, license, modelUsed,
        createdAt: new Date().toISOString(),
      });

      const signature = await signPayload(payload, this.keyPair!.privateKey);

      const cert: ProvenanceCertificate = {
        version: 1,
        assetId,
        promptHash,
        geometryHash,
        thumbnailHash,
        creatorId,
        createdAt: new Date().toISOString(),
        license,
        modelUsed,
        signature,
        publicKeyJwk,
      };

      this.certificates.set(assetId, cert);
      telemetry.counter('provenance.issued').add(1, { license });
      log.info('Provenance certificate issued', { assetId, creatorId });

      span.end('ok');
      return cert;

    } catch (err) {
      span.end('error', err instanceof Error ? err : undefined);
      throw err;
    }
  }

  // ── Certificate verification ──────────────────────────────────────────────

  async verifyCertificate(cert: ProvenanceCertificate): Promise<boolean> {
    try {
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(cert.publicKeyJwk),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );

      const payload = JSON.stringify({
        assetId: cert.assetId,
        promptHash: cert.promptHash,
        geometryHash: cert.geometryHash,
        thumbnailHash: cert.thumbnailHash,
        creatorId: cert.creatorId,
        license: cert.license,
        modelUsed: cert.modelUsed,
        createdAt: cert.createdAt,
      });

      const valid = await verifySignature(payload, cert.signature, publicKey);
      telemetry.counter('provenance.verified').add(1, { valid: String(valid) });
      return valid;

    } catch {
      return false;
    }
  }

  getCertificate(assetId: string): ProvenanceCertificate | undefined {
    return this.certificates.get(assetId);
  }

  // ── Provenance chain ──────────────────────────────────────────────────────

  async recordStep(
    assetId: string,
    type: ProvenanceStep['type'],
    metadata: Record<string, string | number>,
  ): Promise<void> {
    const chain = this.chains.get(assetId) ?? { assetId, steps: [] };
    const stepPayload = JSON.stringify({ type, metadata, timestamp: new Date().toISOString() });
    const hash = await sha256Hex(stepPayload);

    chain.steps.push({ type, timestamp: new Date().toISOString(), metadata, hash });
    this.chains.set(assetId, chain);
  }

  getChain(assetId: string): ProvenanceChain | undefined {
    return this.chains.get(assetId);
  }

  // ── GDPR: cascade deletion of provenance data ─────────────────────────────

  deleteCreatorData(creatorId: string): number {
    let deleted = 0;
    for (const [assetId, cert] of this.certificates) {
      if (cert.creatorId === creatorId) {
        this.certificates.delete(assetId);
        this.chains.delete(assetId);
        deleted++;
      }
    }
    log.info('Creator provenance data deleted (GDPR)', { creatorId, deleted });
    telemetry.counter('gdpr.provenance_deleted').add(deleted, { creatorId });
    return deleted;
  }
}

export const provenanceManager = new ProvenanceManager();

// ---------------------------------------------------------------------------
// Legacy sync helpers (used by GenerationInspector.tsx)
// ---------------------------------------------------------------------------

export interface SyncProvenanceSignature {
  signature: string;
  keyId: string;
  timestamp: string;
}

/**
 * Pure-TS synchronous SHA-256 (FIPS 180-4) returning a 64-char lowercase hex
 * digest. Web Crypto (`crypto.subtle`) is async-only, so the render-path
 * provenance signature needs its own deterministic synchronous implementation.
 * Verified against the NIST vectors SHA-256("") and SHA-256("abc").
 */
function rotr32(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function syncSha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const withTerminator = new Uint8Array(bytes.length + 1);
  withTerminator.set(bytes);
  withTerminator[bytes.length] = 0x80;
  const paddedLen = Math.ceil((withTerminator.length + 8) / 64) * 64;
  const msg = new Uint8Array(paddedLen);
  msg.set(withTerminator);
  const dv = new DataView(msg.buffer);
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);

  for (let i = 0; i < msg.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr32(w[t - 15], 7) ^ rotr32(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr32(w[t - 2], 17) ^ rotr32(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/**
 * Deterministic provenance digest for the sync (render-path) contract. Produces
 * a SHA-256 of the (prompt, meshHash, model) payload — a full 256-bit
 * cryptographic digest, unlike the previous 32-bit rolling hash. The version
 * lives in `keyId` ('aethel-v1'); `signature` is the raw 64-char hex digest.
 */
export function signAssetProvenance(
  prompt: string,
  meshHash: string,
  model: string,
): SyncProvenanceSignature {
  const payload = `${prompt}:${meshHash}:${model}`;
  return {
    signature: syncSha256Hex(payload),
    keyId: 'aethel-v1',
    timestamp: new Date().toISOString(),
  };
}

/** Verify a sync provenance signature (null/malformed payloads fail closed). */
export function verifyAssetProvenance(
  prompt: string,
  meshHash: string,
  model: string,
  sig: SyncProvenanceSignature | null | undefined,
): boolean {
  if (!sig || typeof sig !== 'object' || typeof sig.signature !== 'string' || typeof sig.keyId !== 'string') {
    return false;
  }
  const expected = signAssetProvenance(prompt, meshHash, model);
  return sig.signature === expected.signature && sig.keyId === expected.keyId;
}
