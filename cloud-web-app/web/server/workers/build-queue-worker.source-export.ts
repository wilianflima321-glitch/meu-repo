import type AdmZip from 'adm-zip';
import { prisma } from '../../lib/db';
import type { BuildQueueMessage, SourceManifest } from './build-queue-worker-contracts';
import { getErrorMessage, matchesExcludePatterns } from './build-queue-worker.utils';

export async function addSourceFilesToExport(zip: AdmZip, msg: BuildQueueMessage): Promise<SourceManifest> {
  const maxSourceBytes = parseInt(process.env.EXPORT_MAX_SOURCE_BYTES || `${200 * 1024 * 1024}`, 10);
  const maxSourceFiles = parseInt(process.env.EXPORT_MAX_SOURCE_FILES || '5000', 10);
  const excludePatterns = Array.isArray(msg.options?.excludePatterns) ? msg.options?.excludePatterns as string[] : [];
  const sourceManifest: SourceManifest = {
    includedFiles: 0,
    includedBytes: 0,
    skippedFiles: 0,
    skippedBytes: 0,
    warnings: [],
  };

  try {
    const files = await prisma.file.findMany({
      where: { projectId: msg.projectId },
      select: { path: true, content: true, size: true },
      take: maxSourceFiles + 1,
    });

    if (files.length > maxSourceFiles) {
      sourceManifest.warnings.push(`Source file limit exceeded (${maxSourceFiles}). Extra files skipped.`);
    }

    for (const file of files.slice(0, maxSourceFiles)) {
      if (matchesExcludePatterns(file.path, excludePatterns)) {
        sourceManifest.skippedFiles += 1;
        sourceManifest.skippedBytes += file.size || 0;
        continue;
      }
      const content = file.content || '';
      const buffer = Buffer.from(content, 'utf8');
      const fileSize = file.size || buffer.length;

      if (sourceManifest.includedBytes + fileSize > maxSourceBytes) {
        sourceManifest.skippedFiles += 1;
        sourceManifest.skippedBytes += fileSize;
        sourceManifest.warnings.push(`Skipped source due to size limit: ${file.path}`);
        continue;
      }

      const zipPath = ['source', file.path.replace(/^\/+/, '')].join('/');
      zip.addFile(zipPath, buffer);
      sourceManifest.includedFiles += 1;
      sourceManifest.includedBytes += fileSize;
    }
  } catch (error: unknown) {
    sourceManifest.warnings.push(`Failed to export source files: ${getErrorMessage(error)}`);
  }

  zip.addFile('source/manifest.json', Buffer.from(JSON.stringify(sourceManifest, null, 2), 'utf8'));
  return sourceManifest;
}
