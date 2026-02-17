import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { aiService, type LLMProvider } from '@/lib/ai-service'
import { prisma } from '@/lib/db'
import { checkAIQuota, checkModelAccess, recordTokenUsage, getPlanLimits } from '@/lib/plan-limits'
import { notImplementedCapability } from '@/lib/server/capability-response'

const INLINE_EDIT_SYSTEM_PROMPT = `You are an inline code editing assistant.
Rules:
1. Return only JSON with keys: code, explanation, confidence.
2. Preserve formatting and style when possible.
3. Do not invent execution results.
4. If the request cannot be applied, return the original code.
5. Do not wrap output in markdown fences.`

type InlineEditContext = {
  cursorPosition?: { line: number; column: number }
}

type InlineEditBody = {
  code?: string
  instruction?: string
  language?: string
  filePath?: string
  context?: InlineEditContext
  provider?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

function asProvider(value: unknown): LLMProvider | undefined {
  if (value !== 'openai' && value !== 'anthropic' && value !== 'google' && value !== 'groq') {
    return undefined
  }
  return value
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const body = (await req.json().catch(() => null)) as InlineEditBody | null

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : ''
    if (!instruction) {
      return NextResponse.json({ error: 'MISSING_INSTRUCTION', message: 'instruction is required.' }, { status: 400 })
    }

    const code = typeof body.code === 'string' ? body.code : ''
    const language = typeof body.language === 'string' ? body.language : undefined
    const filePath = typeof body.filePath === 'string' ? body.filePath : undefined
    const context = body.context && typeof body.context === 'object' ? body.context : undefined
    const provider = asProvider(body.provider)
    const model = typeof body.model === 'string' ? body.model : undefined
    const maxTokens = typeof body.maxTokens === 'number' ? Math.max(1, Math.floor(body.maxTokens)) : 4096
    const temperature = typeof body.temperature === 'number' ? Math.min(1, Math.max(0, body.temperature)) : 0.3

    const userPrompt = buildPrompt(code, instruction, language, filePath, context)

    const userRow = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true } })
    const limits = getPlanLimits(userRow?.plan || 'starter_trial')

    const estimatedTokens = Math.max(500, Math.ceil(userPrompt.length / 4) + maxTokens)
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

    if (aiService.getAvailableProviders().length === 0) {
      return notImplementedCapability({
        error: 'NOT_IMPLEMENTED',
        status: 501,
        message: 'AI provider not configured.',
        capability: 'AI_INLINE_EDIT',
        milestone: 'P1',
      })
    }

    const result = await aiService.chat({
      messages: [
        { role: 'system', content: INLINE_EDIT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      provider,
      model,
      temperature,
      maxTokens,
    })

    recordTokenUsage(user.userId, result.tokensUsed).catch(() => {})

    return NextResponse.json(parseInlineEditResponse(result.content))
  } catch (error) {
    console.error('Inline Edit Error:', error)
    return NextResponse.json(
      {
        error: 'AI_ERROR',
        message: error instanceof Error ? error.message : 'Inline edit request failed',
      },
      { status: 500 }
    )
  }
}

function parseInlineEditResponse(content: string): { code: string; explanation: string; confidence: number } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON block not found')
    const parsed = JSON.parse(jsonMatch[0]) as { code?: unknown; explanation?: unknown; confidence?: unknown }

    return {
      code: typeof parsed.code === 'string' ? parsed.code : '',
      explanation:
        typeof parsed.explanation === 'string'
          ? parsed.explanation
          : 'Inline edit generated without explanation.',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
    }
  } catch {
    return {
      code: content.replace(/```[\w]*\n?/g, '').replace(/```$/g, ''),
      explanation: 'Inline edit generated from raw model output.',
      confidence: 0.7,
    }
  }
}

function buildPrompt(
  code: string,
  instruction: string,
  language?: string,
  filePath?: string,
  context?: InlineEditContext
): string {
  let prompt = `INSTRUCTION: ${instruction}\n\n`

  if (language) {
    prompt += `LANGUAGE: ${language}\n`
  }

  if (filePath) {
    prompt += `FILE: ${filePath}\n`
  }

  if (context?.cursorPosition) {
    prompt += `CURSOR: line ${context.cursorPosition.line}, column ${context.cursorPosition.column}\n`
  }

  if (code.trim()) {
    prompt += `\nORIGINAL CODE:\n\`\`\`${language || ''}\n${code}\n\`\`\``
  } else {
    prompt += '\n(NO SELECTION - generate new code fragment)'
  }

  prompt += '\n\nApply the instruction and return JSON only.'
  return prompt
}
