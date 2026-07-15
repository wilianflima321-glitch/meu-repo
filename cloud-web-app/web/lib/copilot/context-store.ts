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

type StoreKey = string;

// Nota: store em memória (MVP). Em serverless, pode não persistir entre instâncias.
const store = new Map<StoreKey, CopilotContext>();

function key(userId: string, projectId: string): StoreKey {
	return `${userId}::${projectId}`;
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
