import { NextResponse } from 'next/server'
import cache from '@/lib/redis-cache'
import { capabilityResponse } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

function hasRedisConfig(): boolean {
  return Boolean(process.env.REDIS_HOST || process.env.UPSTASH_REDIS_REST_URL)
}

function hasRealtimeConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_COLLAB_WS_URL || process.env.COLLAB_WS_URL)
}

export async function GET() {
  const redisConfigured = hasRedisConfig()
  const realtimeConfigured = hasRealtimeConfig()

  if (!redisConfigured && !realtimeConfigured) {
    return capabilityResponse({
      error: 'MULTIPLAYER_RUNTIME_NOT_CONFIGURED',
      message: 'Multiplayer runtime is not configured in this environment.',
      status: 503,
      capability: 'MULTIPLAYER_RUNTIME',
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
      metadata: {
        redisConfigured,
        realtimeConfigured,
      },
    })
  }

  try {
    const stats = await cache.getStats()
    const redisConnected = stats.isRedisConnected

    const capabilityStatus = redisConnected && realtimeConfigured ? 'IMPLEMENTED' : 'PARTIAL'
    const healthStatus = redisConnected && realtimeConfigured ? 'healthy' : 'degraded'

    return NextResponse.json(
      {
        status: healthStatus,
        capability: 'MULTIPLAYER_RUNTIME',
        capabilityStatus,
        checks: {
          redisConfigured,
          realtimeConfigured,
          redisConnected,
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: healthStatus === 'healthy' ? 200 : 200,
        headers: {
          'x-aethel-capability': 'MULTIPLAYER_RUNTIME',
          'x-aethel-capability-status': capabilityStatus,
        },
      }
    )
  } catch (error) {
    console.error('Multiplayer health check failed:', error)
    return capabilityResponse({
      error: 'MULTIPLAYER_HEALTH_CHECK_FAILED',
      message: 'Failed to verify multiplayer runtime health.',
      status: 503,
      capability: 'MULTIPLAYER_RUNTIME',
      capabilityStatus: 'PARTIAL',
      metadata: {
        redisConfigured,
        realtimeConfigured,
      },
    })
  }
}
