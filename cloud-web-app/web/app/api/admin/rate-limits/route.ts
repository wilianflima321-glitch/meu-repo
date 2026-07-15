import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { rateLimiter } from '@/lib/rate-limiting';

const handler = async (_req: NextRequest) => {
  const configs = rateLimiter.listConfigs().map((config) => ({
    name: config.name,
    algorithm: config.algorithm,
    limit: config.limit,
    window: config.window,
    identifier: config.identifier,
  }));

  return NextResponse.json({
    success: true,
    configs,
  });
};

export const GET = withAdminAuth(handler, 'ops:settings:view');
