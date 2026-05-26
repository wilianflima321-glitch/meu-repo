import { prisma } from '@/lib/prisma'
import { readAgentReadReceiptStateFromSettings } from '@/lib/production/agent-read-receipts'
import {
  buildContextMemorySpinePlan,
  type ContextMemorySpinePlan,
} from '@/lib/production/context-memory-spine'
import {
  buildMultiResolutionProjectMemory,
  planProjectMemoryRetrieval,
} from '@/lib/production/multi-resolution-project-memory'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import { buildMentionContextBlock } from '@/lib/server/mention-context'
import { loadProjectRulesContext } from '@/lib/server/project-rules'
import {
  SYSTEM_PROMPT,
  QUALITY_POLICY,
  MAX_HISTORY_CONTEXT_CHARS,
  buildSelfQuestioningChecklist,
  maybeCollectWebBenchmarkContext,
} from '@/lib/server/advanced-chat-policy'
import { clampText } from './model-policy'
import type { ChatMessage } from './types'

function contextBudgetForQualityMode(qualityMode: 'standard' | 'delivery' | 'studio'): number {
  if (qualityMode === 'studio') return 32_000
  if (qualityMode === 'delivery') return 24_000
  return 16_000
}

function buildContextMemoryInstruction(plan: ContextMemorySpinePlan | null): string {
  if (!plan) return ''

  return `

CONTEXT MEMORY SPINE:
- Status: ${plan.status}
- Lane: ${plan.compressionLane}
- Planned tokens: ${plan.plannedInputTokens}/${plan.usableInputTokens}
- Direct context cap: ${plan.maxDirectContextTokens}
- UI thread allowed: ${plan.canUseUiThread ? 'yes' : 'no'}
- Selected shards: ${plan.selectedShardIds.slice(0, 8).join(', ') || 'none'}
- Read receipts: ${plan.requiresReadReceipts ? 'required before apply' : 'satisfied or not required'}
- Human review: ${plan.requiresHumanReview ? 'required' : 'not required'}
- Next action: ${plan.nextAction}

Rules:
${plan.hallucinationControls.slice(0, 5).map((rule) => `- ${rule}`).join('\n')}
${plan.deviceControls.slice(0, 4).map((rule) => `- ${rule}`).join('\n')}

If the context status is blocked or held, answer simple questions normally, but do not claim broad autonomous edits, final assets, release readiness, or complete game/film execution. Ask for the missing Project Memory, read receipts, evidence, Studio Local capacity, cloud indexing, or human review before apply.`
}

export async function buildAdvancedChatContext(params: {
  userId: string
  projectId?: string
  messages: ChatMessage[]
  qualityMode: 'standard' | 'delivery' | 'studio'
  enableWebResearch: boolean
}) {
  const { userId, projectId, messages, qualityMode, enableWebResearch } = params
  const lastUserMessage = messages[messages.length - 1]?.content ?? ''
  const historyContextRaw = messages
    .slice(0, -1)
    .filter((message) => message.role !== 'tool')
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n')
  let projectContext = ''
  let contextMemoryPlan: ContextMemorySpinePlan | null = null

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        files: { take: 50, orderBy: { updatedAt: 'desc' } },
      },
    })

    if (project) {
      const recentFilePaths = project.files.map((file: { path: string }) => file.path)
      projectContext = `
Current project: ${project.name}
Tipo: ${project.template || 'game'}
Recent files: ${recentFilePaths.join(', ')}
`
      const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
      const receiptState = readAgentReadReceiptStateFromSettings(project.settings)

      if (manifest) {
        const memory = buildMultiResolutionProjectMemory({ manifest })
        const retrievalPlan = planProjectMemoryRetrieval({
          memory,
          mission: lastUserMessage,
          requestedPaths: recentFilePaths.slice(0, 16),
          maxTokenBudget: contextBudgetForQualityMode(qualityMode),
        })

        contextMemoryPlan = buildContextMemorySpinePlan({
          mission: lastUserMessage,
          surface: 'ide',
          model: 'advanced-chat',
          memory,
          retrievalPlan,
          evidenceRefs: [`repository-cartography:${manifest.id}`],
          readReceiptRefs: receiptState?.receipts.map((receipt) => receipt.id) ?? [],
          conversationHistoryChars: historyContextRaw.length,
        })
      } else {
        contextMemoryPlan = buildContextMemorySpinePlan({
          mission: lastUserMessage,
          surface: 'ide',
          model: 'advanced-chat',
          conversationHistoryChars: historyContextRaw.length,
        })
      }
    }
  }

  const systemMessage = SYSTEM_PROMPT + (projectContext ? `

${projectContext}` : '')
  const mentionContext = await buildMentionContextBlock(lastUserMessage, { userId, projectId })
  const projectRulesContext = await loadProjectRulesContext({ userId, projectId })
  const webBenchmark = await maybeCollectWebBenchmarkContext(lastUserMessage, enableWebResearch)
  const qualityInstruction = `${QUALITY_POLICY[qualityMode]}

${buildSelfQuestioningChecklist()}`
  const rulesInstruction = projectRulesContext ? `

${projectRulesContext}` : ''
  const mentionInstruction = mentionContext.context
    ? `

${mentionContext.context}
Use this context only when it helps answer more precisely.`
    : ''
  const benchmarkInstruction = webBenchmark.summary
    ? `

External references (automated best-effort research):
${webBenchmark.summary}
Use as benchmark context; do not copy blindly.`
    : ''
  const contextMemoryInstruction = buildContextMemoryInstruction(contextMemoryPlan)
  const enhancedSystemMessage = `${systemMessage}

${qualityInstruction}${rulesInstruction}${mentionInstruction}${benchmarkInstruction}${contextMemoryInstruction}`
  const historyContext = clampText(historyContextRaw, MAX_HISTORY_CONTEXT_CHARS)

  return {
    projectContext,
    systemMessage,
    lastUserMessage,
    mentionContext,
    projectRulesContext,
    webBenchmark,
    contextMemoryPlan,
    enhancedSystemMessage,
    historyContext,
  }
}
