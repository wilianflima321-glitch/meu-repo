import { prisma } from '@/lib/prisma'
import { readAgentReadReceiptStateFromSettings } from '@/lib/production/agent-read-receipts'
import {
  buildContextMemorySpinePlan,
  type ContextMemorySpinePlan,
} from '@/lib/production/context-memory-spine'
import {
  buildDeepContextPack,
  type DeepContextPack,
  type DeepContextPackMode,
} from '@/lib/production/deep-context-context-pack'
import { readDeepContextMemorySnapshotFromSettings } from '@/lib/production/deep-context-settings-persistence'
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
import { buildArchitectureContextSpine } from '@/lib/production/architecture-context-spine'
import { createComponentLogger } from '@/lib/observability/logger'

const contextLogger = createComponentLogger('server.ai-chat-advanced.context')

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

function inferDeepContextMode(message: string, qualityMode: 'standard' | 'delivery' | 'studio'): DeepContextPackMode {
  const normalized = message.toLowerCase()
  if (/\b(release|publish|deploy|ship|final|approval|approve|launch)\b/.test(normalized)) return 'release'
  if (/\b(code|refactor|bug|test|typescript|route|api|component|commit)\b/.test(normalized)) return 'code'
  if (/\b(research|benchmark|compare|market|source|paper|audit)\b/.test(normalized)) return 'research'
  if (/\b(gameplay|playtest|combat|quest|asset|mesh|lod|pbr|navmesh|character controller)\b/.test(normalized)) return 'gameplay'
  if (/\b(story|world|scene|shot|film|character|cinematic|dialogue)\b/.test(normalized)) return 'creative'
  return qualityMode === 'delivery' ? 'release' : 'plan'
}

function buildDeepContextPackInstruction(pack: DeepContextPack | null): string {
  if (!pack) return ''

  const selected = pack.selectedItems
    .slice(0, 8)
    .map((item) => `${item.chunk.id}:${item.chunk.category}`)
    .join(', ') || 'none'
  const held = pack.heldItems
    .slice(0, 8)
    .map((item) => `${item.chunk.id}:${item.reasons.join('|') || 'held'}`)
    .join(', ') || 'none'

  return `

DEEP CONTEXT PACK:
- Status: ${pack.status}
- Mode: ${pack.mode}
- Surface: ${pack.surface}
- Model: ${pack.model}
- Cache key: ${pack.cacheKey}
- Selected tokens: ${pack.selectedTokens}/${pack.contextBudgetTokens}
- Selected chunks: ${selected}
- Held chunks: ${held}
- Evidence required: ${pack.requiresEvidence ? 'yes' : 'no'}
- Read receipts: ${pack.requiresReadReceipts ? 'required before apply' : 'satisfied or not required'}
- Next action: ${pack.nextAction}

${pack.context}

If the Deep Context Pack is blocked, held, or needs-review, keep the answer useful but do not invent missing facts, assets, files, runtime capability, final approvals, release readiness, or game/film completeness.`
}

export async function buildAdvancedChatContext(params: {
  userId: string
  projectId?: string
  messages: ChatMessage[]
  qualityMode: 'standard' | 'delivery' | 'studio'
  enableWebResearch: boolean
  model?: string
}) {
  const { userId, projectId, messages, qualityMode, enableWebResearch, model = 'advanced-chat' } = params
  const lastUserMessage = messages[messages.length - 1]?.content ?? ''
  const historyContextRaw = messages
    .slice(0, -1)
    .filter((message) => message.role !== 'tool')
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n')
  let projectContext = ''
  let contextMemoryPlan: ContextMemorySpinePlan | null = null
  let deepContextPack: DeepContextPack | null = null

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
      const deepContextSnapshot = readDeepContextMemorySnapshotFromSettings(project.settings, project.id)

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

      deepContextPack = buildDeepContextPack({
        snapshot: deepContextSnapshot,
        query: lastUserMessage,
        mode: inferDeepContextMode(lastUserMessage, qualityMode),
        surface: 'ide',
        model,
        maxTokens: contextBudgetForQualityMode(qualityMode),
        maxChunks: qualityMode === 'studio' ? 12 : 8,
        includeHeld: true,
        readReceiptRefs: receiptState?.receipts.map((receipt) => receipt.id) ?? [],
        evidenceRefs: manifest ? [`repository-cartography:${manifest.id}`] : [],
        conversationHistoryChars: historyContextRaw.length,
      })
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
  const deepContextPackInstruction = buildDeepContextPackInstruction(deepContextPack)

  let l14Instruction = ''
  let architectureSpine: Awaited<ReturnType<typeof buildArchitectureContextSpine>> | null = null
  const deepMode = inferDeepContextMode(lastUserMessage, qualityMode)
  if (
    projectId &&
    (deepMode === 'creative' || deepMode === 'gameplay' || deepMode === 'code' || qualityMode === 'studio')
  ) {
    try {
      architectureSpine = await buildArchitectureContextSpine({
        userId,
        projectId,
        query: lastUserMessage,
        mode: deepMode === 'gameplay' || deepMode === 'creative' ? 'game-3d' : 'mixed',
        tokenBudget: qualityMode === 'studio' ? 3000 : 2000,
      })
      l14Instruction = `\n${architectureSpine.promptSection}`
    } catch (error) {
      contextLogger.warn('l14_spine_attach_failed', error)
    }
  }

  const enhancedSystemMessage = `${systemMessage}

${qualityInstruction}${rulesInstruction}${mentionInstruction}${benchmarkInstruction}${contextMemoryInstruction}${deepContextPackInstruction}${l14Instruction}`
  const historyContext = clampText(historyContextRaw, MAX_HISTORY_CONTEXT_CHARS)

  return {
    projectContext,
    systemMessage,
    lastUserMessage,
    mentionContext,
    projectRulesContext,
    webBenchmark,
    contextMemoryPlan,
    deepContextPack,
    architectureSpine,
    enhancedSystemMessage,
    historyContext,
  }
}
