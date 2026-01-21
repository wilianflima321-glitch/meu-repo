import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// IP REGISTRY ADMIN API
// =============================================================================

type LicenseEntry = {
  status: string;
  holder?: string | null;
  since?: string | null;
  until?: string | null;
  notes?: string | null;
};

type RegistryPayload = {
  allowed: string[];
  licenses: Record<string, LicenseEntry>;
};

export const GET = withAdminAuth(
  async () => {
    try {
      const ipRegistryAllowed = (prisma as any).ipRegistryAllowed;
      const ipRegistryLicense = (prisma as any).ipRegistryLicense;
      const [allowedRows, licenseRows] = await Promise.all([
        ipRegistryAllowed.findMany({ orderBy: { slug: 'asc' } }),
        ipRegistryLicense.findMany({ orderBy: { slug: 'asc' } }),
      ]);

      const licenses = licenseRows.reduce((acc: Record<string, LicenseEntry>, item: any) => {
        acc[item.slug] = {
          status: item.status,
          holder: item.holder,
          since: item.since ? item.since.toISOString().slice(0, 10) : null,
          until: item.until ? item.until.toISOString().slice(0, 10) : null,
          notes: item.notes,
        };
        return acc;
      }, {});

      return NextResponse.json({
        allowed: allowedRows.map((row) => row.slug),
        licenses,
      });
    } catch (error) {
      console.error('[Admin IP Registry] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch IP registry' }, { status: 500 });
    }
  },
  'ops:settings:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = (await request.json()) as RegistryPayload;
      const allowed = (body.allowed || []).map((slug) => slug.toLowerCase().trim()).filter(Boolean);
      const licenses = body.licenses || {};

      const ipRegistryAllowed = (prisma as any).ipRegistryAllowed;
      const ipRegistryLicense = (prisma as any).ipRegistryLicense;
      const currentAllowed = await ipRegistryAllowed.findMany();
      const currentAllowedSet = new Set(currentAllowed.map((row) => row.slug));
      const nextAllowedSet = new Set(allowed);

      const deleteAllowed = currentAllowed.filter((row) => !nextAllowedSet.has(row.slug));
      const createAllowed = allowed.filter((slug) => !currentAllowedSet.has(slug));

      const allowedOps = [
        ...deleteAllowed.map((row) => ipRegistryAllowed.delete({ where: { id: row.id } })),
        ...createAllowed.map((slug) => ipRegistryAllowed.create({ data: { slug } })),
      ];

      const licenseOps = Object.entries(licenses).map(([slug, entry]) =>
        ipRegistryLicense.upsert({
          where: { slug: slug.toLowerCase() },
          create: {
            slug: slug.toLowerCase(),
            status: entry.status || 'licensed',
            holder: entry.holder || null,
            since: entry.since ? new Date(entry.since) : null,
            until: entry.until ? new Date(entry.until) : null,
            notes: entry.notes || null,
          },
          update: {
            status: entry.status || 'licensed',
            holder: entry.holder || null,
            since: entry.since ? new Date(entry.since) : null,
            until: entry.until ? new Date(entry.until) : null,
            notes: entry.notes || null,
          },
        })
      );

      await prisma.$transaction([...allowedOps, ...licenseOps]);

      await prisma.auditLog.create({
        data: {
          action: 'IP_REGISTRY_UPDATE',
          category: 'security',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ip-registry',
          metadata: {
            allowedCount: allowed.length,
            licensesCount: Object.keys(licenses).length,
          } as any,
        },
      });

      return NextResponse.json({ status: 'ok' });
    } catch (error) {
      console.error('[Admin IP Registry] Error:', error);
      return NextResponse.json({ error: 'Failed to update IP registry' }, { status: 500 });
    }
  },
  'ops:settings:edit'
);
