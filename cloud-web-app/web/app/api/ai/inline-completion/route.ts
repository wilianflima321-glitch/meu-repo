import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { aiService } from '@/lib/ai-service';
import { prisma } from '@/lib/db';
import { checkAIQuota, checkModelAccess, recordTokenUsage, getPlanLimits } from '@/lib/plan-limits';

/**
 * Inline Completion API
 * POST /api/ai/inline-completion
 *
 * Endpoint server-side para completar código (ghost text) sem expor API keys.
 * Retorna APENAS o texto a ser inserido no cursor.
 */

const SYSTEM_PROMPT = `Você é um mecanismo de autocomplete inline (ghost text) tipo Copilot.

REGRAS CRÍTICAS:
- Retorne APENAS o texto que deve ser inserido no cursor.
- NÃO inclua markdown, blocos de código, explicações, nem comentários extras.
- NÃO repita texto já presente no prefixo/sufixo.
- Seja conciso: complete apenas o necessário para avançar o código.
- Se não souber, retorne string vazia.
`;

function normalizeCompletion(text: string): string {
	return String(text || '')
		.replace(/```[\w]*\n?/g, '')
		.replace(/```$/g, '')
		.replace(/<\|[^|]+\|>/g, '')
		.trimEnd();
}

export async function POST(req: NextRequest) {
	try {
		const user = requireAuth(req);
		const body = await req.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON inválido.' }, { status: 400 });
		}

		const prompt = typeof (body as any).prompt === 'string' ? (body as any).prompt : '';
		const provider = typeof (body as any).provider === 'string' ? (body as any).provider : undefined;
		const model = typeof (body as any).model === 'string' ? (body as any).model : undefined;
		const maxTokens = typeof (body as any).maxTokens === 'number' ? Math.max(1, Math.floor((body as any).maxTokens)) : 256;
		const temperature = typeof (body as any).temperature === 'number' ? Math.min(1, Math.max(0, (body as any).temperature)) : 0.1;

		if (!prompt) {
			return NextResponse.json({ text: '' });
		}

		// ================================
		// Enforcement de limites por plano
		// ================================
		const userRow = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true } });
		const limits = getPlanLimits(userRow?.plan || 'starter_trial');

		const estimatedTokens = Math.max(300, Math.ceil(prompt.length / 4) + 300 + maxTokens);
		if (estimatedTokens > limits.maxTokensPerRequest) {
			return NextResponse.json(
				{
					error: 'REQUEST_TOO_LARGE',
					message: `Request muito grande para o seu plano. Limite estimado: ${limits.maxTokensPerRequest.toLocaleString()} tokens por request.`,
					maxTokensPerRequest: limits.maxTokensPerRequest,
					upgradeUrl: '/pricing',
				},
				{ status: 413 }
			);
		}

		const quotaCheck = await checkAIQuota(user.userId, estimatedTokens);
		if (!quotaCheck.allowed) {
			return NextResponse.json(
				{ error: quotaCheck.code, message: quotaCheck.reason, upgradeUrl: '/pricing' },
				{ status: 429 }
			);
		}

		if (model) {
			const modelCheck = await checkModelAccess(user.userId, model);
			if (!modelCheck.allowed) {
				return NextResponse.json(
					{ error: modelCheck.code, message: modelCheck.reason, availableModels: limits.models, upgradeUrl: '/pricing' },
					{ status: 403 }
				);
			}
		}

		const response = await aiService.chat({
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: prompt },
			],
			provider,
			model,
			temperature,
			maxTokens,
		});

		// Registrar uso (best effort)
		recordTokenUsage(user.userId, response.tokensUsed).catch(() => {});

		return NextResponse.json({
			text: normalizeCompletion(response.content),
			provider: response.provider,
			model: response.model,
			tokensUsed: response.tokensUsed,
			latencyMs: response.latencyMs,
		});
	} catch (error) {
		console.error('[AI Inline Completion] Error:', error);
		return NextResponse.json(
			{ error: 'AI_ERROR', message: error instanceof Error ? error.message : 'Erro interno ao processar IA' },
			{ status: 500 }
		);
	}
}
