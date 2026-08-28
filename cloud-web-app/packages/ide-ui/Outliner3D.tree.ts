import type { FlatNode, SceneNode } from './Outliner3D.types'

export const ROW_HEIGHT = 28 // px — must match virtual list math
export const OVERSCAN = 6 // extra rows rendered above/below viewport

export function flattenNodes(
  nodes: SceneNode[],
  expanded: Set<string>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.children?.length && expanded.has(node.id)) {
      result.push(...flattenNodes(node.children, expanded, depth + 1))
    }
  }
  return result
}

export function filterNodes(nodes: SceneNode[], query: string): SceneNode[] {
  if (!query.trim()) return nodes
  const q = query.toLowerCase()
  function matchNode(node: SceneNode): SceneNode | null {
    const selfMatch = node.name.toLowerCase().includes(q)
    const filteredChildren = (node.children ?? []).map(matchNode).filter(Boolean) as SceneNode[]
    if (selfMatch || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren }
    }
    return null
  }
  return nodes.map(matchNode).filter(Boolean) as SceneNode[]
}

export function countSceneNodes(nodes: SceneNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countSceneNodes(n.children ?? []), 0)
}
