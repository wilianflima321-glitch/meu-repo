import type { SceneSerialized } from './types';

export async function saveSceneJsonToFile(json: string, filename: string): Promise<boolean> {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.aethel') ? filename : `${filename}.aethel`;
  anchor.click();

  URL.revokeObjectURL(url);
  return true;
}

export async function loadSceneJsonFromFile(): Promise<SceneSerialized | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.aethel,.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const text = await file.text();
      resolve(JSON.parse(text) as SceneSerialized);
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}
