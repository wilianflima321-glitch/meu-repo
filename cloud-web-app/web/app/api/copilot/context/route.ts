import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import type { CopilotContext } from '@/lib/copilot/context-store';
import { mergeCopilotContext } from '@/lib/copilot/context-merge';
import { assertProjectOwnership, resolveProjectIdFromRequest } from '@/lib/copilot/project-resolver';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

async function resolveWorkflowId(userId: string, req: NextRequest, projectId: string | null, body?: any): Promise<string | null> {
	const prismaAny = prisma as any;
	const url = new URL(req.url);
	const headerWorkflowId = req.headers.get('x-workflow-id');
	const queryWorkflowId = url.searchParams.get('workflowId');
	const bodyWorkflowId = body?.workflowId;

	const candidate = headerWorkflowId || queryWorkflowId || bodyWorkflowId;
	if (typeof candidate === 'string' && candidate.trim()) {
		const owned = await prismaAny.copilotWorkflow.findFirst({
			where: { id: candidate, userId },
			select: { id: true },
		});
		return owned?.id ?? null;
	}

	if (!projectId) return null;

	const latest = await prismaAny.copilotWorkflow.findFirst({
		where: { userId, projectId, archived: false },
		orderBy: [{ lastUsedAt: 'desc' }, { updatedAt: 'desc' }],
		select: { id: true },
	});
	if (latest?.id) return latest.id;

	const created = await prismaAny.copilotWorkflow.create({
		data: {
			userId,
			projectId,
			title: 'Workflow',
			lastUsedAt: new Date(),
		},
		select: { id: true },
	});
	return created.id;
}

function toPatchFromBody(body: any) {
	const livePreview = body?.livePreview;
	return {
		livePreview:
			livePreview && typeof livePreview === 'object'
				?
					{
						selectedPoint:
							livePreview.selectedPoint && typeof livePreview.selectedPoint === 'object'
								?
									{
										x: Number(livePreview.selectedPoint.x),
										y: Number(livePreview.selectedPoint.y),
										z: Number(livePreview.selectedPoint.z),
									}
								: undefined,
						camera:
							livePreview.camera && typeof livePreview.camera === 'object'
								?
									{
										x: Number(livePreview.camera.x),
										y: Number(livePreview.camera.y),
										z: Number(livePreview.camera.z),
									}
								: undefined,
					}
				: undefined,
		editor:
			body?.editor && typeof body.editor === 'object'
				?
					{
						activeFilePath: typeof body.editor.activeFilePath === 'string' ? body.editor.activeFilePath : undefined,
						selection:
							body.editor.selection && typeof body.editor.selection === 'object'
								?
									{
										start: Number(body.editor.selection.start),
										end: Number(body.editor.selection.end),
									}
								: undefined,
					}
				: undefined,
		openFiles: Array.isArray(body?.openFiles) ? body.openFiles.filter((p: any) => typeof p === 'string') : undefined,
	};
}

export async function GET(req: NextRequest): Promise<NextResponse> {
	try {
		const user = requireAuth(req);
		await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'copilot-context-get',
      key: user.userId,
      max: 600,
      windowMs: 60 * 60 * 1000,
      message: 'Too many copilot context requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

		const projectId = await resolveProjectIdFromRequest(user.userId, req);
		if (!projectId) {
			return NextResponse.json({ projectId: null, workflowId: null, context: null });
		}

		await assertProjectOwnership(user.userId, projectId);

		const workflowId = await resolveWorkflowId(user.userId, req, projectId);
		if (!workflowId) {
			return NextResponse.json({ projectId, workflowId: null, context: null });
		}

		const prismaAny = prisma as any;
		const wf = await prismaAny.copilotWorkflow.findFirst({
			where: { id: workflowId, userId: user.userId },
			select: { id: true, projectId: true, chatThreadId: true, context: true, contextVersion: true },
		});
		if (!wf) {
			return NextResponse.json({ projectId, workflowId: null, context: null });
		}

		await prismaAny.copilotWorkflow.update({
			where: { id: wf.id },
			data: { lastUsedAt: new Date() },
			select: { id: true },
		});

		return NextResponse.json({
			projectId,
			workflowId: wf.id,
			chatThreadId: wf.chatThreadId,
			context: wf.context,
			contextVersion: wf.contextVersion,
		});
	} catch (error) {
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;

		if ((error as any)?.code === 'PROJECT_NOT_FOUND') {
			return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
		}

		return apiInternalError('Failed to load copilot context');
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const user = requireAuth(req);
		await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'copilot-context-post',
      key: user.userId,
      max: 300,
      windowMs: 60 * 60 * 1000,
      message: 'Too many copilot context update requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

		const body = await req.json().catch(() => ({}));
		const projectId = await resolveProjectIdFromRequest(user.userId, req, body);
		if (!projectId) {
			return NextResponse.json({ error: 'NO_PROJECT_AVAILABLE' }, { status: 404 });
		}

		await assertProjectOwnership(user.userId, projectId);

		const workflowId = await resolveWorkflowId(user.userId, req, projectId, body);
		if (!workflowId) {
			return NextResponse.json({ error: 'WORKFLOW_NOT_FOUND' }, { status: 404 });
		}

		const prismaAny = prisma as any;
		const wf = await prismaAny.copilotWorkflow.findFirst({
			where: { id: workflowId, userId: user.userId },
			select: { id: true, context: true, contextVersion: true },
		});
		if (!wf) {
			return NextResponse.json({ error: 'WORKFLOW_NOT_FOUND' }, { status: 404 });
		}

		const patch = toPatchFromBody(body);
		const existing = (wf.context as CopilotContext | null) ?? null;
		const merged = mergeCopilotContext(existing, projectId, patch);

		// Guarda o JSON completo (inclui campos extras), mantendo compatibilidade.
		const contextJson = {
			...(typeof wf.context === 'object' && wf.context ? (wf.context as any) : null),
			...merged,
			...(patch.editor ? { editor: patch.editor } : {}),
			...(patch.openFiles ? { openFiles: patch.openFiles } : {}),
		};

		const updated = await prismaAny.copilotWorkflow.update({
			where: { id: wf.id },
			data: {
				context: contextJson,
				contextVersion: wf.contextVersion + 1,
				lastUsedAt: new Date(),
			},
			select: { id: true, context: true, contextVersion: true, lastUsedAt: true },
		});

		return NextResponse.json({ ok: true, projectId, workflowId: updated.id, context: updated.context, contextVersion: updated.contextVersion });
	} catch (error) {
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;

		if ((error as any)?.code === 'PROJECT_NOT_FOUND') {
			return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
		}

		return apiInternalError('Failed to update copilot context');
	}
}
