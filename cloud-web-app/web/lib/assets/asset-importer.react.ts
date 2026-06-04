import { useCallback, useRef, useState } from 'react';

import AssetImporter from './asset-importer';
import type {
  ImportedAsset,
  ImportedAudio,
  ImportedHDRI,
  ImportedModel,
  ImportedTexture,
  ImportOptions,
  ImportProgress,
} from './asset-importer-contracts';

export function useAssetImporter() {
  const importerRef = useRef<AssetImporter>(new AssetImporter());
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Setup progress callback
  importerRef.current.onProgress(setProgress);

  const importModel = useCallback(async (
    source: string | File | ArrayBuffer,
    options?: ImportOptions
  ): Promise<ImportedModel | null> => {
    setIsImporting(true);
    setLastError(null);

    try {
      return await importerRef.current.importModel(source, options);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const importTexture = useCallback(async (
    source: string | File,
    options?: ImportOptions
  ): Promise<ImportedTexture | null> => {
    setIsImporting(true);
    setLastError(null);

    try {
      return await importerRef.current.importTexture(source, options);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const importHDRI = useCallback(async (
    source: string | File
  ): Promise<ImportedHDRI | null> => {
    setIsImporting(true);
    setLastError(null);

    try {
      return await importerRef.current.importHDRI(source);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const importAudio = useCallback(async (
    source: string | File
  ): Promise<ImportedAudio | null> => {
    setIsImporting(true);
    setLastError(null);

    try {
      return await importerRef.current.importAudio(source);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const importFiles = useCallback(async (
    files: FileList | File[]
  ): Promise<ImportedAsset[]> => {
    setIsImporting(true);
    setLastError(null);

    try {
      return await importerRef.current.importFromFiles(files);
    } catch (error) {
      setLastError(error as Error);
      return [];
    } finally {
      setIsImporting(false);
    }
  }, []);

  const openFilePicker = useCallback(async (
    accept?: string
  ): Promise<ImportedAsset[]> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = accept || '.gltf,.glb,.fbx,.obj,.jpg,.png,.hdr,.exr,.mp3,.wav';

      input.onchange = async () => {
        if (input.files && input.files.length > 0) {
          const results = await importFiles(input.files);
          resolve(results);
        } else {
          resolve([]);
        }
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  }, [importFiles]);

  return {
    importModel,
    importTexture,
    importHDRI,
    importAudio,
    importFiles,
    openFilePicker,
    progress,
    isImporting,
    lastError,
    getFromCache: (id: string) => importerRef.current.getFromCache(id),
    clearCache: () => importerRef.current.clearCache(),
    getCacheStats: () => importerRef.current.getCacheStats(),
  };
}
