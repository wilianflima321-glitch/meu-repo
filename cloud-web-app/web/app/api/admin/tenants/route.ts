import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// TENANTS API (Derived from user domains)
// =============================================================================

type TenantSummary = {
  id: string;
  domain: string;
  users: number;
  storageBytes: number;
  lastActiveAt: string | null;
  status: 'active' | 'inactive';
};

const ACTIVE_DAYS = 30;

function normalizeDomain(email?: string | null): string {
  if (!email || !email.includes('@')) return 'unknown';
  return email.split('@')[1]?.toLowerCase().trim() || 'unknown';
}

async function getHandler(_req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        storageUsed: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const byDomain = new Map<string, Omit<TenantSummary, 'id'>>();
    const now = Date.now();

    for (const user of users) {
      const domain = normalizeDomain(user.email);
      const existing = byDomain.get(domain) || {
        domain,
        users: 0,
        storageBytes: 0,
        lastActiveAt: null as string | null,
        status: 'inactive' as const,
      };

      existing.users += 1;
      existing.storageBytes += user.storageUsed || 0;

      const lastActive = (user.updatedAt || user.createdAt)?.getTime?.() ?? null;
      if (lastActive && (!existing.lastActiveAt || lastActive > new Date(existing.lastActiveAt).getTime())) {
        existing.lastActiveAt = new Date(lastActive).toISOString();
      }

      byDomain.set(domain, existing);
    }

    const tenants: TenantSummary[] = Array.from(byDomain.values())
      .map((tenant, index) => {
        const lastActiveMs = tenant.lastActiveAt ? new Date(tenant.lastActiveAt).getTime() : null;
        const isActive = lastActiveMs ? now - lastActiveMs <= ACTIVE_DAYS * 24 * 60 * 60 * 1000 : false;
        const status: TenantSummary['status'] = isActive ? 'active' : 'inactive';

        return {
          id: `${tenant.domain}-${index}`,
          ...tenant,
          status,
        };
      })
      .sort((a, b) => b.users - a.users);

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('[Tenants] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:users:view');
