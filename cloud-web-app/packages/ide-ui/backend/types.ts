/**
 * IDE Backend Contracts (CLAUDE_MASTER_EXECUTION_PLAN_V8 R1.2).
 *
 * `packages/ide-ui` panels (Outliner3D, PropertiesPanel3D, etc.) are pure,
 * presentational, prop-driven components. They must never import a web-app
 * alias (`@/...`) or reach into a concrete store implementation directly —
 * that would recreate the exact coupling Task 1 (R1.1) just removed.
 *
 * Instead, the web app is expected to implement these interfaces against its
 * real state (Zustand viewport store, render-job REST API, etc.) and pass the
 * resulting data down as props / callbacks. `WebIDEBackend` in
 * `web/lib/ide/WebIDEBackend.ts` is the concrete implementation used today.
 */

export type IDESceneNodeType = 'mesh' | 'light' | 'camera' | 'generated-mesh' | 'group' | 'empty'

export interface IDESceneNode {
  id: string
  name: string
  type: IDESceneNodeType
  visible: boolean
  locked: boolean
  selected: boolean
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color?: string
  geometry?: string
  children?: IDESceneNode[]
}

export type IDESceneNodeTransformPatch = Partial<Pick<IDESceneNode, 'position' | 'rotation' | 'scale'>>

/**
 * Read/write access to the live engine scene graph backing the current
 * viewport. This is intentionally flat (no nested `children` requirement)
 * because the current engine viewport store is a flat object list; backends
 * that do support hierarchy (e.g. the desktop `SceneManager`/`Scene` graph in
 * `packages/engine/scene-graph-*.ts`) may populate `children`.
 */
export interface ISceneService {
  getNodes(): IDESceneNode[]
  getSelectedIds(): string[]
  select(ids: string[]): void
  setVisible(id: string, visible: boolean): void
  setLocked(id: string, locked: boolean): void
  updateTransform(id: string, patch: IDESceneNodeTransformPatch): void
  /** Subscribe to any scene mutation (nodes or selection). Returns an unsubscribe fn. */
  subscribe(listener: () => void): () => void
}

export type IDETransformMode = 'translate' | 'rotate' | 'scale'
export type IDETransformSpace = 'world' | 'local'
export type IDERenderMode = 'draft' | 'cinematic'

export interface IViewportService {
  getRenderMode(): IDERenderMode
  getTransformMode(): IDETransformMode
  setTransformMode(mode: IDETransformMode): void
  getTransformSpace(): IDETransformSpace
  setTransformSpace(space: IDETransformSpace): void
  getSnapEnabled(): boolean
  setSnapEnabled(enabled: boolean): void
  subscribe(listener: () => void): () => void
}

export type IDERenderJobStatus =
  | 'queued'
  | 'held'
  | 'preparing'
  | 'rendering'
  | 'encoding'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface IDERenderJob {
  id: string
  projectId: string
  status: IDERenderJobStatus
  provider: string
  progress: number
  createdAt: string
}

/**
 * Thin wrapper around the render-job REST surface
 * (`app/api/render/jobs/**`, already Upstash-rate-limited). No polling/queue
 * logic is duplicated here — callers combine this with `useRenderProgress`
 * (WebSocket) for live progress if needed.
 */
export interface IJobService {
  listJobs(projectId?: string): Promise<IDERenderJob[]>
  getJob(jobId: string): Promise<IDERenderJob | null>
  cancelJob(jobId: string): Promise<void>
}

export interface IDEFileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: IDEFileTreeNode[]
}

/**
 * Read/write access to the project workspace filesystem. Backed by
 * `/api/files/tree` and `/api/files/fs` today (see `WebIDEBackend`'s
 * `WebFileService`) — an HTTP contract, not a Node.js `fs` binding, so a
 * future Tauri/embedded backend can satisfy this with a native filesystem
 * bridge instead without changing this interface (Golden Rule 1 —
 * Isomorfismo Fractal).
 */
export interface IFileService {
  readTree(path?: string, maxDepth?: number): Promise<IDEFileTreeNode[]>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
}

/**
 * Presentational snapshot for Timeline3D / sequencer docks.
 * Keyframes come only from a bound SequencerTimeline (curves/clips) —
 * never fabricated from static scene transforms (Zero-MVP).
 */
export interface IDETimelineKeyframe {
  id: string
  time: number
  track: string
  value: unknown
}

export interface IDETimelineSnapshot {
  /** True when a project sequence document is bound (may still have zero tracks). */
  bound: boolean
  duration: number
  frameRate: number
  trackIds: string[]
  keyframes: IDETimelineKeyframe[]
  sequenceId: string | null
  label: string | null
  /** True only when the bound document is an explicit demo/fixture timeline. */
  isDemo: boolean
}

export type IDETimelinePersistResult =
  | { ok: true; path: string; bytes: number }
  | { ok: false; reason: string; message: string }

export type IDETimelineHydrateResult =
  | { ok: true; path: string }
  | { ok: false; reason: string; message: string }

export type IDETimelineAuthorResult =
  | {
      ok: true
      snapshot: IDETimelineSnapshot
      /** Present when a persist attempt ran after the mutation. */
      persist?: IDETimelinePersistResult
    }
  | { ok: false; reason: string; message: string }

/**
 * Project sequence document backing Timeline3D.
 * Concrete backends bridge `aethel.timeline.v1` (lib/sequencer) — not IDESceneNode transforms.
 * Persist/hydrate write `*.timeline.json`; authoring mutates the bound SequencerTimeline in-place.
 */
export interface ITimelineService {
  getSnapshot(): IDETimelineSnapshot
  subscribe(listener: () => void): () => void
  /** Persist bound (non-demo) timeline to project `*.timeline.json`. */
  persistToProject?(relativePath?: string): Promise<IDETimelinePersistResult>
  /** Hydrate in-memory bind from project `*.timeline.json`. */
  hydrateFromProject?(relativePath?: string): Promise<IDETimelineHydrateResult>
  /** Bind an empty non-demo shell when unbound (no fabricated tracks). */
  ensureBound?(options?: { durationSec?: number }): IDETimelineSnapshot
  /** Add a Timeline3D authoring lane (position/rotation/…). Demo binds blocked. */
  addTrack?(laneId: string): Promise<IDETimelineAuthorResult>
  /** Add/upsert a keyframe on a lane at time (seconds). Creates the lane if missing. */
  addKeyframe?(input: {
    track: string
    time: number
    value?: number
  }): Promise<IDETimelineAuthorResult>
  removeKeyframe?(keyframeId: string): Promise<IDETimelineAuthorResult>
  removeTrack?(laneId: string): Promise<IDETimelineAuthorResult>
  /** Lanes not yet present on the bound document (empty when unbound/demo). */
  listAvailableTracks?(): string[]
}

export interface IIDEBackend {
  readonly scene: ISceneService
  readonly viewport: IViewportService
  readonly jobs: IJobService
  readonly files: IFileService
  readonly timeline: ITimelineService
}
