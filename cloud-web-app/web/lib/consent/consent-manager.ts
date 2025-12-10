/**
 * Consent Manager
 * Manages user consent for expensive/risky operations with cost/time/risk assessment
 */

import { randomUUID } from 'crypto';

export interface ConsentRequest {
  operation: string;
  description: string;
  cost: {
    monetary?: number;
    currency?: string;
    credits?: number;
  };
  time: {
    estimated: number;
    unit: 'seconds' | 'minutes' | 'hours';
  };
  risk: 'low' | 'medium' | 'high' | 'critical';
  resources: {
    network?: boolean;
    disk?: number;
    cpu?: boolean;
    memory?: number;
  };
  details?: string[];
  alternatives?: string[];
}

export interface ConsentResponse {
  chargeId: string;
  approved: boolean;
  timestamp: Date;
  userId?: string;
  budgetRemaining?: number;
  quotaRemaining?: number;
}

export interface Budget {
  userId: string;
  monthly: number;
  spent: number;
  remaining: number;
  currency: string;
}

export interface Quota {
  userId: string;
  resource: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

export class ConsentManager {
  private pendingRequests: Map<string, ConsentRequest> = new Map();
  private approvedCharges: Map<string, ConsentResponse> = new Map();
  private budgets: Map<string, Budget> = new Map();
  private quotas: Map<string, Quota[]> = new Map();

  async requestConsent(request: ConsentRequest, userId?: string): Promise<ConsentResponse> {
    const chargeId = randomUUID();

    // Check budget
    if (request.cost.monetary && userId) {
      const budget = await this.getBudget(userId);
      if (budget && request.cost.monetary > budget.remaining) {
        return {
          chargeId,
          approved: false,
          timestamp: new Date(),
          userId,
          budgetRemaining: budget.remaining
        };
      }
    }

    // Check quotas
    if (userId) {
      const quotaCheck = await this.checkQuotas(userId, request);
      if (!quotaCheck.allowed) {
        return {
          chargeId,
          approved: false,
          timestamp: new Date(),
          userId,
          quotaRemaining: quotaCheck.remaining
        };
      }
    }

    // Store pending request
    this.pendingRequests.set(chargeId, request);

    // For high/critical risk, require explicit approval
    if (request.risk === 'high' || request.risk === 'critical') {
      // Return pending, will be approved via UI
      return {
        chargeId,
        approved: false,
        timestamp: new Date(),
        userId
      };
    }

    // Auto-approve low/medium risk within budget
    return await this.approveConsent(chargeId, userId);
  }

  async approveConsent(chargeId: string, userId?: string): Promise<ConsentResponse> {
    const request = this.pendingRequests.get(chargeId);
    if (!request) {
      throw new Error(`Consent request not found: ${chargeId}`);
    }

    const response: ConsentResponse = {
      chargeId,
      approved: true,
      timestamp: new Date(),
      userId
    };

    // Update budget
    if (request.cost.monetary && userId) {
      await this.deductBudget(userId, request.cost.monetary);
      const budget = await this.getBudget(userId);
      response.budgetRemaining = budget?.remaining;
    }

    // Update quotas
    if (userId) {
      await this.updateQuotas(userId, request);
    }

    // Store approval
    this.approvedCharges.set(chargeId, response);
    this.pendingRequests.delete(chargeId);

    // Emit telemetry event
    await this.emitConsentEvent('consent.approved', {
      chargeId,
      operation: request.operation,
      cost: request.cost,
      risk: request.risk,
      userId
    });

    return response;
  }

  async rejectConsent(chargeId: string, userId?: string): Promise<void> {
    const request = this.pendingRequests.get(chargeId);
    if (!request) {
      throw new Error(`Consent request not found: ${chargeId}`);
    }

    this.pendingRequests.delete(chargeId);

    // Emit telemetry event
    await this.emitConsentEvent('consent.rejected', {
      chargeId,
      operation: request.operation,
      risk: request.risk,
      userId
    });
  }

  async getBudget(userId: string): Promise<Budget | null> {
    // In production, fetch from database
    let budget = this.budgets.get(userId);
    
    if (!budget) {
      // Create default budget
      budget = {
        userId,
        monthly: 100,
        spent: 0,
        remaining: 100,
        currency: 'USD'
      };
      this.budgets.set(userId, budget);
    }

    return budget;
  }

  async deductBudget(userId: string, amount: number): Promise<void> {
    const budget = await this.getBudget(userId);
    if (!budget) return;

    budget.spent += amount;
    budget.remaining = budget.monthly - budget.spent;

    // Emit telemetry event
    await this.emitConsentEvent('budget.deducted', {
      userId,
      amount,
      remaining: budget.remaining
    });
  }

  async getQuotas(userId: string): Promise<Quota[]> {
    // In production, fetch from database
    let quotas = this.quotas.get(userId);
    
    if (!quotas) {
      // Create default quotas
      const resetAt = new Date();
      resetAt.setHours(resetAt.getHours() + 24);

      quotas = [
        {
          userId,
          resource: 'api_calls',
          limit: 1000,
          used: 0,
          remaining: 1000,
          resetAt
        },
        {
          userId,
          resource: 'storage_mb',
          limit: 1000,
          used: 0,
          remaining: 1000,
          resetAt
        },
        {
          userId,
          resource: 'compute_minutes',
          limit: 100,
          used: 0,
          remaining: 100,
          resetAt
        }
      ];
      this.quotas.set(userId, quotas);
    }

    return quotas;
  }

  private async checkQuotas(userId: string, request: ConsentRequest): Promise<{
    allowed: boolean;
    remaining?: number;
  }> {
    const quotas = await this.getQuotas(userId);

    // Check network quota
    if (request.resources.network) {
      const apiQuota = quotas.find(q => q.resource === 'api_calls');
      if (apiQuota && apiQuota.remaining <= 0) {
        return { allowed: false, remaining: 0 };
      }
    }

    // Check disk quota
    if (request.resources.disk) {
      const storageQuota = quotas.find(q => q.resource === 'storage_mb');
      if (storageQuota && request.resources.disk > storageQuota.remaining) {
        return { allowed: false, remaining: storageQuota.remaining };
      }
    }

    // Check compute quota
    if (request.resources.cpu) {
      const computeQuota = quotas.find(q => q.resource === 'compute_minutes');
      const estimatedMinutes = request.time.unit === 'minutes' 
        ? request.time.estimated 
        : request.time.estimated / 60;
      
      if (computeQuota && estimatedMinutes > computeQuota.remaining) {
        return { allowed: false, remaining: computeQuota.remaining };
      }
    }

    return { allowed: true };
  }

  private async updateQuotas(userId: string, request: ConsentRequest): Promise<void> {
    const quotas = await this.getQuotas(userId);

    // Update network quota
    if (request.resources.network) {
      const apiQuota = quotas.find(q => q.resource === 'api_calls');
      if (apiQuota) {
        apiQuota.used += 1;
        apiQuota.remaining = apiQuota.limit - apiQuota.used;
      }
    }

    // Update disk quota
    if (request.resources.disk) {
      const storageQuota = quotas.find(q => q.resource === 'storage_mb');
      if (storageQuota) {
        storageQuota.used += request.resources.disk;
        storageQuota.remaining = storageQuota.limit - storageQuota.used;
      }
    }

    // Update compute quota
    if (request.resources.cpu) {
      const computeQuota = quotas.find(q => q.resource === 'compute_minutes');
      if (computeQuota) {
        const estimatedMinutes = request.time.unit === 'minutes' 
          ? request.time.estimated 
          : request.time.estimated / 60;
        
        computeQuota.used += estimatedMinutes;
        computeQuota.remaining = computeQuota.limit - computeQuota.used;
      }
    }
  }

  getPendingRequest(chargeId: string): ConsentRequest | undefined {
    return this.pendingRequests.get(chargeId);
  }

  getAllPendingRequests(): Array<{ chargeId: string; request: ConsentRequest }> {
    return Array.from(this.pendingRequests.entries()).map(([chargeId, request]) => ({
      chargeId,
      request
    }));
  }

  getApprovedCharge(chargeId: string): ConsentResponse | undefined {
    return this.approvedCharges.get(chargeId);
  }

  private async emitConsentEvent(eventType: string, data: any): Promise<void> {
    // Emit to observability system (OTel)
    try {
      await fetch('/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          timestamp: new Date().toISOString(),
          data
        })
      });
    } catch (error) {
      console.error('Failed to emit consent event:', error);
    }
  }
}

// Singleton instance
let consentManagerInstance: ConsentManager | null = null;

export function getConsentManager(): ConsentManager {
  if (!consentManagerInstance) {
    consentManagerInstance = new ConsentManager();
  }
  return consentManagerInstance;
}

export function resetConsentManager(): void {
  consentManagerInstance = null;
}

// Helper function to create consent requests for common operations
export function createConsentRequest(
  operation: string,
  options: Partial<ConsentRequest> = {}
): ConsentRequest {
  const defaults: Record<string, Partial<ConsentRequest>> = {
    'extension.install': {
      description: 'Install extension from marketplace',
      cost: { monetary: 0 },
      time: { estimated: 30, unit: 'seconds' },
      risk: 'low',
      resources: { network: true, disk: 10 }
    },
    'lsp.download': {
      description: 'Download language server',
      cost: { monetary: 0 },
      time: { estimated: 2, unit: 'minutes' },
      risk: 'low',
      resources: { network: true, disk: 50 }
    },
    'debug.start': {
      description: 'Start debug session',
      cost: { monetary: 0 },
      time: { estimated: 5, unit: 'minutes' },
      risk: 'medium',
      resources: { cpu: true, memory: 512 }
    },
    'git.push': {
      description: 'Push commits to remote repository',
      cost: { monetary: 0 },
      time: { estimated: 10, unit: 'seconds' },
      risk: 'medium',
      resources: { network: true }
    },
    'task.run': {
      description: 'Execute task',
      cost: { monetary: 0 },
      time: { estimated: 1, unit: 'minutes' },
      risk: 'low',
      resources: { cpu: true }
    },
    'test.run': {
      description: 'Run tests',
      cost: { monetary: 0 },
      time: { estimated: 2, unit: 'minutes' },
      risk: 'low',
      resources: { cpu: true }
    }
  };

  const base = defaults[operation] || {
    description: operation,
    cost: { monetary: 0 },
    time: { estimated: 1, unit: 'minutes' as const },
    risk: 'medium' as const,
    resources: {}
  };

  return {
    operation,
    ...base,
    ...options
  } as ConsentRequest;
}
