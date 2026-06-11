export function downloadSaveData(input: {
  data: string;
  filename: string;
}): void {
  const blob = new Blob([input.data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = input.filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function readUploadedSaveFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sav,.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        resolve(await file.text());
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}
