export type CopilotLivePreviewPoint = { x: number; y: number; z: number };
export type CopilotLivePreviewContext = {
	selectedPoint?: CopilotLivePreviewPoint;
	camera?: CopilotLivePreviewPoint;
	version: number;
	updatedAt: string;
};

export type CopilotContext = {
	projectId: string;
	livePreview?: CopilotLivePreviewContext;
};

export type CopilotContextPersistence = 'process-local';

/**
 * P2b HIGH #19 — process-local Map only. Not durable across serverless isolates.
 * Callers must treat missing context as empty, never invent cross-instance state.
 */
export const COPILOT_CONTEXT_PERSISTENCE: CopilotContextPersistence = 'process-local';

export const COPILOT_CONTEXT_DURABLE = false as const;

type StoreKey = string;

const store = new Map<StoreKey, CopilotContext>();

function key(userId: string, projectId: string): StoreKey {
	return `${userId}::${projectId}`;
}

export function isCopilotContextDurable(): boolean {
	return COPILOT_CONTEXT_DURABLE;
}

export function getCopilotContextHonesty(): {
	persistence: CopilotContextPersistence;
	durable: false;
	heldReason: 'process_local_only';
} {
	return {
		persistence: COPILOT_CONTEXT_PERSISTENCE,
		durable: false,
		heldReason: 'process_local_only',
	};
}

export function getCopilotContext(userId: string, projectId: string): CopilotContext | null {
	return store.get(key(userId, projectId)) ?? null;
}

export function upsertCopilotContext(
	userId: string,
	projectId: string,
	patch: {
		livePreview?: {
			selectedPoint?: CopilotLivePreviewPoint;
			camera?: CopilotLivePreviewPoint;
		};
	}
): CopilotContext {
	const existing = getCopilotContext(userId, projectId);

	const now = new Date().toISOString();
	const next: CopilotContext = {
		projectId,
		livePreview: patch.livePreview
			? {
					selectedPoint: patch.livePreview.selectedPoint ?? existing?.livePreview?.selectedPoint,
					camera: patch.livePreview.camera ?? existing?.livePreview?.camera,
					version: (existing?.livePreview?.version ?? 0) + 1,
					updatedAt: now,
				}
			: existing?.livePreview,
	};

	store.set(key(userId, projectId), next);
	return next;
}

/** Test helper — clear process-local store between cases. */
export function __clearCopilotContextStoreForTests(): void {
	store.clear();
}
