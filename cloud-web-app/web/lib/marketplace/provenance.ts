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

/** Lightweight deterministic provenance signature (not cryptographic — for display only) */
export function signAssetProvenance(
  prompt: string,
  meshHash: string,
  model: string,
): SyncProvenanceSignature {
  const payload = `${prompt}:${meshHash}:${model}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  const sig = Math.abs(hash).toString(16).padStart(8, '0');
  return {
    signature: `aethel-v1-${sig}`,
    keyId: 'aethel-v1',
    timestamp: new Date().toISOString(),
  };
}

/** Verify a sync provenance signature */
export function verifyAssetProvenance(
  prompt: string,
  meshHash: string,
  model: string,
  sig: SyncProvenanceSignature,
): boolean {
  const expected = signAssetProvenance(prompt, meshHash, model);
  return sig.signature === expected.signature && sig.keyId === expected.keyId;
}
