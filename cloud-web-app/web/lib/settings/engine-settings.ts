import { DEFAULT_SETTINGS } from '@/components/settings/SettingsPageData.defaults';

const STORAGE_KEY = 'settings';

type SettingsRecord = Record<string, unknown>;

function readStoredSettings(): SettingsRecord {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as SettingsRecord) : {};
  } catch {
    return {};
  }
}

export function getEngineSetting<T>(key: string, fallback: T): T {
  const stored = readStoredSettings();
  if (key in stored) {
    return stored[key] as T;
  }
  const defaults = DEFAULT_SETTINGS as SettingsRecord;
  if (key in defaults) {
    return defaults[key] as T;
  }
  return fallback;
}

export function getSimulationTimeDilation(): number {
  const value = getEngineSetting<number>('simulation.timeDilation', 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getSimulationTargetFps(): number {
  const value = getEngineSetting<number>('simulation.targetPhysicsFPS', 60);
  return Number.isFinite(value) && value > 0 ? value : 60;
}

export function isSimulationGodMode(): boolean {
  return getEngineSetting<boolean>('simulation.godMode', false);
}

export function isNaniteViewportEnabled(): boolean {
  return getEngineSetting<boolean>('engine.nanite.viewport', false);
}

export function getPhysicsGravity(): number {
  const value = getEngineSetting<number>('engine.physics.gravity', -9.81);
  return Number.isFinite(value) ? value : -9.81;
}

export function isPhysicsEnabled(): boolean {
  return getEngineSetting<boolean>('engine.physics.enabled', true);
}

export function getControlBinding(action: string, fallback: string): string {
  return getEngineSetting<string>(`controls.action.${action}`, fallback);
}
