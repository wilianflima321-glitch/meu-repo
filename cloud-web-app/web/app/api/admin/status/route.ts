/**
 * Admin Status API - Health Check do Sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { cache } from '@/lib/redis-cache';
import emergencyController from '@/lib/emergency-mode';

interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  ai: 'healthy' | 'degraded' | 'down';
  websocket: 'healthy' | 'degraded' | 'down';
}

async function checkDatabase(): Promise<'healthy' | 'degraded' | 'down'> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    if (latency > 1000) return 'degraded';
    return 'healthy';
  } catch {
    return 'down';
  }
}

async function checkRedis(): Promise<'healthy' | 'degraded' | 'down'> {
  try {
    const health = await cache.healthCheck();
    if (!health.healthy) return 'down';
    if (health.latencyMs > 100) return 'degraded';
    return 'healthy';
  } catch {
    return 'down';
  }
}

async function checkAI(): Promise<'healthy' | 'degraded' | 'down'> {
  const state = emergencyController.getState();
  if (state.level === 'shutdown') return 'down';
  if (state.level === 'critical') return 'degraded';
  return 'healthy';
}

export const GET = withAdminAuth(
  async (request, { user }) => {
    const [database, redis, ai] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkAI(),
    ]);
    
    const status: SystemStatus = {
      api: 'healthy',
      database,
      redis,
      ai,
      websocket: 'healthy', // TODO: Implementar check real
    };
    
    // Se algum está down, API está degradada
    const hasDown = Object.values(status).some(s => s === 'down');
    const hasDegraded = Object.values(status).some(s => s === 'degraded');
    
    if (hasDown) status.api = 'degraded';
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  },
  'ops:dashboard:view'
);
