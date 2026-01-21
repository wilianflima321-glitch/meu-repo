import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { backupId, reason } = body as { backupId?: string; reason?: string };
      if (!backupId) {
        return NextResponse.json({ error: 'Backup obrigatório' }, { status: 400 });
      }

      const backup = await prisma.backup.findUnique({ where: { id: backupId } });
      if (!backup) {
        return NextResponse.json({ error: 'Backup não encontrado' }, { status: 404 });
      }

      await prisma.auditLog.create({
        data: {
          action: 'BACKUP_RESTORE_REQUEST',
          category: 'system',
          severity: 'warning',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'backup',
          metadata: { backupId, reason: reason || null },
        },
      });

      return NextResponse.json({ status: 'queued' });
    } catch (error) {
      console.error('[Admin Backup Restore] Error:', error);
      return NextResponse.json({ error: 'Failed to request restore' }, { status: 500 });
    }
  },
  'ops:infra:restart'
);
