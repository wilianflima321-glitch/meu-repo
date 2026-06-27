/**
 * Admin Moderation Queue API
 * GET  /api/admin/moderation/queue         — list pending review items
 * POST /api/admin/moderation/queue/[id]/approve
 * POST /api/admin/moderation/queue/[id]/reject
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('admin.moderation.queue');

export interface ModerationQueueItem {
  id: string;
  assetId: string;
  assetName: string;
  assetType: 'mesh' | 'texture' | 'audio' | 'world' | 'prompt';
  thumbnailUrl?: string;
  score: number;
  categories: Record<string, number>;
  flaggedAt: string;
  flaggedBy: 'auto' | string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

// In-memory queue for local dev — replace with Prisma in production
const MOCK_QUEUE: ModerationQueueItem[] = [
  {
    id: 'mq_001',
    assetId: 'asset_demo_001',
    assetName: 'Dark Knight Warrior',
    assetType: 'mesh',
    score: 0.67,
    categories: { violence: 0.67 },
    flaggedAt: new Date(Date.now() - 3_600_000).toISOString(),
    flaggedBy: 'auto',
    status: 'pending_review',
  },
  {
    id: 'mq_002',
    assetId: 'asset_demo_002',
    assetName: 'Cursed Ritual Chamber',
    assetType: 'world',
    score: 0.55,
    categories: { adult_content: 0.55 },
    flaggedAt: new Date(Date.now() - 7_200_000).toISOString(),
    flaggedBy: 'auto',
    status: 'pending_review',
  },
];

function requireAdmin(req: NextRequest) {
  const user = requireAuth(req);
  if (!('role' in user) || (user as { role?: string }).role !== 'ADMIN') {
    throw new Error('Forbidden');
  }
  return user;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pending_review';
  const items = MOCK_QUEUE.filter(i => i.status === status);

  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let user;
  try {
    user = requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    itemId: string;
    action: 'approve' | 'reject';
    note?: string;
  };

  const item = MOCK_QUEUE.find(i => i.id === body.itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  item.status = body.action === 'approve' ? 'approved' : 'rejected';
  item.reviewedBy = (user as { userId?: string }).userId ?? 'admin';
  item.reviewedAt = new Date().toISOString();
  item.reviewNote = body.note;

  log.info(`Moderation item ${body.action}d`, { itemId: body.itemId, by: item.reviewedBy });

  return NextResponse.json({ success: true, item });
}
