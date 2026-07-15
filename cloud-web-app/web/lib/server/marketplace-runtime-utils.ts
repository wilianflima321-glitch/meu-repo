import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import type { ExtensionManifest } from './marketplace-runtime.contracts';

export async function downloadMarketplaceFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });

  const fileStream = createWriteStream(destPath);
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(Buffer.from(value));
  }

  fileStream.end();

  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', () => resolve());
    fileStream.on('error', reject);
  });
}

export async function extractMarketplaceVsix(vsixPath: string, destPath: string): Promise<void> {
  type AdmZipConstructor = new (input: string) => {
    getEntries(): Array<{
      entryName: string;
      isDirectory: boolean;
      getData(): Buffer;
    }>;
  };
  const AdmZipModule = (await import('adm-zip')) as unknown as { default?: AdmZipConstructor } & AdmZipConstructor;
  const AdmZip = AdmZipModule.default || AdmZipModule;

  const zip = new AdmZip(vsixPath);

  await fs.mkdir(destPath, { recursive: true });

  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('extension/')) {
      const relativePath = entry.entryName.replace('extension/', '');

      if (!relativePath) continue;

      const fullPath = path.join(destPath, relativePath);

      if (entry.isDirectory) {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, entry.getData());
      }
    }
  }
}

export async function loadMarketplaceManifest(extensionPath: string): Promise<ExtensionManifest> {
  const manifestPath = path.join(extensionPath, 'package.json');
  const content = await fs.readFile(manifestPath, 'utf-8');
  return JSON.parse(content);
}

export function parseVsCodeMarketplaceProperties(
  properties: Array<{ key: string; value: string }>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const prop of properties) {
    result[prop.key] = prop.value;
  }
  return result;
}

export function findVsCodeMarketplaceAsset(
  files: Array<{ assetType: string; source: string }> | undefined,
  assetType: string
): string | undefined {
  return files?.find(f => f.assetType === assetType)?.source;
}

export function isNewerMarketplaceVersion(version1: string, version2: string): boolean {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;

    if (v1 > v2) return true;
    if (v1 < v2) return false;
  }

  return false;
}
