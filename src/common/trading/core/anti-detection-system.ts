/**
 * Anti-Detection System
 * Faz a IA parecer um trader humano para evitar detecção
 */

import { injectable } from 'inversify';
import { HumanBehaviorConfig, AntiDetectionMetrics, OrderRequest } from './trading-types';

/**
 * Gaussian random number generator (Box-Muller transform)
 */
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Anti-Detection System - Human Behavior Mimicry
 */
@injectable()
export class AntiDetectionSystem {
  private config: HumanBehaviorConfig;
  private sessionStartTime: number;
  private actionsThisHour: number = 0;
  private lastActionTime: number = 0;
  private orderSizes: number[] = [];
  private reactionTimes: number[] = [];

  constructor() {
    this.config = this.getDefaultConfig();
    this.sessionStartTime = Date.now();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get humanized delay before action
   */
  getHumanizedDelay(): number {
    const { reactionTime } = this.config;
    
    let delay: number;
    if (reactionTime.distribution === 'gaussian') {
      // Gaussian distribution for more natural variance
      delay = gaussianRandom(reactionTime.baseMs, reactionTime.varianceMs);
    } else {
      // Uniform distribution
      delay = reactionTime.baseMs + (Math.random() * 2 - 1) * reactionTime.varianceMs;
    }

    // Apply fatigue factor (slower as day progresses)
    const hoursSinceStart = (Date.now() - this.sessionStartTime) / (1000 * 60 * 60);
    const fatigueFactor = 1 + (hoursSinceStart * 0.05); // 5% slower per hour
    delay *= fatigueFactor;

    // Add micro-variations
    delay += Math.random() * 50; // 0-50ms micro-jitter

    // Ensure minimum human-possible delay
    return Math.max(150, Math.min(delay, 2000));
  }

  /**
   * Check if trading is allowed at current time
   */
  isTradingTimeAllowed(): { allowed: boolean; reason?: string } {
    const { tradingHours } = this.config;
    const now = new Date();
    
    // Convert to trading timezone
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tradingHours.timezone,
    };
    const timeStr = now.toLocaleTimeString('en-US', options);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    // Parse trading hours
    const [startH, startM] = tradingHours.start.split(':').map(Number);
    const [endH, endM] = tradingHours.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Check if within trading hours
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return {
        allowed: false,
        reason: `Fora do horário de operação (${tradingHours.start} - ${tradingHours.end})`,
      };
    }

    // Check lunch break
    if (tradingHours.lunchBreak) {
      const [lunchStartH, lunchStartM] = tradingHours.lunchBreak.start.split(':').map(Number);
      const [lunchEndH, lunchEndM] = tradingHours.lunchBreak.end.split(':').map(Number);
      const lunchStart = lunchStartH * 60 + lunchStartM;
      const lunchEnd = lunchEndH * 60 + lunchEndM;

      if (currentMinutes >= lunchStart && currentMinutes <= lunchEnd) {
        // Reduce activity during lunch, but don't block completely
        if (Math.random() < 0.7) { // 70% chance to skip
          return {
            allowed: false,
            reason: 'Horário de almoço - atividade reduzida',
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Humanize order - split large orders, add variance
   */
  humanizeOrder(order: OrderRequest): OrderRequest[] {
    const { orderPatterns } = this.config;
    const orders: OrderRequest[] = [];

    // Check if order should be split
    if (orderPatterns.splitLargeOrders && order.quantity > orderPatterns.maxOrderSize) {
      // Split into smaller chunks
      let remaining = order.quantity;
      while (remaining > 0) {
        let chunkSize = Math.min(remaining, orderPatterns.maxOrderSize);
        
        // Randomize chunk size
        if (orderPatterns.randomizeSize && chunkSize > 10) {
          const variance = chunkSize * 0.2; // 20% variance
          chunkSize = Math.round(gaussianRandom(chunkSize, variance));
          chunkSize = Math.max(1, Math.min(chunkSize, remaining));
        }

        orders.push({
          ...order,
          quantity: chunkSize,
          metadata: {
            ...order.metadata,
            isChunk: true,
            originalQuantity: order.quantity,
          },
        });

        remaining -= chunkSize;
      }
    } else {
      // Single order, maybe randomize size slightly
      let quantity = order.quantity;
      if (orderPatterns.randomizeSize && quantity > 10) {
        const variance = quantity * 0.05; // 5% variance
        quantity = Math.round(gaussianRandom(quantity, variance));
        quantity = Math.max(1, quantity);
      }

      orders.push({
        ...order,
        quantity,
      });
    }

    // Record for pattern analysis
    orders.forEach(o => this.orderSizes.push(o.quantity));

    return orders;
  }

  /**
   * Check if we can perform another action (rate limiting)
   */
  canPerformAction(): { allowed: boolean; waitMs?: number; reason?: string } {
    const { activityPatterns } = this.config;
    const now = Date.now();

    // Check hourly limit
    if (this.actionsThisHour >= activityPatterns.maxTradesPerHour) {
      return {
        allowed: false,
        reason: `Limite horário atingido (${activityPatterns.maxTradesPerHour} ações)`,
      };
    }

    // Check cooldown after last action
    const timeSinceLastAction = now - this.lastActionTime;
    if (timeSinceLastAction < activityPatterns.cooldownAfterTrade) {
      const waitMs = activityPatterns.cooldownAfterTrade - timeSinceLastAction;
      return {
        allowed: false,
        waitMs,
        reason: `Aguardando cooldown (${Math.round(waitMs / 1000)}s)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record that an action was performed
   */
  recordAction(): void {
    this.actionsThisHour++;
    this.lastActionTime = Date.now();
    this.reactionTimes.push(this.getHumanizedDelay());

    // Reset hourly counter
    setTimeout(() => {
      this.actionsThisHour = Math.max(0, this.actionsThisHour - 1);
    }, 60 * 60 * 1000);
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics(): AntiDetectionMetrics {
    const humanScore = this.calculateHumanScore();
    
    return {
      humanScore,
      patternVariance: this.calculatePatternVariance(),
      timingRandomness: this.calculateTimingRandomness(),
      sizeDistribution: this.getSizeDistribution(),
      warnings: this.getWarnings(humanScore),
    };
  }

  /**
   * Generate mouse movement path (Bezier curves)
   */
  generateMousePath(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): Array<{ x: number; y: number; delay: number }> {
    const path: Array<{ x: number; y: number; delay: number }> = [];
    const steps = Math.floor(Math.random() * 20) + 10; // 10-30 steps
    
    // Generate control points for Bezier curve
    const cp1 = {
      x: from.x + (to.x - from.x) * 0.3 + (Math.random() - 0.5) * 100,
      y: from.y + (to.y - from.y) * 0.3 + (Math.random() - 0.5) * 100,
    };
    const cp2 = {
      x: from.x + (to.x - from.x) * 0.7 + (Math.random() - 0.5) * 100,
      y: from.y + (to.y - from.y) * 0.7 + (Math.random() - 0.5) * 100,
    };

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Cubic Bezier
      const x = Math.pow(1 - t, 3) * from.x +
                3 * Math.pow(1 - t, 2) * t * cp1.x +
                3 * (1 - t) * Math.pow(t, 2) * cp2.x +
                Math.pow(t, 3) * to.x;
      const y = Math.pow(1 - t, 3) * from.y +
                3 * Math.pow(1 - t, 2) * t * cp1.y +
                3 * (1 - t) * Math.pow(t, 2) * cp2.y +
                Math.pow(t, 3) * to.y;

      // Add human tremor
      const tremor = {
        x: x + (Math.random() - 0.5) * 2,
        y: y + (Math.random() - 0.5) * 2,
      };

      // Variable delay between movements
      const delay = gaussianRandom(10, 5);

      path.push({
        x: Math.round(tremor.x),
        y: Math.round(tremor.y),
        delay: Math.max(5, Math.round(delay)),
      });
    }

    return path;
  }

  /**
   * Generate typing pattern for text input
   */
  generateTypingPattern(text: string): Array<{ char: string; delay: number; typo?: boolean }> {
    const pattern: Array<{ char: string; delay: number; typo?: boolean }> = [];
    const baseWPM = gaussianRandom(60, 15); // 45-75 WPM range
    const baseDelayMs = 60000 / (baseWPM * 5); // Average 5 chars per word

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Variable delay between keystrokes
      let delay = gaussianRandom(baseDelayMs, baseDelayMs * 0.3);
      
      // Longer delay after punctuation
      if (['.', ',', '!', '?', ';', ':'].includes(text[i - 1] || '')) {
        delay += gaussianRandom(200, 50);
      }
      
      // Longer delay for shift key (capitals)
      if (char === char.toUpperCase() && char !== char.toLowerCase()) {
        delay += gaussianRandom(50, 20);
      }

      // Occasional typo (2% chance)
      const isTypo = Math.random() < 0.02;
      if (isTypo && i < text.length - 1) {
        // Add wrong character
        const wrongChar = this.getNearbyKey(char);
        pattern.push({
          char: wrongChar,
          delay: Math.max(30, Math.round(delay)),
          typo: true,
        });
        // Add backspace
        pattern.push({
          char: '\b',
          delay: Math.round(gaussianRandom(150, 50)),
        });
        // Add correct character
        pattern.push({
          char,
          delay: Math.round(gaussianRandom(100, 30)),
        });
      } else {
        pattern.push({
          char,
          delay: Math.max(30, Math.round(delay)),
        });
      }
    }

    return pattern;
  }

  /**
   * Update configuration
   */
  updateConfig(partial: Partial<HumanBehaviorConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private calculateHumanScore(): number {
    let score = 100;

    // Check timing variance
    if (this.reactionTimes.length > 5) {
      const variance = this.calculateVariance(this.reactionTimes);
      const stdDev = Math.sqrt(variance);
      
      // Too consistent = bot-like
      if (stdDev < 50) score -= 20;
      // Good variance = human-like
      if (stdDev > 100 && stdDev < 300) score += 10;
      // Too random = also suspicious
      if (stdDev > 500) score -= 10;
    }

    // Check order size distribution
    if (this.orderSizes.length > 5) {
      const uniqueSizes = new Set(this.orderSizes).size;
      const uniqueRatio = uniqueSizes / this.orderSizes.length;
      
      // All same size = bot-like
      if (uniqueRatio < 0.3) score -= 15;
      // Good variety = human-like
      if (uniqueRatio > 0.6) score += 5;
    }

    // Check activity patterns
    const hoursActive = (Date.now() - this.sessionStartTime) / (1000 * 60 * 60);
    if (hoursActive > 12) score -= 10; // Too long session

    return Math.max(0, Math.min(100, score));
  }

  private calculatePatternVariance(): number {
    if (this.orderSizes.length < 3) return 0;
    return this.calculateVariance(this.orderSizes);
  }

  private calculateTimingRandomness(): number {
    if (this.reactionTimes.length < 3) return 0;
    const variance = this.calculateVariance(this.reactionTimes);
    const mean = this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length;
    return variance / (mean * mean); // Coefficient of variation squared
  }

  private getSizeDistribution(): string {
    if (this.orderSizes.length < 5) return 'insufficient data';
    
    const uniqueSizes = new Set(this.orderSizes).size;
    const ratio = uniqueSizes / this.orderSizes.length;
    
    if (ratio < 0.3) return 'uniform (suspicious)';
    if (ratio < 0.6) return 'moderate variance';
    return 'high variance (good)';
  }

  private getWarnings(humanScore: number): string[] {
    const warnings: string[] = [];
    
    if (humanScore < 50) {
      warnings.push('Human score baixo - risco de detecção');
    }
    
    if (this.actionsThisHour > this.config.activityPatterns.maxTradesPerHour * 0.8) {
      warnings.push('Aproximando limite de ações por hora');
    }

    const hoursActive = (Date.now() - this.sessionStartTime) / (1000 * 60 * 60);
    if (hoursActive > 8) {
      warnings.push('Sessão muito longa - considere reiniciar');
    }

    return warnings;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private getNearbyKey(char: string): string {
    const keyboard: Record<string, string[]> = {
      'q': ['w', 'a', '1', '2'],
      'w': ['q', 'e', 'a', 's', '2', '3'],
      'e': ['w', 'r', 's', 'd', '3', '4'],
      'r': ['e', 't', 'd', 'f', '4', '5'],
      't': ['r', 'y', 'f', 'g', '5', '6'],
      'y': ['t', 'u', 'g', 'h', '6', '7'],
      'u': ['y', 'i', 'h', 'j', '7', '8'],
      'i': ['u', 'o', 'j', 'k', '8', '9'],
      'o': ['i', 'p', 'k', 'l', '9', '0'],
      'p': ['o', 'l', '0'],
      'a': ['q', 'w', 's', 'z'],
      's': ['a', 'w', 'e', 'd', 'z', 'x'],
      'd': ['s', 'e', 'r', 'f', 'x', 'c'],
      'f': ['d', 'r', 't', 'g', 'c', 'v'],
      'g': ['f', 't', 'y', 'h', 'v', 'b'],
      'h': ['g', 'y', 'u', 'j', 'b', 'n'],
      'j': ['h', 'u', 'i', 'k', 'n', 'm'],
      'k': ['j', 'i', 'o', 'l', 'm'],
      'l': ['k', 'o', 'p'],
      'z': ['a', 's', 'x'],
      'x': ['z', 's', 'd', 'c'],
      'c': ['x', 'd', 'f', 'v'],
      'v': ['c', 'f', 'g', 'b'],
      'b': ['v', 'g', 'h', 'n'],
      'n': ['b', 'h', 'j', 'm'],
      'm': ['n', 'j', 'k'],
    };

    const nearby = keyboard[char.toLowerCase()];
    if (nearby && nearby.length > 0) {
      const randomNearby = nearby[Math.floor(Math.random() * nearby.length)];
      return char === char.toUpperCase() ? randomNearby.toUpperCase() : randomNearby;
    }
    return char;
  }

  private getDefaultConfig(): HumanBehaviorConfig {
    return {
      reactionTime: {
        baseMs: 400,
        varianceMs: 200,
        distribution: 'gaussian',
      },
      tradingHours: {
        start: '09:30',
        end: '17:00',
        lunchBreak: { start: '12:00', end: '13:00' },
        timezone: 'America/Sao_Paulo',
      },
      orderPatterns: {
        splitLargeOrders: true,
        maxOrderSize: 1000,
        randomizeSize: true,
        useIceberg: true,
      },
      activityPatterns: {
        maxTradesPerHour: 20,
        cooldownAfterTrade: 30000, // 30 seconds
        simulateFatigue: true,
      },
    };
  }
}
