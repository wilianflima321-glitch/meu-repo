'use client';

// @aethel-heavy-async-boundary: loaded only through the /studio/level route dynamic import.

/**
 * Professional level editor shell.
 *
 * Keeps product chrome, persistence, panels, and play-mode orchestration here.
 * The heavy Three/R3F viewport runtime lives in LevelEditor.viewport.tsx.
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import StudioEngineModuleMiniPanel from '@/components/studio/StudioEngineModuleMiniPanel';
import { authHeaders } from '@/lib/auth';

// ============================================================================
// PHYSICS RUNTIME (simplified for play mode)
// ============================================================================

import {
  defaultEnvironment,
  defaultObjects,
  resolveProjectIdFromClient,
  type EnvironmentSettings,
  type LevelData,
  type LevelObject,
  type SnapMode,
  type TransformMode,
  type ViewportMode,
} from './level-editor-core';
import { LevelEditorPhysicsSession } from './level-editor-physics-rapier';
import { LevelEditorPlayRuntime } from './level-editor-play-runtime';
import { LevelViewport } from '@aethel/engine/LevelEditor.viewport-runtime';
import { DetailsPanelMini, OutlinerMini, Toolbar } from './LevelEditorPanels';
import { getSimulationTargetFps, getSimulationTimeDilation, isSimulationGodMode } from '@/lib/settings/engine-settings';
import { createComponentLogger } from '@/lib/observability/logger';
import { useLevelEditorStore } from '@/lib/studio/level-editor-store';

const log = createComponentLogger('LevelEditor');
const LEVEL_ENGINE_MODULES = ['world-streaming', 'quest-system', 'save-manager', 'inventory-system'] as const


export type LevelEditorProps = {
  /**
   * When true (World Studio / CreativeWorkbenchShell), hide embedded outliner +
   * details columns so shell slots own those gutters (IMPROVE-STUDIO-005).
   */
  embedded?: boolean;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LevelEditor({ embedded = false }: LevelEditorProps = {}) {
  // Onda AAA Studio Deepening Sweep — objects/selectedId lifted into a shared
  // store so the World Studio shell's outliner/inspector slots (rendered as
  // siblings when embedded, not children) can read and mutate the same real
  // scene instead of only the embedded viewport seeing it.
  const objects = useLevelEditorStore((state) => state.objects);
  const setObjects = useLevelEditorStore((state) => state.setObjects);
  const selectedId = useLevelEditorStore((state) => state.selectedId);
  const setSelectedId = useLevelEditorStore((state) => state.setSelectedId);
  const duplicateObject = useLevelEditorStore((state) => state.duplicateObject);
  const deleteObject = useLevelEditorStore((state) => state.deleteObject);
  const toggleVisibility = useLevelEditorStore((state) => state.toggleVisibility);
  const toggleLocked = useLevelEditorStore((state) => state.toggleLocked);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [viewMode, setViewMode] = useState<ViewportMode>('perspective');
  const [snapMode, setSnapMode] = useState<SnapMode>('grid');
  const [gridSize, setGridSize] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showWorldSystems, setShowWorldSystems] = useState(false);
  const [environment] = useState<EnvironmentSettings>(defaultEnvironment);

  // Play Mode state
  const [savedObjects, setSavedObjects] = useState<LevelObject[] | null>(null);
  const physicsSessionRef = useRef<LevelEditorPhysicsSession | null>(null);
  const playRuntimeRef = useRef<LevelEditorPlayRuntime | null>(null);
  const physicsReadyRef = useRef(false);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Play Mode loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      const rawDelta = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = currentTime;
      const dilation = getSimulationTimeDilation();
      const targetFps = getSimulationTargetFps();
      const deltaTime = (1 / targetFps) * dilation;

      if (!isSimulationGodMode() && physicsReadyRef.current && physicsSessionRef.current) {
        setObjects((prev) => physicsSessionRef.current!.step(prev, deltaTime));
      } else if (!physicsReadyRef.current) {
        // Accumulate time while Rapier boots; avoids a frozen first frame.
        void rawDelta;
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, setObjects]);

  // Handle Play/Pause
  const handlePlayPause = useCallback(async () => {
    if (!isPlaying) {
      setSavedObjects(JSON.parse(JSON.stringify(objects)) as LevelObject[]);
      physicsReadyRef.current = false;

      const physicsSession = new LevelEditorPhysicsSession();
      const playRuntime = new LevelEditorPlayRuntime();
      physicsSessionRef.current = physicsSession;
      playRuntimeRef.current = playRuntime;

      try {
        await physicsSession.init(objects);
        physicsReadyRef.current = true;
        playRuntime.start(objects);
      } catch (error) {
        log.error('Failed to initialize Rapier play session', error);
        physicsSessionRef.current = null;
        playRuntimeRef.current = null;
        return;
      }
    } else {
      physicsSessionRef.current?.destroy();
      physicsSessionRef.current = null;
      playRuntimeRef.current?.stop();
      playRuntimeRef.current = null;
      physicsReadyRef.current = false;

      if (savedObjects) {
        setObjects(savedObjects);
        setSavedObjects(null);
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, objects, savedObjects, setObjects]);

  const selectedObject = useMemo(
    () => objects.find(o => o.id === selectedId) || null,
    [objects, selectedId]
  );

  const handleDuplicate = duplicateObject;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'w':
          setTransformMode('translate');
          break;
        case 'e':
          setTransformMode('rotate');
          break;
        case 'r':
          setTransformMode('scale');
          break;
        case 'delete':
        case 'backspace':
          if (selectedId) {
            deleteObject(selectedId);
          }
          break;
        case 'd':
          if (e.ctrlKey && selectedObject) {
            handleDuplicate(selectedObject.id);
          }
          break;
        case 'g':
          setShowGrid(prev => !prev);
          break;
        case 'escape':
          setSelectedId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteObject, handleDuplicate, selectedId, selectedObject, setSelectedId]);

  const handleTransform = useCallback((id: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => {
    setObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, position, rotation, scale } : obj
    ));
  }, [setObjects]);

  const handleObjectChange = useCallback((id: string, changes: Partial<LevelObject>) => {
    setObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, ...changes } : obj
    ));
  }, [setObjects]);

  const handleToggleVisibility = toggleVisibility;
  const handleToggleLock = toggleLocked;
  const handleDelete = deleteObject;

  const handleSave = useCallback(async () => {
    const levelData: LevelData = {
      id: 'level_1',
      name: 'Main Level',
      objects,
      environment,
      lightmapSettings: { resolution: 1024, quality: 'high', directSamples: 32, indirectSamples: 128, bounces: 3 },
      navmeshSettings: { agentRadius: 0.5, agentHeight: 2, maxSlope: 45, stepHeight: 0.4, cellSize: 0.3 },
    };

    // Save to localStorage for immediate access
    localStorage.setItem('aethel_level_data', JSON.stringify(levelData));

    // Also save to API if available
    try {
      const projectId = resolveProjectIdFromClient();
      const response = await fetch('/api/files/fs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': projectId,
          ...authHeaders(),
        },
        body: JSON.stringify({
          action: 'write',
          projectId,
          path: 'levels/main.level.json',
          content: JSON.stringify(levelData, null, 2),
          options: { createDirectories: true },
        })
      });
      if (response.ok) {
        log.info('Level saved to server:', levelData.name);
      }
    } catch (e) {
      log.info('Server save failed, using localStorage only');
    }

    log.info('Level saved:', levelData);
  }, [objects, environment]);

  // Load level on mount
  useEffect(() => {
    const loadLevel = async () => {
      // Try localStorage first
      const cached = localStorage.getItem('aethel_level_data');
      if (cached) {
        try {
          const data = JSON.parse(cached) as LevelData;
          setObjects(data.objects || defaultObjects);
          return;
        } catch (e) {
          log.warn('Failed to parse cached level');
        }
      }

      // Try API
      try {
        const projectId = resolveProjectIdFromClient();
        const response = await fetch('/api/files/fs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
            ...authHeaders(),
          },
          body: JSON.stringify({
            action: 'read',
            projectId,
            path: 'levels/main.level.json',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.content) {
            const levelData = JSON.parse(data.content) as LevelData;
            setObjects(levelData.objects || defaultObjects);
          }
        }
      } catch (e) {
        log.info('No saved level found, using defaults');
      }
    };
    loadLevel();
  }, [setObjects]);

  // World Studio shell dispatches this when a user double-clicks/focuses a
  // node in the (sibling, not child) `WorldSceneOutliner` — select + gizmo
  // highlight the real object. Camera fly-to-selection is not implemented
  // in `LevelViewport` yet, so this intentionally only selects rather than
  // fabricating a camera move that doesn't exist.
  useEffect(() => {
    if (!embedded) return;
    const handleSceneFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId?: string }>).detail;
      if (detail?.nodeId) setSelectedId(detail.nodeId);
    };
    window.addEventListener('aethel:scene-focus', handleSceneFocus);
    return () => window.removeEventListener('aethel:scene-focus', handleSceneFocus);
  }, [embedded, setSelectedId]);

  const handleBuild = useCallback(() => {
    log.info('Building level...');
    // Build process would go here
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--aethel-surface-primary)', color: 'var(--aethel-text-primary)' }}>
      {/* Play Mode Indicator */}
      {isPlaying && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--aethel-success)',
          color: 'var(--aethel-surface-primary)',
          padding: '4px 16px',
          borderRadius: '0 0 8px 8px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 100,
        }}>
          PLAY MODE - Press ESC or click Stop to exit
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        transformMode={transformMode}
        onTransformModeChange={setTransformMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        snapMode={snapMode}
        onSnapModeChange={setSnapMode}
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSave={handleSave}
        onBuild={handleBuild}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - World Outliner (standalone only; shell owns outliner when embedded) */}
        {!embedded && (
          <div style={{ width: '250px', borderRight: '1px solid var(--aethel-border-primary)', background: 'var(--aethel-surface-secondary)' }}>
            <OutlinerMini
              objects={objects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          </div>
        )}

        {/* Center - Viewport */}
        <div style={{ flex: 1, position: 'relative' }}>
          <LevelViewport
            objects={objects}
            selectedId={selectedId}
            onSelect={setSelectedId}
            transformMode={transformMode}
            onTransform={handleTransform}
            viewMode={viewMode}
            showGrid={showGrid}
            showStats={showStats}
            environment={environment}
          />

          {/* Viewport Overlay */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            display: 'flex',
            gap: '8px',
          }}>
            <button type="button" aria-label={showGrid ? 'Hide viewport grid' : 'Show viewport grid'}
              onClick={() => setShowGrid(!showGrid)}
              style={{
                padding: '4px 8px',
                background: showGrid ? 'var(--aethel-primary)' : 'var(--aethel-surface-quaternary)',
                border: 'none',
                borderRadius: '3px',
                color: 'var(--aethel-text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Grid
            </button>
            <button type="button" aria-label={showStats ? 'Hide viewport stats' : 'Show viewport stats'}
              onClick={() => setShowStats(!showStats)}
              style={{
                padding: '4px 8px',
                background: showStats ? 'var(--aethel-primary)' : 'var(--aethel-surface-quaternary)',
                border: 'none',
                borderRadius: '3px',
                color: 'var(--aethel-text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Stats
            </button>
            <button type="button" aria-label={showWorldSystems ? 'Hide world systems drawer' : 'Show world systems drawer'}
              onClick={() => setShowWorldSystems((current) => !current)}
              style={{
                padding: '4px 8px',
                background: showWorldSystems ? 'var(--aethel-primary)' : 'var(--aethel-surface-quaternary)',
                border: '1px solid var(--aethel-border-secondary)',
                borderRadius: '999px',
                color: 'var(--aethel-text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              World systems
            </button>
          </div>

          {showWorldSystems && (
            <div
              role="dialog"
              aria-label="World systems readiness"
              style={{
                position: 'absolute',
                top: '44px',
                right: '12px',
                width: 'min(380px, calc(100% - 24px))',
                maxHeight: 'calc(100% - 88px)',
                overflow: 'auto',
                zIndex: 30,
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '14px',
                background: 'color-mix(in srgb, var(--aethel-surface-secondary) 94%, transparent)',
                boxShadow: 'var(--aethel-shadow-xl)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px 12px',
                borderBottom: '1px solid var(--aethel-border-primary)',
              }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--aethel-text-tertiary)', textTransform: 'uppercase' }}>
                    Context drawer
                  </div>
                  <div style={{ marginTop: '3px', fontSize: '13px', fontWeight: 700, color: 'var(--aethel-text-primary)' }}>
                    World systems
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWorldSystems(false)}
                  aria-label="Close world systems drawer"
                  style={{
                    minWidth: '32px',
                    minHeight: '32px',
                    borderRadius: '999px',
                    border: '1px solid var(--aethel-border-secondary)',
                    background: 'var(--aethel-surface-tertiary)',
                    color: 'var(--aethel-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
              <StudioEngineModuleMiniPanel title="World systems" moduleIds={LEVEL_ENGINE_MODULES} />
            </div>
          )}

          {/* Status Bar */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '24px',
            background: 'color-mix(in srgb, var(--aethel-surface-primary) 82%, transparent)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: '11px',
            color: 'var(--aethel-text-quaternary)',
          }}>
            <span>Objects: {objects.length}</span>
            <span style={{ margin: '0 16px' }}>|</span>
            <span>Selected: {selectedObject?.name || 'None'}</span>
            <span style={{ margin: '0 16px' }}>|</span>
            <span>Mode: {transformMode.toUpperCase()}</span>
            <div style={{ flex: 1 }} />
            <span>W/E/R: Transform | G: Grid | Del: Delete</span>
          </div>
        </div>

        {/* Right Panel - Details (standalone only; shell owns inspector when embedded) */}
        {!embedded && (
          <div style={{ width: '320px', borderLeft: '1px solid var(--aethel-border-primary)', background: 'var(--aethel-surface-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ minHeight: 0, flex: 1, overflow: 'auto' }}>
              <DetailsPanelMini
                object={selectedObject}
                onChange={handleObjectChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
