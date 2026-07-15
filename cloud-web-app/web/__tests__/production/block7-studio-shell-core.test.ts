/**
 * Block 7 Studio shell CORE — virtual window, workspace profile→frameloop, maturity badges.
 */

import { describe, expect, it } from 'vitest'

import {
  appendCappedLog,
  computeVirtualWindow,
  CONSOLE_LOG_CAPACITY,
} from '@/lib/ui/virtual-window'
import {
  normalizeWorkspaceProfile,
  resolveWorkspaceProfileFrameloop,
  WORKSPACE_PROFILES,
} from '@/lib/workspace/workspace-profile'
import { resolveMaturityBadge, resolveMaturityBadgeForPath } from '@/lib/routes/maturity-badge-resolver'
import {
  mergeResumeTabs,
  parseWorkspaceSession,
} from '@/lib/ide/workspace-session-resume'
import {
  buildPlaytestConsoleMessage,
  evaluatePlaytestConsoleBridgeCapability,
  isPlaytestConsoleMessage,
} from '@/lib/console/playtest-console-bridge'

describe('Block 7A.1 — virtual window math', () => {
  it('windows a 10k list to a small visible slice', () => {
    const window = computeVirtualWindow({
      itemCount: 10_000,
      itemHeight: 24,
      scrollTop: 24 * 500,
      viewportHeight: 480,
      overscan: 4,
    })
    expect(window.totalHeight).toBe(10_000 * 24)
    expect(window.startIndex).toBe(496)
    expect(window.visibleCount).toBeLessThan(40)
    expect(window.endIndex - window.startIndex + 1).toBe(window.visibleCount)
  })

  it('caps console ring buffer at 5k', () => {
    let logs: number[] = []
    for (let i = 0; i < CONSOLE_LOG_CAPACITY + 50; i++) {
      logs = appendCappedLog(logs, i, CONSOLE_LOG_CAPACITY)
    }
    expect(logs).toHaveLength(CONSOLE_LOG_CAPACITY)
    expect(logs[0]).toBe(50)
    expect(logs[logs.length - 1]).toBe(CONSOLE_LOG_CAPACITY + 49)
  })
})

describe('Block 7A.4 — workspace profile → frameloop', () => {
  it('maps Code to never and Game/Research to always', () => {
    expect(resolveWorkspaceProfileFrameloop('code')).toBe('never')
    expect(resolveWorkspaceProfileFrameloop('research')).toBe('always')
    expect(resolveWorkspaceProfileFrameloop('game')).toBe('always')
    expect(WORKSPACE_PROFILES.find((p) => p.id === 'code')?.pauseViewport).toBe(true)
    expect(normalizeWorkspaceProfile('nope')).toBe('game')
  })
})

describe('Block 7B.4 — maturity badge resolver', () => {
  it('marks ASPIRATIONAL as [HELD] with token classes', () => {
    const badge = resolveMaturityBadge('ASPIRATIONAL', 'Legacy shell')
    expect(badge?.held).toBe(true)
    expect(badge?.label).toBe('[HELD]')
    expect(badge?.className).toContain('var(--aethel-')
    expect(resolveMaturityBadge('GA')).toBeNull()
  })

  it('resolves known aspirational paths', () => {
    const badge = resolveMaturityBadgeForPath('/vr-preview')
    expect(badge?.maturity).toBe('ASPIRATIONAL')
    expect(badge?.label).toBe('[HELD]')
  })
})

describe('Block 7B.2 — resume session merge', () => {
  it('parses and merges resume tabs without inventing parallel dock state', () => {
    const snapshot = parseWorkspaceSession({
      version: 1,
      openTabPaths: ['/src/a.ts', '/src/b.ts'],
      activePath: '/src/b.ts',
      editorScrollLine: 42,
      panelScroll: { console: 120 },
      updatedAt: '2026-07-11T00:00:00.000Z',
    })
    expect(snapshot?.editorScrollLine).toBe(42)
    const merged = mergeResumeTabs(['/src/c.ts'], snapshot!)
    expect(merged.paths).toContain('/src/a.ts')
    expect(merged.paths).toContain('/src/c.ts')
    expect(merged.activePath).toBe('/src/b.ts')
    expect(merged.scrollLine).toBe(42)
  })
})

describe('Block 7B.5 — playtest console bridge honesty', () => {
  it('accepts postMessage payloads and marks desktop IPC HELD', () => {
    const msg = buildPlaytestConsoleMessage('error', 'playtest boom')
    expect(isPlaytestConsoleMessage(msg)).toBe(true)
    expect(isPlaytestConsoleMessage({ type: 'other' })).toBe(false)
    const capability = evaluatePlaytestConsoleBridgeCapability()
    expect(capability.postMessage).toBe('IMPLEMENTED')
    expect(capability.desktopIpc).toBe('HELD')
  })
})

describe('Block 7A.5 — port snap', () => {
  it('snaps within 20px and rejects outside radius', async () => {
    const { findPortSnapTarget, VS_PORT_SNAP_RADIUS_PX } = await import('@/lib/visual-scripting/port-snap')
    expect(VS_PORT_SNAP_RADIUS_PX).toBe(20)
    const hit = findPortSnapTarget(10, 10, [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 100 },
    ])
    expect(hit.snapped).toBe(true)
    expect(hit.targetId).toBe('a')
    const miss = findPortSnapTarget(50, 50, [{ id: 'a', x: 0, y: 0 }])
    expect(miss.snapped).toBe(false)
  })
})

describe('Block 7A.2 — dock persist honesty', () => {
  it('keeps dock persistence shipped and route WebGL keep-alive HELD', async () => {
    const { evaluateWebglRouteRemountHonesty, IDE_DOCK_STORAGE_KEY } = await import(
      '@/lib/viewport/viewport-dock-persist'
    )
    expect(IDE_DOCK_STORAGE_KEY).toBe('aethel.ide.dock.v1')
    const honesty = evaluateWebglRouteRemountHonesty()
    expect(honesty.dockPersistence).toBe('IMPLEMENTED')
    expect(honesty.webglRouteKeepAlive).toBe('HELD')
  })
})
