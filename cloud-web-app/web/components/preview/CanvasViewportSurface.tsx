'use client';

// NOTE: these three panels live in packages/ide-ui (extracted monorepo package,
// see CLAUDE_MASTER_EXECUTION_PLAN_V8 R1.1), not under web/components/ide — that
// directory does not exist. The previous `@aethel/ide-ui/*` imports pointed
// at nothing and broke this module the moment "Canvas Mode" was selected in
// UnifiedViewport (components/canvas/UnifiedViewport.tsx dynamic-imports this
// file). Relative paths are used instead of a new tsconfig alias because no
// existing web import proves an `@aethel/ide-ui` alias actually resolves
// through Next's webpack config today.
import { useSyncExternalStore } from 'react';
import { Boxes, Film, SlidersHorizontal, Terminal as TerminalIcon } from 'lucide-react';
import { Outliner3D } from '../../../packages/ide-ui/Outliner3D';
import type { SceneNode } from '../../../packages/ide-ui/Outliner3D';
import { PropertiesPanel3D, buildScenePropertySections } from '../../../packages/ide-ui/PropertiesPanel3D';
import { Timeline3D } from '../../../packages/ide-ui/Timeline3D';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';
import { useIDEBackend } from '@/lib/ide/useIDEBackend';
import type { IDESceneNode, IDETimelineSnapshot } from '../../../packages/ide-ui/backend/types';
import { DockPanel } from '../../../packages/ide-ui/docking';
import { ConsoleIntegration } from '../../../packages/ide-ui/ConsoleIntegration';

const EMPTY_TIMELINE_SNAPSHOT: IDETimelineSnapshot = {
  bound: false,
  duration: 0,
  frameRate: 30,
  trackIds: [],
  keyframes: [],
  sequenceId: null,
  label: null,
  isDemo: false,
};

// R1.2: Canvas mode ("Nexus") has no dedicated R3F renderer of its own — the
// only live 3D renderer today is `SceneViewportSurface` (Scene tab). Rather
// than fabricate a second renderer, this surface reuses the *same* scene
// state (`useViewportStore` via `WebIDEBackend`) so Outliner/Properties here
// reflect the real, shared engine scene graph instead of a disconnected mock.
function NexusCanvasV2({ renderMode, nodeCount }: { renderMode: 'draft' | 'cinematic'; nodeCount: number }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--aethel-surface-primary)]">
      <div className="text-center text-xs text-[var(--aethel-text-secondary)]">
        Canvas mode shares the live Scene viewport graph ({nodeCount} object{nodeCount === 1 ? '' : 's'}).
        <div className="mt-1 text-[10px] text-[var(--aethel-text-tertiary)]">Render Mode: {renderMode}</div>
      </div>
    </div>
  );
}

function toOutlinerNode(node: IDESceneNode, selectedIds: string[]): SceneNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type === 'generated-mesh' ? 'mesh' : node.type,
    visible: node.visible,
    locked: node.locked,
    selected: selectedIds.includes(node.id),
  };
}

export default function CanvasViewportSurface({
  renderMode,
  projectId,
}: {
  renderMode: 'draft' | 'cinematic';
  projectId?: string;
}) {
  const { backend, nodes, selectedIds } = useIDEBackend(renderMode, projectId ?? '');
  const selectedNode = nodes.find((node) => selectedIds.includes(node.id)) ?? null;
  const timeline = useSyncExternalStore(
    (onStoreChange) => backend.timeline.subscribe(onStoreChange),
    () => backend.timeline.getSnapshot(),
    () => EMPTY_TIMELINE_SNAPSHOT,
  );

  return (
    <ViewportWorkbenchShell
      mode="canvas"
      title="Aethel Canvas Mode"
      subtitle={`Canvas connected to the project to explore variants, visual research, and composition ${renderMode}.`}
      left={
        <DockPanel id="outliner" title="Outliner" icon={Boxes} defaultRegion="leftBar">
          <Outliner3D
            nodes={nodes.map((node) => toOutlinerNode(node, selectedIds))}
            onNodeSelect={(id) => backend.scene.select([id])}
            onNodeVisibility={(id) => {
              const node = nodes.find((n) => n.id === id);
              if (node) backend.scene.setVisible(id, !node.visible);
            }}
            onNodeLock={(id) => {
              const node = nodes.find((n) => n.id === id);
              if (node) backend.scene.setLocked(id, !node.locked);
            }}
          />
        </DockPanel>
      }
      center={<NexusCanvasV2 renderMode={renderMode} nodeCount={nodes.length} />}
      right={
        <DockPanel id="properties" title="Properties" icon={SlidersHorizontal} defaultRegion="rightBar">
          <PropertiesPanel3D
            objectName={selectedNode?.name ?? ''}
            sections={selectedNode ? buildScenePropertySections(selectedNode) : []}
            onPropertyChange={(_section, property, value) => {
              if (!selectedNode) return;
              if (property === 'Position' || property === 'Rotation' || property === 'Scale') {
                const key = property.toLowerCase() as 'position' | 'rotation' | 'scale';
                backend.scene.updateTransform(selectedNode.id, { [key]: value as [number, number, number] });
              } else if (property === 'Visible') {
                backend.scene.setVisible(selectedNode.id, value as boolean);
              } else if (property === 'Locked') {
                backend.scene.setLocked(selectedNode.id, value as boolean);
              }
            }}
          />
        </DockPanel>
      }
      bottom={
        <>
          <DockPanel id="timeline" title="Timeline" icon={Film} defaultRegion="bottomBar">
            <Timeline3D
              duration={timeline.duration > 0 ? timeline.duration : 10}
              demoMode={timeline.isDemo}
              keyframes={timeline.keyframes}
              tracks={timeline.trackIds}
              authoring={
                timeline.isDemo
                  ? undefined
                  : {
                      availableLanes: backend.timeline.listAvailableTracks?.() ?? [],
                      onAddTrack: (laneId) => {
                        void backend.timeline.addTrack?.(laneId)
                      },
                      onAddKeyframe: (laneId, timeSec) => {
                        void backend.timeline.addKeyframe?.({ track: laneId, time: timeSec })
                      },
                      onRemoveKeyframe: (keyframeId) => {
                        void backend.timeline.removeKeyframe?.(keyframeId)
                      },
                      onRemoveTrack: (laneId) => {
                        void backend.timeline.removeTrack?.(laneId)
                      },
                    }
              }
            />
          </DockPanel>
          <DockPanel id="console" title="Console" icon={TerminalIcon} defaultRegion="bottomBar">
            <ConsoleIntegration />
          </DockPanel>
        </>
      }
    />
  );
}
