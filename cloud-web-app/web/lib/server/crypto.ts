import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;

/**
 * Returns a secure 32-byte key for AES-256 derived from the ENCRYPTION_KEY env var.
 */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Cannot encrypt/decrypt BYOK keys.');
  }
  return crypto.scryptSync(secret, 'aethel-salt', 32);
}

/**
 * Encrypts a string (e.g., an API key) using AES-256-GCM.
 * The output format is: salt(64) + iv(16) + tag(16) + encryptedData
 */
export function encryptString(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default_fallback_do_not_use', salt, 32);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  // Pack everything into a single base64 string
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a string that was encrypted by `encryptString`.
 */
export function decryptString(encryptedText: string): string {
  const buffer = Buffer.from(encryptedText, 'base64');
  
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
  const tag = buffer.subarray(TAG_POSITION, TAG_POSITION + TAG_LENGTH);
  const encrypted = buffer.subarray(TAG_POSITION + TAG_LENGTH);
  
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default_fallback_do_not_use', salt, 32);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}
