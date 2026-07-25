/**
 * CW5 — WorkbenchSurfaceStates must be on real loading/error paths (not dead exports).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  WorkbenchEmptyState,
  WorkbenchErrorState,
  WorkbenchLoadingState,
} from '@/components/ui/WorkbenchSurfaceStates'

const webRoot = join(__dirname, '../..')

describe('CW5 WorkbenchSurfaceStates wiring', () => {
  it('exports loading / error / empty with CW5 data markers', () => {
    expect(typeof WorkbenchLoadingState).toBe('function')
    expect(typeof WorkbenchErrorState).toBe('function')
    expect(typeof WorkbenchEmptyState).toBe('function')
    const src = readFileSync(
      join(webRoot, 'components/ui/WorkbenchSurfaceStates.tsx'),
      'utf8',
    )
    expect(src).toContain('data-aethel-cw5="surface-loading"')
    expect(src).toContain('data-aethel-cw5="surface-error"')
    expect(src).toContain('data-aethel-cw5="surface-empty"')
  })

  it('IDE Monaco surface renders loading + error states (not raw theater)', () => {
    const monaco = readFileSync(join(webRoot, 'lib/editor/MonacoEditor.runtime.tsx'), 'utf8')
    expect(monaco).toContain('WorkbenchLoadingState')
    expect(monaco).toContain('WorkbenchErrorState')
    expect(monaco).toContain('Failed to load file')
  })

  it('Studio workbench uses loading state; Agents ops uses empty + error deny', () => {
    const studio = readFileSync(
      join(webRoot, 'components/studio/CreativeWorkbenchShell.tsx'),
      'utf8',
    )
    const agents = readFileSync(
      join(webRoot, 'components/agents/chat/ops/AIChatOpsSidebar.tsx'),
      'utf8',
    )
    const ideStack = readFileSync(
      join(
        webRoot,
        '../packages/ide-ui/modern-shell/ModernIDEShellCenterStack.tsx',
      ),
      'utf8',
    )
    const creativeShell = readFileSync(
      join(webRoot, 'app/studio/CreativeStudioShell.tsx'),
      'utf8',
    )
    const studioPage = readFileSync(join(webRoot, 'app/studio/page.tsx'), 'utf8')
    const runboard = readFileSync(
      join(webRoot, 'app/studio/StudioRunboardActions.tsx'),
      'utf8',
    )

    expect(studio).toContain('WorkbenchLoadingState')
    expect(agents).toContain('WorkbenchEmptyState')
    expect(agents).toContain('WorkbenchErrorState')
    expect(agents).toContain('apply-deny-honesty')
    expect(ideStack).toContain('WorkbenchEmptyState')
    expect(creativeShell).toContain('WorkbenchLoadingState')
    expect(studioPage).toContain('WorkbenchLoadingState')
    expect(runboard).toContain('WorkbenchErrorState')
    expect(runboard).toContain('mission-control-error')
  })

  it('claimed preview/Studio chrome has no raw rgba/hex; preview EN only', () => {
    const claimed = [
      'components/preview/ViewportWorkbenchShell.tsx',
      'components/preview/CanonicalPreviewSurface.tsx',
      'components/preview/PreviewContextDock.tsx',
      'components/preview/MagicWandChat.tsx',
      'components/preview/SceneViewportWorkflowDrawer.tsx',
      'components/studio/CreativeWorkbenchShell.parts.tsx',
      'components/preview/SceneViewportStage.tsx',
      'components/preview/sceneViewportDerivations.ts',
      'app/studio/level/WorldStudioClient.tsx',
      'app/studio/animation/CharacterStudioClient.tsx',
      'app/studio/StudioMissionControlView.tsx',
      'app/studio/StudioRunboardHeader.tsx',
      'app/studio/SandboxVerificationHub.tsx',
      'app/studio/CreativeStudioShell.tsx',
      'app/studio/page.tsx',
      'app/studio/StudioRunboardActions.tsx',
      'components/studio/StudioLocalReleaseReadinessMatrix.tsx',
      'components/studio/StudioGlobalNav.tsx',
      'components/studio/WorldSceneOutliner.tsx',
      'components/studio/StudioActionRail.tsx',
      'components/studio/EngineModuleAdapterCockpit.tsx',
    ]
    // Ban chrome literals: rgba(...) and #hex. Token resolve fallbacks may use rgb(...).
    const rgbaOrHex = /rgba\(|#[0-9a-fA-F]{3,8}\b/
    const ptBr = /\b(Sem preset|Carregar|Negar)\b/
    for (const rel of claimed) {
      const src = readFileSync(join(webRoot, rel), 'utf8')
      expect(src, `${rel} must not use rgba/#hex chrome`).not.toMatch(rgbaOrHex)
      expect(src, `${rel} must be EN`).not.toMatch(ptBr)
    }
    const derivations = readFileSync(
      join(webRoot, 'components/preview/sceneViewportDerivations.ts'),
      'utf8',
    )
    expect(derivations).toContain('No preset')
    expect(derivations).toContain('resolveCssVarColor')
  })
})
