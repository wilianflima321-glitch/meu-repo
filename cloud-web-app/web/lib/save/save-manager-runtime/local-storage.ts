import type { SaveMetadata } from './types';

export function loadSaveIndex(storageKey: string): SaveMetadata[] {
  if (typeof localStorage === 'undefined') return [];

  const indexData = localStorage.getItem(`${storageKey}_index`);
  if (!indexData) return [];

  return JSON.parse(indexData) as SaveMetadata[];
}

export function saveSaveIndex(storageKey: string, metadata: Array<SaveMetadata | undefined>): void {
  if (typeof localStorage === 'undefined') return;

  const index = metadata.filter(Boolean);
  localStorage.setItem(`${storageKey}_index`, JSON.stringify(index));
}

export function writeSaveSlot(storageKey: string, slotIndex: number, data: string): void {
  if (typeof localStorage === 'undefined') return;

  localStorage.setItem(`${storageKey}_${slotIndex}`, data);
}

export function readSaveSlot(storageKey: string, slotIndex: number): string | null {
  if (typeof localStorage === 'undefined') return null;

  return localStorage.getItem(`${storageKey}_${slotIndex}`);
}

export function deleteSaveSlot(storageKey: string, slotIndex: number): void {
  if (typeof localStorage === 'undefined') return;

  localStorage.removeItem(`${storageKey}_${slotIndex}`);
}
