/**
 * Two-Factor Authentication (2FA/TOTP) System
 * 
 * Implementação completa de autenticação de dois fatores usando TOTP
 * (Time-based One-Time Password) compatível com Google Authenticator,
 * Authy, Microsoft Authenticator, etc.
 * 
 * @security RFC 6238 (TOTP), RFC 4226 (HOTP)
 */

import { createHmac, randomBytes } from 'crypto';
import type { BinaryLike } from 'crypto';
import * as QRCode from 'qrcode';
import { prisma } from '../db';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const TOTP_CONFIG = {
  // Nome do app que aparece no authenticator
  issuer: 'Aethel Engine',
  
  // Algoritmo de hash
  algorithm: 'sha1' as const,
  
  // Número de dígitos do código
  digits: 6,
  
  // Período em segundos (padrão Google Authenticator)
  period: 30,
  
  // Janelas de tempo para aceitar (±1 = aceita códigos 30s antes/depois)
  window: 1,
  
  // Tamanho do secret em bytes
  secretSize: 20,
  
  // Número de códigos de backup
  backupCodesCount: 10,
};

// ============================================================================
// TIPOS
// ============================================================================

export interface TwoFactorSetup {
  secret: string;
  secretBase32: string;
  qrCodeDataURL: string;
  otpauthUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyResult {
  valid: boolean;
  usedBackupCode?: boolean;
  remainingBackupCodes?: number;
}

export interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt?: Date;
  backupCodesRemaining: number;
}

// ============================================================================
// BASE32 ENCODING
// ============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ============================================================================
// TOTP CORE
// ============================================================================

/**
 * Gera um secret aleatório
 */
export function generateSecret(): { raw: Buffer; base32: string } {
  const raw = randomBytes(TOTP_CONFIG.secretSize);
  const base32 = base32Encode(raw);
  return { raw, base32 };
}

/**
 * Gera URL otpauth:// para QR code
 */
export function generateOtpauthUrl(
  accountName: string,
  secret: string
): string {
  const params = new URLSearchParams({
    secret,
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm.toUpperCase(),
    digits: TOTP_CONFIG.digits.toString(),
    period: TOTP_CONFIG.period.toString(),
  });

  const label = `${TOTP_CONFIG.issuer}:${encodeURIComponent(accountName)}`;
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Calcula o código TOTP para um timestamp
 */
export function generateTOTP(secret: Buffer, timestamp?: number): string {
  const time = timestamp || Date.now();
  const counter = Math.floor(time / 1000 / TOTP_CONFIG.period);

  // Converte counter para buffer de 8 bytes (big-endian)
  const counterBuffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = counter & 0xff;
    counter >>> 8;
  }

  // HMAC-SHA1
  const hmac = createHmac(TOTP_CONFIG.algorithm, secret as BinaryLike);
  hmac.update(counterBuffer as BinaryLike);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_CONFIG.digits);
  return otp.toString().padStart(TOTP_CONFIG.digits, '0');
}

/**
 * Verifica um código TOTP
 */
export function verifyTOTP(
  secret: Buffer,
  code: string,
  timestamp?: number
): boolean {
  const time = timestamp || Date.now();
  const window = TOTP_CONFIG.window;

  // Verifica código em janela de tempo (±window períodos)
  for (let i = -window; i <= window; i++) {
    const adjustedTime = time + i * TOTP_CONFIG.period * 1000;
    const expectedCode = generateTOTP(secret, adjustedTime);

    // Comparação timing-safe
    if (timingSafeEqual(code, expectedCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Comparação timing-safe
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// BACKUP CODES
// ============================================================================

/**
 * Gera códigos de backup
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < TOTP_CONFIG.backupCodesCount; i++) {
    // Formato: XXXX-XXXX (8 caracteres alfanuméricos)
    const raw = randomBytes(4);
    const code = raw.toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  
  return codes;
}

/**
 * Hash de código de backup para armazenamento seguro
 */
export function hashBackupCode(code: string): string {
  return createHmac('sha256', process.env.BACKUP_CODE_SECRET || 'backup-secret')
    .update(code.replace('-', '').toUpperCase())
    .digest('hex');
}

// ============================================================================
// SERVIÇO PRINCIPAL
// ============================================================================

export class TwoFactorService {
  /**
   * Inicia o setup de 2FA para um usuário
   */
  async setupTwoFactor(userId: string, email: string): Promise<TwoFactorSetup> {
    // Gera secret e backup codes
    const { raw, base32 } = generateSecret();
    const backupCodes = generateBackupCodes();
    const otpauthUrl = generateOtpauthUrl(email, base32);

    // Gera QR code
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Salva setup pendente (não ativado até verificação)
    await prisma.twoFactorSetup.upsert({
      where: { userId },
      create: {
        userId,
        secret: raw.toString('base64'),
        backupCodes: backupCodes.map(hashBackupCode),
        verified: false,
      },
      update: {
        secret: raw.toString('base64'),
        backupCodes: backupCodes.map(hashBackupCode),
        verified: false,
      },
    });

    return {
      secret: raw.toString('hex'),
      secretBase32: base32,
      qrCodeDataURL,
      otpauthUrl,
      backupCodes, // Mostrar apenas uma vez!
    };
  }

  /**
   * Verifica e ativa 2FA
   */
  async verifyAndEnable(userId: string, code: string): Promise<boolean> {
    const setup = await prisma.twoFactorSetup.findUnique({
      where: { userId },
    });

    if (!setup) {
      throw new Error('2FA setup not found');
    }

    const secret = Buffer.from(setup.secret, 'base64');
    
    if (!verifyTOTP(secret, code)) {
      return false;
    }

    // Ativa 2FA
    await prisma.twoFactorSetup.update({
      where: { userId },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return true;
  }

  /**
   * Verifica código 2FA no login
   */
  async verify(
    userId: string,
    code: string
  ): Promise<TwoFactorVerifyResult> {
    const setup = await prisma.twoFactorSetup.findUnique({
      where: { userId },
    });

    if (!setup || !setup.verified) {
      return { valid: false };
    }

    // Tenta verificar como TOTP
    const secret = Buffer.from(setup.secret, 'base64');
    if (verifyTOTP(secret, code)) {
      return { valid: true, usedBackupCode: false };
    }

    // Tenta como código de backup
    const codeHash = hashBackupCode(code);
    const backupIndex = setup.backupCodes.indexOf(codeHash);

    if (backupIndex !== -1) {
      // Remove código usado
      const updatedCodes = [...setup.backupCodes];
      updatedCodes.splice(backupIndex, 1);

      await prisma.twoFactorSetup.update({
        where: { userId },
        data: { backupCodes: updatedCodes },
      });

      return {
        valid: true,
        usedBackupCode: true,
        remainingBackupCodes: updatedCodes.length,
      };
    }

    return { valid: false };
  }

  /**
   * Desativa 2FA
   */
  async disable(userId: string, code: string): Promise<boolean> {
    const result = await this.verify(userId, code);

    if (!result.valid) {
      return false;
    }

    await prisma.twoFactorSetup.delete({
      where: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    return true;
  }

  /**
   * Regenera códigos de backup
   */
  async regenerateBackupCodes(
    userId: string,
    code: string
  ): Promise<string[] | null> {
    const result = await this.verify(userId, code);

    if (!result.valid || result.usedBackupCode) {
      return null; // Não permite usar backup code para regenerar
    }

    const newCodes = generateBackupCodes();

    await prisma.twoFactorSetup.update({
      where: { userId },
      data: { backupCodes: newCodes.map(hashBackupCode) },
    });

    return newCodes;
  }

  /**
   * Obtém status do 2FA
   */
  async getStatus(userId: string): Promise<TwoFactorStatus> {
    const setup = await prisma.twoFactorSetup.findUnique({
      where: { userId },
    });

    if (!setup || !setup.verified) {
      return {
        enabled: false,
        backupCodesRemaining: 0,
      };
    }

    return {
      enabled: true,
      verifiedAt: setup.verifiedAt || undefined,
      backupCodesRemaining: setup.backupCodes.length,
    };
  }
}

// Singleton
export const twoFactorService = new TwoFactorService();
