/**
 * Adapters entre o MediaToolkit (Node-friendly) e os engines completos do Theia fork.
 *
 * IMPORTANTE:
 * - Este módulo NÃO importa os engines do Theia diretamente (para não acoplar/buildar fora de src/common).
 * - Você injeta uma instância do engine (vinda do runtime do IDE) e os adapters fazem o “bridge”.
 * - Parte do fluxo de vídeo/áudio depende de APIs de browser (DOM/WebAudio). Em Node, use apenas o MediaToolkit.
 */

import type {
  AudioProjectBasic,
  AudioTrack,
  ImageDocumentBasic,
  ImageLayer,
  VideoProjectBasic,
  VideoTrack,
} from './media-toolkit';

export function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// ============================================================================
// VIDEO
// ============================================================================

export interface TheiaVideoTimelineEngineLike {
  createProject(name: string, settings?: unknown): { timeline: { tracks: Array<{ id: string; type: string }> } };
  importMedia(filePath: string): Promise<{ id: string; duration?: number }>;
  addClip(
    mediaItemId: string,
    trackId: string,
    startFrame: number,
    sourceIn?: number,
    sourceOut?: number
  ): unknown;
}

export interface SyncVideoOptions {
  /**
   * Se true, tenta importar mídia e criar clips na timeline.
   * Requer runtime com DOM (o engine usa canvas/document internamente).
   */
  importAndCreateClips?: boolean;
}

export async function syncVideoProjectToTheia(
  engine: TheiaVideoTimelineEngineLike,
  project: VideoProjectBasic,
  options: SyncVideoOptions = {}
): Promise<unknown> {
  const theiaProject = engine.createProject(project.name, {
    resolution: project.resolution,
    frameRate: project.frameRate,
  });

  if (!options.importAndCreateClips) {
    return theiaProject;
  }

  if (!isBrowserRuntime()) {
    throw new Error('syncVideoProjectToTheia(importAndCreateClips) requer runtime de browser (DOM)');
  }

  const theiaTracks = theiaProject.timeline?.tracks ?? [];
  const pickTrackId = (type: VideoTrack['type']): string | undefined => {
    const found = theiaTracks.find(t => t.type === type);
    return found?.id;
  };

  const mediaByPath = new Map<string, { id: string; duration?: number }>();

  for (const track of project.tracks) {
    const trackId = pickTrackId(track.type);
    if (!trackId) continue;

    for (const clip of track.clips) {
      if (!clip.sourceFile) continue;

      let media = mediaByPath.get(clip.sourceFile);
      if (!media) {
        media = await engine.importMedia(clip.sourceFile);
        mediaByPath.set(clip.sourceFile, media);
      }

      engine.addClip(media.id, trackId, clip.startFrame, clip.sourceIn, clip.sourceOut);
    }
  }

  return theiaProject;
}

// ============================================================================
// IMAGE
// ============================================================================

export interface TheiaImageLayerEngineLike {
  createDocument(
    width: number,
    height: number,
    options?: {
      name?: string;
      resolution?: number;
      colorSpace?: string;
      bitDepth?: number;
      backgroundColor?: unknown;
      transparent?: boolean;
    }
  ): { layers: Array<{ id: string }> };

  addEffect(layerId: string, effectType: string): { id: string };
  updateEffect(layerId: string, effectId: string, parameters: Record<string, unknown>): void;
}

export function syncImageDocumentToTheia(
  engine: TheiaImageLayerEngineLike,
  doc: ImageDocumentBasic
): unknown {
  const theiaDoc = engine.createDocument(doc.width, doc.height, {
    name: doc.name,
    colorSpace: doc.colorSpace,
    bitDepth: doc.bitDepth,
  });

  const firstLayerId = theiaDoc.layers?.[0]?.id;
  if (!firstLayerId) return theiaDoc;

  const flattenEffects = (layers: ImageLayer[]): Array<{ type: string; parameters: Record<string, unknown> }> => {
    const out: Array<{ type: string; parameters: Record<string, unknown> }> = [];
    for (const layer of layers) {
      for (const effect of layer.effects) {
        out.push({ type: effect.type, parameters: effect.parameters });
      }
    }
    return out;
  };

  for (const effect of flattenEffects(doc.layers)) {
    const created = engine.addEffect(firstLayerId, effect.type);
    engine.updateEffect(firstLayerId, created.id, effect.parameters);
  }

  return theiaDoc;
}

// ============================================================================
// AUDIO
// ============================================================================

export interface TheiaAudioProcessingEngineLike {
  createProject(name: string, settings?: unknown): { tracks: Array<{ id: string; inserts?: any[] }> };
}

export function syncAudioProjectToTheia(
  engine: TheiaAudioProcessingEngineLike,
  project: AudioProjectBasic
): unknown {
  const theiaProject = engine.createProject(project.name, {
    sampleRate: project.sampleRate,
    bitDepth: project.bitDepth,
    tempo: project.tempo,
  });

  // Nota: o engine de áudio do Theia trabalha principalmente com buffers e inserts estruturados.
  // Aqui fazemos apenas um “best effort” para copiar a cadeia de efeitos (inserts) por track.
  for (let i = 0; i < project.tracks.length; i++) {
    const toolkitTrack: AudioTrack = project.tracks[i];
    const theiaTrack = theiaProject.tracks?.[i];
    if (!theiaTrack) continue;

    if (!theiaTrack.inserts) theiaTrack.inserts = [];

    for (const effect of toolkitTrack.effects) {
      theiaTrack.inserts.push({
        id: effect.id,
        type: effect.type,
        name: effect.type,
        enabled: effect.enabled,
        mix: effect.mix,
        parameters: Object.entries(effect.parameters).map(([name, value]) => ({
          id: `${effect.id}:${name}`,
          name,
          value,
          defaultValue: value,
          min: -100000,
          max: 100000,
        })),
      });
    }
  }

  return theiaProject;
}
