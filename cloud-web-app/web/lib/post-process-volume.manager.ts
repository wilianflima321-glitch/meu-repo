// @aethel-heavy-async-boundary

import { logger } from '@/lib/observability/logger';
import { THREE } from './pbr-three-namespace';
import type { Box3, Color } from '@/lib/three';
import type { PostProcessSettings, PostProcessVolume } from './post-process-volume.contracts';
import { DEFAULT_POST_PROCESS_SETTINGS, POST_PROCESS_PRESETS } from './post-process-volume.presets';

export class PostProcessVolumeManager {
  private volumes: Map<string, PostProcessVolume> = new Map();
  private globalSettings: PostProcessSettings;
  private currentSettings: PostProcessSettings;
  private viewerPosition = new THREE.Vector3();

  private onSettingsChange: ((settings: PostProcessSettings) => void)[] = [];

  constructor() {
    this.globalSettings = { ...DEFAULT_POST_PROCESS_SETTINGS };
    this.currentSettings = { ...DEFAULT_POST_PROCESS_SETTINGS };
  }

  // ============================================================================
  // VOLUME MANAGEMENT
  // ============================================================================

  addVolume(
    id: string,
    settings: Partial<PostProcessSettings>,
    options: {
      bounds?: Box3;
      priority?: number;
      weight?: number;
      blendDistance?: number;
    } = {}
  ): PostProcessVolume {
    const volume: PostProcessVolume = {
      id,
      bounds: options.bounds || null,
      priority: options.priority ?? 0,
      weight: options.weight ?? 1,
      blendDistance: options.blendDistance ?? 5,
      settings,
      enabled: true,
    };

    this.volumes.set(id, volume);
    this.updateSettings();

    return volume;
  }

  addGlobalVolume(id: string, settings: Partial<PostProcessSettings>, priority: number = 0): PostProcessVolume {
    return this.addVolume(id, settings, { priority, bounds: undefined });
  }

  addLocalVolume(
    id: string,
    bounds: Box3,
    settings: Partial<PostProcessSettings>,
    blendDistance: number = 5,
    priority: number = 10
  ): PostProcessVolume {
    return this.addVolume(id, settings, { bounds, blendDistance, priority });
  }

  removeVolume(id: string): void {
    this.volumes.delete(id);
    this.updateSettings();
  }

  setVolumeEnabled(id: string, enabled: boolean): void {
    const volume = this.volumes.get(id);
    if (volume) {
      volume.enabled = enabled;
      this.updateSettings();
    }
  }

  setVolumeWeight(id: string, weight: number): void {
    const volume = this.volumes.get(id);
    if (volume) {
      volume.weight = weight;
      this.updateSettings();
    }
  }

  updateVolumeSettings(id: string, settings: Partial<PostProcessSettings>): void {
    const volume = this.volumes.get(id);
    if (volume) {
      Object.assign(volume.settings, settings);
      this.updateSettings();
    }
  }

  // ============================================================================
  // PRESETS
  // ============================================================================

  applyPreset(presetName: string, volumeId?: string): void {
    const preset = POST_PROCESS_PRESETS[presetName];
    if (!preset) {
      logger.warn(`Unknown preset: ${presetName}`);
      return;
    }

    if (volumeId) {
      this.updateVolumeSettings(volumeId, preset);
    } else {
      // Apply to global
      Object.assign(this.globalSettings, preset);
      this.updateSettings();
    }
  }

  // ============================================================================
  // UPDATE
  // ============================================================================

  update(viewerPosition: Vector3): void {
    this.viewerPosition.copy(viewerPosition);
    this.updateSettings();
  }

  private updateSettings(): void {
    // Start with global settings
    const result = this.cloneSettings(this.globalSettings);

    // Collect and sort active volumes
    const activeVolumes: { volume: PostProcessVolume; influence: number }[] = [];

    for (const volume of this.volumes.values()) {
      if (!volume.enabled) continue;

      const influence = this.calculateVolumeInfluence(volume);
      if (influence > 0) {
        activeVolumes.push({ volume, influence });
      }
    }

    // Sort by priority
    activeVolumes.sort((a, b) => a.volume.priority - b.volume.priority);

    // Blend settings
    for (const { volume, influence } of activeVolumes) {
      const blendWeight = influence * volume.weight;
      this.blendSettings(result, volume.settings, blendWeight);
    }

    // Check if settings changed
    if (!this.settingsEqual(this.currentSettings, result)) {
      this.currentSettings = result;
      this.notifySettingsChange();
    }
  }

  private calculateVolumeInfluence(volume: PostProcessVolume): number {
    // Global volumes always have full influence
    if (!volume.bounds) return 1;

    // Check if viewer is inside bounds
    if (volume.bounds.containsPoint(this.viewerPosition)) {
      return 1;
    }

    // Calculate distance to bounds
    const closestPoint = volume.bounds.clampPoint(this.viewerPosition, new THREE.Vector3());
    const distance = this.viewerPosition.distanceTo(closestPoint);

    if (distance >= volume.blendDistance) return 0;

    // Smooth blend based on distance
    return 1 - (distance / volume.blendDistance);
  }

  private blendSettings(
    target: PostProcessSettings,
    source: Partial<PostProcessSettings>,
    weight: number
  ): void {
    for (const key of Object.keys(source) as (keyof PostProcessSettings)[]) {
      const sourceValue = source[key];
      if (sourceValue === undefined) continue;

      const targetValue = target[key];

      if (typeof sourceValue === 'boolean') {
        // Boolean: use source if weight > 0.5
        (target as any)[key] = weight > 0.5 ? sourceValue : targetValue;
      } else if (typeof sourceValue === 'number') {
        // Number: lerp
        (target as any)[key] = THREE.MathUtils.lerp(targetValue as number, sourceValue, weight);
      } else if (sourceValue instanceof Color) {
        // Color: lerp
        const targetColor = (targetValue as Color).clone();
        (target as any)[key] = targetColor.lerp(sourceValue, weight);
      } else if (typeof sourceValue === 'string') {
        // String (enum): use source if weight > 0.5
        (target as any)[key] = weight > 0.5 ? sourceValue : targetValue;
      }
    }
  }

  private cloneSettings(settings: PostProcessSettings): PostProcessSettings {
    return {
      ...settings,
      shadows: settings.shadows.clone(),
      midtones: settings.midtones.clone(),
      highlights: settings.highlights.clone(),
      vignetteColor: settings.vignetteColor.clone(),
      fogColor: settings.fogColor.clone(),
    };
  }

  private settingsEqual(a: PostProcessSettings, b: PostProcessSettings): boolean {
    for (const key of Object.keys(a) as (keyof PostProcessSettings)[]) {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal instanceof Color) {
        if (!aVal.equals(bVal as Color)) return false;
      } else if (aVal !== bVal) {
        return false;
      }
    }
    return true;
  }

  // ============================================================================
  // EVENTS
  // ============================================================================

  onSettingsChanged(callback: (settings: PostProcessSettings) => void): () => void {
    this.onSettingsChange.push(callback);
    return () => {
      const idx = this.onSettingsChange.indexOf(callback);
      if (idx !== -1) this.onSettingsChange.splice(idx, 1);
    };
  }

  private notifySettingsChange(): void {
    for (const callback of this.onSettingsChange) {
      callback(this.currentSettings);
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getCurrentSettings(): PostProcessSettings {
    return this.cloneSettings(this.currentSettings);
  }

  getGlobalSettings(): PostProcessSettings {
    return this.cloneSettings(this.globalSettings);
  }

  setGlobalSettings(settings: Partial<PostProcessSettings>): void {
    Object.assign(this.globalSettings, settings);
    this.updateSettings();
  }

  getVolume(id: string): PostProcessVolume | undefined {
    return this.volumes.get(id);
  }

  getAllVolumes(): PostProcessVolume[] {
    return Array.from(this.volumes.values());
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    this.volumes.clear();
    this.onSettingsChange = [];
  }
}
