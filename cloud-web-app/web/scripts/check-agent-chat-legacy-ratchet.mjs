#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const AI_CHAT_DIR = path.join(ROOT, 'components', 'ai-chat')
const failures = []
const MAX_AI_CHAT_FILES = 4
const MAX_AI_CHAT_LINES = 1230
const REQUIRED_AGENT_CHAT_FILES = [
  'components/agents/AgentEvidenceCard.tsx',
  'components/agents/AgentEvidencePanel.tsx',
  'components/agents/evidence-artifacts.ts',
  'components/agents/chat/index.ts',
  'components/agents/chat/AIChatCostMeter.tsx',
  'components/agents/chat/AIChatCostMeter.stories.tsx',
  'components/agents/chat/activity/index.ts',
  'components/agents/chat/activity/AgentBoard.tsx',
  'components/agents/chat/activity/AIChatActivityDeck.tsx',
  'components/agents/chat/activity/AIChatTimeline.tsx',
  'components/agents/chat/activity/LiveConversationPanel.tsx',
  'components/agents/chat/activity/RunCard.tsx',
  'components/agents/chat/composer.ts',
  'components/agents/chat/context/index.ts',
  'components/agents/chat/context/useAIChatContextActions.ts',
  'components/agents/chat/context/useChatContextPreviews.ts',
  'components/agents/chat/header/index.ts',
  'components/agents/chat/header/AIChatAgentLane.tsx',
  'components/agents/chat/header/AIChatHeader.tsx',
  'components/agents/chat/header/AIChatHeader.types.ts',
  'components/agents/chat/header/AIChatHeaderActions.tsx',
  'components/agents/chat/header/AIChatModeMenu.tsx',
  'components/agents/chat/header/AIChatModelPicker.tsx',
  'components/agents/chat/economics/index.ts',
  'components/agents/chat/economics/AIChatEconomicsPanel.tsx',
  'components/agents/chat/ledger/index.ts',
  'components/agents/chat/ledger/AIChatLedgerStrip.tsx',
  'components/agents/chat/messages/index.ts',
  'components/agents/chat/ops/index.ts',
  'components/agents/chat/ops/useAIChatOpsArtifacts.ts',
  'components/agents/chat/messages/AIChatMessagesPane.tsx',
  'components/agents/chat/messages/MessageBubble.tsx',
  'components/agents/chat/messages/MessageBubbleActionBar.tsx',
  'components/agents/chat/messages/MessageBubbleCodeActions.tsx',
  'components/agents/chat/messages/MessageBubbleContent.tsx',
  'components/agents/chat/messages/useMessageBubbleCopyActions.ts',
  'components/agents/chat/panels.ts',
  'components/agents/chat/presets.ts',
  'components/agents/chat/review/index.ts',
  'components/agents/chat/review/AIChatPendingDiffTray.tsx',
  'components/agents/chat/review/AIChatProposalPreview.tsx',
  'components/agents/chat/rules/index.ts',
  'components/agents/chat/rules/AIChatRulesPanel.tsx',
  'components/agents/chat/rules/useAIChatProjectRules.ts',
  'components/agents/chat/session/index.ts',
  'components/agents/chat/session/AIChatSessionBanner.tsx',
  'components/agents/chat/session/useAIChatSessionContext.ts',
  'components/agents/chat/session/useAIProviderPreflight.ts',
  'components/agents/chat/session-types.ts',
  'components/agents/chat/shell/index.ts',
  'components/agents/chat/shell/AIChatContextStrip.tsx',
  'components/agents/chat/shell/AIChatHistoryModeRail.tsx',
  'components/agents/chat/state/index.ts',
  'components/agents/chat/state/useAIChatHistoryMode.ts',
  'components/agents/chat/state/useAIChatOpsState.ts',
  'components/agents/chat/state/useAIChatPanelUiState.ts',
  'components/agents/chat/state/useAIChatRunState.ts',
  'components/agents/chat/telemetry/index.ts',
  'components/agents/chat/voice/index.ts',
  'components/agents/chat/voice/useAIChatSpeechPlayback.ts',
  'components/agents/chat/voice/useVoiceRecording.ts',
  'components/agents/chat/telemetry/AIChatBenchmarkTelemetry.tsx',
  'components/agents/chat/telemetry/AIChatQuickPromptStrip.tsx',
  'components/agents/chat/utils.ts',
  'components/agents/legacy-chat-panel.ts',
]

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function listTsFiles(dir) {
  if (!fs.existsSync(dir)) {
    failures.push('components/ai-chat: missing legacy directory while migration is still in progress')
    return []
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort()
}

const aiChatFiles = listTsFiles(AI_CHAT_DIR)
const totalLines = aiChatFiles.reduce((sum, file) => {
  return sum + fs.readFileSync(file, 'utf8').split(/\r?\n/).length
}, 0)

if (aiChatFiles.length > MAX_AI_CHAT_FILES) {
  failures.push(`components/ai-chat file count exceeded ${MAX_AI_CHAT_FILES}: ${aiChatFiles.length}`)
}

if (totalLines > MAX_AI_CHAT_LINES) {
  failures.push(`components/ai-chat line budget exceeded ${MAX_AI_CHAT_LINES}: ${totalLines}`)
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'chat-utils.ts'))) {
  failures.push('components/ai-chat/chat-utils.ts: utility must stay absorbed into components/agents/chat/utils.ts')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'ai-chat-container.types.ts'))) {
  failures.push('components/ai-chat/ai-chat-container.types.ts: session types must stay absorbed into components/agents/chat/session-types.ts')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'presets.ts'))) {
  failures.push('components/ai-chat/presets.ts: presets must stay absorbed into components/agents/chat/presets.ts')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'AIChatCostMeter.stories.tsx'))) {
  failures.push('components/ai-chat/AIChatCostMeter.stories.tsx: story must stay absorbed into components/agents/chat')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'AIChatCostMeter.tsx'))) {
  failures.push('components/ai-chat/AIChatCostMeter.tsx: cost meter must stay absorbed into components/agents/chat')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'ai-chat-evidence.ts'))) {
  failures.push('components/ai-chat/ai-chat-evidence.ts: evidence artifacts must stay absorbed into components/agents/evidence-artifacts.ts')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'AIChatEvidenceCard.tsx'))) {
  failures.push('components/ai-chat/AIChatEvidenceCard.tsx: evidence card must stay absorbed into components/agents/AgentEvidenceCard.tsx')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'AIChatEvidencePanel.tsx'))) {
  failures.push('components/ai-chat/AIChatEvidencePanel.tsx: evidence panel must stay absorbed into components/agents/AgentEvidencePanel.tsx')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'AIChatEconomicsPanel.tsx'))) {
  failures.push('components/ai-chat/AIChatEconomicsPanel.tsx: economics panel must stay absorbed into components/agents/chat/economics')
}

if (fs.existsSync(path.join(AI_CHAT_DIR, 'AIChatLedgerStrip.tsx'))) {
  failures.push('components/ai-chat/AIChatLedgerStrip.tsx: ledger strip must stay absorbed into components/agents/chat/ledger')
}

for (const file of ['AIChatBenchmarkTelemetry.tsx', 'AIChatQuickPromptStrip.tsx']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: telemetry and quick prompts must stay absorbed into components/agents/chat/telemetry`)
  }
}

for (const file of ['AIChatPendingDiffTray.tsx', 'AIChatProposalPreview.tsx']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: proposal review UI must stay absorbed into components/agents/chat/review`)
  }
}

for (const file of ['AIChatContextStrip.tsx', 'AIChatHistoryModeRail.tsx']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: agent shell UI must stay absorbed into components/agents/chat/shell`)
  }
}

for (const file of [
  'AIChatMessagesPane.tsx',
  'MessageBubble.tsx',
  'MessageBubbleActionBar.tsx',
  'MessageBubbleCodeActions.tsx',
  'MessageBubbleContent.tsx',
  'useMessageBubbleCopyActions.ts',
]) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: conversation message UI must stay absorbed into components/agents/chat/messages`)
  }
}

for (const file of ['AIChatSessionBanner.tsx', 'useAIChatSessionContext.ts', 'useAIProviderPreflight.ts']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: session handoff and provider preflight must stay absorbed into components/agents/chat/session`)
  }
}

for (const file of ['AIChatRulesPanel.tsx', 'useAIChatProjectRules.ts']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: project rules must stay absorbed into components/agents/chat/rules`)
  }
}

for (const file of ['useAIChatSpeechPlayback.ts', 'useVoiceRecording.ts']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: voice hooks must stay absorbed into components/agents/chat/voice`)
  }
}

for (const file of ['useAIChatHistoryMode.ts', 'useAIChatOpsState.ts', 'useAIChatPanelUiState.ts', 'useAIChatRunState.ts']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: panel state hooks must stay absorbed into components/agents/chat/state`)
  }
}

for (const file of ['useAIChatContextActions.ts', 'useChatContextPreviews.ts']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: context preview hooks must stay absorbed into components/agents/chat/context`)
  }
}

for (const file of ['AIChatAgentLane.tsx', 'AIChatHeader.tsx', 'AIChatHeader.types.ts', 'AIChatHeaderActions.tsx', 'AIChatModeMenu.tsx', 'AIChatModelPicker.tsx']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: chat chrome must stay absorbed into components/agents/chat/header`)
  }
}

for (const file of ['useAIChatOpsArtifacts.ts']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: ops artifacts must stay absorbed into components/agents/chat/ops`)
  }
}

for (const file of ['AgentBoard.tsx', 'AIChatActivityDeck.tsx', 'AIChatTimeline.tsx', 'LiveConversationPanel.tsx', 'RunCard.tsx']) {
  if (fs.existsSync(path.join(AI_CHAT_DIR, file))) {
    failures.push(`components/ai-chat/${file}: agent activity UI must stay absorbed into components/agents/chat/activity`)
  }
}

for (const file of REQUIRED_AGENT_CHAT_FILES) read(file)

const legacyAlias = read('components/agents/legacy-chat-panel.ts').trim()
if (legacyAlias !== "export * from './chat'") {
  failures.push('components/agents/legacy-chat-panel.ts: expected exactly a thin alias to ./chat')
}

const agentChatIndex = read('components/agents/chat/index.ts')
for (const token of ['activity', 'composer', 'context', 'header', 'economics', 'ledger', 'messages', 'ops', 'panels', 'presets', 'review', 'rules', 'session', 'session-types', 'shell', 'state', 'telemetry', 'voice']) {
  if (!agentChatIndex.includes(token)) {
    failures.push(`components/agents/chat/index.ts: missing ${token} export`)
  }
}

const directConsumerFiles = []
for (const relative of [
  'components/ide/AIChatPanelPro.tsx',
  'components/ide/AIChatPanelPro.types.ts',
  'components/ide/InlineAIChat.response.ts',
  'components/ide/InlineAIChat.types.ts',
  'components/ide/InlineAIChatMessageSurface.tsx',
]) {
  const content = read(relative)
  if (content.includes('@/components/ai-chat/')) directConsumerFiles.push(relative)
}

if (directConsumerFiles.length) {
  failures.push(`IDE files must consume agent adapters instead of ai-chat directly: ${directConsumerFiles.join(', ')}`)
}

if (failures.length) {
  console.error('[agent-chat-legacy-ratchet] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[agent-chat-legacy-ratchet] PASS files=${aiChatFiles.length}/${MAX_AI_CHAT_FILES} lines=${totalLines}/${MAX_AI_CHAT_LINES} grammar=components/agents/chat`)
