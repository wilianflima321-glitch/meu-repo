import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AudioGovernancePolicy,
  ProjectAsset,
  ProjectGraphState,
  ProjectJob,
  ProjectScene,
  ProjectSceneNode,
  ProjectShot,
  ProjectTimelineClip,
  ProjectTimelineTrack,
} from './types';

const STORAGE_KEY = 'aethel.project-graph.v1';

const defaultAudioPolicy: AudioGovernancePolicy = {
  targetLufs: -14,
  truePeakDbtp: -1,
  stemVersioning: 'by-shot',
  exportPreset: 'web-preview',
};

const initialState: ProjectGraphState = {
  projectId: 'local-project',
  name: 'Unified Project',
  domain: 'app',
  assets: [],
  scenes: [{ id: 'scene-main', name: 'Main Scene', nodeIds: [] }],
  sceneNodes: [],
  shots: [],
  timeline: {
    durationSec: 60,
    tracks: [
      { id: 'track-video-1', name: 'Video 1', type: 'video' },
      { id: 'track-audio-1', name: 'Audio 1', type: 'audio' },
    ],
    clips: [],
  },
  scripts: [],
  jobs: [],
  audioPolicy: defaultAudioPolicy,
};

type ProjectGraphStore = {
  graph: ProjectGraphState;
  selectedEntityId: string | null;
  setProjectMeta: (name: string, domain: ProjectGraphState['domain']) => void;
  selectEntity: (id: string | null) => void;
  upsertAsset: (asset: ProjectAsset) => void;
  upsertManyAssets: (assets: ProjectAsset[]) => void;
  upsertScene: (scene: ProjectScene) => void;
  upsertSceneNode: (node: ProjectSceneNode) => void;
  upsertShot: (shot: ProjectShot) => void;
  upsertTimelineTrack: (track: ProjectTimelineTrack) => void;
  upsertTimelineClip: (clip: ProjectTimelineClip) => void;
  replaceTimeline: (tracks: ProjectTimelineTrack[], clips: ProjectTimelineClip[], durationSec: number) => void;
  upsertJob: (job: ProjectJob) => void;
  removeJob: (jobId: string) => void;
  setAudioPolicy: (patch: Partial<AudioGovernancePolicy>) => void;
  attachArtifactToJob: (jobId: string, artifact: ProjectAsset) => void;
};

function upsertById<T extends { id: string }>(list: T[], entity: T): T[] {
  const index = list.findIndex((item) => item.id === entity.id);
  if (index === -1) {
    return [...list, entity];
  }
  const copy = [...list];
  copy[index] = entity;
  return copy;
}

export const useProjectGraphStore = create<ProjectGraphStore>()(
  persist(
    (set) => ({
      graph: initialState,
      selectedEntityId: null,
      setProjectMeta: (name, domain) =>
        set((state) => ({
          graph: {
            ...state.graph,
            name,
            domain,
          },
        })),
      selectEntity: (id) => set({ selectedEntityId: id }),
      upsertAsset: (asset) =>
        set((state) => ({
          graph: {
            ...state.graph,
            assets: upsertById(state.graph.assets, asset),
          },
        })),
      upsertManyAssets: (assets) =>
        set((state) => ({
          graph: {
            ...state.graph,
            assets: assets.reduce((nextAssets, asset) => upsertById(nextAssets, asset), state.graph.assets),
          },
        })),
      upsertScene: (scene) =>
        set((state) => ({
          graph: {
            ...state.graph,
            scenes: upsertById(state.graph.scenes, scene),
          },
        })),
      upsertSceneNode: (node) =>
        set((state) => ({
          graph: {
            ...state.graph,
            sceneNodes: upsertById(state.graph.sceneNodes, node),
          },
        })),
      upsertShot: (shot) =>
        set((state) => ({
          graph: {
            ...state.graph,
            shots: upsertById(state.graph.shots, shot),
          },
        })),
      upsertTimelineTrack: (track) =>
        set((state) => ({
          graph: {
            ...state.graph,
            timeline: {
              ...state.graph.timeline,
              tracks: upsertById(state.graph.timeline.tracks, track),
            },
          },
        })),
      upsertTimelineClip: (clip) =>
        set((state) => ({
          graph: {
            ...state.graph,
            timeline: {
              ...state.graph.timeline,
              clips: upsertById(state.graph.timeline.clips, clip),
            },
          },
        })),
      replaceTimeline: (tracks, clips, durationSec) =>
        set((state) => ({
          graph: {
            ...state.graph,
            timeline: {
              tracks,
              clips,
              durationSec,
            },
          },
        })),
      upsertJob: (job) =>
        set((state) => ({
          graph: {
            ...state.graph,
            jobs: upsertById(state.graph.jobs, job),
          },
        })),
      removeJob: (jobId) =>
        set((state) => ({
          graph: {
            ...state.graph,
            jobs: state.graph.jobs.filter((job) => job.id !== jobId),
          },
        })),
      setAudioPolicy: (patch) =>
        set((state) => ({
          graph: {
            ...state.graph,
            audioPolicy: {
              ...state.graph.audioPolicy,
              ...patch,
            },
          },
        })),
      attachArtifactToJob: (jobId, artifact) =>
        set((state) => {
          const jobs = state.graph.jobs.map((job) => (job.id === jobId ? { ...job, artifactId: artifact.id } : job));
          const assets = upsertById(state.graph.assets, artifact);
          return {
            graph: {
              ...state.graph,
              jobs,
              assets,
            },
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            get length() {
              return 0;
            },
            clear: () => undefined,
            getItem: () => null,
            key: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          } as Storage;
        }
        return window.localStorage;
      }),
      version: 1,
    }
  )
);
