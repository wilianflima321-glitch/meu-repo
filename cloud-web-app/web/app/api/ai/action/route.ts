import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/db'
import { checkAIQuota, checkModelAccess, recordTokenUsage, getPlanLimits } from '@/lib/plan-limits'
import { notImplementedCapability } from '@/lib/server/capability-response'

/**
 * POST /api/ai/action
 * Quick actions endpoint (L3) aligned with AI_SYSTEM_SPEC.
 */

const SYSTEM_PROMPT = `You are a helpful coding assistant.
Rules:
- Be concise and direct.
- Provide code when requested.
- Do not fabricate execution results.`

const ACTION_PROMPTS: Record<string, (code: string, language: string) => string> = {
  explain: (code, language) =>
    `Explain the following ${language} code clearly and concisely:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  refactor: (code, language) =>
    `Refactor the following ${language} code for readability and maintainability:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  fix: (code, language) =>
    `Fix bugs or issues in the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  test: (code, language) =>
    `Generate unit tests for the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  document: (code, language) =>
    `Add documentation/comments to the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  optimize: (code, language) =>
    `Optimize the following ${language} code for performance:\n\n\`\`\`${language}\n${code}\n\`\`\``,
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const action = typeof (body as any).action === 'string' ? (body as any).action : 'explain'
    const code = typeof (body as any).code === 'string' ? (body as any).code : ''
    const language = typeof (body as any).language === 'string' ? (body as any).language : 'text'
    const instruction = typeof (body as any).instruction === 'string' ? (body as any).instruction : ''
    const provider = typeof (body as any).provider === 'string' ? (body as any).provider : undefined
    const model = typeof (body as any).model === 'string' ? (body as any).model : undefined
    const maxTokens = typeof (body as any).maxTokens === 'number' ? Math.max(1, Math.floor((body as any).maxTokens)) : 2048
    const temperature = typeof (body as any).temperature === 'number' ? Math.min(1, Math.max(0, (body as any).temperature)) : 0.3

    if (!code && !instruction) {
      return NextResponse.json({ error: 'MISSING_INPUT', message: 'code or instruction is required.' }, { status: 400 })
    }

    const userRow = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true } })
    const limits = getPlanLimits(userRow?.plan || 'starter_trial')

    const estimatedTokens = Math.max(500, Math.ceil((code.length + instruction.length) / 4) + maxTokens)
    if (estimatedTokens > limits.maxTokensPerRequest) {
      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: `Request too large. Limit: ${limits.maxTokensPerRequest.toLocaleString()} tokens.`,
          maxTokensPerRequest: limits.maxTokensPerRequest,
        },
        { status: 413 }
      )
    }

    const quotaCheck = await checkAIQuota(user.userId, estimatedTokens)
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.code, message: quotaCheck.reason }, { status: 429 })
    }

    if (model) {
      const modelCheck = await checkModelAccess(user.userId, model)
      if (!modelCheck.allowed) {
        return NextResponse.json({ error: modelCheck.code, message: modelCheck.reason }, { status: 403 })
      }
    }

    const promptBuilder = ACTION_PROMPTS[action]
    const prompt = instruction || (promptBuilder ? promptBuilder(code, language) : code)

    if (aiService.getAvailableProviders().length === 0) {
      return notImplementedCapability({
        error: 'NOT_IMPLEMENTED',
        status: 501,
        message: 'AI provider not configured.',
        capability: 'AI_ACTION',
        milestone: 'P0',
      })
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
    })

    recordTokenUsage(user.userId, response.tokensUsed).catch(() => {})

    return NextResponse.json({
      action,
      content: response.content,
      provider: response.provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
    })
  } catch (error) {
    console.error('[AI Action] Error:', error)
    return NextResponse.json(
      { error: 'AI_ERROR', message: error instanceof Error ? error.message : 'AI request failed' },
      { status: 500 }
    )
  }
}
