import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// BACKUP ADMIN API
// =============================================================================

export const GET = withAdminAuth(
  async () => {
    try {
      const backups = await prisma.backup.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const items = backups.map((backup) => ({
        id: backup.id,
        date: backup.createdAt.toISOString(),
        size: backup.size,
        status: backup.status,
        type: backup.type,
        description: backup.description,
        storageUrl: backup.storageUrl,
      }));

      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin Backup] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 });
    }
  },
  'ops:infra:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { description } = body as { description?: string };

      const backup = await prisma.backup.create({
        data: {
          projectId: 'system',
          type: 'manual',
          description: description || 'Backup manual solicitado via admin',
          status: 'pending',
          createdBy: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'BACKUP_REQUEST',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'backup',
          metadata: { id: backup.id, type: backup.type },
        },
      });

      return NextResponse.json({ item: backup });
    } catch (error) {
      console.error('[Admin Backup] Error:', error);
      return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
    }
  },
  'ops:infra:restart'
);
