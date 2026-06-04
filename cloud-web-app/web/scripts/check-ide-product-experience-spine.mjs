#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath))
    failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content))
    failures.push(`${relativePath}: missing ${pattern} (${reason})`)
}

function rejectPattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) return
  const content = read(relativePath)
  if (pattern.test(content))
    failures.push(`${relativePath}: matched ${pattern} (${reason})`)
}

function requireLineBudget(relativePath, maxLines, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const lines = read(relativePath).split(/\r?\n/).length
  if (lines > maxLines)
    failures.push(
      `${relativePath}: ${lines} lines exceeds ${maxLines} (${reason})`,
    )
}

function requireJsonField(relativePath, field, expected, reason) {
  if (!exists(relativePath)) return
  const json = JSON.parse(read(relativePath))
  if (json[field] !== expected) {
    failures.push(
      `${relativePath}: ${field}=${JSON.stringify(json[field])}, expected ${JSON.stringify(expected)} (${reason})`,
    )
  }
}

requireFile(
  'components/ide/ModernIDEShell.tsx',
  'IDE must have a single canonical shell',
)
requireFile(
  'components/ide/modern-shell/chromeHeaderParts.tsx',
  'IDE top chrome must stay command-first and avoid duplicated panel navigation',
)
requireFile(
  'components/ide/FullscreenIDE.tsx',
  'fullscreen IDE route shell must stay tiny and focused',
)
requireFile(
  'components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
  'fullscreen IDE must compose the canonical shell',
)
requireFile(
  'components/ide/fullscreen/WorkbenchEditorStates.tsx',
  'editor empty states must be product-grade, not placeholder copy',
)
requireFile(
  'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
  'editor toolbar must adapt to compact/mobile surfaces',
)
requireFile(
  'components/ide/fullscreen/WorkbenchPreviewModeHeader.tsx',
  'preview mode chrome must stay compact and registry-backed',
)
requireFile(
  'components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx',
  'preview empty state must be product-grade and governed',
)
requireFile(
  'components/ide/fullscreen/useFullscreenIDEOrchestrator.ts',
  'fullscreen IDE orchestration must be isolated from the route shell',
)
requireFile(
  'components/ide/fullscreen/useFullscreenIDERuntime.ts',
  'fullscreen IDE runtime orchestration must be isolated',
)
requireFile(
  'components/ide/fullscreen/useFullscreenIDECollaboration.ts',
  'fullscreen IDE access/presence/collaboration orchestration must be isolated',
)
requireFile(
  'components/ide/fullscreen/useFullscreenIDEFileModel.ts',
  'fullscreen IDE file/editor model orchestration must be isolated',
)
requireFile(
  'components/preview/CanonicalPreviewSurface.tsx',
  'preview/viewport must route through one canonical surface',
)
requireFile(
  'components/preview/previewSurfaceRegistry.ts',
  'preview modes must have one market-aligned registry',
)
requireFile(
  'components/viewport/AethelViewport3D.tsx',
  '3D viewport must have a canonical runtime adapter',
)
requireFile(
  'components/preview/PreviewContextDock.tsx',
  'runtime preview edit controls must stay contextual',
)
requireFile(
  'components/preview/RuntimePreviewSurface.tsx',
  'runtime preview surface must be explicit',
)
requireFile(
  'components/ide/fullscreen/WorkbenchPreviewPane.tsx',
  'IDE preview pane must embed the canonical preview surface',
)
requireFile(
  'components/ide/PreviewRuntimeToolbar.parts.tsx',
  'preview runtime toolbar must be a thin barrel',
)
requireFile(
  'components/ide/PreviewRuntimeToolbar.types.tsx',
  'preview runtime toolbar types/copy must stay isolated',
)
requireFile(
  'components/ide/PreviewDeployTrustPanel.tsx',
  'deploy trust panel must stay isolated',
)
requireFile(
  'components/ide/PreviewRuntimeSettingsPanel.tsx',
  'runtime settings panel must stay isolated',
)
requireFile(
  'components/ide/PreviewRuntimeTechnicalDetails.tsx',
  'technical preview details must stay hidden and isolated',
)
requireFile(
  'components/ide/CommandPaletteUI.tsx',
  'command palette rendering must be isolated from command/state registration',
)
requireFile(
  'components/ide/CommandPalette.parts.tsx',
  'command palette models and fuzzy search helpers must stay isolated',
)
requireFile(
  'components/ide/DebugPanel.parts.tsx',
  'debug panel models and shared disclosure primitive must stay isolated',
)
requireFile(
  'components/ide/DebugVariablesTree.tsx',
  'debug variable tree must stay isolated',
)
requireFile(
  'components/ide/DebugBreakpointsStack.tsx',
  'debug breakpoint and stack lists must stay isolated',
)
requireFile(
  'components/ide/DebugWatchConsole.tsx',
  'debug watch expressions and console output must stay isolated',
)
requireFile(
  'components/ide/InlineAIChat.helpers.ts',
  'inline AI helper entrypoint must be a thin barrel',
)
requireFile(
  'components/ide/InlineAIChat.types.ts',
  'inline AI types must stay isolated',
)
requireFile(
  'components/ide/InlineAIChat.context.ts',
  'inline AI context and suggestion copy must stay isolated',
)
requireFile(
  'components/ide/InlineAIChat.response.ts',
  'inline AI response parsing/mock logic must stay isolated',
)
requireFile(
  'components/ide/FileExplorerPro.parts.tsx',
  'file explorer entrypoint must be a thin barrel',
)
requireFile(
  'components/ide/FileExplorerPro.types.ts',
  'file explorer types must stay isolated',
)
requireFile(
  'components/ide/FileExplorerPro.helpers.ts',
  'file explorer data helpers must stay isolated',
)
requireFile(
  'components/ide/FileExplorerTree.tsx',
  'file explorer tree rendering must stay isolated',
)
requireFile(
  'components/ide/FileExplorerContextMenu.tsx',
  'file explorer context menu must stay isolated',
)
requireFile(
  'components/ide/FileExplorerView.tsx',
  'file explorer chrome and empty/loading states must stay isolated',
)
requireFile(
  'components/ide/InlineCompletion.parts.tsx',
  'inline completion entrypoint must be a thin barrel',
)
requireFile(
  'components/ide/InlineCompletion.types.ts',
  'inline completion types must stay isolated',
)
requireFile(
  'components/ide/InlineCompletion.provider.ts',
  'inline completion provider must stay isolated',
)
requireFile(
  'components/ide/InlineCompletion.debounce.ts',
  'inline completion debounce hook must stay isolated',
)
requireFile(
  'components/ide/InlineCompletionGhost.tsx',
  'inline completion ghost text UI must stay isolated',
)
requireFile(
  'components/ide/InlineCompletionSettings.tsx',
  'inline completion settings/status UI must stay isolated',
)
requireFile(
  'lib/mobile/mobile-companion-contract.ts',
  'mobile must be a companion contract, not a desktop clone',
)

requirePattern(
  'components/ide/ModernIDEShell.tsx',
  /children:\s*\{[\s\S]*sidebar:[\s\S]*editor:[\s\S]*preview:[\s\S]*chat:[\s\S]*terminal:/,
  'IDE shell must keep the VS Code/Cursor-grade workbench regions explicit',
)
requirePattern(
  'components/ide/ModernIDEShell.tsx',
  /<ModernIDEShellPanels/,
  'canonical shell must delegate panel layout through one orchestrator',
)
requirePattern(
  'components/ide/modern-shell/chromeHeaderParts.tsx',
  /CommandCenterButton[\s\S]*Cmd\+K[\s\S]*Cmd\+P/,
  'top chrome must prioritize command center and quick open',
)
rejectPattern(
  'components/ide/modern-shell/chromeHeaderParts.tsx',
  /headerPanelItems|function PanelToggle|label: 'AI Console'|label: 'Visual'/,
  'top chrome must not duplicate bottom dock panel navigation',
)
requirePattern(
  'components/ide/modern-shell/ModernIDEShellPanels.tsx',
  /EditorErrorBoundary[\s\S]*PanelErrorBoundary[\s\S]*Explorer[\s\S]*AI Console[\s\S]*Terminal/,
  'IDE regions must have independent error boundaries so one failed pane does not crash the workbench',
)
rejectPattern(
  'components/ide/modern-shell/ModernIDEShellPanels.tsx',
  /Redimensionar|barra lateral/,
  'IDE shell chrome must stay in the premium default English surface',
)
requirePattern(
  'components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
  /<ModernIDEShell[\s\S]*sidebar:[\s\S]*<WorkbenchSidebar[\s\S]*chat:\s*<AIChatPanelContainer[\s\S]*terminal:\s*<MultiTerminalPanel[\s\S]*editor:\s*<WorkbenchEditorPane[\s\S]*preview:\s*<WorkbenchPreviewPane/,
  'fullscreen IDE must compose sidebar, agent sidecar, terminal, editor, and preview through the canonical shell',
)
requirePattern(
  'components/ide/FullscreenIDE.tsx',
  /useFullscreenIDEOrchestrator[\s\S]*useFullscreenIDEWorkspaceProps[\s\S]*<FullscreenIDEWorkspace \{\.\.\.workspaceProps\}/,
  'fullscreen route shell must delegate orchestration and render the canonical workspace directly',
)
requirePattern(
  'components/ide/fullscreen/useFullscreenIDEOrchestrator.ts',
  /useWorkbenchRouteParams[\s\S]*useWorkbenchShellState[\s\S]*useFullscreenIDERuntime[\s\S]*useFullscreenIDEFileModel[\s\S]*useFullscreenIDECollaboration[\s\S]*useFullscreenIDEBridgeProps/,
  'fullscreen orchestration hook must delegate runtime, files/editor, and collaboration wiring into focused hooks',
)
requirePattern(
  'components/ide/fullscreen/useFullscreenIDEFileModel.ts',
  /useWorkbenchFiles[\s\S]*useWorkbenchEditorModel/,
  'fullscreen file model hook must own workspace file IO and derived editor model',
)
requirePattern(
  'components/ide/fullscreen/useFullscreenIDERuntime.ts',
  /usePreviewRuntimeManager[\s\S]*useWorkbenchRuntimeSyncScheduler[\s\S]*useWorkbenchRuntimeActions/,
  'fullscreen runtime hook must own preview runtime, sync scheduling, and recommended runtime action',
)
requirePattern(
  'components/ide/fullscreen/useFullscreenIDECollaboration.ts',
  /useWorkbenchFullAccess[\s\S]*useWorkbenchPresence[\s\S]*useWorkbenchRealtimeCollaboration/,
  'fullscreen collaboration hook must own full access, presence, and realtime collaboration state',
)
rejectPattern(
  'components/ide/FullscreenIDE.tsx',
  /useWorkbench|usePreviewRuntimeManager|monaco-editor|useRef|useFullscreenIDEBridgeProps/,
  'fullscreen route shell must not import workbench/runtime internals',
)
rejectPattern(
  'components/ide/fullscreen/useFullscreenIDEOrchestrator.ts',
  /useWorkbenchFiles|useWorkbenchEditorModel|useWorkbenchFullAccess|useWorkbenchPresence|useWorkbenchRealtimeCollaboration|usePreviewRuntimeManager|useWorkbenchRuntimeActions|useWorkbenchRuntimeSyncScheduler/,
  'fullscreen orchestrator must delegate file/editor, runtime, and collaboration implementation hooks',
)
requirePattern(
  'components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
  /CommandPaletteProvider/,
  'IDE must preserve command-first navigation',
)
requirePattern(
  'components/ide/fullscreen/WorkbenchEditorStates.tsx',
  /Workspace ready[\s\S]*Cmd\+P[\s\S]*Cmd\+K[\s\S]*Ctrl\+I/,
  'empty editor state must guide users toward quick open, command center, and AI Console',
)
rejectPattern(
  'components/ide/fullscreen/WorkbenchEditorStates.tsx',
  /Select a file to start editing|No file open in this group/,
  'IDE empty states must not regress to weak placeholder copy',
)
requirePattern(
  'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
  /if \(isCompactViewport\)[\s\S]*Compact editor:[\s\S]*Search[\s\S]*Split[\s\S]*Diagnostics/,
  'compact editor toolbar must reduce visible controls to the core mobile-safe actions',
)
rejectPattern(
  'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
  /Compact viewport detected/,
  'compact editor copy must not sound like a warning/error state',
)
requirePattern(
  'components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
  /CostMeter/,
  'cost awareness must remain close to the workbench without becoming a separate cockpit',
)
requirePattern(
  'components/ide/fullscreen/WorkbenchPreviewPane.tsx',
  /CanonicalPreviewSurface/,
  'IDE preview modes must not bypass the canonical preview surface',
)
requirePattern(
  'components/preview/CanonicalPreviewSurface.tsx',
  /RuntimePreviewSurface/,
  'canonical preview must include runtime app preview',
)
requirePattern(
  'components/preview/CanonicalPreviewSurface.tsx',
  /UnifiedViewport[\s\S]*surface="scene"/,
  'canonical preview must route scene/3D viewport through the unified lazy viewport adapter',
)
requirePattern(
  'components/preview/CanonicalPreviewSurface.tsx',
  /data-canonical-preview-surface/,
  'canonical preview variants must expose a stable surface marker for visual QA',
)
requirePattern(
  'components/preview/previewSurfaceRegistry.ts',
  /PREVIEW_SURFACE_REGISTRY[\s\S]*viewport3d[\s\S]*runtime[\s\S]*console/,
  'preview registry must define viewport, runtime, and console as one controlled family',
)
requirePattern(
  'components/ide/fullscreen/WorkbenchPreviewModeHeader.tsx',
  /data-preview-surface-kind[\s\S]*data-preview-surface-owner/,
  'preview mode chrome must expose stable registry-backed markers for visual QA and regression capture',
)
requirePattern(
  'components/ide/fullscreen/WorkbenchPreviewModeHeader.tsx',
  /contextTitle[\s\S]*activeSurface\.detailPolicy[\s\S]*xl:inline-flex[\s\S]*2xl:inline-flex/,
  'preview mode chrome must keep detailed mission/file context out of the default dense viewport',
)
rejectPattern(
  'components/ide/fullscreen/WorkbenchPreviewModeHeader.tsx',
  /Surface:/,
  'preview header must not expose technical surface policy as noisy visible copy',
)
requirePattern(
  'components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx',
  /Preview waits for real context[\s\S]*3D output/,
  'preview empty state must stay product-grade without weak placeholder copy',
)
requirePattern(
  'components/preview/PreviewRuntimeTrustNotice.tsx',
  /data-preview-trust-notice="compact"[\s\S]*Preview trust[\s\S]*Runtime evidence/,
  'IDE preview runtime trust must show one calm status row and hide detailed health/readiness evidence behind disclosure',
)
requirePattern(
  'components/ide/PreviewRuntimeToolbar.tsx',
  /data-preview-runtime-toolbar="calm"[\s\S]*(Run guard|Runtime lane policy)/,
  'IDE preview toolbar must keep preview state calm and move run policy detail behind disclosure',
)
rejectPattern(
  'components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx',
  /Select a file to open the right visual surface/,
  'preview empty state must not regress to basic placeholder copy',
)
requireLineBudget(
  'components/ide/FullscreenIDE.tsx',
  80,
  'fullscreen IDE shell should only mount suspense and the canonical workspace adapter',
)
requireLineBudget(
  'components/ide/fullscreen/useFullscreenIDEOrchestrator.ts',
  180,
  'fullscreen IDE orchestration should stay below god-hook size while split into focused hooks',
)
requireLineBudget(
  'components/ide/fullscreen/useFullscreenIDEFileModel.ts',
  110,
  'fullscreen file/editor model hook should stay focused',
)
requireLineBudget(
  'components/ide/fullscreen/useFullscreenIDERuntime.ts',
  90,
  'fullscreen runtime hook should stay focused',
)
requireLineBudget(
  'components/ide/fullscreen/useFullscreenIDECollaboration.ts',
  90,
  'fullscreen collaboration hook should stay focused',
)
requireLineBudget(
  'components/ide/PreviewRuntimeToolbar.parts.tsx',
  40,
  'toolbar parts should only re-export focused components',
)
requireLineBudget(
  'components/ide/PreviewRuntimeToolbar.types.tsx',
  220,
  'toolbar types/copy should stay compact',
)
requireLineBudget(
  'components/ide/PreviewDeployTrustPanel.tsx',
  190,
  'deploy trust panel should stay focused',
)
requireLineBudget(
  'components/ide/PreviewRuntimeSettingsPanel.tsx',
  160,
  'runtime settings panel should stay focused',
)
requireLineBudget(
  'components/ide/PreviewRuntimeTechnicalDetails.tsx',
  120,
  'technical details must stay compact and hidden by default',
)
requireLineBudget(
  'components/ide/CommandPalette.tsx',
  240,
  'command palette provider should only own state, shortcuts, and command registration',
)
requireLineBudget(
  'components/ide/CommandPaletteUI.tsx',
  330,
  'command palette UI should stay compact and isolated',
)
requireLineBudget(
  'components/ide/CommandPalette.parts.tsx',
  320,
  'command palette helpers/models should stay focused',
)
requireLineBudget(
  'components/ide/DebugPanel.parts.tsx',
  120,
  'debug parts barrel should only keep types and shared disclosure shell',
)
requireLineBudget(
  'components/ide/DebugVariablesTree.tsx',
  120,
  'debug variables tree should stay focused',
)
requireLineBudget(
  'components/ide/DebugBreakpointsStack.tsx',
  130,
  'debug breakpoint/stack lists should stay focused',
)
requireLineBudget(
  'components/ide/DebugWatchConsole.tsx',
  220,
  'debug watch/console panel should stay focused',
)
requireLineBudget(
  'components/ide/InlineAIChat.helpers.ts',
  40,
  'inline AI helper entrypoint should only re-export focused modules',
)
requireLineBudget(
  'components/ide/InlineAIChat.types.ts',
  80,
  'inline AI types should stay focused',
)
requireLineBudget(
  'components/ide/InlineAIChat.context.ts',
  220,
  'inline AI context helpers should stay focused',
)
requireLineBudget(
  'components/ide/InlineAIChat.response.ts',
  200,
  'inline AI response helpers should stay focused',
)
requireLineBudget(
  'components/ide/FileExplorerPro.tsx',
  260,
  'file explorer orchestrator should stay below cockpit-size',
)
requireLineBudget(
  'components/ide/FileExplorerPro.parts.tsx',
  40,
  'file explorer parts should only re-export focused modules',
)
requireLineBudget(
  'components/ide/FileExplorerPro.types.ts',
  80,
  'file explorer types should stay focused',
)
requireLineBudget(
  'components/ide/FileExplorerPro.helpers.ts',
  80,
  'file explorer helpers should stay focused',
)
requireLineBudget(
  'components/ide/FileExplorerTree.tsx',
  170,
  'file explorer tree should stay focused',
)
requireLineBudget(
  'components/ide/FileExplorerContextMenu.tsx',
  150,
  'file explorer context menu should stay focused',
)
requireLineBudget(
  'components/ide/FileExplorerView.tsx',
  280,
  'file explorer chrome should stay focused',
)
requireLineBudget(
  'components/ide/InlineCompletion.parts.tsx',
  40,
  'inline completion parts should only re-export focused modules',
)
requireLineBudget(
  'components/ide/InlineCompletion.types.ts',
  80,
  'inline completion types should stay focused',
)
requireLineBudget(
  'components/ide/InlineCompletion.provider.ts',
  150,
  'inline completion provider should stay focused',
)
requireLineBudget(
  'components/ide/InlineCompletion.debounce.ts',
  30,
  'inline completion debounce hook should stay tiny',
)
requireLineBudget(
  'components/ide/InlineCompletionGhost.tsx',
  90,
  'inline completion ghost UI should stay focused',
)
requireLineBudget(
  'components/ide/InlineCompletionSettings.tsx',
  160,
  'inline completion settings UI should stay focused',
)
requirePattern(
  'components/ide/PreviewRuntimeToolbar.parts.tsx',
  /export \{ PreviewDeployTrustPanel \}[\s\S]*export \{ PreviewRuntimeSettingsPanel \}[\s\S]*export \{ PreviewRuntimeTechnicalDetails \}/,
  'preview toolbar barrel must expose the three contextual panels explicitly',
)
rejectPattern(
  'components/ide/PreviewRuntimeToolbar.parts.tsx',
  /<button|<details|<input|PreviewRuntimeTechnicalRow/,
  'toolbar barrel must not contain UI implementation',
)
requirePattern(
  'components/ide/CommandPalette.tsx',
  /<CommandPaletteUI[\s\S]*isOpen=\{isOpen\}[\s\S]*mode=\{mode\}[\s\S]*commands=\{commands\}[\s\S]*executeCommand=\{executeCommand\}/,
  'command palette provider must pass state into the isolated UI component',
)
requirePattern(
  'components/ide/CommandPaletteUI.tsx',
  /buildCommandResults[\s\S]*buildFileResults[\s\S]*PaletteKeyboardHints[\s\S]*CommandResultRow[\s\S]*FileResultRow/,
  'command palette UI must own filtering, rendering, and keyboard hint rows',
)
rejectPattern(
  'components/ide/CommandPalette.tsx',
  /fuzzyMatch|highlightMatches|listRef|role="dialog"|PaletteKeyboardHints|buildCommandResults/,
  'command palette provider must not contain result filtering or rendering implementation',
)
requirePattern(
  'components/ide/DebugPanel.parts.tsx',
  /export \{ VariableTree \}[\s\S]*export \{ BreakpointList, CallStack \}[\s\S]*export \{ ConsoleOutput, WatchExpressions \}/,
  'debug parts barrel must expose focused debug subpanels explicitly',
)
rejectPattern(
  'components/ide/DebugPanel.parts.tsx',
  /ConsoleOutput\(|WatchExpressions\(|BreakpointList\(|CallStack\(|VariableTree\(/,
  'debug parts barrel must not contain full debug subpanel implementations',
)
requirePattern(
  'components/ide/InlineAIChat.helpers.ts',
  /from "\.\/InlineAIChat\.types"[\s\S]*from "\.\/InlineAIChat\.context"[\s\S]*from "\.\/InlineAIChat\.response"/,
  'inline AI helper entrypoint must re-export types, context helpers, and response helpers',
)
rejectPattern(
  'components/ide/InlineAIChat.helpers.ts',
  /generateMockResponse\(|buildContextSummary\(|extractCodeBlocks\(|FILE_SUGGESTIONS|PROJECT_SUGGESTIONS/,
  'inline AI helper entrypoint must not contain implementation logic',
)
requirePattern(
  'components/ide/FileExplorerPro.parts.tsx',
  /FileExplorerPro\.types[\s\S]*FileExplorerPro\.helpers[\s\S]*FileExplorerTree[\s\S]*FileExplorerContextMenu/,
  'file explorer parts barrel must expose focused modules explicitly',
)
rejectPattern(
  'components/ide/FileExplorerPro.tsx',
  /<FileTreeNode|<ContextMenu|<input|Loading workspace tree|Empty workspace/,
  'file explorer orchestrator must not contain chrome/tree implementation',
)
requirePattern(
  'components/ide/InlineCompletion.parts.tsx',
  /InlineCompletion\.types[\s\S]*InlineCompletion\.provider[\s\S]*InlineCompletion\.debounce[\s\S]*InlineCompletionGhost[\s\S]*InlineCompletionSettings/,
  'inline completion barrel must expose focused modules explicitly',
)
rejectPattern(
  'components/ide/InlineCompletion.parts.tsx',
  /class GhostTextProvider|GhostTextOverlay\(|CompletionSettings\(|fetch\(|useDebounce\(/,
  'inline completion barrel must not contain provider, fetch, or UI implementation',
)
requirePattern(
  'components/preview/RuntimePreviewSurface.tsx',
  /PreviewContextDock/,
  'runtime preview edit tools must stay in a contextual dock instead of a persistent card wall',
)
requirePattern(
  'components/viewport/AethelViewport3D.tsx',
  /data-canonical-viewport3d="true"/,
  'canonical 3D viewport must expose a stable visual QA marker',
)
requirePattern(
  'components/viewport/ViewportAICommandPanel.tsx',
  /data-viewport-context-menu="collapsed"/,
  'viewport AI/edit affordances must default to a hidden contextual menu',
)
requirePattern(
  'lib/mobile/mobile-companion-contract.ts',
  /productRole:\s*'control-plane'/,
  'mobile must be a control plane',
)
requirePattern(
  'lib/mobile/mobile-companion-contract.ts',
  /blockedHeavyRuntimeLanes:[\s\S]*viewport-render[\s\S]*build-export[\s\S]*render-queue/,
  'mobile must block heavy runtime lanes',
)

requirePattern(
  'app/manifest.ts',
  /start_url:\s*'\/ide'/,
  'installable app should open the product workspace',
)
requirePattern(
  'app/manifest.ts',
  /lang:\s*'en-US'/,
  'canonical manifest language should be English by default',
)
requireJsonField(
  'public/manifest.json',
  'lang',
  'en-US',
  'public fallback manifest must match canonical app manifest language',
)
requireJsonField(
  'public/manifest.json',
  'start_url',
  '/ide',
  'public fallback manifest must open the product workspace',
)
rejectPattern(
  'public/manifest.json',
  /Novo Projeto|Meus Projetos|Explorar templates de jogos|pt-BR|game development IDE/i,
  'public manifest must not drift into old PT-BR/game-only positioning',
)
rejectPattern('public/sw.js', /Ã|Â/, 'service worker must not contain mojibake')

if (failures.length > 0) {
  console.error('[ide-product-experience-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  '[ide-product-experience-spine] PASS canonicalWorkbench=true contextualPreview=true mobileCompanion=true manifestAligned=true',
)
