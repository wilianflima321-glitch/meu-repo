import type { ServiceConfig } from './health-check.types';

type RegisterHealthService = (config: ServiceConfig) => void;

export function registerDefaultHealthServices(registerService: RegisterHealthService): void {

// Database check
registerService({
  name: 'database',
  type: 'database',
  critical: true,
  timeout: 5000,
  interval: 30000,
  check: async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/db', { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      return {
        healthy: response.ok && data.connected,
        latency: Date.now() - start,
        metadata: { version: data.version },
      };
    } catch (e) {
      return { healthy: false, message: String(e) };
    }
  },
});

// Redis/Cache check
registerService({
  name: 'cache',
  type: 'cache',
  critical: false,
  timeout: 3000,
  interval: 30000,
  check: async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/cache', { signal: AbortSignal.timeout(3000) });
      return {
        healthy: response.ok,
        latency: Date.now() - start,
      };
    } catch {
      return { healthy: false, message: 'Cache unavailable' };
    }
  },
});

// Storage check
registerService({
  name: 'storage',
  type: 'storage',
  critical: true,
  timeout: 5000,
  interval: 60000,
  check: async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/storage', { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      return {
        healthy: response.ok,
        latency: Date.now() - start,
        metadata: { usedSpace: data.used, totalSpace: data.total },
      };
    } catch {
      return { healthy: false, message: 'Storage unavailable' };
    }
  },
});

// Payment (Stripe) check
registerService({
  name: 'payment',
  type: 'payment',
  critical: true,
  timeout: 10000,
  interval: 120000,
  check: async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/stripe', { signal: AbortSignal.timeout(10000) });
      return {
        healthy: response.ok,
        latency: Date.now() - start,
      };
    } catch {
      return { healthy: false, message: 'Payment service unavailable' };
    }
  },
});

// AI service check
registerService({
  name: 'ai',
  type: 'ai',
  critical: false,
  timeout: 15000,
  interval: 60000,
  check: async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/ai', { signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      return {
        healthy: response.ok,
        latency: Date.now() - start,
        metadata: { model: data.model, tokensRemaining: data.tokensRemaining },
      };
    } catch {
      return { healthy: false, message: 'AI service unavailable' };
    }
  },
});

// Email service check
registerService({
  name: 'email',
  type: 'email',
  critical: false,
  timeout: 5000,
  interval: 120000,
  check: async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/email', { signal: AbortSignal.timeout(5000) });
      return {
        healthy: response.ok,
        latency: Date.now() - start,
      };
    } catch {
      return { healthy: false, message: 'Email service unavailable' };
    }
  },
});
}
