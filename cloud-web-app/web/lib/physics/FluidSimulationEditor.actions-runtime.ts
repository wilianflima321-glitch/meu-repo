import type { FluidParams } from '@/lib/physics/fluid-simulation-core';

export async function bakeFluidToMesh(input: {
  meshResolution: number;
  log: { info: (...args: unknown[]) => void };
}): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  input.log.info('Baking fluid to mesh with resolution:', input.meshResolution);
}

export function exportFluidConfiguration(input: {
  params: FluidParams;
  volumeId?: string;
  onExport?: (data: { params: FluidParams; meshData?: ArrayBuffer }) => void;
}): void {
  const exportData = {
    params: input.params,
    metadata: {
      volumeId: input.volumeId,
      timestamp: Date.now(),
      version: '1.0',
    },
  };

  input.onExport?.({ params: input.params });

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fluid_${input.volumeId || 'config'}_${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importFluidConfiguration(input: {
  onParams: (params: Partial<FluidParams>) => void;
  onError: (error: unknown) => void;
}): void {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      try {
        const data = JSON.parse(readerEvent.target?.result as string);
        if (data.params) {
          input.onParams(data.params);
        }
      } catch (error) {
        input.onError(error);
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}
