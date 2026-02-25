/**
 * Level Editor Integrado - Editor de Niveis Profissional
 *
 * Editor estilo Unreal para cena, outliner, details e runtime de play mode.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DetailsPanelMini, OutlinerMini, Toolbar } from './LevelEditorPanels';
import {
  defaultEnvironment,
  defaultObjects,
  type EnvironmentSettings,
  type LevelData,
  type LevelObject,
  type SnapMode,
  type TransformMode,
  type ViewportMode,
} from './LevelEditor.types';
import {
  resolveProjectIdFromClient,
  simulatePhysics,
  type PhysicsState,
} from './LevelEditor.runtime';
import { LevelEditorViewport } from './LevelEditor.viewport';

export type {
  EnvironmentSettings,
  LevelComponent,
  LevelData,
  LevelObject,
  LightmapSettings,
  NavmeshSettings,
  SnapMode,
  TransformMode,
  ViewportMode,
} from './LevelEditor.types';

export default function LevelEditor() {
  const [objects, setObjects] = useState<LevelObject[]>(defaultObjects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [viewMode, setViewMode] = useState<ViewportMode>('perspective');
  const [snapMode, setSnapMode] = useState<SnapMode>('grid');
  const [gridSize, setGridSize] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [environment] = useState<EnvironmentSettings>(defaultEnvironment);

  const [savedObjects, setSavedObjects] = useState<LevelObject[] | null>(null);
  const physicsStateRef = useRef<PhysicsState>({
    velocities: new Map(),
    angularVelocities: new Map(),
  });
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = currentTime;

      setObjects((prev) => simulatePhysics(prev, physicsStateRef.current, deltaTime));

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
  }, [isPlaying]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      setSavedObjects(JSON.parse(JSON.stringify(objects)) as LevelObject[]);
      physicsStateRef.current = {
        velocities: new Map(),
        angularVelocities: new Map(),
      };
    } else if (savedObjects) {
      setObjects(savedObjects);
      setSavedObjects(null);
    }

    setIsPlaying(!isPlaying);
  }, [isPlaying, objects, savedObjects]);

  const selectedObject = useMemo(
    () => objects.find((o) => o.id === selectedId) || null,
    [objects, selectedId],
  );

  const handleDuplicate = useCallback((id: string) => {
    const timestamp = Date.now();
    let nextId: string | null = null;

    setObjects((prev) => {
      const obj = prev.find((o) => o.id === id);
      if (!obj) return prev;

      nextId = `${obj.id}_copy_${timestamp}`;

      const newObj: LevelObject = {
        ...obj,
        id: nextId,
        name: `${obj.name}_Copy`,
        position: [obj.position[0] + 1, obj.position[1], obj.position[2] + 1],
      };

      return [...prev, newObj];
    });

    if (nextId) {
      setSelectedId(nextId);
    }
  }, []);

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
            setObjects((prev) => prev.filter((o) => o.id !== selectedId));
            setSelectedId(null);
          }
          break;
        case 'd':
          if (e.ctrlKey && selectedObject) {
            handleDuplicate(selectedObject.id);
          }
          break;
        case 'g':
          setShowGrid((prev) => !prev);
          break;
        case 'escape':
          setSelectedId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDuplicate, selectedId, selectedObject]);

  const handleTransform = useCallback(
    (
      id: string,
      position: [number, number, number],
      rotation: [number, number, number],
      scale: [number, number, number],
    ) => {
      setObjects((prev) =>
        prev.map((obj) => (obj.id === id ? { ...obj, position, rotation, scale } : obj)),
      );
    },
    [],
  );

  const handleObjectChange = useCallback((id: string, changes: Partial<LevelObject>) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, ...changes } : obj)));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, visible: !obj.visible } : obj)));
  }, []);

  const handleToggleLock = useCallback((id: string) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, locked: !obj.locked } : obj)));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const handleSave = useCallback(async () => {
    const levelData: LevelData = {
      id: 'level_1',
      name: 'Main Level',
      objects,
      environment,
      lightmapSettings: {
        resolution: 1024,
        quality: 'high',
        directSamples: 32,
        indirectSamples: 128,
        bounces: 3,
      },
      navmeshSettings: {
        agentRadius: 0.5,
        agentHeight: 2,
        maxSlope: 45,
        stepHeight: 0.4,
        cellSize: 0.3,
      },
    };

    localStorage.setItem('aethel_level_data', JSON.stringify(levelData));

    try {
      const projectId = resolveProjectIdFromClient();
      const response = await fetch('/api/files/fs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': projectId,
        },
        body: JSON.stringify({
          action: 'write',
          projectId,
          path: 'levels/main.level.json',
          content: JSON.stringify(levelData, null, 2),
          options: { createDirectories: true },
        }),
      });

      if (response.ok) {
        console.log('Level saved to server:', levelData.name);
      }
    } catch {
      console.log('Server save failed, using localStorage only');
    }

    console.log('Level saved:', levelData);
  }, [objects, environment]);

  useEffect(() => {
    const loadLevel = async () => {
      const cached = localStorage.getItem('aethel_level_data');
      if (cached) {
        try {
          const data = JSON.parse(cached) as LevelData;
          setObjects(data.objects || defaultObjects);
          return;
        } catch {
          console.warn('Failed to parse cached level');
        }
      }

      try {
        const projectId = resolveProjectIdFromClient();
        const response = await fetch('/api/files/fs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
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
      } catch {
        console.log('No saved level found, using defaults');
      }
    };

    loadLevel();
  }, []);

  const handleBuild = useCallback(() => {
    console.log('Building level...');
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a1a',
        color: '#fff',
      }}
    >
      {isPlaying && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#22c55e',
            color: '#000',
            padding: '4px 16px',
            borderRadius: '0 0 8px 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 100,
          }}
        >
          Play Mode - Press ESC or click Stop to exit
        </div>
      )}

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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: '250px', borderRight: '1px solid #333', background: '#222' }}>
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

        <div style={{ flex: 1, position: 'relative' }}>
          <LevelEditorViewport
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

          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={() => setShowGrid(!showGrid)}
              style={{
                padding: '4px 8px',
                background: showGrid ? '#3498db' : '#333',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              style={{
                padding: '4px 8px',
                background: showStats ? '#3498db' : '#333',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Stats
            </button>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '24px',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: '11px',
              color: '#888',
            }}
          >
            <span>Objects: {objects.length}</span>
            <span style={{ margin: '0 16px' }}>|</span>
            <span>Selected: {selectedObject?.name || 'None'}</span>
            <span style={{ margin: '0 16px' }}>|</span>
            <span>Mode: {transformMode.toUpperCase()}</span>
            <div style={{ flex: 1 }} />
            <span>W/E/R: Transform | G: Grid | Del: Delete</span>
          </div>
        </div>

        <div style={{ width: '300px', borderLeft: '1px solid #333', background: '#222' }}>
          <DetailsPanelMini object={selectedObject} onChange={handleObjectChange} />
        </div>
      </div>
    </div>
  );
}
