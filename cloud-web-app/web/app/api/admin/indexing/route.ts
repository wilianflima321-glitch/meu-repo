import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import { createComponentLogger } from '@/lib/observability/logger';

// =============================================================================
// INDEXING ADMIN API
// =============================================================================

const log = createComponentLogger('api/admin/indexing/route');
const getFileName = (path: string) => path.split('/').pop() || path;

type IndexingEntryRecord = {
  fileId: string;
  filePath: string;
  indexed: boolean;
  context?: string | null;
  file?: { size?: number | null } | null;
  updatedAt: Date;
};

export const GET = withAdminAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = (searchParams.get('q') || '').trim().toLowerCase();
      const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

      const indexingEntry = (prisma as any).indexingEntry;
      const indexingConfig = (prisma as any).indexingConfig;

      const config = await indexingConfig.findUnique({ where: { id: 'singleton' } });
      const entries = await indexingEntry.findMany({
        where: query
          ? {
              OR: [
                { filePath: { contains: query } },
                { context: { contains: query } },
              ],
            }
          : undefined,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: { file: true },
      });

      const files = (entries as IndexingEntryRecord[]).map((entry) => ({
        id: entry.fileId,
        name: getFileName(entry.filePath),
        path: entry.filePath,
        indexed: entry.indexed,
        context: entry.context || '',
        size: entry.file?.size || 0,
        updatedAt: entry.updatedAt.toISOString(),
      }));

      return NextResponse.json({
        config: {
          depthLevel: config?.depthLevel ?? 3,
          maxFileSizeMb: config?.maxFileSizeMb ?? 10,
        },
        files,
      });
    } catch (error) {
      log.error('[Admin Indexing] Error', error);
      return NextResponse.json({ error: 'Failed to fetch indexing data' }, { status: 500 });
    }
  },
  'ops:settings:view'
);

export const PATCH = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { depthLevel, maxFileSizeMb } = body as { depthLevel?: number; maxFileSizeMb?: number };

      const indexingConfig = (prisma as any).indexingConfig;
      const config = await indexingConfig.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          depthLevel: depthLevel ?? 3,
          maxFileSizeMb: maxFileSizeMb ?? 10,
          updatedBy: user.id,
        },
        update: {
          depthLevel: depthLevel ?? undefined,
          maxFileSizeMb: maxFileSizeMb ?? undefined,
          updatedBy: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'INDEXING_CONFIG_UPDATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'indexing',
          metadata: { depthLevel: config.depthLevel, maxFileSizeMb: config.maxFileSizeMb },
        },
      });

      return NextResponse.json({ config });
    } catch (error) {
      log.error('[Admin Indexing] Error', error);
      return NextResponse.json({ error: 'Failed to update indexing config' }, { status: 500 });
    }
  },
  'ops:settings:edit'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { fileId, indexed, context } = body as { fileId?: string; indexed?: boolean; context?: string };

      if (!fileId || typeof indexed !== 'boolean') {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
      }

      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const indexingEntry = (prisma as any).indexingEntry;
      const entry = await indexingEntry.upsert({
        where: { fileId },
        create: {
          fileId,
          filePath: file.path,
          indexed,
          context: context || null,
        },
        update: {
          indexed,
          context: context ?? undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'INDEXING_TOGGLE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'indexing',
          metadata: { fileId, indexed },
        },
      });

      return NextResponse.json({ entry });
    } catch (error) {
      log.error('[Admin Indexing] Error', error);
      return NextResponse.json({ error: 'Failed to update indexing entry' }, { status: 500 });
    }
  },
  'ops:settings:edit'
);
