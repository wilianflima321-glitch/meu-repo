import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// BIAS DETECTION API (Moderation-backed)
// =============================================================================

type BiasStats = {
  total: number;
  highBias: number;
  mediumBias: number;
  lowBias: number;
  pending: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function buildWhereClause() {
  return {
    OR: [{ type: 'ai_output' }, { targetType: 'ai_generation' }],
  };
}

function parseFlags(autoFlags: unknown): string[] {
  if (!autoFlags) return [];
  if (Array.isArray(autoFlags)) return autoFlags.filter((flag) => typeof flag === 'string');
  if (typeof autoFlags === 'string') {
    try {
      const parsed = JSON.parse(autoFlags);
      if (Array.isArray(parsed)) return parsed.filter((flag) => typeof flag === 'string');
    } catch {
      return [];
    }
  }
  return [];
}

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10), 1),
      MAX_LIMIT
    );

    const where = buildWhereClause();

    const [items, total, highBias, mediumBias, lowBias, pending] = await Promise.all([
      prisma.moderationItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.moderationItem.count({ where }),
      prisma.moderationItem.count({ where: { ...where, autoScore: { gte: 0.7 } } }),
      prisma.moderationItem.count({
        where: { ...where, autoScore: { gte: 0.4, lt: 0.7 } },
      }),
      prisma.moderationItem.count({ where: { ...where, autoScore: { lt: 0.4 } } }),
      prisma.moderationItem.count({ where: { ...where, status: 'pending' } }),
    ]);

    const stats: BiasStats = {
      total,
      highBias,
      mediumBias,
      lowBias,
      pending,
    };

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        text:
          (item.contentSnapshot as any)?.preview ||
          (item.contentSnapshot as any)?.fullContent ||
          item.reason ||
          'Sem conteúdo registrado',
        status: item.status,
        autoScore: item.autoScore,
        autoFlags: parseFlags(item.autoFlags as any),
        createdAt: item.createdAt.toISOString(),
      })),
      stats,
    });
  } catch (error) {
    console.error('[Bias Detection] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch bias audits' }, { status: 500 });
  }
}

async function postHandler(req: NextRequest, { user }: { user: { id: string; email: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const flagsInput = body?.flags;
    const rawScore = body?.score;
    const priorityInput = typeof body?.priority === 'string' ? body.priority : 'normal';
    const priority = ['low', 'normal', 'high', 'urgent'].includes(priorityInput)
      ? priorityInput
      : 'normal';

    if (!text) {
      return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 });
    }

    const preview = text.length > 240 ? `${text.slice(0, 240)}...` : text;
    const scoreValue = Number.isFinite(Number(rawScore)) ? Number(rawScore) : null;
    const score = scoreValue !== null ? Math.min(Math.max(scoreValue, 0), 1) : null;

    let flags: string[] | null = null;
    if (Array.isArray(flagsInput)) {
      flags = flagsInput.filter((flag) => typeof flag === 'string' && flag.trim());
    } else if (typeof flagsInput === 'string' && flagsInput.trim()) {
      flags = flagsInput
        .split(',')
        .map((flag: string) => flag.trim())
        .filter(Boolean);
    }

    const item = await prisma.moderationItem.create({
      data: {
        type: 'ai_output',
        status: 'pending',
        priority,
        reporterId: user.id,
        reporterEmail: user.email,
        targetType: 'ai_generation',
        targetId: randomUUID(),
        contentSnapshot: {
          type: 'text',
          preview,
          fullContent: text,
        },
        reason: reason || 'Auditoria manual de bias',
        category: 'bias',
        autoScore: score,
        autoFlags: flags ? JSON.stringify(flags) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        text: preview,
        status: item.status,
        autoScore: item.autoScore,
        autoFlags: parseFlags(item.autoFlags as any),
        createdAt: item.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Bias Detection] Create Error:', error);
    return NextResponse.json({ error: 'Failed to create bias audit' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:moderation:view');
export const POST = withAdminAuth(postHandler, 'ops:moderation:approve');
