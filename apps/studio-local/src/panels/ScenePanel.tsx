import { useEffect, useMemo, useState } from 'react'

import { Outliner3D, type SceneNode as OutlinerSceneNode } from '../../../../cloud-web-app/packages/ide-ui/Outliner3D'
import { PropertiesPanel3D, buildScenePropertySections } from '../../../../cloud-web-app/packages/ide-ui/PropertiesPanel3D'
import type { IDESceneNode } from '../../../../cloud-web-app/packages/ide-ui/backend/types'
import type { NativeIDEBackend, SceneIpcStatus } from '../ide/NativeIDEBackend'
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
    children: node.children?.map(toOutlinerNode),
  }
}

function findNodeById(nodes: IDESceneNode[], id: string): IDESceneNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const nested = node.children ? findNodeById(node.children, id) : null
    if (nested) return nested
  }
  return null
}

function ipcStatusLabel(status: SceneIpcStatus): string {
  switch (status) {
    case 'live':
      return 'IPC live'
    case 'unavailable':
      return 'IPC HELD'
    default:
      return 'IPC probing'
  }
}

export type ScenePanelMode = 'full' | 'outliner' | 'details'

/**
 * Real scene editing surface for the desktop shell: `Outliner3D` +
 * `PropertiesPanel3D` driven by `NativeIDEBackend.scene` → `scene_graph.rs`.
 * Empty list = no native nodes (not a fake demo tree). wgpu present-in-WebView
 * stays HELD — this panel is authoring chrome, not a rendered viewport.
 */
export function ScenePanel({
  backend,
  mode = 'full',
}: {
  backend: NativeIDEBackend
  mode?: ScenePanelMode
}) {
  const [nodes, setNodes] = useState<IDESceneNode[]>(() => backend.scene.getNodes())
  const [flatCount, setFlatCount] = useState(() => backend.scene.getFlatNodes().length)
  const [ipcStatus, setIpcStatus] = useState<SceneIpcStatus>(() => backend.scene.getIpcStatus())
  const [selectedIds, setSelectedIds] = useState<string[]>(() => backend.scene.getSelectedIds())

  useEffect(() => {
    const sync = () => {
      setNodes(backend.scene.getNodes())
      setFlatCount(backend.scene.getFlatNodes().length)
      setIpcStatus(backend.scene.getIpcStatus())
      setSelectedIds(backend.scene.getSelectedIds())
    }
    sync()
    return backend.scene.subscribe(sync)
  }, [backend])

  const outlinerNodes = useMemo(() => nodes.map(toOutlinerNode), [nodes])
  const selectedId = selectedIds[0] ?? null
  const selected = selectedId ? findNodeById(nodes, selectedId) : null
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

  const canMutate = ipcStatus === 'live'

  const toolbar = (
    <div className="button-row" style={{ marginBottom: 0 }}>
      <button
        type="button"
        disabled={!canMutate}
        onClick={() => void backend.scene.addNode('Cube', 'mesh')}
        title={canMutate ? 'Add mesh to native scene graph' : 'Scene IPC unavailable'}
      >
        + Cube
      </button>
      <button
        type="button"
        disabled={!canMutate}
        onClick={() => void backend.scene.addNode('Light', 'light')}
      >
        + Light
      </button>
      <button
        type="button"
        disabled={!canMutate}
        onClick={() => void backend.scene.addNode('Folder', 'group')}
      >
        + Group
      </button>
      <button
        type="button"
        disabled={!canMutate || !selectedId}
        onClick={() => {
          if (selectedId) backend.scene.removeNode(selectedId)
        }}
        title="Remove selected (children orphan to root)"
      >
        Delete
      </button>
      {mode === 'full' && (
        <button type="button" onClick={() => void openPanelWindow('scene')} title="Open this panel in its own window">
          Undock ↗
        </button>
      )}
    </div>
  )

  const honestyStrip = (
    <div
      className="mb-2 flex flex-wrap items-center gap-2 text-[10px]"
      style={{ color: 'var(--aethel-text-tertiary)' }}
    >
      <span
        className="rounded border px-1.5 py-0.5 font-semibold uppercase tracking-wide"
        style={{
          borderColor:
            ipcStatus === 'live'
              ? 'color-mix(in srgb, var(--aethel-success) 40%, transparent)'
              : 'color-mix(in srgb, var(--aethel-warning) 40%, transparent)',
          color:
            ipcStatus === 'live' ? 'var(--aethel-success-light)' : 'var(--aethel-warning-light)',
        }}
      >
        {ipcStatusLabel(ipcStatus)}
      </span>
      <span>{flatCount} node{flatCount === 1 ? '' : 's'}</span>
      <span style={{ color: 'var(--aethel-text-quaternary)' }}>
        Viewport present HELD · outliner = scene IPC only
      </span>
    </div>
  )

  const outliner = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)]">
      {ipcStatus === 'unavailable' ? (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs"
          style={{ color: 'var(--aethel-text-tertiary)' }}
        >
          <strong style={{ color: 'var(--aethel-warning-light)' }}>Scene IPC unavailable</strong>
          <span>
            Open Studio Local inside the Tauri shell. Plain browser preview cannot bind the native
            scene graph — no fake outliner list is shown.
          </span>
        </div>
      ) : (
        <Outliner3D
          nodes={outlinerNodes}
          onNodeSelect={(id) => backend.scene.select([id])}
          onNodeVisibility={(id) => {
            const node = findNodeById(nodes, id)
            if (node) backend.scene.setVisible(id, !node.visible)
          }}
          onNodeLock={(id) => {
            const node = findNodeById(nodes, id)
            if (node) backend.scene.setLocked(id, !node.locked)
          }}
          onNodeReparent={(draggedId, targetId) => {
            if (!canMutate || draggedId === targetId) return
            backend.scene.reparent(draggedId, targetId)
          }}
        />
      )}
    </div>
  )

  const details = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)]">
      {!selected ? (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs"
          style={{ color: 'var(--aethel-text-tertiary)' }}
        >
          <strong style={{ color: 'var(--aethel-text-secondary)' }}>No selection</strong>
          <span>Select a node in the World Outliner to edit transform and visibility.</span>
        </div>
      ) : (
        <PropertiesPanel3D
          sections={sections}
          objectName={selected.name}
          onPropertyChange={(sectionTitle, propertyName, value) => {
            if (!selected || !canMutate) return
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
      )}
    </div>
  )

  if (mode === 'outliner') {
    return (
      <div className="panel panel-wide flex h-full min-h-0 flex-col">
        <div className="panel-heading">
          <span>World Outliner</span>
          {toolbar}
        </div>
        {honestyStrip}
        <div className="min-h-0 flex-1">{outliner}</div>
      </div>
    )
  }

  if (mode === 'details') {
    return (
      <div className="panel panel-wide flex h-full min-h-0 flex-col">
        <div className="panel-heading">
          <span>Details</span>
          <strong style={{ color: 'var(--aethel-text-tertiary)', fontWeight: 500 }}>
            {selected?.name ?? '—'}
          </strong>
        </div>
        {honestyStrip}
        <div className="min-h-0 flex-1">{details}</div>
      </div>
    )
  }

  return (
    <div className="panel panel-wide">
      <div className="panel-heading">
        <span>Scene (Native)</span>
        {toolbar}
      </div>
      {honestyStrip}
      <div className="grid h-[420px] grid-cols-[minmax(220px,280px)_1fr] gap-3">
        {outliner}
        {details}
      </div>
    </div>
  )
}
