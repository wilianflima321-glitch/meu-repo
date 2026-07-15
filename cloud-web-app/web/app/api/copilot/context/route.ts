import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import type { CopilotContext } from '@/lib/copilot/context-store';
import { mergeCopilotContext } from '@/lib/copilot/context-merge';
import { assertProjectOwnership, resolveProjectIdFromRequest } from '@/lib/copilot/project-resolver';

export const dynamic = 'force-dynamic';

type CopilotContextBody = Record<string, unknown> & {
	projectId?: unknown;
	workflowId?: unknown;
	livePreview?: unknown;
	editor?: unknown;
	openFiles?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasErrorCode(error: unknown, code: string): boolean {
	return isRecord(error) && error.code === code;
}

async function resolveWorkflowId(userId: string, req: NextRequest, projectId: string | null, body?: CopilotContextBody): Promise<string | null> {
	const url = new URL(req.url);
	const headerWorkflowId = req.headers.get('x-workflow-id');
	const queryWorkflowId = url.searchParams.get('workflowId');
	const bodyWorkflowId = body?.workflowId;

	const candidate = headerWorkflowId || queryWorkflowId || bodyWorkflowId;
	if (typeof candidate === 'string' && candidate.trim()) {
		const owned = await prisma.copilotWorkflow.findFirst({
			where: { id: candidate, userId },
			select: { id: true },
		});
		return owned?.id ?? null;
	}

	if (!projectId) return null;

	const latest = await prisma.copilotWorkflow.findFirst({
		where: { userId, projectId, archived: false },
		orderBy: [{ lastUsedAt: 'desc' }, { updatedAt: 'desc' }],
		select: { id: true },
	});
	if (latest?.id) return latest.id;

	const created = await prisma.copilotWorkflow.create({
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

function toPatchFromBody(body: CopilotContextBody) {
	const livePreview = isRecord(body.livePreview) ? body.livePreview : null;
	const selectedPoint = isRecord(livePreview?.selectedPoint) ? livePreview.selectedPoint : null;
	const camera = isRecord(livePreview?.camera) ? livePreview.camera : null;
	const editor = isRecord(body.editor) ? body.editor : null;
	const selection = isRecord(editor?.selection) ? editor.selection : null;
	return {
		livePreview:
			livePreview
				?
					{
						selectedPoint:
							selectedPoint
								?
									{
										x: Number(selectedPoint.x),
										y: Number(selectedPoint.y),
										z: Number(selectedPoint.z),
									}
								: undefined,
						camera:
							camera
								?
									{
										x: Number(camera.x),
										y: Number(camera.y),
										z: Number(camera.z),
									}
								: undefined,
					}
				: undefined,
		editor:
			editor
				?
					{
						activeFilePath: typeof editor.activeFilePath === 'string' ? editor.activeFilePath : undefined,
						selection:
							selection
								?
									{
										start: Number(selection.start),
										end: Number(selection.end),
									}
								: undefined,
					}
				: undefined,
		openFiles: Array.isArray(body.openFiles) ? body.openFiles.filter((p): p is string => typeof p === 'string') : undefined,
	};
}

export async function GET(req: NextRequest): Promise<NextResponse> {
	try {
		const user = requireAuth(req);
		await requireEntitlementsForUser(user.userId);

		const projectId = await resolveProjectIdFromRequest(user.userId, req);
		if (!projectId) {
			return NextResponse.json({ projectId: null, workflowId: null, context: null });
		}

		await assertProjectOwnership(user.userId, projectId);

		const workflowId = await resolveWorkflowId(user.userId, req, projectId);
		if (!workflowId) {
			return NextResponse.json({ projectId, workflowId: null, context: null });
		}

		const wf = await prisma.copilotWorkflow.findFirst({
			where: { id: workflowId, userId: user.userId },
			select: { id: true, projectId: true, chatThreadId: true, context: true, contextVersion: true },
		});
		if (!wf) {
			return NextResponse.json({ projectId, workflowId: null, context: null });
		}

		await prisma.copilotWorkflow.update({
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

		if (hasErrorCode(error, 'PROJECT_NOT_FOUND')) {
			return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
		}

		return apiInternalError('Failed to load copilot context');
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const user = requireAuth(req);
		await requireEntitlementsForUser(user.userId);

		const body = (await req.json().catch(() => ({}))) as CopilotContextBody;
		const projectId = await resolveProjectIdFromRequest(user.userId, req, body);
		if (!projectId) {
			return NextResponse.json({ error: 'NO_PROJECT_AVAILABLE' }, { status: 404 });
		}

		await assertProjectOwnership(user.userId, projectId);

		const workflowId = await resolveWorkflowId(user.userId, req, projectId, body);
		if (!workflowId) {
			return NextResponse.json({ error: 'WORKFLOW_NOT_FOUND' }, { status: 404 });
		}

		const wf = await prisma.copilotWorkflow.findFirst({
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
			...(isRecord(wf.context) ? wf.context : {}),
			...merged,
			...(patch.editor ? { editor: patch.editor } : {}),
			...(patch.openFiles ? { openFiles: patch.openFiles } : {}),
		};

		const updated = await prisma.copilotWorkflow.update({
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

		if (hasErrorCode(error, 'PROJECT_NOT_FOUND')) {
			return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
		}

		return apiInternalError('Failed to update copilot context');
	}
}
