/**
 * WebIDEBackend — concrete `IIDEBackend` (packages/ide-ui/backend/types.ts)
 * implementation for the browser IDE (CLAUDE_MASTER_EXECUTION_PLAN_V8 R1.2).
 *
 * This wraps state/services that already exist and are already live:
 *  - SceneService  -> `useViewportStore` (the same Zustand store the primary
 *    `SceneViewportSurface` viewport reads/writes — NOT a separate mock).
 *  - ViewportService -> transform mode/space/snap flags in the same store.
 *  - JobService -> the real, rate-limited `/api/render/jobs` REST endpoints.
 *
 * `packages/ide-ui` panels stay framework/alias-agnostic; this file is the
 * one place in `web/` allowed to bridge them to concrete app state.
 */
import { authHeaders } from '@/lib/auth';
import { createComponentLogger } from '@/lib/observability/logger';
import { useViewportStore } from '@/lib/viewport/useViewportStore';
import type { ViewportSceneObject } from '@/components/viewport/viewport-model';
import type {
  IDEFileTreeNode,
  IDERenderJob,
  IDERenderJobStatus,
  IDESceneColorUpdateResult,
  IDESceneNode,
  IDESceneNodeTransformPatch,
  IDETimelineAuthorResult,
  IDETimelineHydrateResult,
  IDETimelinePersistResult,
  IDETimelineSnapshot,
  IDETransformMode,
  IDETransformSpace,
  IDERenderMode,
  IFileService,
  IIDEBackend,
  IJobService,
  ISceneService,
  ITimelineService,
  IViewportService,
} from '../../../packages/ide-ui/backend/types';
import {
  createEmptyProjectTimeline,
  ensureProjectTimelineBound,
  getProjectTimelineBinding,
  subscribeProjectTimeline,
  updateProjectTimeline,
} from '@/lib/sequencer/project-timeline-store';
import {
  hydrateProjectTimelineFromFile,
  persistProjectTimelineToFile,
} from '@/lib/sequencer/timeline-project-persist';
import {
  addAuthoringKeyframe,
  addAuthoringLane,
  AUTHORABLE_TIMELINE_LANES,
  listAvailableAuthoringLanes,
  moveAuthoringKeyframe,
  removeAuthoringKeyframe,
  removeAuthoringLane,
  setAuthoringKeyframeValue,
  type TimelineAuthorResult,
} from '@/lib/sequencer/timeline-authoring';
import { bindingToIDETimelineSnapshot } from '@/lib/sequencer/timeline-ui-adapter';
import {
  isValidSceneColorLiteral,
  viewportObjectSupportsLiveColor,
} from '@/lib/ide/scene-color-support';

const log = createComponentLogger('WebIDEBackend');

function toIDESceneNode(obj: ViewportSceneObject, selectedIds: string[]): IDESceneNode {
  return {
    id: obj.id,
    name: obj.name,
    type: obj.type,
    visible: obj.visible ?? true,
    locked: obj.locked ?? false,
    selected: selectedIds.includes(obj.id),
    position: obj.position,
    rotation: obj.rotation,
    scale: obj.scale,
    color: obj.color,
    geometry: obj.geometry,
  };
}

class WebSceneService implements ISceneService {
  getNodes(): IDESceneNode[] {
    const { objects, selectedIds } = useViewportStore.getState();
    return objects.map((obj) => toIDESceneNode(obj, selectedIds));
  }

  getSelectedIds(): string[] {
    return useViewportStore.getState().selectedIds;
  }

  select(ids: string[]): void {
    useViewportStore.getState().setSelectedIds(ids);
  }

  setVisible(id: string, visible: boolean): void {
    useViewportStore.getState().setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, visible } : obj))
    );
  }

  setLocked(id: string, locked: boolean): void {
    useViewportStore.getState().setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, locked } : obj))
    );
  }

  updateTransform(id: string, patch: IDESceneNodeTransformPatch): void {
    useViewportStore.getState().handleObjectTransformChange(id, patch);
  }

  setColor(id: string, color: string): IDESceneColorUpdateResult {
    if (!isValidSceneColorLiteral(color)) {
      return { ok: false, reason: 'invalid_color' };
    }
    const { objects } = useViewportStore.getState();
    const obj = objects.find((entry) => entry.id === id);
    if (!obj) return { ok: false, reason: 'missing_node' };
    if (obj.locked) return { ok: false, reason: 'locked' };
    if (!viewportObjectSupportsLiveColor(obj)) {
      return { ok: false, reason: 'no_color_support' };
    }
    const next = color.trim();
    useViewportStore.getState().setObjects((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, color: next } : entry)),
    );
    return { ok: true };
  }

  subscribe(listener: () => void): () => void {
    return useViewportStore.subscribe(() => listener());
  }
}

class WebViewportService implements IViewportService {
  constructor(private readonly renderMode: IDERenderMode) {}

  getRenderMode(): IDERenderMode {
    return this.renderMode;
  }

  getTransformMode(): IDETransformMode {
    return useViewportStore.getState().transformMode;
  }

  setTransformMode(mode: IDETransformMode): void {
    useViewportStore.getState().setTransformMode(mode);
  }

  getTransformSpace(): IDETransformSpace {
    return useViewportStore.getState().transformSpace;
  }

  setTransformSpace(space: IDETransformSpace): void {
    useViewportStore.getState().setTransformSpace(space);
  }

  getSnapEnabled(): boolean {
    return useViewportStore.getState().snapEnabled;
  }

  setSnapEnabled(enabled: boolean): void {
    useViewportStore.getState().setSnapEnabled(enabled);
  }

  subscribe(listener: () => void): () => void {
    return useViewportStore.subscribe(() => listener());
  }
}

function normalizeJobStatus(status: string): IDERenderJobStatus {
  if (['processing', 'running', 'active'].includes(status)) return 'rendering';
  const known: IDERenderJobStatus[] = [
    'queued', 'held', 'preparing', 'rendering', 'encoding', 'uploading', 'completed', 'failed', 'cancelled',
  ];
  return (known as string[]).includes(status) ? (status as IDERenderJobStatus) : 'queued';
}

class WebJobService implements IJobService {
  async listJobs(projectId?: string): Promise<IDERenderJob[]> {
    const url = projectId ? `/api/render/jobs?projectId=${encodeURIComponent(projectId)}` : '/api/render/jobs';
    try {
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Failed to list render jobs (${res.status})`);
      const data = await res.json();
      return (data.jobs ?? []).map((job: any) => ({
        id: job.id,
        projectId: job.projectId,
        status: normalizeJobStatus(job.status),
        provider: job.provider ?? 'internal',
        progress: job.progress ?? 0,
        createdAt: job.createdAt,
      }));
    } catch (error) {
      log.error('listJobs failed', error);
      return [];
    }
  }

  async getJob(jobId: string): Promise<IDERenderJob | null> {
    try {
      const res = await fetch(`/api/render/jobs/${jobId}`, { headers: authHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      const job = data.job ?? data;
      return {
        id: job.id,
        projectId: job.projectId,
        status: normalizeJobStatus(job.status),
        provider: job.provider ?? 'internal',
        progress: job.progress ?? 0,
        createdAt: job.createdAt,
      };
    } catch (error) {
      log.error('getJob failed', error);
      return null;
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const res = await fetch(`/api/render/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to cancel render job ${jobId} (${res.status})`);
  }
}

/**
 * `/api/files/fs` + `/api/files/tree` over HTTP (see `route.ts` for both) —
 * the same endpoints `packages/ide-ui/fullscreen/useWorkbenchFiles.ts`
 * already talks to for the main editor. No Node.js `fs`/`path` import here,
 * so this stays safe to eventually run inside a Tauri WebView pointed at a
 * different backend implementation of `IFileService`.
 */
class WebFileService implements IFileService {
  constructor(private readonly projectId: string) {}

  async readTree(path = '/', maxDepth = 6): Promise<IDEFileTreeNode[]> {
    try {
      const res = await fetch('/api/files/tree', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': this.projectId,
          ...authHeaders(),
        },
        body: JSON.stringify({ path, maxDepth, projectId: this.projectId }),
      });
      if (!res.ok) return [];
      const data = await res.json().catch(() => null);
      const rawTree = Array.isArray(data?.children) ? data.children : Array.isArray(data?.tree) ? data.tree : [];
      return rawTree as IDEFileTreeNode[];
    } catch (error) {
      log.error('readTree failed', error);
      return [];
    }
  }

  async readFile(path: string): Promise<string> {
    const res = await fetch('/api/files/fs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': this.projectId,
        ...authHeaders(),
      },
      body: JSON.stringify({ action: 'read', path, projectId: this.projectId }),
    });
    if (!res.ok) throw new Error(`Failed to read ${path} (${res.status})`);
    const payload = await res.json();
    return typeof payload?.content === 'string' ? payload.content : '';
  }

  async writeFile(path: string, content: string): Promise<void> {
    const res = await fetch('/api/files/fs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': this.projectId,
        ...authHeaders(),
      },
      body: JSON.stringify({ action: 'write', path, content, projectId: this.projectId }),
    });
    if (!res.ok) throw new Error(`Failed to write ${path} (${res.status})`);
  }
}

class WebTimelineService implements ITimelineService {
  constructor(
    private readonly projectId: string,
    private readonly files: IFileService,
  ) {}

  getSnapshot(): IDETimelineSnapshot {
    return bindingToIDETimelineSnapshot(getProjectTimelineBinding(this.projectId));
  }

  subscribe(listener: () => void): () => void {
    return subscribeProjectTimeline(listener);
  }

  async persistToProject(relativePath?: string): Promise<IDETimelinePersistResult> {
    return persistProjectTimelineToFile({
      projectId: this.projectId,
      io: this.files,
      relativePath,
    });
  }

  async hydrateFromProject(relativePath?: string): Promise<IDETimelineHydrateResult> {
    const result = await hydrateProjectTimelineFromFile({
      projectId: this.projectId,
      io: this.files,
      relativePath,
    });
    if (!result.ok) {
      return { ok: false, reason: result.reason, message: result.message };
    }
    return { ok: true, path: result.path };
  }

  ensureBound(options?: { durationSec?: number }): IDETimelineSnapshot {
    const binding = getProjectTimelineBinding(this.projectId);
    if (binding?.isDemo) {
      return bindingToIDETimelineSnapshot(binding);
    }
    ensureProjectTimelineBound(this.projectId, options);
    return this.getSnapshot();
  }

  listAvailableTracks(): string[] {
    const binding = getProjectTimelineBinding(this.projectId);
    if (!binding) return [...AUTHORABLE_TIMELINE_LANES];
    if (binding.isDemo) return [];
    return listAvailableAuthoringLanes(binding.timeline);
  }

  private async commitAuthor(
    mutate: (timeline: NonNullable<ReturnType<typeof getProjectTimelineBinding>>['timeline']) => TimelineAuthorResult,
    options?: { persist?: boolean },
  ): Promise<IDETimelineAuthorResult> {
    const binding = getProjectTimelineBinding(this.projectId);
    if (binding?.isDemo) {
      return {
        ok: false,
        reason: 'demo_blocked',
        message: 'Demo/fixture timelines are read-only — authoring is blocked.',
      };
    }
    const base = binding?.timeline ?? createEmptyProjectTimeline(this.projectId);
    const result = mutate(base);
    if (!result.ok) {
      return { ok: false, reason: result.reason, message: result.message };
    }
    updateProjectTimeline(this.projectId, result.timeline, { isDemo: false });
    const snapshot = this.getSnapshot();
    if (options?.persist === false) {
      return { ok: true, snapshot };
    }
    let persist: IDETimelinePersistResult | undefined;
    try {
      persist = await this.persistToProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn('timeline_author_persist_failed', { projectId: this.projectId, err: message });
      persist = { ok: false, reason: 'io_error', message };
    }
    return { ok: true, snapshot, persist };
  }

  addTrack(
    laneId: string,
    options?: { targetNodeId?: string },
  ): Promise<IDETimelineAuthorResult> {
    return this.commitAuthor((timeline) =>
      addAuthoringLane(timeline, laneId, { targetNodeId: options?.targetNodeId }),
    );
  }

  addKeyframe(input: {
    track: string;
    time: number;
    value?: number;
    targetNodeId?: string;
    /** Event-lane GAS cue tag — see timeline-authoring `eventName`. */
    eventName?: string;
    cueName?: string;
  }): Promise<IDETimelineAuthorResult> {
    return this.commitAuthor((timeline) =>
      addAuthoringKeyframe(timeline, {
        lane: input.track,
        timeSec: input.time,
        value: input.value,
        targetNodeId: input.targetNodeId,
        eventName: input.eventName,
        cueName: input.cueName,
      }),
    );
  }

  removeKeyframe(keyframeId: string): Promise<IDETimelineAuthorResult> {
    return this.commitAuthor((timeline) => removeAuthoringKeyframe(timeline, keyframeId));
  }

  removeTrack(laneId: string): Promise<IDETimelineAuthorResult> {
    return this.commitAuthor((timeline) => removeAuthoringLane(timeline, laneId));
  }

  moveKeyframe(
    keyframeId: string,
    timeSec: number,
    options?: { persist?: boolean },
  ): Promise<IDETimelineAuthorResult> {
    return this.commitAuthor(
      (timeline) => moveAuthoringKeyframe(timeline, keyframeId, timeSec),
      options,
    );
  }

  setKeyframeValue(
    keyframeId: string,
    value: number,
    options?: { persist?: boolean },
  ): Promise<IDETimelineAuthorResult> {
    return this.commitAuthor(
      (timeline) => setAuthoringKeyframeValue(timeline, keyframeId, value),
      options,
    );
  }
}

export class WebIDEBackend implements IIDEBackend {
  readonly scene: ISceneService = new WebSceneService();
  readonly viewport: IViewportService;
  readonly jobs: IJobService = new WebJobService();
  readonly files: IFileService;
  readonly timeline: ITimelineService;

  constructor(renderMode: IDERenderMode = 'draft', projectId = '') {
    this.viewport = new WebViewportService(renderMode);
    this.files = new WebFileService(projectId);
    this.timeline = new WebTimelineService(projectId, this.files);
  }
}
