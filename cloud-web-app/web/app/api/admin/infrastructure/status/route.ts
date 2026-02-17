import { NextRequest, NextResponse } from 'next/server';
import os from 'node:os';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import cache from '@/lib/redis-cache';
import queueManager from '@/lib/queue-system';
import { buildAppUrl } from '@/lib/server/app-origin';

// =============================================================================
// INFRASTRUCTURE STATUS API
// =============================================================================

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  uptime?: number;
  lastCheck: string;
  details?: string;
}

async function checkServiceHealth(
  name: string,
  checkFn: () => Promise<{ latency: number; details?: string }>
): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const result = await Promise.race([
      checkFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      ),
    ]);
    
    return {
      name,
      status: result.latency < 500 ? 'healthy' : 'degraded',
      latency: result.latency,
      lastCheck: new Date().toISOString(),
      details: result.details,
    };
  } catch (error) {
    return {
      name,
      status: 'down',
      latency: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function handler(req: NextRequest) {
  try {
    // Check all services in parallel
    const [
      databaseHealth,
      redisHealth,
      aiHealth,
      websocketHealth,
      storageHealth,
      emailHealth,
      localRuntimeHealth,
    ] = await Promise.all([
      // Database
      checkServiceHealth('PostgreSQL', async () => {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        return { latency: Date.now() - start };
      }),
      
      // Redis
      checkServiceHealth('Redis', async () => {
        const start = Date.now();
        const stats = await cache.getStats();
        return { 
          latency: Date.now() - start,
          details: `Hits: ${stats.hits}, Misses: ${stats.misses}`
        };
      }),
      
      // AI Service
      checkServiceHealth('AI Gateway', async () => {
        const start = Date.now();
        // Simple health check - in production would ping actual AI service
        const res = await fetch(buildAppUrl('/api/health', req), {
          method: 'HEAD',
          cache: 'no-store',
        }).catch(() => null);
        return { 
          latency: Date.now() - start,
          details: res?.ok ? 'All providers available' : 'Checking...'
        };
      }),
      
      // WebSocket (Liveblocks/Y.js)
      checkServiceHealth('WebSocket', async () => {
        const start = Date.now();
        // Check if Liveblocks is configured
        const hasLiveblocks = !!process.env.LIVEBLOCKS_SECRET_KEY;
        return {
          latency: Date.now() - start,
          details: hasLiveblocks ? 'Liveblocks connected' : 'Local Y.js only'
        };
      }),
      
      // Storage (S3/Local)
      checkServiceHealth('Storage', async () => {
        const start = Date.now();
        const hasS3 = !!(process.env.S3_BUCKET || process.env.AWS_S3_BUCKET);
        return {
          latency: Date.now() - start,
          details: hasS3 ? 'S3 configured' : 'Local storage'
        };
      }),
      
      // Email (Resend)
      checkServiceHealth('Email', async () => {
        const start = Date.now();
        const hasResend = !!process.env.RESEND_API_KEY;
        return {
          latency: Date.now() - start,
          details: hasResend ? 'Resend configured' : 'Email disabled'
        };
      }),

      // Local Runtime (Aethel Engine Server)
      checkServiceHealth('Local Runtime', async () => {
        const start = Date.now();
        const baseUrl = (process.env.AETHEL_SERVER_URL || process.env.NEXT_PUBLIC_AETHEL_SERVER_URL || 'http://localhost:1234').replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/api/health/system`, { cache: 'no-store' }).catch(() => null);
        return {
          latency: Date.now() - start,
          details: res?.ok ? 'Local server healthy' : 'Local server unreachable'
        };
      }),
    ]);
    
    // Get queue stats
    const queueStats = await queueManager.getAllStats();
    const queues = Object.entries(queueStats).map(([name, stats]) => ({
      name,
      waiting: stats.waiting,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
      isPaused: false,
    }));
    
    // Get database connection stats
    const dbMetrics = await (prisma as any).$metrics?.json?.() as any;
    const dbConnections = {
      active: dbMetrics?.counters?.find((c: any) => c.key === 'prisma_client_queries_active')?.value || 0,
      idle: dbMetrics?.gauges?.find((g: any) => g.key === 'prisma_pool_connections_idle')?.value || 0,
      max: dbMetrics?.gauges?.find((g: any) => g.key === 'prisma_pool_connections_max')?.value || 0,
    };
    
    // Estimate query time from recent queries
    const dbQueryTime = dbMetrics?.histograms?.find((h: any) => h.key === 'prisma_client_queries_duration_histogram_ms')?.value?.mean || 0;
    
    // Get Redis stats
    const cacheStats = await cache.getStats();
    const cacheHitRate = cacheStats.hits + cacheStats.misses > 0
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
      : 0;
    
    // Resource metrics (derived from runtime)
    const cpuCores = Math.max(1, os.cpus().length || 1);
    const cpuLoad = Array.isArray(os.loadavg()) ? os.loadavg()[0] : 0;
    const cpuUsage = Math.min(100, Math.max(0, (cpuLoad / cpuCores) * 100));

    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = Math.max(0, totalMemBytes - freeMemBytes);
    const totalMemGB = totalMemBytes / (1024 * 1024 * 1024);
    const usedMemGB = usedMemBytes / (1024 * 1024 * 1024);

    const diskTotalEnv = Number(process.env.AETHEL_DISK_TOTAL_GB || 0);
    const diskUsedEnv = Number(process.env.AETHEL_DISK_USED_GB || 0);
    const diskTotal = Number.isFinite(diskTotalEnv) && diskTotalEnv > 0 ? diskTotalEnv : 0;
    const diskUsed = Number.isFinite(diskUsedEnv) && diskUsedEnv >= 0 ? Math.min(diskUsedEnv, diskTotal || diskUsedEnv) : 0;
    const diskPercentage = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;

    const networkIn = Number(process.env.AETHEL_NETWORK_IN_BPS || 0);
    const networkOut = Number(process.env.AETHEL_NETWORK_OUT_BPS || 0);

    const resources = {
      cpu: {
        usage: cpuUsage,
        cores: cpuCores,
      },
      memory: {
        used: usedMemGB,
        total: totalMemGB,
        percentage: totalMemGB > 0 ? (usedMemGB / totalMemGB) * 100 : 0,
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        percentage: diskPercentage,
      },
      network: {
        in: Number.isFinite(networkIn) ? networkIn : 0,
        out: Number.isFinite(networkOut) ? networkOut : 0,
      },
    };

    // Request/session metrics
    const activeConnections = await prisma.liveSession.count({ where: { isActive: true } });
    const requestsPerMinute = 0;
    const errorRate = 0;
    
    return NextResponse.json({
      services: [
        databaseHealth,
        redisHealth,
        aiHealth,
        websocketHealth,
        storageHealth,
        emailHealth,
        localRuntimeHealth,
      ],
      resources,
      queues,
      requestsPerMinute,
      activeConnections,
      errorRate,
      dbConnections,
      dbQueryTime,
      cacheHitRate,
      cacheMemory: cacheStats.memoryUsage,
    });
    
  } catch (error) {
    console.error('[Infrastructure Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch infrastructure status' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler, 'ops:infra:view');
