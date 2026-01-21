import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// COMPLIANCE ADMIN API (Derived from audit log)
// =============================================================================

type CompliancePolicy = {
  id: string;
  name: string;
  status: 'active' | 'review' | 'inactive';
  lastAuditAt: string | null;
  incidents: number;
};

const POLICIES: CompliancePolicy[] = [
  { id: 'gdpr', name: 'GDPR Compliance', status: 'active', lastAuditAt: null, incidents: 0 },
  { id: 'lgpd', name: 'LGPD Compliance', status: 'active', lastAuditAt: null, incidents: 0 },
  { id: 'data-retention', name: 'Data Retention Policy', status: 'review', lastAuditAt: null, incidents: 0 },
  { id: 'security-audit', name: 'Security Audit', status: 'active', lastAuditAt: null, incidents: 0 },
];

async function getHandler(_req: NextRequest) {
  try {
    const lastAudit = await prisma.auditLog.findFirst({
      where: { category: 'compliance' },
      orderBy: { createdAt: 'desc' },
    });

    const incidents = await prisma.auditLog.count({
      where: { category: 'compliance', severity: 'critical' },
    });

    const policies = POLICIES.map((policy) => ({
      ...policy,
      lastAuditAt: lastAudit?.createdAt?.toISOString() || null,
      incidents,
    }));

    return NextResponse.json({ policies });
  } catch (error) {
    console.error('[Admin Compliance] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch compliance' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:settings:view');
