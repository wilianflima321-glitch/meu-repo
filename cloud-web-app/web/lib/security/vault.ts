/**
 * Security Vault - AES-256-GCM Encrypted Secret Storage
 *
 * Encrypts API keys and sensitive credentials at rest.
 * Uses AES-256-GCM with unique IVs per encryption.
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Security)
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive a 256-bit key from the master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100_000, KEY_LENGTH, 'sha512');
}

function getMasterKey(): string {
  const key = process.env.VAULT_MASTER_KEY;
  if (!key || key.length < 16) {
    throw new Error('VAULT_MASTER_KEY must be set and at least 16 characters');
  }
  return key;
}

export interface EncryptedPayload {
  /** Base64-encoded encrypted data */
  ciphertext: string;
  /** Base64-encoded IV */
  iv: string;
  /** Base64-encoded auth tag */
  tag: string;
  /** Base64-encoded salt for key derivation */
  salt: string;
  /** Algorithm version for future migration */
  version: 1;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const masterKey = getMasterKey();
  const salt = crypto.randomBytes(32);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    salt: salt.toString('base64'),
    version: 1,
  };
}

/**
 * Decrypt an encrypted payload back to plaintext
 */
export function decrypt(payload: EncryptedPayload): string {
  if (payload.version !== 1) {
    throw new Error(`Unsupported vault version: ${payload.version}`);
  }

  const masterKey = getMasterKey();
  const salt = Buffer.from(payload.salt, 'base64');
  const key = deriveKey(masterKey, salt);
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Encrypt a JSON-serializable value
 */
export function encryptJSON<T>(value: T): EncryptedPayload {
  return encrypt(JSON.stringify(value));
}

/**
 * Decrypt and parse a JSON value
 */
export function decryptJSON<T = unknown>(payload: EncryptedPayload): T {
  const plaintext = decrypt(payload);
  return JSON.parse(plaintext) as T;
}

/**
 * Hash a value for comparison (non-reversible)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Validate that the vault is operational
 */
export function validateVault(): { operational: boolean; error?: string } {
  try {
    const testPlaintext = 'vault-health-check-' + Date.now();
    const encrypted = encrypt(testPlaintext);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testPlaintext) {
      return { operational: false, error: 'Roundtrip validation failed' };
    }

    return { operational: true };
  } catch (err) {
    return {
      operational: false,
      error: err instanceof Error ? err.message : 'Unknown vault error',
    };
  }
}

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

export interface VaultEntry {
  id: string;
  name: string;
  encrypted: EncryptedPayload;
  createdAt: string;
  updatedAt: string;
  rotatedAt?: string;
}

/**
 * In-memory vault store for development
 * Production should use database-backed storage
 */
const memoryStore = new Map<string, VaultEntry>();

export function storeSecret(id: string, name: string, plaintext: string): VaultEntry {
  const now = new Date().toISOString();
  const entry: VaultEntry = {
    id,
    name,
    encrypted: encrypt(plaintext),
    createdAt: memoryStore.get(id)?.createdAt || now,
    updatedAt: now,
  };
  memoryStore.set(id, entry);
  return entry;
}

export function retrieveSecret(id: string): string | null {
  const entry = memoryStore.get(id);
  if (!entry) return null;
  return decrypt(entry.encrypted);
}

export function deleteSecret(id: string): boolean {
  return memoryStore.delete(id);
}

export function listSecretIds(): string[] {
  return Array.from(memoryStore.keys());
}

export function rotateSecret(id: string, newPlaintext: string): VaultEntry | null {
  const existing = memoryStore.get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const entry: VaultEntry = {
    ...existing,
    encrypted: encrypt(newPlaintext),
    updatedAt: now,
    rotatedAt: now,
  };
  memoryStore.set(id, entry);
  return entry;
}
