/**
 * API Facade (client-side)
 *
 * Este arquivo é importado diretamente por componentes do dashboard/chat.
 * Ele expõe um client pequeno e estável para as rotas Next (/api/*).
 */

// O client-side deve falar somente com as rotas Next (/api/*),
// para garantir auth/entitlements/metering no server.
export const API_BASE = '/api';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export type ChatThreadSummary = {
	id: string;
	title: string;
	projectId: string | null;
	archived: boolean;
	createdAt: string;
	updatedAt: string;
	_count?: { messages: number };
};

export type ChatStoredMessage = {
	id: string;
	role: 'user' | 'assistant' | 'system' | string;
	content: string;
	model?: string | null;
	metadata?: unknown;
	createdAt: string;
};

export type CopilotWorkflowSummary = {
	id: string;
	title: string;
	projectId: string | null;
	chatThreadId: string | null;
	archived: boolean;
	contextVersion: number;
	createdAt: string;
	updatedAt: string;
	lastUsedAt: string;
};

export type CopilotContextResponse = {
	projectId: string | null;
	workflowId: string | null;
	chatThreadId?: string | null;
	context?: unknown;
	contextVersion?: number;
};

export type BillingPlan = {
	id: string;
	name: string;
	description?: string;
	price?: number;
	priceBRL?: number;
	currency?: string;
	interval?: string;
	popular?: boolean;
	features?: string[];
	limits?: Record<string, unknown>;
};

export type WalletTransaction = {
	id: string;
	amount: number;
	currency: string;
	entry_type: string;
	created_at: string;
	reference?: string | null;
	metadata?: Record<string, unknown> | null;
	balance_after?: number | null;
};

export type WalletSummary = {
	balance: number;
	currency: string;
	transactions: WalletTransaction[];
};

export type ConnectivityResponse = {
	status?: string;
	overall_status?: string;
	timestamp?: string;
	services?: Array<{
		name: string;
		status: string;
		endpoints: Array<{
			url: string;
			healthy: boolean;
			latency_ms: number | null;
			status_code?: number | null;
			error?: string | null;
		}>;
		latency_ms?: number;
		message?: string;
	}>;
};

export type PurchaseIntentResponse = {
	intent_id: string;
	entry: WalletTransaction;
};

export type TransferResponse = {
	transfer_id: string;
	sender_entry: WalletTransaction;
	receiver_entry?: WalletTransaction;
};

type RequestOptions = {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
};

export class APIError extends Error {
	public status: number;
	public statusText: string;
	public data: unknown;

	constructor(status: number, statusText: string, message: string, data?: unknown) {
		super(message);
		this.name = 'APIError';
		this.status = status;
		this.statusText = statusText;
		this.data = data;
	}
}

function getAuthToken(): string | null {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem('aethel-token');
}

async function requestJSON<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const token = getAuthToken();
	const res = await fetch(`${API_BASE}${path}`, {
		method: options.method ?? 'GET',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers ?? {}),
		},
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});

	const text = await res.text().catch(() => '');
	const data = (() => {
		try {
			return text ? JSON.parse(text) : null;
		} catch {
			return text;
		}
	})();

	if (!res.ok) {
		const message =
			(data && typeof data === 'object' && (data as any).message) ||
			(data && typeof data === 'object' && (data as any).error) ||
			(typeof data === 'string' ? data : null) ||
			`HTTP ${res.status}`;
		throw new APIError(res.status, res.statusText, String(message), data);
	}

	return data as T;
}

async function* streamText(path: string, body: unknown): AsyncGenerator<string> {
	const token = getAuthToken();
	const res = await fetch(`${API_BASE}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(body),
	});

	if (!res.ok || !res.body) {
		const text = await res.text().catch(() => '');
		throw new APIError(res.status, res.statusText, text || `HTTP ${res.status}`);
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		if (!value) continue;
		yield decoder.decode(value, { stream: true });
	}
}

export const AethelAPIClient = {
	health: () => requestJSON<{ status: string; timestamp: string; services: Record<string, string> }>('/health'),

	getBillingPlans: async (): Promise<BillingPlan[]> => {
		const data = await requestJSON<{ plans?: BillingPlan[]; success?: boolean }>('/billing/plans');
		return Array.isArray(data?.plans) ? data.plans : (data as any);
	},

	getWalletSummary: async (): Promise<WalletSummary> => {
		return requestJSON<WalletSummary>('/wallet/summary');
	},

	getConnectivityStatus: async (): Promise<ConnectivityResponse> => {
		return requestJSON<ConnectivityResponse>('/connectivity/status');
	},

	getCurrentPlan: async (): Promise<BillingPlan> => {
		const usage = await requestJSON<any>('/usage/status');
		const planId = String(usage?.data?.plan ?? '').trim();
		const plans = await AethelAPIClient.getBillingPlans().catch(() => [] as BillingPlan[]);
		const match = plans.find((p) => String(p.id) === planId);
		return (
			match ?? {
				id: planId || 'unknown',
				name: planId || 'unknown',
				description: 'Plano atual conforme contrato.',
			}
		);
	},

	getCredits: async (): Promise<{ credits: number }> => {
		const usage = await requestJSON<any>('/usage/status');
		const remaining = Number(usage?.data?.usage?.tokens?.remaining ?? 0);
		return { credits: Number.isFinite(remaining) ? remaining : 0 };
	},

	chat: (input: { model: string; messages: ChatMessage[] }) =>
		requestJSON<any>('/ai/chat', { method: 'POST', body: input }),

	chatStream: (input: { model: string; messages: ChatMessage[] }) => streamText('/ai/stream', input),

	getCopilotContext: () => requestJSON<CopilotContextResponse>('/copilot/context'),

	listChatThreads: (input?: { projectId?: string; archived?: boolean }) => {
		const qs = new URLSearchParams();
		if (input?.projectId) qs.set('projectId', input.projectId);
		if (typeof input?.archived === 'boolean') qs.set('archived', input.archived ? 'true' : 'false');
		const suffix = qs.toString() ? `?${qs.toString()}` : '';
		return requestJSON<{ threads: ChatThreadSummary[] }>(`/chat/threads${suffix}`);
	},

	createChatThread: (input?: { title?: string; projectId?: string }) =>
		requestJSON<{ thread: ChatThreadSummary }>(`/chat/threads`, { method: 'POST', body: input ?? {} }),

	updateChatThread: (threadId: string, input: { title?: string; archived?: boolean }) =>
		requestJSON<{ thread: ChatThreadSummary }>(`/chat/threads/${encodeURIComponent(threadId)}`, {
			method: 'PATCH',
			body: input,
		}),

	getChatMessages: (threadId: string) =>
		requestJSON<{ threadId: string; messages: ChatStoredMessage[] }>(
			`/chat/threads/${encodeURIComponent(threadId)}/messages`
		),

	appendChatMessage: (threadId: string, input: { role: 'user' | 'assistant' | 'system'; content: string; model?: string; metadata?: unknown }) =>
		requestJSON<{ message: ChatStoredMessage }>(
			`/chat/threads/${encodeURIComponent(threadId)}/messages`,
			{ method: 'POST', body: input }
		),

	cloneChatThread: (input: { sourceThreadId: string; title?: string }) =>
		requestJSON<{ thread: ChatThreadSummary; copiedMessages: number }>(`/chat/threads/clone`, { method: 'POST', body: input }),

	mergeChatThreads: (input: { sourceThreadId: string; targetThreadId: string }) =>
		requestJSON<{ mergedMessages: number }>(`/chat/threads/merge`, { method: 'POST', body: input }),

	listCopilotWorkflows: (input?: { projectId?: string; archived?: boolean }) => {
		const qs = new URLSearchParams();
		if (input?.projectId) qs.set('projectId', input.projectId);
		if (typeof input?.archived === 'boolean') qs.set('archived', input.archived ? 'true' : 'false');
		const suffix = qs.toString() ? `?${qs.toString()}` : '';
		return requestJSON<{ workflows: CopilotWorkflowSummary[] }>(`/copilot/workflows${suffix}`);
	},

	createCopilotWorkflow: (input?: { title?: string; projectId?: string; chatThreadId?: string }) =>
		requestJSON<{ workflow: CopilotWorkflowSummary }>(`/copilot/workflows`, { method: 'POST', body: input ?? {} }),

	getCopilotWorkflow: (workflowId: string) =>
		requestJSON<{ workflow: any }>(`/copilot/workflows/${encodeURIComponent(workflowId)}`),

	updateCopilotWorkflow: (workflowId: string, input: { title?: string; archived?: boolean; chatThreadId?: string | null }) =>
		requestJSON<{ workflow: CopilotWorkflowSummary }>(`/copilot/workflows/${encodeURIComponent(workflowId)}`, {
			method: 'PATCH',
			body: input,
		}),

	createPurchaseIntent: async (input: { amount: number; currency: string; reference?: string }): Promise<PurchaseIntentResponse> => {
		return requestJSON<PurchaseIntentResponse>('/wallet/purchase-intent', { method: 'POST', body: input });
	},

	transferCredits: async (input: { target_user_id: string; amount: number; currency: string; reference?: string }): Promise<TransferResponse> => {
		return requestJSON<TransferResponse>('/credits/transfer', { method: 'POST', body: input });
	},

	subscribe: async (planId: string): Promise<{ status: string; checkoutUrl?: string }> => {
		const data = await requestJSON<{ success?: boolean; checkoutUrl?: string; sessionId?: string }>('/billing/checkout', {
			method: 'POST',
			body: { planId },
		});
		return { status: data?.success ? 'checkout_created' : 'checkout_unknown', checkoutUrl: data?.checkoutUrl };
	},

	// ========== Profile ==========
	
	getProfile: async () => {
		return requestJSON<{ profile: any }>('/auth/profile');
	},
	
	updateProfile: async (updates: Record<string, unknown>) => {
		return requestJSON<{ profile: any }>('/auth/profile', { method: 'PATCH', body: updates });
	},
	
	deleteAccount: async () => {
		return requestJSON<{ success: boolean }>('/auth/delete-account', { method: 'DELETE' });
	},
	
	// ========== Sessions ==========
	
	getSessions: async () => {
		return requestJSON<{ sessions: any[] }>('/auth/sessions');
	},
	
	revokeSession: async (sessionId: string) => {
		return requestJSON<{ success: boolean }>(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
	},
	
	revokeAllSessions: async () => {
		return requestJSON<{ success: boolean }>('/auth/sessions', { method: 'DELETE' });
	},
};

export default API_BASE;
