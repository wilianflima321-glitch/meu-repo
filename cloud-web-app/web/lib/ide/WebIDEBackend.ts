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
} from '../../../packages/ide-ui/backend/types';

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

export class WebIDEBackend implements IIDEBackend {
  readonly scene: ISceneService = new WebSceneService();
  readonly viewport: IViewportService;
  readonly jobs: IJobService = new WebJobService();
  readonly files: IFileService;

  constructor(renderMode: IDERenderMode = 'draft', projectId = '') {
    this.viewport = new WebViewportService(renderMode);
    this.files = new WebFileService(projectId);
  }
}
