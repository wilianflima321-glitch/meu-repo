'use client'

/**
 * OMNI-PLAN FASE 3.1 — Ação A (Smart Routing).
 *
 * Replaces ReactFlow's default Bezier edge with an A*-routed orthogonal
 * polyline that steers around every other node's bounding box. See
 * `lib/orthogonal-router.ts` for the pathfinding itself; this component only
 * gathers node bounding boxes from the live ReactFlow store and turns the
 * resulting waypoints into an SVG path.
 *
 * Scope note: the A* search runs synchronously on the main thread rather
 * than in a Web Worker. The grid is capped (`maxCells`) so a single route
 * computation stays well under a frame budget even on large graphs, and
 * keeping it synchronous avoids adding worker-bundling configuration to a
 * package consumed by Next.js' webpack/turbopack build — a real trade-off,
 * not an oversight. If profiling ever shows this on the hot path for very
 * large graphs (thousands of simultaneous edges), moving the pure function
 * in `orthogonal-router.ts` into a worker is a drop-in change.
 */

import { useMemo } from 'react'
import { BaseEdge, useNodes, type EdgeProps, type Node } from '@xyflow/react'
import { buildOrthogonalSvgPath, computeOrthogonalRoute, type RouteRect } from './lib/orthogonal-router'

const DEFAULT_NODE_WIDTH = 200
const DEFAULT_NODE_HEIGHT_BASE = 56
const DEFAULT_PORT_ROW_HEIGHT = 26

/** Best-effort node footprint before ReactFlow has measured the DOM node (first paint / SSR-hydrated state). */
function estimateNodeHeight(node: Node): number {
  const definition = (node.data as { definition?: { inputs?: unknown[]; outputs?: unknown[] } } | undefined)?.definition
  const portRows = Math.max(definition?.inputs?.length ?? 0, definition?.outputs?.length ?? 0, 1)
  return DEFAULT_NODE_HEIGHT_BASE + portRows * DEFAULT_PORT_ROW_HEIGHT
}

export function SmartEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const nodes = useNodes()

  const path = useMemo(() => {
    const obstacles: RouteRect[] = nodes
      .filter((node) => node.id !== source && node.id !== target)
      .map((node): RouteRect => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
        height: node.measured?.height ?? node.height ?? estimateNodeHeight(node),
      }))

    const points = computeOrthogonalRoute({ x: sourceX, y: sourceY }, { x: targetX, y: targetY }, obstacles)
    return buildOrthogonalSvgPath(points)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, source, target, sourceX, sourceY, targetX, targetY])

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeWidth: selected ? 2.5 : (style?.strokeWidth as number | undefined) ?? 2,
      }}
    />
  )
}

export default SmartEdge
