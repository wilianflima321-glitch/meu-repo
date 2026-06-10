import type { ControllerProfile } from './types';

const CONTROLLER_PROFILES_STORAGE_KEY = 'aethel_controller_profiles';

export function readCustomControllerProfiles(): ControllerProfile[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const saved = localStorage.getItem(CONTROLLER_PROFILES_STORAGE_KEY);
    return saved ? JSON.parse(saved) as ControllerProfile[] : [];
  } catch {
    return [];
  }
}

export function writeCustomControllerProfiles(profiles: Iterable<ControllerProfile>): void {
  if (typeof localStorage === 'undefined') return;
  const customProfiles = Array.from(profiles).filter((profile) => !profile.id.startsWith('default-'));
  localStorage.setItem(CONTROLLER_PROFILES_STORAGE_KEY, JSON.stringify(customProfiles));
}
