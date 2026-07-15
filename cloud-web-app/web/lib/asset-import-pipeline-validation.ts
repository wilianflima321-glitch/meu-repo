import { getAssetType, getSupportedFormats } from './asset-import-pipeline-contracts';

export function validateImportFiles(files: File[]): Array<{ file: File; valid: boolean; error?: string }> {
  return files.map((file) => {
    const type = getAssetType(file.name);

    if (!type) {
      return { file, valid: false, error: 'Unsupported file format' };
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return { file, valid: false, error: 'File too large (max 500MB)' };
    }

    return { file, valid: true };
  });
}

export function getImportStatistics(): { supportedFormats: number; totalFormats: string[] } {
  const totalFormats = getSupportedFormats();
  return {
    supportedFormats: totalFormats.length,
    totalFormats,
  };
}
