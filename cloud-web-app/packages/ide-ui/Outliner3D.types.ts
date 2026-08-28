export type SceneNodeType =
  | 'mesh'
  | 'light'
  | 'camera'
  | 'empty'
  | 'group'
  | 'audio'
  | 'trigger'
  | 'terrain'

export interface SceneNode {
  id: string
  name: string
  type: SceneNodeType
  children?: SceneNode[]
  visible?: boolean
  locked?: boolean
  selected?: boolean
}

export interface OutlinerProps {
  nodes?: SceneNode[]
  onNodeSelect?: (nodeId: string) => void
  onNodeToggle?: (nodeId: string) => void
  onNodeVisibility?: (nodeId: string) => void
  onNodeLock?: (nodeId: string) => void
  onNodeReparent?: (draggedId: string, targetId: string) => void
}

/** Flattened row for virtualization. */
export interface FlatNode {
  node: SceneNode
  depth: number
}
