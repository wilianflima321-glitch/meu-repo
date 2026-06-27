/**
 * ai-soundscape-generator.ts  — Sprint V31
 *
 * Biome-driven, AI-assisted ambient soundscape blending for Aethel Studio.
 *
 * Architecture:
 *   SoundscapeLayer     — a named ambient audio track with biome tags
 *   AISoundscapeGenerator
 *     .setActiveBiomes()  — updates which biomes are dominant this frame
 *     .tick()             — smoothly crossfades layer volumes to match biome weights
 *     .addLayer()         — register a new ambient layer
 *
 * Biome weights are computed by the WorldMemoryBank.matchBiome() centroid search,
 * then fed into this system to produce a live mix. The "AI" component is the
 * embedding-based biome matching — no external API call is needed at runtime.
 *
 * Usage:
 *   const sg = new AISoundscapeGenerator(SpatialAudioSystem.get());
 *   await sg.addLayer({ url: '/audio/ambient/forest-wind.ogg', biomeTags: ['dark-forest'], volume: 0.6 });
 *   await sg.addLayer({ url: '/audio/ambient/city-hum.ogg',    biomeTags: ['cyberpunk-city'], volume: 0.8 });
 *   sg.setActiveBiomes([{ name: 'dark-forest', weight: 0.8 }, { name: 'cyberpunk-city', weight: 0.2 }]);
 *   // call sg.tick() each frame
 */

import { SpatialAudioSystem, type AudioSourceHandle } from './spatial-audio-system';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('ai-soundscape');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SoundscapeLayerDef {
  /** Audio file URL */
  url: string;
  /** Which biomes this layer belongs to (can belong to multiple) */
  biomeTags: string[];
  /** Peak volume when this layer is fully active (0–1). Default 0.7 */
  volume?: number;
  /** Fade speed coefficient — higher = faster crossfade. Default 2.0 */
  fadeSpeed?: number;
}

export interface ActiveBiome {
  name: string;
  /** 0–1 blend weight (all weights should sum to ≤ 1). */
  weight: number;
}

interface ActiveLayer {
  def: SoundscapeLayerDef;
  handle: AudioSourceHandle;
  currentVolume: number;
  targetVolume: number;
  loaded: boolean;
}

// ---------------------------------------------------------------------------
// AISoundscapeGenerator
// ---------------------------------------------------------------------------

export class AISoundscapeGenerator {
  private layers: ActiveLayer[] = [];
  private activeBiomes: ActiveBiome[] = [];
  private isRunning = false;

  constructor(private readonly audioSystem: SpatialAudioSystem) {}

  // ── Layer Registration ────────────────────────────────────────────────────

  async addLayer(def: SoundscapeLayerDef): Promise<void> {
    const handle = await this.audioSystem.createSource(def.url, {
      loop: true,
      volume: 0, // start silent, faded in by tick()
    });
    const layer: ActiveLayer = {
      def,
      handle,
      currentVolume: 0,
      targetVolume: 0,
      loaded: true,
    };
    this.layers.push(layer);
    log.info('Soundscape layer registered', { url: def.url, biomes: def.biomeTags });
  }

  removeLayer(url: string): void {
    const idx = this.layers.findIndex((l) => l.def.url === url);
    if (idx === -1) return;
    const [removed] = this.layers.splice(idx, 1);
    removed.handle.dispose();
  }

  // ── Biome Blending ────────────────────────────────────────────────────────

  /**
   * Update the active biome blend. Call this whenever the player moves to
   * a new region or the WorldMemoryBank biome match changes.
   */
  setActiveBiomes(biomes: ActiveBiome[]): void {
    this.activeBiomes = biomes;
    this.recalculateTargets();
  }

  private recalculateTargets(): void {
    // Build a lookup from biome name to blend weight
    const biomeWeightMap = new Map<string, number>(
      this.activeBiomes.map((b) => [b.name, b.weight]),
    );

    for (const layer of this.layers) {
      // Layer volume = max weight of any matching biome × layer peak volume
      let maxWeight = 0;
      for (const tag of layer.def.biomeTags) {
        const w = biomeWeightMap.get(tag) ?? 0;
        if (w > maxWeight) maxWeight = w;
      }
      layer.targetVolume = maxWeight * (layer.def.volume ?? 0.7);
    }
  }

  // ── Playback Control ──────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    // Kick off all layers (they start silent)
    await Promise.all(
      this.layers.filter((l) => l.loaded).map((l) => l.handle.play()),
    );
    log.info('Soundscape started', { layers: this.layers.length });
  }

  stop(): void {
    this.isRunning = false;
    this.layers.forEach((l) => l.handle.pause());
    log.info('Soundscape stopped');
  }

  /**
   * Call every frame (or on a low-frequency interval like 100ms).
   * @param dt Elapsed seconds since last call.
   */
  tick(dt: number): void {
    if (!this.isRunning) return;

    for (const layer of this.layers) {
      const diff = layer.targetVolume - layer.currentVolume;
      if (Math.abs(diff) < 0.001) {
        layer.currentVolume = layer.targetVolume;
      } else {
        // Smooth exponential approach
        const fadeSpeed = layer.def.fadeSpeed ?? 2.0;
        layer.currentVolume += diff * Math.min(1, fadeSpeed * dt);
      }
      layer.handle.setVolume(layer.currentVolume);
    }
  }

  // ── Preset Helpers ────────────────────────────────────────────────────────

  /**
   * Convenience method: blends to a single biome at full weight.
   * Fades all other layers out.
   */
  transitionToBiome(biomeName: string, transitionDuration = 2): void {
    this.setActiveBiomes([{ name: biomeName, weight: 1.0 }]);
    // Adjust fade speeds to match desired transition duration
    for (const layer of this.layers) {
      layer.def.fadeSpeed = 1 / transitionDuration;
    }
  }

  /**
   * Generate a random ambient variation within the active biome mix
   * by micro-jittering layer volumes. Prevents repetitive static blends.
   */
  applyVariation(intensity = 0.1): void {
    for (const layer of this.layers) {
      if (layer.targetVolume > 0) {
        const jitter = (Math.random() * 2 - 1) * intensity;
        const clamped = Math.max(0, Math.min(1, layer.targetVolume + jitter));
        layer.targetVolume = clamped;
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  dispose(): void {
    this.stop();
    this.layers.forEach((l) => l.handle.dispose());
    this.layers = [];
  }
}
