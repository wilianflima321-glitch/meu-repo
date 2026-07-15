'use client';

/**
 * useQuota Hook - Client-side quota management
 * 
 * @module hooks/use-quota
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface QuotaUsage {
  quotaName: string;
  userId: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  percentUsed: number;
}

// Simplified client-side quota manager that uses API
class ClientQuotaManager {
  async getUsage(quotaName: string, userId: string): Promise<QuotaUsage> {
    try {
      const res = await fetch(`/api/quotas?name=${quotaName}&userId=${userId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch quota');
      }
      const data = await res.json();
      return data.usage as QuotaUsage;
    } catch {
      // Return default quota if API fails
      return {
        quotaName,
        userId,
        used: 0,
        limit: 1000,
        remaining: 1000,
        resetAt: new Date(Date.now() + 86400000),
        percentUsed: 0,
      };
    }
  }

  async consume(quotaName: string, userId: string, amount: number): Promise<QuotaUsage> {
    try {
      const res = await fetch('/api/quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotaName, userId, amount }),
      });
      if (!res.ok) {
        throw new Error('Failed to consume quota');
      }
      const data = await res.json();
      return data.usage as QuotaUsage;
    } catch {
      // Return current usage on error
      return this.getUsage(quotaName, userId);
    }
  }
}

export function useQuota(quotaName: string, userId: string) {
  const [usage, setUsage] = useState<QuotaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const manager = useMemo(() => new ClientQuotaManager(), []);
  
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await manager.getUsage(quotaName, userId);
      setUsage(data);
    } finally {
      setLoading(false);
    }
  }, [manager, quotaName, userId]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  const consume = useCallback(async (amount: number = 1) => {
    const newUsage = await manager.consume(quotaName, userId, amount);
    setUsage(newUsage);
    return newUsage;
  }, [manager, quotaName, userId]);
  
  return {
    usage,
    loading,
    refresh,
    consume,
    canUse: (amount: number = 1) => usage ? usage.remaining >= amount : false,
  };
}
