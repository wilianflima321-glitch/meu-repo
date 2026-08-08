import { beforeEach, describe, expect, it } from 'vitest'

import {
  UI_PERSISTENCE_BAG_KEY,
  UI_PERSISTENCE_LEGACY_KEYS,
  __resetUiPersistenceMigrateGateForTests,
  __resetUiPersistenceWriteStateForTests,
  __setUiPersistenceLegacyMirrorOverrideForTests,
  clearStudioSessionId,
  getAgentsOpsMemory,
  getStudioSessionId,
  getAgentsOpsPrefs,
  getChromeCommandHistory,
  getChromeSearchHistory,
  getUiPersistence,
  getViewportFidelityPreference,
  getWorkbenchLastProjectId,
  getWorkbenchLayout,
  isUiPersistenceLegacyMirrorActive,
  migrateUiPersistenceSpine,
  setAgentsOpsMemory,
  setAgentsOpsPrefs,
  setChromeCommandHistory,
  setChromeSearchHistory,
  setStudioSessionId,
  setUiPersistence,
  setIdeDockLayout,
  getIdeDockLayout,
  parseViewportDockStorageMode,
  getViewportDockLayoutForMode,
  setViewportDockLayoutForMode,
  setViewportFidelityPreference,
  setWorkbenchLastProjectId,
  setWorkbenchLayout,
  unwrapEnvelope,
  wrapEnvelope,
} from '@/lib/storage/ui-persistence-spine'
import {
  __resetUiPersistenceCrossTabForTests,
  getUiPersistenceCrossTabGeneration,
  subscribeUiPersistenceExternalInvalidate,
} from '@/lib/storage/ui-persistence-cross-tab'

describe('ui-persistence-spine (CW4)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage?.clear?.()
    __resetUiPersistenceMigrateGateForTests()
    __resetUiPersistenceWriteStateForTests()
    __resetUiPersistenceCrossTabForTests()
    // Default production: mirror expired. Opt-in per test when asserting legacy writes.
    __setUiPersistenceLegacyMirrorOverrideForTests(null)
  })

  it('round-trips typed namespace get/set', () => {
    expect(setUiPersistence('dashboard.activeTab', 'activity')).toBe(true)
    expect(getUiPersistence('dashboard.activeTab', 'overview')).toBe('activity')

    const bagRaw = window.localStorage.getItem(UI_PERSISTENCE_BAG_KEY)
    expect(bagRaw).toBeTruthy()
    const bag = JSON.parse(bagRaw as string)
    expect(bag.v).toBe(1)
    expect(bag.entries['dashboard.activeTab']).toBe('activity')
  })

  it('migrates legacy IDE session + studio session into the bag', () => {
    window.localStorage.setItem(
      UI_PERSISTENCE_LEGACY_KEYS.ideSession,
      JSON.stringify({
        version: 1,
        openTabPaths: ['/src/main.ts'],
        activePath: '/src/main.ts',
        editorScrollLine: 12,
        panelScroll: { explorer: 40 },
        updatedAt: '2026-07-01T00:00:00.000Z',
      }),
    )
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.studioSession, 'studio_session_resume')
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workspaceProfile, 'code')

    const bag = migrateUiPersistenceSpine()
    expect(bag.entries['ide.session']).toMatchObject({
      version: 1,
      openTabPaths: ['/src/main.ts'],
      activePath: '/src/main.ts',
    })
    expect(bag.entries['studio.session']).toBe('studio_session_resume')
    expect(bag.entries['workspace.profile']).toBe('code')

    expect(getStudioSessionId()).toBe('studio_session_resume')
  })

  it('migrates workbench layout modes and round-trips helpers', () => {
    window.localStorage.setItem(
      `${UI_PERSISTENCE_LEGACY_KEYS.workbenchPrefix}world`,
      JSON.stringify({ outliner: false, leftW: 220 }),
    )

    migrateUiPersistenceSpine()
    const layout = getWorkbenchLayout('World', {
      outliner: true,
      inspector: true,
      leftW: 200,
    })
    expect(layout.outliner).toBe(false)
    expect(layout.leftW).toBe(220)
    expect(layout.inspector).toBe(true)

    expect(setWorkbenchLayout('World', { ...layout, rightW: 300 })).toBe(true)
    expect(getWorkbenchLayout('world', { rightW: 0 }).rightW).toBe(300)
  })

  it('studio session helpers clear fail-closed', () => {
    setStudioSessionId('studio_abc')
    expect(getStudioSessionId()).toBe('studio_abc')
    clearStudioSessionId()
    expect(getStudioSessionId()).toBeNull()
  })

  it('agents ops memory migrates legacy project key', () => {
    const memories = [
      {
        id: 'm1',
        scope: 'project',
        key: 'tone',
        value: 'cinematic',
        timestamp: 1,
      },
    ]
    window.localStorage.setItem(
      `${UI_PERSISTENCE_LEGACY_KEYS.agentsOpsMemoryPrefix}proj_1`,
      JSON.stringify(memories),
    )

    const loaded = getAgentsOpsMemory('proj_1', [])
    expect(loaded).toEqual(memories)

    expect(setAgentsOpsMemory('proj_1', [...memories, { ...memories[0], id: 'm2' }])).toBe(true)
    expect(getAgentsOpsMemory('proj_1', [])).toHaveLength(2)
  })

  it('wrap/unwrap envelope validates version + payload', () => {
    const env = wrapEnvelope({ openTabPaths: ['a.ts'] })
    expect(env.v).toBe(1)
    const ok = unwrapEnvelope(env, (data): data is { openTabPaths: string[] } => {
      return Boolean(data && typeof data === 'object' && Array.isArray((data as { openTabPaths?: unknown }).openTabPaths))
    })
    expect(ok?.openTabPaths).toEqual(['a.ts'])
    expect(unwrapEnvelope({ v: 99, data: {} }, (_): _ is object => true)).toBeNull()
  })

  it('validate predicate rejects corrupt bag entries fail-closed', () => {
    setUiPersistence('workspace.profile', 42 as unknown as string)
    const profile = getUiPersistence(
      'workspace.profile',
      'game',
      (v): v is string => typeof v === 'string',
    )
    expect(profile).toBe('game')
  })

  it('version mismatch fail-closes to empty bag (no theater migrate)', () => {
    window.localStorage.setItem(
      UI_PERSISTENCE_BAG_KEY,
      JSON.stringify({
        v: 99,
        updatedAt: '2026-07-01T00:00:00.000Z',
        entries: { 'dashboard.activeTab': 'poison' },
      }),
    )
    expect(getUiPersistence('dashboard.activeTab', 'overview')).toBe('overview')
  })

  it('migrates ide.dock from legacy once, then the bag is authoritative (CW4 closed)', () => {
    window.localStorage.setItem(
      UI_PERSISTENCE_LEGACY_KEYS.ideDock,
      JSON.stringify({ regions: { bottomBar: { size: 22 } }, zenMode: false, presets: {} }),
    )
    migrateUiPersistenceSpine()
    expect(getUiPersistence('ide.dock', null)).toMatchObject({
      regions: { bottomBar: { size: 22 } },
    })

    // CW4 fix: WorkspaceProvider can no longer write the legacy key directly
    // (the spine adapter is registered structurally before any store is
    // created — see docking/WorkspaceProvider.tsx). A foreign/stale write to
    // the raw legacy key alone (simulating an old tab or manual edit) must
    // NOT silently override the now-authoritative bag — the old resync-on-
    // read behavior that caused this is exactly the dual-write hazard that
    // was closed. Only `setIdeDockLayout` (bag write, mirrored outward)
    // changes what `getUiPersistence('ide.dock', ...)` returns.
    window.localStorage.setItem(
      UI_PERSISTENCE_LEGACY_KEYS.ideDock,
      JSON.stringify({ regions: { bottomBar: { size: 40 } }, zenMode: true, presets: {} }),
    )
    expect(getUiPersistence('ide.dock', null)).toMatchObject({
      regions: { bottomBar: { size: 22 } },
    })

    expect(setIdeDockLayout({ regions: { bottomBar: { size: 40 } }, zenMode: true, presets: {} })).toBe(
      true,
    )
    expect(getUiPersistence('ide.dock', null)).toMatchObject({
      regions: { bottomBar: { size: 40 } },
      zenMode: true,
    })
  })

  it('migrates theme + workbench panel + agents prefs (CW4 deepen)', () => {
    __setUiPersistenceLegacyMirrorOverrideForTests(true)
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.themeCurrent, 'aethel-dark')
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.themeIcon, 'aethel-icons')
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchBottomPanel, 'terminal')
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.agentsCalmMode, 'false')

    const bag = migrateUiPersistenceSpine()
    expect(bag.entries['theme.current']).toBe('aethel-dark')
    expect(bag.entries['theme.icon']).toBe('aethel-icons')
    expect(bag.entries['ide.workbench.bottomPanel']).toBe('terminal')
    expect(bag.entries['agents.opsPrefs']).toMatchObject({ calmMode: false })

    expect(setUiPersistence('ide.workbench.previewEnabled', '1')).toBe(true)
    expect(getUiPersistence('ide.workbench.previewEnabled', '0')).toBe('1')
    expect(window.localStorage.getItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewEnabled)).toBe(
      '1',
    )
  })

  it('migrates ThemeContext aethel-theme when current-theme absent', () => {
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.themeContextLegacy, 'dark-plus')
    const bag = migrateUiPersistenceSpine()
    expect(bag.entries['theme.current']).toBe('dark-plus')
  })

  it('agents ops prefs helpers round-trip calm mode', () => {
    __setUiPersistenceLegacyMirrorOverrideForTests(true)
    expect(setAgentsOpsPrefs({ calmMode: false, showAdvancedControls: true })).toBe(true)
    expect(getAgentsOpsPrefs()).toMatchObject({
      calmMode: false,
      showAdvancedControls: true,
    })
    expect(window.localStorage.getItem(UI_PERSISTENCE_LEGACY_KEYS.agentsCalmMode)).toBe('false')
  })

  it('migrates viewport fidelity + lastProjectId + viewport.dock (no secrets)', () => {
    __setUiPersistenceLegacyMirrorOverrideForTests(true)
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.viewportFidelity, 'quality')
    window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchLastProjectId, 'proj_cw4')
    window.localStorage.setItem(
      `${UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix}viewport.v1`,
      JSON.stringify({ regions: { bottomBar: { size: 28 } } }),
    )

    const bag = migrateUiPersistenceSpine()
    expect(bag.entries['viewport.fidelity']).toBe('quality')
    expect(bag.entries['workbench.lastProjectId']).toBe('proj_cw4')
    expect(bag.entries['viewport.dock']).toMatchObject({
      viewport: { regions: { bottomBar: { size: 28 } } },
    })

    expect(getViewportFidelityPreference()).toBe('quality')
    expect(getWorkbenchLastProjectId()).toBe('proj_cw4')
    expect(setViewportFidelityPreference('balanced')).toBe(true)
    expect(setWorkbenchLastProjectId('proj_next')).toBe(true)
    expect(window.localStorage.getItem(UI_PERSISTENCE_LEGACY_KEYS.viewportFidelity)).toBe('balanced')
    expect(window.localStorage.getItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchLastProjectId)).toBe(
      'proj_next',
    )
  })

  it('notifies cross-tab invalidate lite on bag write (BroadcastChannel path)', () => {
    const before = getUiPersistenceCrossTabGeneration()
    const events: string[] = []
    const unsub = subscribeUiPersistenceExternalInvalidate((event) => {
      events.push(event.source)
    })
    expect(setUiPersistence('dashboard.activeTab', 'activity')).toBe(true)
    // Local write notifies peers via BroadcastChannel; this tab does not echo storage to self.
    expect(getUiPersistenceCrossTabGeneration()).toBeGreaterThanOrEqual(before)
    unsub()

    // Simulate peer storage event (other tab).
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: UI_PERSISTENCE_BAG_KEY,
        newValue: '{}',
      }),
    )
    expect(getUiPersistenceCrossTabGeneration()).toBeGreaterThan(before)
  })

  it('setIdeDockLayout writes bag; legacy mirror only when compat window forced on', () => {
    const layout = {
      regions: { bottomBar: { size: 36, tabIds: [], activeTabId: null, open: true } },
      zenMode: false,
      presets: {},
    }
    expect(isUiPersistenceLegacyMirrorActive()).toBe(false)
    expect(setIdeDockLayout(layout)).toBe(true)
    expect(getIdeDockLayout(null)).toMatchObject({
      regions: { bottomBar: { size: 36 } },
    })
    expect(window.localStorage.getItem(UI_PERSISTENCE_LEGACY_KEYS.ideDock)).toBeNull()

    __setUiPersistenceLegacyMirrorOverrideForTests(true)
    expect(setIdeDockLayout({ ...layout, zenMode: true })).toBe(true)
    const legacyRaw = window.localStorage.getItem(UI_PERSISTENCE_LEGACY_KEYS.ideDock)
    expect(legacyRaw).toBeTruthy()
    expect(JSON.parse(legacyRaw as string)).toMatchObject({ zenMode: true })
    const bag = JSON.parse(window.localStorage.getItem(UI_PERSISTENCE_BAG_KEY) as string) as {
      entries: Record<string, unknown>
    }
    expect(JSON.stringify(bag.entries)).not.toMatch(/sk-|api[_-]?key|password|byok/i)
  })

  it('migrates viewport.dock from legacy once, then the bag is authoritative (CW4 closed)', () => {
    window.localStorage.setItem(
      `${UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix}canvas.v1`,
      JSON.stringify({ zenMode: false, size: 18 }),
    )
    migrateUiPersistenceSpine()
    expect(getUiPersistence('viewport.dock', {})).toMatchObject({
      canvas: { zenMode: false, size: 18 },
    })

    // Same guarantee as ide.dock above — a foreign raw write must not win
    // over the bag; only setViewportDockLayoutForMode (spine write) does.
    window.localStorage.setItem(
      `${UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix}canvas.v1`,
      JSON.stringify({ zenMode: true, size: 33 }),
    )
    expect(getUiPersistence('viewport.dock', {})).toMatchObject({
      canvas: { zenMode: false, size: 18 },
    })

    expect(setViewportDockLayoutForMode('canvas', { zenMode: true, size: 33 })).toBe(true)
    expect(getUiPersistence('viewport.dock', {})).toMatchObject({
      canvas: { zenMode: true, size: 33 },
    })
  })

  it('setViewportDockLayoutForMode writes bag; no legacy race when mirror expired', () => {
    expect(parseViewportDockStorageMode('aethel.viewport.dock.runtime.v1')).toBe('runtime')
    expect(parseViewportDockStorageMode('aethel.ide.dock.v1')).toBeNull()

    expect(
      setViewportDockLayoutForMode('runtime', { zenMode: true, regions: { bottomBar: { size: 22 } } }),
    ).toBe(true)
    expect(getViewportDockLayoutForMode('runtime', null)).toMatchObject({ zenMode: true })
    expect(
      window.localStorage.getItem(`${UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix}runtime.v1`),
    ).toBeNull()

    // Foreign legacy write must not win over bag (no dual-source read path).
    window.localStorage.setItem(
      `${UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix}runtime.v1`,
      JSON.stringify({ zenMode: false, poisoned: true }),
    )
    expect(getViewportDockLayoutForMode('runtime', null)).toMatchObject({ zenMode: true })
    expect(getViewportDockLayoutForMode('runtime', null)).not.toMatchObject({ poisoned: true })
  })

  it('migrates chrome command/search history and round-trips without dual-source race', () => {
    window.localStorage.setItem(
      UI_PERSISTENCE_LEGACY_KEYS.commandHistory,
      JSON.stringify([{ commandId: 'file.save', timestamp: 1 }]),
    )
    window.localStorage.setItem(
      UI_PERSISTENCE_LEGACY_KEYS.searchHistory,
      JSON.stringify(['foo']),
    )
    window.localStorage.setItem(
      UI_PERSISTENCE_LEGACY_KEYS.replaceHistory,
      JSON.stringify(['bar']),
    )
    migrateUiPersistenceSpine()
    expect(getChromeCommandHistory([])).toEqual([{ commandId: 'file.save', timestamp: 1 }])
    expect(getChromeSearchHistory()).toEqual({ search: ['foo'], replace: ['bar'] })

    expect(setChromeCommandHistory([{ commandId: 'edit.undo', timestamp: 2 }])).toBe(true)
    expect(setChromeSearchHistory({ search: ['baz'], replace: [] })).toBe(true)
    // Mirror expired → no raw rewrite; bag remains authority.
    expect(window.localStorage.getItem(UI_PERSISTENCE_LEGACY_KEYS.commandHistory)).toBe(
      JSON.stringify([{ commandId: 'file.save', timestamp: 1 }]),
    )
    expect(getChromeCommandHistory([])).toEqual([{ commandId: 'edit.undo', timestamp: 2 }])
    window.localStorage.setItem(
      UI_PERSISTENCE_LEGACY_KEYS.commandHistory,
      JSON.stringify([{ commandId: 'poison', timestamp: 9 }]),
    )
    expect(getChromeCommandHistory([])).toEqual([{ commandId: 'edit.undo', timestamp: 2 }])
  })
})
