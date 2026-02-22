import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_THREAD_ID_LENGTH = 120;
const normalizeThreadId = (value?: string) => String(value ?? '').trim();
const ALLOWED_ROLES = new Set(['user', 'assistant', 'system']);
type RouteContext = { params: Promise<{ id: string }> };

interface CreateMessageBody {
  role?: string;
  content?: string;
  metadata?: unknown;
}

async function assertThreadOwnership(userId: string, threadId: string) {
  return prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    select: { id: true, userId: true, archived: true },
  });
}

async function resolveThreadId(ctx: RouteContext) {
  const resolved = await ctx.params;
  return normalizeThreadId(resolved?.id);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'chat-thread-messages-get',
      key: user.userId,
      max: 720,
      windowMs: 60 * 60 * 1000,
      message: 'Too many chat messages read requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const threadId = await resolveThreadId(ctx);
    if (!threadId || threadId.length > MAX_THREAD_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_THREAD_ID', message: 'threadId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    const thread = await assertThreadOwnership(user.userId, threadId);

    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread not found.' }, { status: 404 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
      take: 500,
    });

    return NextResponse.json({ threadId, messages });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'chat-thread-messages-post',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many chat message creation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const threadId = await resolveThreadId(ctx);
    if (!threadId || threadId.length > MAX_THREAD_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_THREAD_ID', message: 'threadId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    const thread = await assertThreadOwnership(user.userId, threadId);

    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread not found.' }, { status: 404 });
    }

    if (thread.archived) {
      return NextResponse.json(
        { error: 'THREAD_ARCHIVED', message: 'Thread is archived. Create a new conversation.' },
        { status: 409 }
      );
    }

    const body = (await req.json().catch(() => null)) as CreateMessageBody | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Body must be a valid JSON object.' }, { status: 400 });
    }

    const role = typeof body.role === 'string' ? body.role.trim() : '';
    const content = typeof body.content === 'string' ? body.content : '';

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'INVALID_ROLE', message: 'role must be user|assistant|system.' }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'EMPTY_CONTENT', message: 'content is required.' }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        role,
        content,
        metadata: body.metadata ?? undefined,
      },
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    await prisma.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
