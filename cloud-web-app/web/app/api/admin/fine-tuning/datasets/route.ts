import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import { generateUploadUrl } from '@/lib/storage/s3-client';

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const GET = withAdminAuth(
  async () => {
    try {
      const fineTuneDataset = (prisma as any).fineTuneDataset;
      const items = await fineTuneDataset.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin Fine Tuning Datasets] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 });
    }
  },
  'ops:agents:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { name, size, contentType } = body as { name?: string; size?: number; contentType?: string };

      if (!name || !size || !contentType) {
        return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
      }

      const fineTuneDataset = (prisma as any).fineTuneDataset;
      const storageKey = `fine-tuning/${Date.now()}-${slugify(name)}`;

      const dataset = await fineTuneDataset.create({
        data: {
          name,
          size,
          contentType,
          storageKey,
          status: 'pending_upload',
        },
      });

      const uploadUrl = await generateUploadUrl(storageKey, contentType);

      const status = uploadUrl ? 'pending_upload' : 'storage_unavailable';
      if (status !== dataset.status) {
        await fineTuneDataset.update({
          where: { id: dataset.id },
          data: { status },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: 'FINE_TUNING_DATASET_CREATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'fine-tuning',
          metadata: { id: dataset.id, name: dataset.name, status },
        },
      });

      return NextResponse.json({ dataset: { ...dataset, status }, uploadUrl });
    } catch (error) {
      console.error('[Admin Fine Tuning Datasets] Error:', error);
      return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
    }
  },
  'ops:agents:config'
);

export const PATCH = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { id, status } = body as { id?: string; status?: string };
      if (!id || !status) {
        return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
      }

      const fineTuneDataset = (prisma as any).fineTuneDataset;
      const dataset = await fineTuneDataset.update({
        where: { id },
        data: { status },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FINE_TUNING_DATASET_UPDATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'fine-tuning',
          metadata: { id: dataset.id, status: dataset.status },
        },
      });

      return NextResponse.json({ dataset });
    } catch (error) {
      console.error('[Admin Fine Tuning Datasets] Error:', error);
      return NextResponse.json({ error: 'Failed to update dataset' }, { status: 500 });
    }
  },
  'ops:agents:config'
);
