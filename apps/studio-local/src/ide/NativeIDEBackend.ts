/**
 * NativeIDEBackend — Tauri counterpart to `web/lib/ide/WebIDEBackend.ts`
 * (Round 3, Tarefa 1: O Coração da IDE).
 *
 * `WebIDEBackend` wraps `useViewportStore`, a Zustand store living only in
 * the browser tab. Studio Local has no such store — and per the "Motor
 * Gráfico Fractal" direction (the engine should eventually run standalone
 * inside an exported game, not just a browser tab), the scene graph belongs
 * to the native engine process. So every `ISceneService` call here is a real
 * Tauri `invoke()` IPC round-trip to `scene_graph.rs`, not a browser API and
 * not a mock — this file is exactly as isomorphism-safe as `WebIDEBackend`
 * (Regra de Ouro 1): no direct filesystem/OS access, everything goes through
 * the same `invoke()` bridge `createDesktopAdapter.ts` already uses.
 */
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

import type {
  IDEFileTreeNode,
  IDERenderJob,
  IDERenderJobStatus,
  IDESceneNode,
  IDESceneNodeTransformPatch,
  IDETransformMode,
  IDETransformSpace,
  IDERenderMode,
  IFileService,
  IIDEBackend,
  IJobService,
  ISceneService,
  IViewportService,
} from '../../../../cloud-web-app/packages/ide-ui/backend/types'
import type { TauriInvoke } from '../desktop-bridge/createDesktopAdapter'

const SCENE_GRAPH_CHANGED_EVENT = 'scene_graph_changed'

type NativeSceneNode = {
  id: string
  name: string
  type: string
  visible: boolean
  locked: boolean
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color?: string
  geometry?: string
}

type NativeSceneSnapshot = {
  nodes: NativeSceneNode[]
  selectedIds: string[]
}

const KNOWN_NODE_TYPES: ReadonlySet<string> = new Set(['mesh', 'light', 'camera', 'generated-mesh', 'group', 'empty'])

function toIDESceneNode(node: NativeSceneNode, selectedIds: string[]): IDESceneNode {
  return {
    id: node.id,
    name: node.name,
    type: KNOWN_NODE_TYPES.has(node.type) ? (node.type as IDESceneNode['type']) : 'empty',
    visible: node.visible,
    locked: node.locked,
    selected: selectedIds.includes(node.id),
    position: node.position,
    rotation: node.rotation,
    scale: node.scale,
    color: node.color,
    geometry: node.geometry,
  }
}

/**
 * Real, IPC-backed scene service. Caches the last `scene_graph_changed`
 * broadcast (or the initial `scene_get_nodes` fetch) so `getNodes()` can stay
 * synchronous, matching `ISceneService`'s contract — the same trade-off
 * `WebSceneService` makes by reading `useViewportStore.getState()`
 * synchronously.
 */
class NativeSceneService implements ISceneService {
  private latest: NativeSceneSnapshot = { nodes: [], selectedIds: [] }
  private readonly listeners = new Set<() => void>()
  private unlisten: UnlistenFn | null = null
  private ready: Promise<void>

  constructor(private readonly invoke: TauriInvoke) {
    this.ready = this.bootstrap()
  }

  private async bootstrap(): Promise<void> {
    try {
      this.unlisten = await listen<NativeSceneSnapshot>(SCENE_GRAPH_CHANGED_EVENT, (event) => {
        this.latest = event.payload
        this.notify()
      })
    } catch {
      // Outside a real Tauri window (e.g. plain browser preview of this Vite
      // app) `listen` rejects — the service just stays at its empty default
      // instead of throwing, same fail-soft posture as `unavailableInvoke`.
    }
    await this.refresh()
  }

  private async refresh(): Promise<void> {
    try {
      this.latest = await this.invoke<NativeSceneSnapshot>('scene_get_nodes')
      this.notify()
    } catch {
      // No live Tauri backend — leave the empty snapshot in place.
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  getNodes(): IDESceneNode[] {
    return this.latest.nodes.map((node) => toIDESceneNode(node, this.latest.selectedIds))
  }

  getSelectedIds(): string[] {
    return this.latest.selectedIds
  }

  select(ids: string[]): void {
    void this.invoke('scene_select', { ids })
  }

  setVisible(id: string, visible: boolean): void {
    void this.invoke('scene_set_visible', { id, visible })
  }

  setLocked(id: string, locked: boolean): void {
    void this.invoke('scene_set_locked', { id, locked })
  }

  updateTransform(id: string, patch: IDESceneNodeTransformPatch): void {
    void this.invoke('scene_update_transform', { id, patch })
  }

  async addNode(name: string, type: IDESceneNode['type']): Promise<IDESceneNode> {
    const node = await this.invoke<NativeSceneNode>('scene_add_node', { name, nodeType: type })
    return toIDESceneNode(node, this.latest.selectedIds)
  }

  removeNode(id: string): void {
    void this.invoke('scene_remove_node', { id })
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    this.unlisten?.()
    this.listeners.clear()
  }
}

/**
 * Transform-gizmo mode/space/snap are editor UI preferences, not
 * engine-authoritative state — unlike the scene graph, nothing outside this
 * process needs to observe them, so they stay in plain JS memory (Golden
 * Rule 1 is about not requiring Node.js/server APIs, not about banning all
 * local state).
 */
class NativeViewportService implements IViewportService {
  private transformMode: IDETransformMode = 'translate'
  private transformSpace: IDETransformSpace = 'world'
  private snapEnabled = false
  private readonly listeners = new Set<() => void>()

  constructor(private readonly renderMode: IDERenderMode) {}

  getRenderMode(): IDERenderMode {
    return this.renderMode
  }

  getTransformMode(): IDETransformMode {
    return this.transformMode
  }

  setTransformMode(mode: IDETransformMode): void {
    this.transformMode = mode
    this.notify()
  }

  getTransformSpace(): IDETransformSpace {
    return this.transformSpace
  }

  setTransformSpace(space: IDETransformSpace): void {
    this.transformSpace = space
    this.notify()
  }

  getSnapEnabled(): boolean {
    return this.snapEnabled
  }

  setSnapEnabled(enabled: boolean): void {
    this.snapEnabled = enabled
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

/** Raw shape `jobs_list` returns — `RuntimeJobStatus` in `contracts.rs`, serialized as-is (snake_case, PascalCase enum variants), unlike `jobs_route`'s already-normalized `RuntimeRouteResponse`. */
type NativeRuntimeJobStatus = {
  id: string
  request: { project_id: string }
  state: 'Queued' | 'Running' | 'Held' | 'NeedsApproval' | 'Complete' | 'Failed' | 'Cancelled'
  target: 'LocalNative' | 'LocalWorker' | 'LocalMainSafe' | 'CloudSandbox' | 'Held'
  progress: number
  created_at_unix_ms: number
}

function normalizeNativeJobState(state: NativeRuntimeJobStatus['state']): IDERenderJobStatus {
  switch (state) {
    case 'Queued':
      return 'queued'
    case 'Running':
      return 'rendering'
    case 'Held':
    case 'NeedsApproval':
      return 'held'
    case 'Complete':
      return 'completed'
    case 'Failed':
      return 'failed'
    case 'Cancelled':
      return 'cancelled'
    default:
      return 'queued'
  }
}

function toIDERenderJob(status: NativeRuntimeJobStatus): IDERenderJob {
  return {
    id: status.id,
    projectId: status.request.project_id,
    status: normalizeNativeJobState(status.state),
    // Rust has no separate "cloud provider" concept for native jobs — the
    // execution target ("local-native" / "cloud-sandbox" / ...) is the
    // closest honest analog to `provider` here.
    provider: status.target.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    progress: status.progress,
    createdAt: status.created_at_unix_ms > 0 ? new Date(status.created_at_unix_ms).toISOString() : '',
  }
}

/** Real IPC bridge to the already-existing `jobs_route` / `jobs_list` / `jobs_cancel` Rust commands (`main.rs`) — no separate REST layer needed on desktop. */
class NativeJobService implements IJobService {
  constructor(private readonly invoke: TauriInvoke) {}

  async listJobs(projectId?: string): Promise<IDERenderJob[]> {
    try {
      const jobs = await this.invoke<NativeRuntimeJobStatus[]>('jobs_list')
      const mapped = jobs.map(toIDERenderJob)
      return projectId ? mapped.filter((job) => job.projectId === projectId) : mapped
    } catch {
      return []
    }
  }

  async getJob(jobId: string): Promise<IDERenderJob | null> {
    const jobs = await this.listJobs()
    return jobs.find((job) => job.id === jobId) ?? null
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.invoke('jobs_cancel', { jobId })
  }
}

/** `fs_read` / `fs_write` / `fs_tree` over real Tauri IPC (`desktop_commands.rs`) — no Node.js `fs`, no IndexedDB. */
class NativeFileService implements IFileService {
  constructor(private readonly invoke: TauriInvoke) {}

  async readTree(path = '.', maxDepth = 6): Promise<IDEFileTreeNode[]> {
    try {
      return await this.invoke<IDEFileTreeNode[]>('fs_tree', { path, maxDepth })
    } catch {
      return []
    }
  }

  async readFile(path: string): Promise<string> {
    return this.invoke<string>('fs_read', { path })
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.invoke('fs_write', { path, content })
  }
}

type NativeTerminalCreateResponse = {
  id: string
  state: string
  reason: string
  cwd?: string
}

/**
 * Tarefa 2 (O Terminal Real) — bridges to the real `portable-pty` process
 * Rust spawns in `desktop_commands.rs::TerminalSessionStore::create_held`
 * (PowerShell on Windows, bash elsewhere). Not part of `IIDEBackend`: the
 * web backend has no PTY equivalent to satisfy the same interface honestly
 * (its "terminal" is a simulated command runner), so this stays a
 * desktop-only capability on `NativeIDEBackend` rather than a fake shared
 * contract. `TerminalPanel.tsx` is the xterm.js UI consuming it.
 */
/** Human UI lane — Law #48 requires callerKind=user on every terminal_* IPC. */
const HUMAN_TERMINAL_CALLER = { callerKind: 'user' as const }

class NativeTerminalService {
  constructor(private readonly invoke: TauriInvoke) {}

  async create(cwd?: string): Promise<NativeTerminalCreateResponse> {
    return this.invoke<NativeTerminalCreateResponse>('terminal_create', {
      cwd,
      ...HUMAN_TERMINAL_CALLER,
    })
  }

  async write(sessionId: string, input: string): Promise<void> {
    await this.invoke('terminal_write', { sessionId, input, ...HUMAN_TERMINAL_CALLER })
  }

  async resize(sessionId: string, rows: number, cols: number): Promise<void> {
    await this.invoke('terminal_resize', {
      sessionId,
      rows,
      cols,
      ...HUMAN_TERMINAL_CALLER,
    })
  }

  async close(sessionId: string): Promise<void> {
    await this.invoke('terminal_close', { sessionId, ...HUMAN_TERMINAL_CALLER })
  }

  /** Raw PTY output bytes for one session, straight off `terminal_data_<id>` (emitted as a `number[]` byte array from the Rust reader thread). */
  async onData(sessionId: string, listener: (bytes: Uint8Array) => void): Promise<UnlistenFn> {
    return listen<number[]>(`terminal_data_${sessionId}`, (event) => {
      listener(Uint8Array.from(event.payload))
    })
  }
}

export class NativeIDEBackend implements IIDEBackend {
  readonly scene: NativeSceneService
  readonly viewport: IViewportService
  readonly jobs: IJobService
  readonly files: IFileService
  readonly terminal: NativeTerminalService

  constructor(invoke: TauriInvoke, renderMode: IDERenderMode = 'draft') {
    this.scene = new NativeSceneService(invoke)
    this.viewport = new NativeViewportService(renderMode)
    this.jobs = new NativeJobService(invoke)
    this.files = new NativeFileService(invoke)
    this.terminal = new NativeTerminalService(invoke)
  }

  dispose(): void {
    this.scene.dispose()
  }
}

/**
 * `window.__TAURI__` (or `window.__TAURI_INTERNALS__` on newer Tauri 2
 * builds) is only ever injected by the Tauri webview shell — a plain browser
 * tab loading this same bundle (e.g. `vite preview`) never has it. This is
 * the single detection point the rest of the app should use instead of
 * scattering `typeof window !== 'undefined' && ...` checks everywhere.
 */
export function isRunningInsideTauri(): boolean {
  if (typeof window === 'undefined') return false
  const globalWindow = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  return Boolean(globalWindow.__TAURI__ ?? globalWindow.__TAURI_INTERNALS__)
}
