import type { BrushTool, HairData, HairPreset, LODSettings } from '@/components/character/hair-fur-model';

export type HairEditorTabId = 'general' | 'style' | 'physics' | 'lod' | 'brush';

export const HAIR_EDITOR_TABS: Array<{ id: HairEditorTabId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'style', label: 'Style' },
  { id: 'physics', label: 'Physics' },
  { id: 'lod', label: 'LOD' },
  { id: 'brush', label: 'Brush' },
];

export const HAIR_BRUSH_ICONS: Record<BrushTool, string> = {
  comb: 'C',
  cut: 'X',
  add: '+',
  length: 'L',
};

export const HAIR_PRESET_LABELS: Record<HairPreset, string> = {
  straight: 'Straight',
  wavy: 'Wavy',
  curly: 'Curly',
  afro: 'Afro',
  fur: 'Fur',
  custom: 'Custom',
};

export const HAIR_BRUSH_LABELS: Record<BrushTool, string> = {
  comb: 'Comb',
  cut: 'Cut',
  add: 'Add',
  length: 'Length',
};

export function exportHairRuntimeData(input: {
  type: 'hair_cards' | 'hair_strands';
  characterId: string;
  hairData: HairData;
  lod?: LODSettings;
}): void {
  const exportData = {
    type: input.type,
    characterId: input.characterId,
    ...input.hairData,
    ...(input.type === 'hair_cards' && input.lod ? { cardCount: input.lod.cardCount } : {}),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${input.characterId}_${input.type === 'hair_cards' ? 'hair_cards' : 'hair_strands'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
