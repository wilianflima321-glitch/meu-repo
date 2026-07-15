/**
 * OMNI-PLAN FASE 3.1 — "O Fim do Espaguete": A* orthogonal wire routing.
 *
 * Routes a connection between two ports around every other node's bounding
 * box on a coarse grid, producing clean 90-degree-only polylines instead of
 * Bezier curves that cut straight through node bodies. This is a synchronous,
 * in-thread A* (not a Web Worker) — see the module doc below for why that is
 * an honest, deliberate scope decision for a shared package consumed by
 * Next.js' bundler.
 */

export interface RouteRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface RoutePoint {
  x: number
  y: number
}

export interface RouteOptions {
  /** Grid cell size in canvas units (flow coordinates, i.e. before pan/zoom). */
  cellSize?: number
  /** Extra clearance added around each obstacle's bounding box, in canvas units. */
  padding?: number
  /** Hard cap on grid cells explored — protects against pathological huge canvases. */
  maxCells?: number
  /** Cost multiplier applied whenever the path changes direction (higher = straighter routes). */
  turnPenalty?: number
}

const DEFAULT_OPTIONS: Required<RouteOptions> = {
  cellSize: 20,
  padding: 12,
  maxCells: 6000,
  turnPenalty: 4,
}

type Direction = 0 | 1 | 2 | 3 // right, down, left, up
const DX = [1, 0, -1, 0]
const DY = [0, 1, 0, -1]

/**
 * A* search on a coarse occupancy grid built from the other nodes'
 * bounding boxes, with a turn-penalty heuristic so ties are broken toward
 * long straight runs (what makes hand-routed schematics/blueprints read as
 * "clean" instead of jagged). Falls back to a simple 3-segment elbow if the
 * grid search fails to converge (fully boxed-in ports, pathological zoom,
 * etc.) so a wire is always rendered — never a straight line through nodes,
 * but never a missing wire either.
 */
export function computeOrthogonalRoute(
  start: RoutePoint,
  end: RoutePoint,
  obstacles: RouteRect[],
  options: RouteOptions = {}
): RoutePoint[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (Math.abs(start.x - end.x) < opts.cellSize && Math.abs(start.y - end.y) < opts.cellSize) {
    return [start, end]
  }

  const margin = opts.cellSize * 3
  const minX = Math.min(start.x, end.x) - margin
  const minY = Math.min(start.y, end.y) - margin
  const maxX = Math.max(start.x, end.x) + margin
  const maxY = Math.max(start.y, end.y) + margin

  let cellSize = opts.cellSize
  let cols = Math.max(2, Math.ceil((maxX - minX) / cellSize))
  let rows = Math.max(2, Math.ceil((maxY - minY) / cellSize))
  // Coarsen the grid rather than exploring an unbounded number of cells on
  // huge/zoomed-out canvases — keeps this synchronous search sub-frame.
  while (cols * rows > opts.maxCells) {
    cellSize *= 1.5
    cols = Math.max(2, Math.ceil((maxX - minX) / cellSize))
    rows = Math.max(2, Math.ceil((maxY - minY) / cellSize))
  }

  const toCell = (p: RoutePoint) => ({
    cx: Math.min(cols - 1, Math.max(0, Math.round((p.x - minX) / cellSize))),
    cy: Math.min(rows - 1, Math.max(0, Math.round((p.y - minY) / cellSize))),
  })
  const toPoint = (cx: number, cy: number): RoutePoint => ({ x: minX + cx * cellSize, y: minY + cy * cellSize })

  const blocked = new Uint8Array(cols * rows)
  const index = (cx: number, cy: number) => cy * cols + cx

  for (const rect of obstacles) {
    const left = rect.x - opts.padding
    const top = rect.y - opts.padding
    const right = rect.x + rect.width + opts.padding
    const bottom = rect.y + rect.height + opts.padding
    const c0 = Math.max(0, Math.floor((left - minX) / cellSize))
    const c1 = Math.min(cols - 1, Math.ceil((right - minX) / cellSize))
    const r0 = Math.max(0, Math.floor((top - minY) / cellSize))
    const r1 = Math.min(rows - 1, Math.ceil((bottom - minY) / cellSize))
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        blocked[index(cx, cy)] = 1
      }
    }
  }

  const startCell = toCell(start)
  const endCell = toCell(end)
  // Ports sit on a node's own border, so the immediate start/end cells are
  // always walkable regardless of the obstacle grid — otherwise a node
  // would block routes originating from its own handles.
  blocked[index(startCell.cx, startCell.cy)] = 0
  blocked[index(endCell.cx, endCell.cy)] = 0

  const path = runAStar(startCell, endCell, cols, rows, blocked, opts.turnPenalty)
  if (!path) {
    return buildElbowFallback(start, end)
  }

  const canvasPoints = path.map(({ cx, cy }) => toPoint(cx, cy))
  canvasPoints[0] = start
  canvasPoints[canvasPoints.length - 1] = end
  return simplifyOrthogonalPath(canvasPoints)
}

interface Cell {
  cx: number
  cy: number
}

function runAStar(
  start: Cell,
  end: Cell,
  cols: number,
  rows: number,
  blocked: Uint8Array,
  turnPenalty: number
): Cell[] | null {
  const index = (cx: number, cy: number) => cy * cols + cx
  const heuristic = (cx: number, cy: number) => Math.abs(cx - end.cx) + Math.abs(cy - end.cy)

  const startIndex = index(start.cx, start.cy)
  const gScore = new Float64Array(cols * rows).fill(Infinity)
  const fScore = new Float64Array(cols * rows).fill(Infinity)
  const cameFrom = new Int32Array(cols * rows).fill(-1)
  const cameDir = new Int8Array(cols * rows).fill(-1)
  const closed = new Uint8Array(cols * rows)

  gScore[startIndex] = 0
  fScore[startIndex] = heuristic(start.cx, start.cy)

  // Small binary-heap-free open set: grids routed here are bounded by
  // `maxCells` (a few thousand), so a linear scan for the lowest fScore is
  // simple and fast enough without pulling in a heap dependency.
  const open = new Set<number>([startIndex])

  while (open.size > 0) {
    let currentIndex = -1
    let currentF = Infinity
    for (const candidate of open) {
      if (fScore[candidate] < currentF) {
        currentF = fScore[candidate]
        currentIndex = candidate
      }
    }
    if (currentIndex === -1) break

    const cx = currentIndex % cols
    const cy = Math.floor(currentIndex / cols)
    if (cx === end.cx && cy === end.cy) {
      return reconstructPath(cameFrom, currentIndex, cols)
    }

    open.delete(currentIndex)
    closed[currentIndex] = 1

    for (let dir = 0 as Direction; dir < 4; dir++) {
      const nx = cx + DX[dir]
      const ny = cy + DY[dir]
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const neighborIndex = index(nx, ny)
      if (closed[neighborIndex] || blocked[neighborIndex]) continue

      const prevDir = cameDir[currentIndex]
      const turnCost = prevDir !== -1 && prevDir !== dir ? turnPenalty : 0
      const tentativeG = gScore[currentIndex] + 1 + turnCost

      if (tentativeG < gScore[neighborIndex]) {
        cameFrom[neighborIndex] = currentIndex
        cameDir[neighborIndex] = dir
        gScore[neighborIndex] = tentativeG
        fScore[neighborIndex] = tentativeG + heuristic(nx, ny)
        open.add(neighborIndex)
      }
    }
  }

  return null
}

function reconstructPath(cameFrom: Int32Array, endIndex: number, cols: number): Cell[] {
  const path: Cell[] = []
  let current = endIndex
  while (current !== -1) {
    path.push({ cx: current % cols, cy: Math.floor(current / cols) })
    current = cameFrom[current]
  }
  return path.reverse()
}

/** Merges consecutive colinear points so the rendered path has one vertex per turn, not per grid cell. */
function simplifyOrthogonalPath(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 2) return points
  const simplified: RoutePoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = simplified[simplified.length - 1]
    const current = points[i]
    const next = points[i + 1]
    const sameDirectionAsNext =
      (current.x === prev.x && current.x === next.x) || (current.y === prev.y && current.y === next.y)
    if (!sameDirectionAsNext) {
      simplified.push(current)
    }
  }
  simplified.push(points[points.length - 1])
  return simplified
}

/** Simple 2-turn elbow used only when A* cannot find a path (grid too coarse / degenerate cases). */
function buildElbowFallback(start: RoutePoint, end: RoutePoint): RoutePoint[] {
  const midX = start.x + (end.x - start.x) / 2
  return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
}

/** Renders an orthogonal waypoint list as a SVG path `d` string with square corners (clean 90-degree turns). */
export function buildOrthogonalSvgPath(points: RoutePoint[]): string {
  if (points.length === 0) return ''
  return points.reduce((accumulator, point, index) => {
    const command = index === 0 ? 'M' : 'L'
    return `${accumulator}${command} ${point.x},${point.y} `
  }, '').trim()
}
