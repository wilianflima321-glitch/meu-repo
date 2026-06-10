#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

function lineCount(relativePath) {
  const content = read(relativePath)
  return content ? content.split(/\r?\n/).length : 0
}

const agentsWindowLines = lineCount('components/agents/AgentsWindow.tsx')
if (agentsWindowLines > 180) {
  failures.push(`components/agents/AgentsWindow.tsx: expected <=180 lines after composition split, found ${agentsWindowLines}`)
}

const requiredFiles = [
  'components/agents/index.ts',
  'components/agents/AgentEvidenceCard.tsx',
  'components/agents/AgentsWorkspaceContainer.tsx',
  'components/agents/evidence.ts',
  'components/agents/chat/index.ts',
  'components/agents/chat/composer.ts',
  'components/agents/chat/panels.ts',
  'components/agents/chat/state.ts',
  'components/agents/chat/utils.ts',
  'components/agents/legacy-chat-panel.ts',
  'components/agents/presets.ts',
  'components/agents/window/types.ts',
  'components/agents/window/agent-window-api.ts',
  'components/agents/window/AgentCard.tsx',
  'components/agents/window/AgentTrustStrip.tsx',
  'components/agents/window/AgentFleetPanel.tsx',
  'components/agents/window/AgentReplayPanel.tsx',
  'components/agents/window/AgentWindowStates.tsx',
  'components/agents/window/AgentWindowTabs.tsx',
]
for (const file of requiredFiles) read(file)

requirePattern('components/agents/AgentsWindow.tsx', /AgentReplayPanel/, 'AgentsWindow must delegate replay UI')
requirePattern('components/agents/AgentsWindow.tsx', /AgentFleetPanel/, 'AgentsWindow must delegate fleet UI')
requirePattern('components/agents/index.ts', /AgentsWorkspaceContainer/, 'agents barrel must expose the workspace container')
requirePattern('components/agents/index.ts', /AgentEvidenceCard/, 'agents barrel must expose evidence cards')
requirePattern('components/agents/index.ts', /AIChatTraceArtifact/, 'agents barrel must expose evidence types')
requirePattern('components/agents/legacy-chat-panel.ts', /export \* from ['"]\.\/chat['"]/, 'legacy chat adapter must stay a thin alias to agent chat grammar')
requirePattern('components/agents/chat/index.ts', /composer/, 'agent chat index must export composer grammar')
requirePattern('components/agents/chat/index.ts', /panels/, 'agent chat index must export panel grammar')
requirePattern('components/agents/chat/index.ts', /state/, 'agent chat index must export state grammar')
requirePattern('components/agents/chat/index.ts', /utils/, 'agent chat index must export utility grammar')
requirePattern('components/agents/chat/composer.ts', /AIChatComposer/, 'agent chat composer adapter must expose composer')
requirePattern('components/agents/chat/panels.ts', /AIChatMessagesPane/, 'agent chat panels adapter must expose message pane')
requirePattern('components/agents/chat/state.ts', /useAIChatRunState/, 'agent chat state adapter must expose run state')
requirePattern('components/agents/chat/utils.ts', /formatCost/, 'agent chat utilities must expose cost formatting')
requirePattern('components/agents/AgentsWorkspaceContainer.tsx', /AgentsWindow/, 'workspace container must expose AgentsWindow')
requirePattern('components/agents/AgentsWorkspaceContainer.tsx', /AIChatPanelPro/, 'workspace container must keep the composer while migration is in progress')
requirePattern('components/ide/fullscreen/FullscreenIDEWorkspace.tsx', /AgentsWorkspaceContainer/, 'IDE workbench must use the canonical agents workspace container')
requirePattern('components/ide/AIChatPanelContainer.tsx', /AgentsWorkspaceContainer/, 'legacy AIChatPanelContainer must stay a compatibility wrapper')
requirePattern('components/agents/window/AgentReplayPanel.tsx', /BrowserOperatorReplay/, 'replay panel must keep governed replay evidence visible')
requirePattern('components/agents/window/AgentTrustStrip.tsx', /CostMeter remains the source of truth/, 'trust strip must be honest about missing per-agent cost')
requirePattern('components/agents/window/AgentTrustStrip.tsx', /Read receipts/, 'trust strip must show read receipt status')
requirePattern('components/agents/window/AgentTrustStrip.tsx', /Scope locks/, 'trust strip must show scope locks')
requirePattern('components/agents/window/AgentReplayPanel.tsx', /No replay yet|Replay is ready when evidence exists/, 'replay empty state must be honest')
requirePattern('components/agents/window/agent-window-api.ts', /fetchBrowserOperatorRuns/, 'recent replay discovery must stay in API helper')
requirePattern('components/agents/window/AgentFleetPanel.tsx', /Pause fleet/, 'fleet panel must keep pause control visible')

const workspace = read('components/ide/fullscreen/FullscreenIDEWorkspace.tsx')
if (/AIChatPanelContainer/.test(workspace)) {
  failures.push('components/ide/fullscreen/FullscreenIDEWorkspace.tsx: must not import legacy AIChatPanelContainer')
}

if (failures.length) {
  console.error('[agents-window-composition] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[agents-window-composition] PASS AgentsWindow.tsx=${agentsWindowLines} lines modules=${requiredFiles.length}`)
