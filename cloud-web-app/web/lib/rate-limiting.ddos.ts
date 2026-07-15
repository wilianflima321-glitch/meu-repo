/**
 * DDoS guardrail built on top of the core rate limiter.
 */

import { createComponentLogger } from '@/lib/observability/logger';

import { RateLimiter } from './rate-limiting';

const log = createComponentLogger('rate-limiting.ddos');

// ============================================================================
// DDOS PROTECTION
// ============================================================================

export class DDoSProtection {
  private rateLimiter: RateLimiter;
  private blacklist: Set<string> = new Set();
  private suspiciousActivity: Map<string, number> = new Map();
  private threshold = 10; // Atividade suspeita threshold

  constructor() {
    this.rateLimiter = new RateLimiter();

    // Rate limit muito agressivo para proteção
    this.rateLimiter.addConfig({
      name: 'ddos_protection',
      algorithm: 'sliding_window',
      limit: 1000,
      window: 60,
      identifier: 'ip',
      onLimitReached: (key, info) => {
        this.handleSuspiciousIP(key);
      },
    });
  }

  /**
   * Verifica se IP está bloqueado
   */
  isBlocked(ip: string): boolean {
    return this.blacklist.has(ip);
  }

  /**
   * Verifica request contra DDoS
   */
  async check(ip: string): Promise<{
    allowed: boolean;
    blocked: boolean;
    suspicious: boolean;
  }> {
    if (this.blacklist.has(ip)) {
      return { allowed: false, blocked: true, suspicious: false };
    }

    const result = await this.rateLimiter.check('ddos_protection', ip);
    const suspicious = this.isSuspicious(ip);

    return {
      allowed: result.allowed && !suspicious,
      blocked: false,
      suspicious,
    };
  }

  /**
   * Registra atividade suspeita
   */
  private handleSuspiciousIP(key: string): void {
    const ip = key.split(':').pop() || '';
    const count = (this.suspiciousActivity.get(ip) || 0) + 1;
    this.suspiciousActivity.set(ip, count);

    if (count >= this.threshold) {
      this.blacklist.add(ip);
      log.info(`[DDoS] IP blocked: ${ip}`);
    }
  }

  /**
   * Verifica se IP é suspeito
   */
  private isSuspicious(ip: string): boolean {
    const count = this.suspiciousActivity.get(ip) || 0;
    return count >= this.threshold / 2;
  }

  /**
   * Remove IP da blacklist
   */
  unblock(ip: string): void {
    this.blacklist.delete(ip);
    this.suspiciousActivity.delete(ip);
  }

  /**
   * Lista IPs bloqueados
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blacklist);
  }
}
