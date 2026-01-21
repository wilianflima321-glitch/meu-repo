import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// AI ENHANCEMENTS ADMIN API
// =============================================================================

export const GET = withAdminAuth(
  async () => {
    try {
      const aiEnhancement = (prisma as any).aiEnhancement;
      const items = await aiEnhancement.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin AI Enhancements] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch enhancements' }, { status: 500 });
    }
  },
  'ops:agents:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { name, description, status } = body as { name?: string; description?: string; status?: string };
      if (!name) {
        return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
      }

      const aiEnhancement = (prisma as any).aiEnhancement;
      const item = await aiEnhancement.create({
        data: {
          name,
          description: description || null,
          status: status || 'planned',
          applied: false,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'AI_ENHANCEMENT_CREATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ai-enhancements',
          metadata: { id: item.id, name: item.name },
        },
      });

      return NextResponse.json({ item });
    } catch (error) {
      console.error('[Admin AI Enhancements] Error:', error);
      return NextResponse.json({ error: 'Failed to create enhancement' }, { status: 500 });
    }
  },
  'ops:agents:config'
);

export const PATCH = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { id, applied, status } = body as { id?: string; applied?: boolean; status?: string };
      if (!id) {
        return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
      }

      const aiEnhancement = (prisma as any).aiEnhancement;
      const item = await aiEnhancement.update({
        where: { id },
        data: {
          applied: applied ?? undefined,
          status: status ?? undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'AI_ENHANCEMENT_UPDATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ai-enhancements',
          metadata: { id: item.id, applied: item.applied, status: item.status },
        },
      });

      return NextResponse.json({ item });
    } catch (error) {
      console.error('[Admin AI Enhancements] Error:', error);
      return NextResponse.json({ error: 'Failed to update enhancement' }, { status: 500 });
    }
  },
  'ops:agents:config'
);
