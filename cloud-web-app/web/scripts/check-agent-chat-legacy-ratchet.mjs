#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const AI_CHAT_DIR = path.join(ROOT, 'components', 'ai-chat')
const failures = []
const MAX_AI_CHAT_FILES = 51
const MAX_AI_CHAT_LINES = 6100
const REQUIRED_AGENT_CHAT_FILES = [
  'components/agents/chat/index.ts',
  'components/agents/chat/composer.ts',
  'components/agents/chat/panels.ts',
  'components/agents/chat/state.ts',
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

for (const file of REQUIRED_AGENT_CHAT_FILES) read(file)

const legacyAlias = read('components/agents/legacy-chat-panel.ts').trim()
if (legacyAlias !== "export * from './chat'") {
  failures.push('components/agents/legacy-chat-panel.ts: expected exactly a thin alias to ./chat')
}

const agentChatIndex = read('components/agents/chat/index.ts')
for (const token of ['composer', 'panels', 'state']) {
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
