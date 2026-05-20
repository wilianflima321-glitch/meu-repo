import { prisma } from '@/lib/prisma'
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

export async function buildAdvancedChatContext(params: {
  userId: string
  projectId?: string
  messages: ChatMessage[]
  qualityMode: 'standard' | 'delivery' | 'studio'
  enableWebResearch: boolean
}) {
  const { userId, projectId, messages, qualityMode, enableWebResearch } = params
  let projectContext = ''

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        files: { take: 50, orderBy: { updatedAt: 'desc' } },
      },
    })

    if (project) {
      projectContext = `
Current project: ${project.name}
Tipo: ${project.template || 'game'}
Recent files: ${project.files.map((file: { path: string }) => file.path).join(', ')}
`
    }
  }

  const systemMessage = SYSTEM_PROMPT + (projectContext ? `

${projectContext}` : '')
  const lastUserMessage = messages[messages.length - 1].content
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
  const enhancedSystemMessage = `${systemMessage}

${qualityInstruction}${rulesInstruction}${mentionInstruction}${benchmarkInstruction}`
  const historyContextRaw = messages
    .slice(0, -1)
    .filter((message) => message.role !== 'tool')
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n')
  const historyContext = clampText(historyContextRaw, MAX_HISTORY_CONTEXT_CHARS)

  return {
    projectContext,
    systemMessage,
    lastUserMessage,
    mentionContext,
    projectRulesContext,
    webBenchmark,
    enhancedSystemMessage,
    historyContext,
  }
}
