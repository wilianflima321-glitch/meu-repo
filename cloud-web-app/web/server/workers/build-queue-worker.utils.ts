import { readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { DELAY_BASE_MS, METRICS_KEY, type ExportState, type RedisClient, type WorkerMetric } from './build-queue-worker-contracts';

export type LocalAssetFile = {
  absPath: string;
  relativePath: string;
  size: number;
};

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'unknown error');
}

export function parseJsonObject(value: string): ExportState | null {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  return parsed as ExportState;
}

export function nowIso() {
  return new Date().toISOString();
}

export function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

export function appendLog(existing: ExportState | null | undefined, line: string) {
  const logs = Array.isArray(existing?.logs) ? existing.logs.slice(-500) : [];
  logs.push(`[${nowIso()}] ${line}`);
  return logs;
}

export function backoffMs(attempt: number) {
  const ms = DELAY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(ms, 60_000);
}

export async function recordWorkerMetric(redis: RedisClient, data: WorkerMetric) {
  try {
    if (data.status === 'success') {
      await redis.hincrby(METRICS_KEY, 'success', 1);
    } else {
      await redis.hincrby(METRICS_KEY, 'failed', 1);
    }
    if (typeof data.durationMs === 'number') {
      await redis.hincrby(METRICS_KEY, 'totalDurationMs', Math.round(data.durationMs));
      await redis.hincrby(METRICS_KEY, 'completed', 1);
    }
    if (typeof data.backlog === 'number') {
      await redis.hset(METRICS_KEY, 'backlog', String(data.backlog));
      await redis.hset(METRICS_KEY, 'updatedAt', new Date().toISOString());
    }
  } catch {
    // ignore metrics errors
  }
}

export function parseS3Url(value: string): { bucket: string; key: string } | null {
  if (!value?.startsWith('s3://')) return null;
  const withoutScheme = value.replace('s3://', '');
  const firstSlash = withoutScheme.indexOf('/');
  if (firstSlash === -1) return null;
  const bucket = withoutScheme.slice(0, firstSlash);
  const key = withoutScheme.slice(firstSlash + 1);
  if (!bucket || !key) return null;
  return { bucket, key };
}

export function getRuntimeTemplatesDir() {
  return process.env.RUNTIME_TEMPLATES_DIR
    ? path.resolve(process.env.RUNTIME_TEMPLATES_DIR)
    : path.resolve(process.cwd(), '..', '..', 'runtime-templates');
}

export function matchesExcludePatterns(filePath: string, patterns: string[]) {
  if (!patterns.length) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return patterns.some((pattern) => {
    const escaped = pattern
      .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(normalized);
  });
}

export async function runGltfTransformSimplify(input: string, output: string, ratio: number): Promise<void> {
  const cli = process.env.GLTF_TRANSFORM_PATH || 'gltf-transform';
  const safeRatio = Math.min(Math.max(ratio, 0.02), 1);
  await new Promise<void>((resolve, reject) => {
    const args = ['simplify', input, output, '--ratio', safeRatio.toString()];
    const proc = spawn(cli, args);
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`gltf-transform failed with code ${code}`)));
    proc.on('error', reject);
  });
}

export async function listFilesRecursive(rootDir: string, currentDir: string = rootDir): Promise<LocalAssetFile[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: LocalAssetFile[] = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(rootDir, entryPath));
      continue;
    }
    if (!entry.isFile()) continue;

    const fileStat = await stat(entryPath);
    files.push({
      absPath: entryPath,
      relativePath: path.relative(rootDir, entryPath),
      size: fileStat.size,
    });
  }

  return files;
}
