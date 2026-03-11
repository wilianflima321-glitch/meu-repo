'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RenderQueue, type RenderJob, type RenderJobStatus } from './RenderProgress';
import { useProjectGraphStore } from '@/lib/project-graph/store';
import type { ProjectAsset, ProjectDomain, ProjectGraphState, ProjectJob } from '@/lib/project-graph/types';
import type { MediaAsset, MediaKind, MediaProject } from '@/components/media/media-studio-core';
import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';

const MediaStudio = dynamic(() => import('@/components/media/MediaStudio'), { ssr: false });

type RuntimeMode = 'interactive' | 'render';
type CenterPanel = 'scene' | 'timeline' | 'preview';
type RightPanel = 'jobs' | 'audio-policy' | 'inspector';

const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = window.localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function mapStatus(status: ProjectJob['status']): RenderJobStatus {
  if (status === 'queued') return 'queued';
  if (status === 'processing') return 'rendering';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'failed';
}

function buildPreviewHtml(name: string, runtimeMode: RuntimeMode, assetCount: number, jobCount: number, clipCount: number) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${name}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "IBM Plex Sans", Inter, system-ui, sans-serif;
      }
      body {
        margin: 0;
        padding: 24px;
        background: linear-gradient(180deg, #0b0d12 0%, #11141c 100%);
        color: #e2e8f0;
      }
      .shell {
        max-width: 880px;
        margin: 0 auto;
        border: 1px solid #243042;
        border-radius: 20px;
        overflow: hidden;
        background: rgba(13, 18, 28, 0.9);
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
      }
      .hero {
        padding: 28px;
        border-bottom: 1px solid #243042;
        background: radial-gradient(circle at top right, rgba(14, 165, 233, 0.2), transparent 34%);
      }
      .eyebrow {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        padding: 6px 10px;
        border: 1px solid #26405f;
        border-radius: 999px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #7dd3fc;
        background: rgba(14, 165, 233, 0.08);
      }
      h1 {
        margin: 16px 0 10px;
        font-size: 30px;
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #94a3b8;
        font-size: 15px;
        line-height: 1.6;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        padding: 24px;
      }
      .card {
        padding: 18px;
        border: 1px solid #243042;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.8);
      }
      .label {
        margin-bottom: 8px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
      }
      .value {
        font-size: 30px;
        font-weight: 700;
      }
      @media (max-width: 760px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <div class="eyebrow">Project Graph Runtime - ${runtimeMode}</div>
        <h1>${name}</h1>
        <p>This preview reflects the canonical project graph instead of a disconnected demo surface. Assets, jobs and timeline state share one workbench model.</p>
      </section>
      <section class="grid">
        <div class="card">
          <div class="label">Assets</div>
          <div class="value">${assetCount}</div>
        </div>
        <div class="card">
          <div class="label">Jobs</div>
          <div class="value">${jobCount}</div>
        </div>
        <div class="card">
          <div class="label">Timeline Clips</div>
          <div class="value">${clipCount}</div>
        </div>
      </section>
    </div>
  </body>
</html>`;
}

function inferMediaKindFromAsset(asset: ProjectAsset): MediaKind | null {
  if (asset.kind === 'audio') return 'audio';
  if (asset.kind === 'video') return 'video';
  if (asset.mimeType?.startsWith('image/')) return 'image';
  if (asset.kind === 'texture') return 'image';
  if (asset.kind === 'render' && asset.mimeType?.startsWith('video/')) return 'video';
  if (asset.kind === 'render' && asset.mimeType?.startsWith('image/')) return 'image';
  return null;
}

function mapGraphToMediaProject(
  projectId: string,
  name: string,
  assets: ProjectAsset[],
  timeline: ProjectGraphState['timeline']
): MediaProject {
  const mediaAssets: MediaAsset[] = assets
    .map((asset) => {
      const kind = inferMediaKindFromAsset(asset);
      if (!kind || !asset.url) return null;
      return {
        id: asset.id,
        name: asset.name,
        kind,
        src: asset.url,
      };
    })
    .filter((asset): asset is MediaAsset => Boolean(asset));

  return {
    id: `media-${projectId}`,
    name,
    assets: mediaAssets,
    tracks: timeline.tracks.map((track, index) => ({
      id: track.id,
      name: track.name,
      type: track.type === 'subtitle' || track.type === 'fx' ? 'video' : track.type,
      muted: false,
      locked: false,
      height: 60 + (index === 0 ? 0 : 0),
    })),
    clips: timeline.clips
      .map((clip) => {
        const asset = mediaAssets.find((item) => item.id === clip.assetId);
        const trackIndex = timeline.tracks.findIndex((track) => track.id === clip.trackId);
        if (!asset || trackIndex === -1) return null;
        return {
          id: clip.id,
          name: asset.name,
          src: asset.src,
          startTime: clip.startSec,
          duration: clip.durationSec,
          inPoint: clip.inSec ?? 0,
          outPoint: (clip.inSec ?? 0) + clip.durationSec,
          trackIndex,
          type: asset.kind,
        };
      })
      .filter((clip): clip is MediaProject['clips'][number] => Boolean(clip)),
    duration: Math.max(30, timeline.durationSec),
  };
}

function mapMediaKindToProjectKind(kind: MediaKind): ProjectAsset['kind'] {
  if (kind === 'audio') return 'audio';
  if (kind === 'video') return 'video';
  return 'texture';
}

type DashboardCreationWorkbenchProps = {
  initialDomain?: ProjectDomain;
  surfaceLabel?: string;
};

export default function DashboardCreationWorkbench({
  initialDomain = 'app',
  surfaceLabel = 'Unified Creation Workbench',
}: DashboardCreationWorkbenchProps) {
  const graph = useProjectGraphStore((s) => s.graph);
  const selectedEntityId = useProjectGraphStore((s) => s.selectedEntityId);
  const selectEntity = useProjectGraphStore((s) => s.selectEntity);
  const setProjectMeta = useProjectGraphStore((s) => s.setProjectMeta);
  const upsertManyAssets = useProjectGraphStore((s) => s.upsertManyAssets);
  const upsertJob = useProjectGraphStore((s) => s.upsertJob);
  const removeJob = useProjectGraphStore((s) => s.removeJob);
  const upsertTimelineClip = useProjectGraphStore((s) => s.upsertTimelineClip);
  const replaceTimeline = useProjectGraphStore((s) => s.replaceTimeline);
  const attachArtifactToJob = useProjectGraphStore((s) => s.attachArtifactToJob);
  const setAudioPolicy = useProjectGraphStore((s) => s.setAudioPolicy);

  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('interactive');
  const [centerPanel, setCenterPanel] = useState<CenterPanel>('scene');
  const [rightPanel, setRightPanel] = useState<RightPanel>('jobs');
  const [musicPrompt, setMusicPrompt] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [modelPrompt, setModelPrompt] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextName =
      initialDomain === 'game'
        ? 'Game Creation Project'
        : initialDomain === 'film'
          ? 'Film Creation Project'
          : 'Unified Project';
    if (graph.domain !== initialDomain || graph.name !== nextName) {
      setProjectMeta(nextName, initialDomain);
    }
  }, [graph.domain, graph.name, initialDomain, setProjectMeta]);

  const selectedAsset = useMemo(
    () => graph.assets.find((asset) => asset.id === selectedEntityId) || null,
    [graph.assets, selectedEntityId]
  );
  const selectedJob = useMemo(
    () => graph.jobs.find((job) => job.id === selectedEntityId) || null,
    [graph.jobs, selectedEntityId]
  );
  const selectedClip = useMemo(
    () => graph.timeline.clips.find((clip) => clip.id === selectedEntityId) || null,
    [graph.timeline.clips, selectedEntityId]
  );
  const recentAssets = useMemo(() => graph.assets.slice(-8).reverse(), [graph.assets]);
  const recentJobs = useMemo(() => graph.jobs.slice(-6).reverse(), [graph.jobs]);

  const queueJobs = useMemo<RenderJob[]>(
    () =>
      graph.jobs.map((job) => ({
        id: job.id,
        name: `${job.kind} - ${job.provider || 'auto'}`,
        type: job.kind === 'model3d' ? 'image' : 'sequence',
        status: mapStatus(job.status),
        progress: job.progress,
        currentFrame: Math.round(job.progress),
        totalFrames: 100,
        startTime: Date.parse(job.createdAt),
        resolution: { width: 1920, height: 1080 },
        samples: 64,
        engine: 'workbench',
        error: job.error,
        output: job.artifactId ? graph.assets.find((a) => a.id === job.artifactId)?.url : undefined,
      })),
    [graph.assets, graph.jobs]
  );

  const previewHtml = useMemo(
    () => buildPreviewHtml(graph.name, runtimeMode, graph.assets.length, graph.jobs.length, graph.timeline.clips.length),
    [graph.assets.length, graph.jobs.length, graph.name, graph.timeline.clips.length, runtimeMode]
  );

  const mediaProject = useMemo(
    () => mapGraphToMediaProject(graph.projectId, graph.name, graph.assets, graph.timeline),
    [graph.assets, graph.name, graph.projectId, graph.timeline]
  );

  const handleMediaProjectChange = useCallback((nextProject: MediaProject) => {
    const nextAssets: ProjectAsset[] = nextProject.assets.map((asset) => {
      const existingAsset = graph.assets.find((item) => item.id === asset.id);
      return {
        id: asset.id,
        name: asset.name,
        kind: existingAsset?.kind || mapMediaKindToProjectKind(asset.kind),
        url: asset.src,
        mimeType:
          existingAsset?.mimeType ||
          (asset.kind === 'audio'
            ? 'audio/mpeg'
            : asset.kind === 'video'
              ? 'video/mp4'
              : 'image/png'),
        version: existingAsset?.version || 1,
        tags: existingAsset?.tags || ['media-studio'],
        sourceJobId: existingAsset?.sourceJobId,
        createdAt: existingAsset?.createdAt || new Date().toISOString(),
      };
    });

    const nextTracks = nextProject.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      type: track.type,
    }));

    const nextClips = nextProject.clips.map((clip) => {
      const linkedAsset = nextAssets.find((asset) => asset.url === clip.src) || nextAssets.find((asset) => asset.name === clip.name);
      const trackId = nextTracks[clip.trackIndex]?.id || nextTracks[0]?.id || 'track-video-1';
      return {
        id: clip.id,
        trackId,
        assetId: linkedAsset?.id || clip.id,
        startSec: clip.startTime,
        durationSec: clip.duration,
        inSec: clip.inPoint,
      };
    });

    upsertManyAssets(nextAssets);
    replaceTimeline(nextTracks, nextClips, Math.max(nextProject.duration, ...nextClips.map((clip) => clip.startSec + clip.durationSec), 30));
  }, [graph.assets, replaceTimeline, upsertManyAssets]);

  const importAsset = useCallback(
    (asset: ProjectAsset) => {
      const targetTrackType = asset.kind === 'audio' ? 'audio' : asset.kind === 'video' ? 'video' : null;
      if (!targetTrackType) return;
      const trackId =
        graph.timeline.tracks.find((track) => track.type === targetTrackType)?.id ||
        (targetTrackType === 'audio' ? 'track-audio-1' : 'track-video-1');
      const startSec = graph.timeline.clips.reduce((maxStart, clip) => Math.max(maxStart, clip.startSec + clip.durationSec), 0);
      upsertTimelineClip({
        id: makeId('clip'),
        trackId,
        assetId: asset.id,
        startSec,
        durationSec: asset.kind === 'audio' ? 8 : 6,
        inSec: 0,
      });
      selectEntity(asset.id);
      setCenterPanel('timeline');
    },
    [graph.timeline.clips, graph.timeline.tracks, selectEntity, upsertTimelineClip]
  );

  const createAsset = useCallback(
    (job: ProjectJob, url: string, kind: ProjectAsset['kind'], mimeType: string) => {
      const asset: ProjectAsset = {
        id: makeId('asset'),
        name: `${job.kind}-${new Date().toLocaleTimeString()}`,
        kind,
        url,
        mimeType,
        version: 1,
        tags: ['ai-generated', job.kind],
        sourceJobId: job.id,
        createdAt: new Date().toISOString(),
      };
      attachArtifactToJob(job.id, asset);
      importAsset(asset);
    },
    [attachArtifactToJob, importAsset]
  );

  const startAsyncJob = useCallback(
    async (kind: ProjectJob['kind'], route: string, body: Record<string, unknown>, prompt: string) => {
      const id = makeId(`job_${kind}`);
      const now = new Date().toISOString();
      upsertJob({ id, kind, status: 'queued', prompt, progress: 0, sourceRoute: route, createdAt: now, updatedAt: now });
      const response = await fetch(route, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.task?.id) throw new Error(payload?.error || `${kind} start failed`);
      upsertJob({
        id,
        kind,
        status: 'processing',
        provider: payload.provider,
        prompt,
        progress: 5,
        checkStatusUrl: payload.task.checkStatusUrl,
        sourceRoute: route,
        createdAt: now,
        updatedAt: new Date().toISOString(),
      });
    },
    [upsertJob]
  );

  const generateMusic = useCallback(
    async () =>
      startAsyncJob(
        'music',
        '/api/ai/music/generate',
        { prompt: musicPrompt, provider: 'suno', instrumental: true, duration: 45 },
        musicPrompt
      ),
    [musicPrompt, startAsyncJob]
  );

  const generate3D = useCallback(
    async () =>
      startAsyncJob(
        'model3d',
        '/api/ai/3d/generate',
        {
          provider: 'meshy',
          mode: 'text-to-3d',
          prompt: modelPrompt,
          quality: runtimeMode === 'render' ? 'high' : 'draft',
          style: 'realistic',
        },
        modelPrompt
      ),
    [modelPrompt, runtimeMode, startAsyncJob]
  );

  const generateVoice = useCallback(async () => {
    const id = makeId('job_voice');
    const now = new Date().toISOString();
    upsertJob({
      id,
      kind: 'voice',
      status: 'processing',
      prompt: voiceText,
      provider: 'openai',
      progress: 15,
      sourceRoute: '/api/ai/voice/generate',
      createdAt: now,
      updatedAt: now,
    });
    const response = await fetch('/api/ai/voice/generate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text: voiceText, provider: 'openai', format: 'mp3' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.audio?.data) throw new Error(payload?.error || 'voice generation failed');
    createAsset(
      { id, kind: 'voice', status: 'processing', progress: 15, sourceRoute: '/api/ai/voice/generate', createdAt: now, updatedAt: now },
      `data:${payload.audio.mimeType};base64,${payload.audio.data}`,
      'audio',
      payload.audio.mimeType || 'audio/mpeg'
    );
    upsertJob({
      id,
      kind: 'voice',
      status: 'completed',
      provider: payload.provider || 'openai',
      prompt: voiceText,
      progress: 100,
      sourceRoute: '/api/ai/voice/generate',
      createdAt: now,
      updatedAt: new Date().toISOString(),
    });
  }, [createAsset, upsertJob, voiceText]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const processing = graph.jobs.filter((job) => job.status === 'processing' && job.checkStatusUrl);
      for (const job of processing) {
        try {
          const statusUrl = job.checkStatusUrl;
          if (!statusUrl) continue;
          const response = await fetch(statusUrl, { headers: getAuthHeaders() });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload?.error || 'status error');
          if (payload.status === 'completed') {
            if (payload.audioUrl) createAsset(job, payload.audioUrl, 'audio', 'audio/mpeg');
            if (payload.modelUrl) createAsset(job, payload.modelUrl, 'model', 'model/gltf-binary');
            upsertJob({ ...job, status: 'completed', progress: 100, updatedAt: new Date().toISOString() });
          } else if (payload.status === 'failed') {
            upsertJob({ ...job, status: 'failed', error: payload.error || 'provider failed', updatedAt: new Date().toISOString() });
          } else {
            upsertJob({
              ...job,
              status: 'processing',
              progress: Math.max(job.progress, payload.progress || 5),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (pollError) {
          upsertJob({
            ...job,
            status: 'failed',
            error: pollError instanceof Error ? pollError.message : 'polling failed',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [createAsset, graph.jobs, upsertJob]);

  const doAction = async (fn: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice('Operation completed and synced into the project graph.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Operation failed.');
    }
  };

  const retryJob = useCallback(
    async (jobId: string) => {
      const job = graph.jobs.find((item) => item.id === jobId);
      if (!job?.prompt) return;
      if (job.kind === 'music') {
        await startAsyncJob(
          'music',
          '/api/ai/music/generate',
          { prompt: job.prompt, provider: job.provider || 'suno', instrumental: true, duration: 45 },
          job.prompt
        );
        return;
      }
      if (job.kind === 'model3d') {
        await startAsyncJob(
          'model3d',
          '/api/ai/3d/generate',
          {
            provider: job.provider || 'meshy',
            mode: 'text-to-3d',
            prompt: job.prompt,
            quality: runtimeMode === 'render' ? 'high' : 'draft',
            style: 'realistic',
          },
          job.prompt
        );
        return;
      }
      if (job.kind === 'voice') {
        setVoiceText(job.prompt);
        await generateVoice();
      }
    },
    [generateVoice, graph.jobs, runtimeMode, startAsyncJob]
  );

  const downloadAsset = useCallback((asset: ProjectAsset) => {
    if (!asset.url || typeof window === 'undefined') return;
    const anchor = window.document.createElement('a');
    anchor.href = asset.url;
    anchor.download = asset.name;
    anchor.rel = 'noopener';
    anchor.click();
  }, []);

  return (
    <div className="aethel-p-4 h-[calc(100vh-8.5rem)] min-h-[720px]">
      <div className="h-full aethel-card grid grid-cols-[260px,1fr,420px] overflow-hidden border border-slate-800">
        <aside className="border-r border-slate-800 p-3 bg-slate-950/70 overflow-y-auto">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Project Graph</h3>
          <div className="space-y-2 text-xs">
            <button type="button" onClick={() => selectEntity(null)} className="w-full text-left px-2 py-1 rounded bg-slate-900 border border-slate-800">
              Root - {graph.name}
            </button>
            <div className="px-2 py-1 rounded bg-slate-900/40 border border-slate-800">Assets - {graph.assets.length}</div>
            <div className="px-2 py-1 rounded bg-slate-900/40 border border-slate-800">Scenes - {graph.scenes.length}</div>
            <div className="px-2 py-1 rounded bg-slate-900/40 border border-slate-800">Timeline Clips - {graph.timeline.clips.length}</div>
            <div className="px-2 py-1 rounded bg-slate-900/40 border border-slate-800">Jobs - {graph.jobs.length}</div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Recent Assets</div>
            <div className="space-y-2">
              {recentAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => selectEntity(asset.id)}
                  className={`w-full text-left px-2 py-1 rounded border text-xs ${selectedEntityId === asset.id ? 'bg-blue-500/20 border-blue-500/40' : 'bg-slate-900/40 border-slate-800'}`}
                >
                  <div className="truncate">{asset.name}</div>
                  <div className="text-[10px] text-slate-400">{asset.kind} - v{asset.version}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Recent Jobs</div>
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => {
                    selectEntity(job.id);
                    setRightPanel('inspector');
                  }}
                  className={`w-full text-left px-2 py-1 rounded border text-xs ${selectedEntityId === job.id ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-slate-900/40 border-slate-800'}`}
                >
                  <div className="truncate">{job.kind}</div>
                  <div className="text-[10px] text-slate-400">{job.status} - {Math.round(job.progress)}%</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 h-full flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="mr-2 text-[11px] uppercase tracking-wider text-slate-500">{surfaceLabel}</span>
              <button type="button" onClick={() => setCenterPanel('scene')} className={`px-2 py-1 text-xs rounded ${centerPanel === 'scene' ? 'bg-slate-700' : 'text-slate-300'}`}>Scene</button>
              <button type="button" onClick={() => setCenterPanel('timeline')} className={`px-2 py-1 text-xs rounded ${centerPanel === 'timeline' ? 'bg-slate-700' : 'text-slate-300'}`}>Timeline</button>
              <button type="button" onClick={() => setCenterPanel('preview')} className={`px-2 py-1 text-xs rounded ${centerPanel === 'preview' ? 'bg-slate-700' : 'text-slate-300'}`}>Preview</button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRuntimeMode('interactive')} className={`px-2 py-1 text-xs rounded border ${runtimeMode === 'interactive' ? 'bg-blue-600 border-blue-500' : 'border-slate-700'}`}>Interactive</button>
              <button type="button" onClick={() => setRuntimeMode('render')} className={`px-2 py-1 text-xs rounded border ${runtimeMode === 'render' ? 'bg-cyan-600 border-cyan-500' : 'border-slate-700'}`}>Render</button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-950">
            {centerPanel === 'scene' && (
              <CanonicalPreviewSurface
                variant="scene"
                renderMode={runtimeMode === 'render' ? 'cinematic' : 'draft'}
              />
            )}
            {centerPanel === 'timeline' && (
              <MediaStudio
                project={mediaProject}
                onProjectChange={handleMediaProjectChange}
                selectedAssetId={selectedAsset?.id || null}
                onSelectedAssetIdChange={selectEntity}
                selectedClipId={selectedClip?.id || null}
                onSelectedClipIdChange={selectEntity}
              />
            )}
            {centerPanel === 'preview' && (
              <CanonicalPreviewSurface
                variant="runtime"
                title="Project Graph Preview"
                filePath="project-graph.html"
                html={previewHtml}
              />
            )}
          </div>
        </section>

        <aside className="border-l border-slate-800 p-3 bg-slate-950/80 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <button type="button" onClick={() => setRightPanel('jobs')} className={`px-2 py-1 text-xs rounded ${rightPanel === 'jobs' ? 'bg-slate-700' : 'text-slate-300'}`}>AI Jobs</button>
            <button type="button" onClick={() => setRightPanel('audio-policy')} className={`px-2 py-1 text-xs rounded ${rightPanel === 'audio-policy' ? 'bg-slate-700' : 'text-slate-300'}`}>Audio Policy</button>
            <button type="button" onClick={() => setRightPanel('inspector')} className={`px-2 py-1 text-xs rounded ${rightPanel === 'inspector' ? 'bg-slate-700' : 'text-slate-300'}`}>Inspector</button>
          </div>
          {error && <div className="aethel-state aethel-state-error text-xs mb-2">{error}</div>}
          {notice && <div className="aethel-state aethel-state-loading text-xs mb-2">{notice}</div>}

          {rightPanel === 'jobs' && (
            <div className="space-y-3">
              <textarea value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)} placeholder="Prompt de musica..." className="w-full min-h-16 rounded border border-slate-700 bg-slate-950 p-2 text-xs" />
              <button type="button" onClick={() => void doAction(generateMusic)} className="w-full px-3 py-1 rounded bg-cyan-600 text-xs">Gerar Musica</button>
              <textarea value={voiceText} onChange={(e) => setVoiceText(e.target.value)} placeholder="Texto de voz..." className="w-full min-h-16 rounded border border-slate-700 bg-slate-950 p-2 text-xs" />
              <button type="button" onClick={() => void doAction(generateVoice)} className="w-full px-3 py-1 rounded bg-emerald-600 text-xs">Gerar Voz</button>
              <textarea value={modelPrompt} onChange={(e) => setModelPrompt(e.target.value)} placeholder="Prompt 3D..." className="w-full min-h-16 rounded border border-slate-700 bg-slate-950 p-2 text-xs" />
              <button type="button" onClick={() => void doAction(generate3D)} className="w-full px-3 py-1 rounded bg-violet-600 text-xs">Gerar 3D</button>
              <RenderQueue
                jobs={queueJobs}
                onCancel={(jobId) => {
                  const current = graph.jobs.find((job) => job.id === jobId);
                  if (current) upsertJob({ ...current, status: 'cancelled', updatedAt: new Date().toISOString() });
                }}
                onRetry={(jobId) => void doAction(() => retryJob(jobId))}
                onClearCompleted={() => graph.jobs.filter((job) => ['completed', 'failed', 'cancelled'].includes(job.status)).forEach((job) => removeJob(job.id))}
                className="!bg-slate-900/60 !p-3"
              />
              <div className="rounded border border-slate-800 bg-slate-900/40 p-3 text-xs">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Provenance</div>
                <div className="space-y-2">
                  {recentJobs.length === 0 && <div className="text-slate-400">No jobs recorded yet.</div>}
                  {recentJobs.map((job) => (
                    <div key={job.id} className="rounded border border-slate-800 bg-slate-950/70 p-2">
                      <div className="font-medium text-slate-100">{job.kind}</div>
                      <div className="text-slate-400">route: {job.sourceRoute}</div>
                      <div className="text-slate-400">provider: {job.provider || 'auto'}</div>
                      <div className="text-slate-400">status: {job.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rightPanel === 'audio-policy' && (
            <div className="space-y-2 text-xs">
              <label className="block">Target LUFS<input type="number" value={graph.audioPolicy.targetLufs} onChange={(e) => setAudioPolicy({ targetLufs: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-1" /></label>
              <label className="block">True Peak (dBTP)<input type="number" value={graph.audioPolicy.truePeakDbtp} onChange={(e) => setAudioPolicy({ truePeakDbtp: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-1" /></label>
              <label className="block">Stem Versioning<select value={graph.audioPolicy.stemVersioning} onChange={(e) => setAudioPolicy({ stemVersioning: e.target.value as 'none' | 'by-scene' | 'by-shot' })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-1"><option value="none">None</option><option value="by-scene">By Scene</option><option value="by-shot">By Shot</option></select></label>
              <label className="block">Export Preset<select value={graph.audioPolicy.exportPreset} onChange={(e) => setAudioPolicy({ exportPreset: e.target.value as 'web-preview' | 'master-48k' | 'cinema' })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-1"><option value="web-preview">Web Preview</option><option value="master-48k">Master 48k</option><option value="cinema">Cinema</option></select></label>
            </div>
          )}

          {rightPanel === 'inspector' && (
            <div className="space-y-3">
              {selectedAsset && (
                <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Selected Asset</div>
                  <div className="font-medium text-slate-100">{selectedAsset.name}</div>
                  <div className="text-slate-400">kind: {selectedAsset.kind}</div>
                  <div className="text-slate-400">version: {selectedAsset.version}</div>
                  <div className="mt-3 flex gap-2">
                    {(selectedAsset.kind === 'audio' || selectedAsset.kind === 'video') && (
                      <button type="button" onClick={() => importAsset(selectedAsset)} className="rounded bg-blue-600 px-2 py-1 text-[11px]">
                        Import to Timeline
                      </button>
                    )}
                    {selectedAsset.url && (
                      <button type="button" onClick={() => downloadAsset(selectedAsset)} className="rounded border border-slate-700 px-2 py-1 text-[11px]">
                        Download
                      </button>
                    )}
                  </div>
                </div>
              )}
              {selectedJob && (
                <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Selected Job</div>
                  <div className="font-medium text-slate-100">{selectedJob.kind}</div>
                  <div className="text-slate-400">status: {selectedJob.status}</div>
                  <div className="text-slate-400">provider: {selectedJob.provider || 'auto'}</div>
                  <div className="text-slate-400">route: {selectedJob.sourceRoute}</div>
                  {selectedJob.prompt && <div className="mt-2 text-slate-300">{selectedJob.prompt}</div>}
                </div>
              )}
              {selectedClip && (
                <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Selected Clip</div>
                  <div className="font-medium text-slate-100">{selectedClip.id}</div>
                  <div className="text-slate-400">assetId: {selectedClip.assetId}</div>
                  <div className="text-slate-400">startSec: {selectedClip.startSec}</div>
                  <div className="text-slate-400">durationSec: {selectedClip.durationSec}</div>
                </div>
              )}
              {!selectedAsset && !selectedJob && !selectedClip && (
                <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
                  Select an asset, job or clip to inspect linked project graph data.
                </div>
              )}
              <pre className="text-xs rounded border border-slate-800 bg-slate-950 p-2 overflow-auto max-h-[42vh]">
                {JSON.stringify(selectedEntityId ? (selectedAsset || selectedJob || selectedClip || null) : null, null, 2)}
              </pre>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
