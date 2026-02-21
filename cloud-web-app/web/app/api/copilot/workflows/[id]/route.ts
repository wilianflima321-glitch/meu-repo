import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_WORKFLOW_ID_LENGTH = 120;
const normalizeWorkflowId = (value?: string) => String(value ?? '').trim();

async function getOwnedWorkflow(userId: string, id: string) {
  const prismaAny = prisma as any;
  return prismaAny.copilotWorkflow.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      projectId: true,
      chatThreadId: true,
      archived: true,
      context: true,
      contextVersion: true,
      createdAt: true,
      updatedAt: true,
      lastUsedAt: true,
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'copilot-workflow-detail-get',
      key: user.userId,
      max: 480,
      windowMs: 60 * 60 * 1000,
      message: 'Too many copilot workflow read requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const workflowId = normalizeWorkflowId(ctx.params?.id);
    if (!workflowId || workflowId.length > MAX_WORKFLOW_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_WORKFLOW_ID', message: 'workflowId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const workflow = await getOwnedWorkflow(user.userId, workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'WORKFLOW_NOT_FOUND', message: 'Workflow não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'copilot-workflow-detail-patch',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many copilot workflow update requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const workflowId = normalizeWorkflowId(ctx.params?.id);
    if (!workflowId || workflowId.length > MAX_WORKFLOW_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_WORKFLOW_ID', message: 'workflowId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;

    const id = workflowId;
    const existing = await prismaAny.copilotWorkflow.findFirst({ where: { id, userId: user.userId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'WORKFLOW_NOT_FOUND', message: 'Workflow não encontrado.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const archived = typeof body?.archived === 'boolean' ? body.archived : undefined;
    const hasChatThreadId = Object.prototype.hasOwnProperty.call(body ?? {}, 'chatThreadId');
    const chatThreadIdRaw = hasChatThreadId ? (body as any).chatThreadId : undefined;
    const chatThreadId =
      chatThreadIdRaw === null
        ? null
        : typeof chatThreadIdRaw === 'string' && chatThreadIdRaw.trim()
        ? chatThreadIdRaw.trim()
        : undefined;

    if (!title && archived === undefined && !hasChatThreadId) {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Envie { title } e/ou { archived } e/ou { chatThreadId }.' }, { status: 400 });
    }

    if (hasChatThreadId) {
      if (chatThreadId !== null && chatThreadId === undefined) {
        return NextResponse.json(
          { error: 'INVALID_BODY', message: 'Envie { chatThreadId: string | null }.' },
          { status: 400 }
        );
      }

      if (typeof chatThreadId === 'string') {
        const ownedThread = await prismaAny.chatThread.findFirst({
          where: { id: chatThreadId, userId: user.userId },
          select: { id: true },
        });
        if (!ownedThread) {
          return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread não encontrada.' }, { status: 404 });
        }

        const existingLink = await prismaAny.copilotWorkflow.findFirst({
          where: { chatThreadId },
          select: { id: true },
        });
        if (existingLink && existingLink.id !== id) {
          return NextResponse.json(
            { error: 'THREAD_ALREADY_LINKED', message: 'Essa thread já está ligada a um workflow.' },
            { status: 409 }
          );
        }
      }
    }

    const workflow = await prismaAny.copilotWorkflow.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(archived !== undefined ? { archived } : {}),
        ...(hasChatThreadId ? { chatThreadId: chatThreadId ?? null } : {}),
        lastUsedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        chatThreadId: true,
        archived: true,
        contextVersion: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
