export type ProjectDomain = 'app' | 'game' | 'film';

export type ProjectAssetKind =
  | 'model'
  | 'texture'
  | 'audio'
  | 'video'
  | 'script'
  | 'render'
  | 'document';

export interface ProjectAsset {
  id: string;
  name: string;
  kind: ProjectAssetKind;
  url?: string;
  mimeType?: string;
  version: number;
  tags: string[];
  sourceJobId?: string;
  createdAt: string;
}

export interface ProjectSceneNode {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'group';
  parentId?: string;
  assetId?: string;
}

export interface ProjectScene {
  id: string;
  name: string;
  nodeIds: string[];
}

export interface ProjectShot {
  id: string;
  name: string;
  sceneId?: string;
  startSec: number;
  endSec: number;
  continuityScore?: number;
}

export interface ProjectTimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'fx' | 'subtitle';
}

export interface ProjectTimelineClip {
  id: string;
  trackId: string;
  assetId: string;
  startSec: number;
  durationSec: number;
  inSec?: number;
}

export interface ProjectTimeline {
  durationSec: number;
  tracks: ProjectTimelineTrack[];
  clips: ProjectTimelineClip[];
}

export interface ProjectScript {
  id: string;
  name: string;
  path: string;
  language: string;
  updatedAt: string;
}

export type ProjectJobKind = 'music' | 'voice' | 'model3d' | 'render';
export type ProjectJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ProjectJob {
  id: string;
  kind: ProjectJobKind;
  status: ProjectJobStatus;
  provider?: string;
  prompt?: string;
  progress: number;
  checkStatusUrl?: string;
  error?: string;
  artifactId?: string;
  sourceRoute: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioGovernancePolicy {
  targetLufs: number;
  truePeakDbtp: number;
  stemVersioning: 'none' | 'by-scene' | 'by-shot';
  exportPreset: 'web-preview' | 'master-48k' | 'cinema';
}

export interface ProjectGraphState {
  projectId: string;
  name: string;
  domain: ProjectDomain;
  assets: ProjectAsset[];
  scenes: ProjectScene[];
  sceneNodes: ProjectSceneNode[];
  shots: ProjectShot[];
  timeline: ProjectTimeline;
  scripts: ProjectScript[];
  jobs: ProjectJob[];
  audioPolicy: AudioGovernancePolicy;
}
