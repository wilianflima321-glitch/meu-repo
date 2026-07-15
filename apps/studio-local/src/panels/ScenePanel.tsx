import { useEffect, useMemo, useState } from 'react'

import { Outliner3D, type SceneNode as OutlinerSceneNode } from '../../../../cloud-web-app/packages/ide-ui/Outliner3D'
import { PropertiesPanel3D, buildScenePropertySections } from '../../../../cloud-web-app/packages/ide-ui/PropertiesPanel3D'
import type { IDESceneNode } from '../../../../cloud-web-app/packages/ide-ui/backend/types'
import type { NativeIDEBackend } from '../ide/NativeIDEBackend'
import { openPanelWindow } from '../ide/panelWindows'

function toOutlinerType(type: IDESceneNode['type']): OutlinerSceneNode['type'] {
  // `Outliner3D` predates the `generated-mesh` node kind (procedural/Nanite
  // clusters); treating it as a plain mesh keeps the icon sensible without
  // forking the shared component just for an icon case.
  return type === 'generated-mesh' ? 'mesh' : type
}

function toOutlinerNode(node: IDESceneNode): OutlinerSceneNode {
  return {
    id: node.id,
    name: node.name,
    type: toOutlinerType(node.type),
    visible: node.visible,
    locked: node.locked,
    selected: node.selected,
  }
}

/**
 * Real scene editing surface for the desktop shell: `Outliner3D` +
 * `PropertiesPanel3D` (shared with `cloud-web-app/web`) driven entirely by
 * `NativeIDEBackend.scene`, which is itself a thin wrapper over the real
 * `scene_graph.rs` Tauri commands. Nothing here is mock data — an empty
 * scene genuinely means "no nodes exist yet in the native scene graph",
 * exactly like a fresh web project.
 */
export function ScenePanel({ backend }: { backend: NativeIDEBackend }) {
  const [nodes, setNodes] = useState<IDESceneNode[]>(() => backend.scene.getNodes())

  useEffect(() => {
    setNodes(backend.scene.getNodes())
    return backend.scene.subscribe(() => setNodes(backend.scene.getNodes()))
  }, [backend])

  const outlinerNodes = useMemo(() => nodes.map(toOutlinerNode), [nodes])
  const selected = nodes.find((node) => node.selected) ?? null
  const sections = useMemo(() => {
    if (!selected) return []
    return buildScenePropertySections({
      type: selected.type,
      position: selected.position,
      rotation: selected.rotation,
      scale: selected.scale,
      color: selected.color,
      geometry: selected.geometry,
      visible: selected.visible,
      locked: selected.locked,
    })
  }, [selected])

  return (
    <div className="panel panel-wide">
      <div className="panel-heading">
        <span>Scene (Native)</span>
        <div className="button-row" style={{ marginBottom: 0 }}>
          <button type="button" onClick={() => void backend.scene.addNode('Cube', 'mesh')}>
            + Cube
          </button>
          <button type="button" onClick={() => void backend.scene.addNode('Light', 'light')}>
            + Light
          </button>
          <button type="button" onClick={() => void openPanelWindow('scene')} title="Open this panel in its own window">
            Undock ↗
          </button>
        </div>
      </div>
      <div className="grid h-[420px] grid-cols-[minmax(220px,280px)_1fr] gap-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)]">
          <Outliner3D
            nodes={outlinerNodes}
            onNodeSelect={(id) => backend.scene.select([id])}
            onNodeVisibility={(id) => {
              const node = nodes.find((entry) => entry.id === id)
              if (node) backend.scene.setVisible(id, !node.visible)
            }}
            onNodeLock={(id) => {
              const node = nodes.find((entry) => entry.id === id)
              if (node) backend.scene.setLocked(id, !node.locked)
            }}
          />
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)]">
          <PropertiesPanel3D
            sections={sections}
            objectName={selected?.name ?? ''}
            onPropertyChange={(sectionTitle, propertyName, value) => {
              if (!selected) return
              if (sectionTitle === 'Transform' && Array.isArray(value)) {
                const vector = value as [number, number, number]
                if (propertyName === 'Position') backend.scene.updateTransform(selected.id, { position: vector })
                if (propertyName === 'Rotation') backend.scene.updateTransform(selected.id, { rotation: vector })
                if (propertyName === 'Scale') backend.scene.updateTransform(selected.id, { scale: vector })
              }
              if (sectionTitle === 'Visibility' && typeof value === 'boolean') {
                if (propertyName === 'Visible') backend.scene.setVisible(selected.id, value)
                if (propertyName === 'Locked') backend.scene.setLocked(selected.id, value)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
