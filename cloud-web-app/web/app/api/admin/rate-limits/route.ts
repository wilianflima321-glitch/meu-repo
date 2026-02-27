import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { rateLimiter } from '@/lib/rate-limiting';
import { getRateLimitRuntimeDiagnostics } from '@/lib/server/rate-limit';

const handler = async (_req: NextRequest) => {
  const configs = rateLimiter.listConfigs().map((config) => ({
    name: config.name,
    algorithm: config.algorithm,
    limit: config.limit,
    window: config.window,
    identifier: config.identifier,
  }));
  const diagnostics = getRateLimitRuntimeDiagnostics();

  return NextResponse.json({
    success: true,
    configs,
    diagnostics,
    notes: [
      'configs reflect admin policy catalog',
      'runtime diagnostics reflect active enforcement backend for route-level limiter',
    ],
  });
};

export const GET = withAdminAuth(handler, 'ops:settings:view');
