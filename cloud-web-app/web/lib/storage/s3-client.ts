import { logger } from '@/lib/observability/logger';
/**
 * S3 Client Helper - Lazy Loading
 * 
 * Este módulo carrega o AWS SDK S3 dinamicamente para evitar
 * erros de build quando o SDK não está instalado.
 * 
 * O SDK é OPCIONAL - a aplicação funciona sem ele,
 * apenas com funcionalidades de storage local/fallback.
 *
 * STORAGE BACKEND: Cloudflare R2 (default in production) ────────────────────
 * R2 exposes an S3-compatible API, so it works with `@aws-sdk/client-s3`
 * unchanged — the only differences are the endpoint (derived from the account
 * id, no separate `S3_ENDPOINT` needed), `region` (R2 requires the literal
 * string `'auto'`, not an AWS region code), and the credential env var names.
 * This is a deliberate choice, not an oversight: R2 charges $0 for egress
 * (asset downloads, export artifacts, render outputs), while the equivalent
 * AWS S3 traffic bills per GB out — at Aethel's expected asset/export volume
 * that is the single largest avoidable infra cost. See
 * CLAUDE_MASTER_EXECUTION_PLAN_V8 "Anti-Bankruptcy Infrastructure".
 *
 * Resolution order (first fully-configured wins):
 *   1. R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY  → Cloudflare R2
 *   2. S3_ENDPOINT + S3_ACCESS_KEY + S3_SECRET_KEY              → self-hosted/MinIO (local dev, docker-compose)
 *   3. AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY                → legacy/back-compat AWS S3 (not recommended: egress fees)
 *   4. none configured                                          → local filesystem emulator (temp/s3-emulator/)
 */

/**
 * Exported so other storage entry points (e.g. `lib/storage-service.ts`,
 * used for project backups) resolve the exact same R2-first backend instead
 * of maintaining a second, drifted copy that silently falls back to AWS S3
 * defaults in production. Single source of truth for "which object storage
 * backend are we actually talking to" across the whole app.
 */
export function resolveStorageBackendConfig() {
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const isR2Configured = !!(r2AccountId && r2AccessKeyId && r2SecretAccessKey);

  if (isR2Configured) {
    return {
      backend: 'r2' as const,
      region: 'auto', // Required literal value for R2 — it rejects AWS region codes.
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      bucket: process.env.R2_BUCKET_NAME || process.env.S3_BUCKET || 'aethel-assets',
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      forcePathStyle: true,
    };
  }

  const genericAccessKeyId = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
  const genericSecretAccessKey = process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  return {
    backend: (process.env.S3_ENDPOINT ? 'self-hosted' : 'aws-s3') as 'self-hosted' | 'aws-s3',
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET || 'aethel-assets',
    accessKeyId: genericAccessKeyId,
    secretAccessKey: genericSecretAccessKey,
    forcePathStyle: !!process.env.S3_ENDPOINT,
  };
}

type S3CommandConstructor = new (input: Record<string, unknown>) => unknown;

interface S3ClientLike {
  send(command: unknown): Promise<{
    ContentLength?: number;
    ContentType?: string;
  }>;
}

interface S3Module {
  S3Client: new (config: Record<string, unknown>) => S3ClientLike;
  GetObjectCommand: S3CommandConstructor;
  PutObjectCommand: S3CommandConstructor;
  HeadObjectCommand: S3CommandConstructor;
  DeleteObjectCommand: S3CommandConstructor;
  CopyObjectCommand: S3CommandConstructor;
}

interface S3PresignerModule {
  getSignedUrl(
    client: S3ClientLike,
    command: unknown,
    options: { expiresIn: number }
  ): Promise<string>;
}

// Estado do carregamento
let s3ClientInstance: S3ClientLike | null = null;
let presignerModule: S3PresignerModule | null = null;
let loadAttempted = false;
let loadSuccessful = false;

// Configuração do storage backend (R2 / self-hosted S3 / AWS S3 — see resolution order above)
const S3_CONFIG = resolveStorageBackendConfig();

/** True when running against real Cloudflare R2 buckets (zero-egress backend). */
export const IS_R2_BACKEND = S3_CONFIG.backend === 'r2';
/** Which storage backend is actually active, for health checks / admin diagnostics. */
export const STORAGE_BACKEND = S3_CONFIG.backend;

// ─── Local Emulator (offline-first) ────────────────────────────────────────
// When no storage credentials are configured at all, the client degrades to a
// local directory (temp/s3-emulator/) so the entire asset upload flow works
// without billing.
export const LOCAL_EMULATOR_DIR = 'temp/s3-emulator';

function isLocalEmulatorMode(): boolean {
  return !S3_CONFIG.accessKeyId || !S3_CONFIG.secretAccessKey;
}

export async function localPutObject(key: string, body: Buffer | string): Promise<boolean> {
  const { promises: fs } = await import('node:fs');
  const nodePath = await import('node:path');
  const dest = nodePath.join(process.cwd(), LOCAL_EMULATOR_DIR, key);
  await fs.mkdir(nodePath.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
  return true;
}

export async function localGetObjectBuffer(key: string): Promise<Buffer | null> {
  const { promises: fs } = await import('node:fs');
  const nodePath = await import('node:path');
  const src = nodePath.join(process.cwd(), LOCAL_EMULATOR_DIR, key);
  try {
    return await fs.readFile(src);
  } catch {
    return null;
  }
}

export function localPresignUrl(key: string, expiresIn = 300): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/api/dev/s3-emulator/${key}?expires=${Date.now() + expiresIn * 1000}`;
}

/**
 * Verifica se o AWS SDK está disponível
 */
export async function isS3Available(): Promise<boolean> {
  const client = await getS3Client();
  return !!client;
}

/**
 * Obtém o cliente S3 (ou null se não disponível)
 */
export async function getS3Client(): Promise<S3ClientLike | null> {
  if (s3ClientInstance) return s3ClientInstance;
  if (loadAttempted && !loadSuccessful) return null;
  
  loadAttempted = true;
  
  // Verifica se as credenciais estão configuradas (R2 ou fallback S3-compatible)
  if (!S3_CONFIG.accessKeyId || !S3_CONFIG.secretAccessKey) {
    logger.warn('[Storage] No storage credentials configured (R2_* / S3_* / AWS_*) - object storage features disabled, using local emulator');
    return null;
  }
  
  try {
    // Import dinâmico - só funciona se o pacote estiver instalado
    const { S3Client } = await eval('import("@aws-sdk/client-s3")') as S3Module;
    
    s3ClientInstance = new S3Client({
      region: S3_CONFIG.region,
      endpoint: S3_CONFIG.endpoint,
      forcePathStyle: S3_CONFIG.forcePathStyle,
      credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
      },
    });
    
    loadSuccessful = true;
    logger.info(`[Storage] Connected to ${S3_CONFIG.backend === 'r2' ? 'Cloudflare R2 (zero-egress)' : S3_CONFIG.backend} bucket "${S3_CONFIG.bucket}"`);
    return s3ClientInstance;
  } catch (error) {
    logger.warn('[Storage] AWS SDK (@aws-sdk/client-s3) not available - object storage features disabled');
    return null;
  }
}

/**
 * Obtém os comandos do S3 (ou null se não disponível)
 */
export async function getS3Commands(): Promise<{
  GetObjectCommand: S3CommandConstructor;
  PutObjectCommand: S3CommandConstructor;
  HeadObjectCommand: S3CommandConstructor;
  DeleteObjectCommand: S3CommandConstructor;
  CopyObjectCommand: S3CommandConstructor;
} | null> {
  if (loadAttempted && !loadSuccessful) return null;
  
  await getS3Client(); // Garante que tentamos carregar
  
  if (!loadSuccessful) return null;
  
  try {
    const s3 = await eval('import("@aws-sdk/client-s3")') as S3Module;
    return {
      GetObjectCommand: s3.GetObjectCommand,
      PutObjectCommand: s3.PutObjectCommand,
      HeadObjectCommand: s3.HeadObjectCommand,
      DeleteObjectCommand: s3.DeleteObjectCommand,
      CopyObjectCommand: s3.CopyObjectCommand,
    };
  } catch {
    return null;
  }
}

/**
 * Obtém o presigner para URLs assinadas (ou null se não disponível)
 */
export async function getPresigner(): Promise<S3PresignerModule | null> {
  if (presignerModule) return presignerModule;
  if (loadAttempted && !loadSuccessful) return null;
  
  await getS3Client(); // Garante que tentamos carregar
  
  if (!loadSuccessful) return null;
  
  try {
    const presigner = await eval('import("@aws-sdk/s3-request-presigner")') as S3PresignerModule;
    presignerModule = presigner;
    return presigner;
  } catch {
    logger.warn('[S3] Presigner not available');
    return null;
  }
}

/**
 * Gera uma URL assinada para download
 */
export async function generateDownloadUrl(
  key: string,
  options:
    | number
    | {
        expiresIn?: number;
        fileName?: string;
        contentType?: string;
      } = 3600
): Promise<string | null> {
  const client = await getS3Client();
  const commands = await getS3Commands();
  const presigner = await getPresigner();
  
  if (!client || !commands || !presigner) {
    return null;
  }

  const opts = typeof options === 'number' ? { expiresIn: options } : options;
  const expiresIn = opts.expiresIn ?? 3600;
  const contentType = opts.contentType;
  const fileName = opts.fileName;
  const contentDisposition = fileName
    ? `attachment; filename="${fileName.replace(/\"/g, '')}"`
    : undefined;
  
  try {
    const command = new commands.GetObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      ...(contentType ? { ResponseContentType: contentType } : {}),
      ...(contentDisposition ? { ResponseContentDisposition: contentDisposition } : {}),
    });
    
    return await presigner.getSignedUrl(client, command, { expiresIn });
  } catch (error) {
    logger.error('[S3] Failed to generate download URL:', error);
    return null;
  }
}

/**
 * Gera uma URL assinada para upload
 */
export async function generateUploadUrl(
  key: string,
  contentType: string,
  options:
    | number
    | {
        expiresIn?: number;
      } = 3600
): Promise<string | null> {
  const client = await getS3Client();
  const commands = await getS3Commands();
  const presigner = await getPresigner();
  
  if (!client || !commands || !presigner) {
    return null;
  }

  const opts = typeof options === 'number' ? { expiresIn: options } : options;
  const expiresIn = opts.expiresIn ?? 3600;
  
  try {
    const command = new commands.PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      ContentType: contentType,
    });
    
    return await presigner.getSignedUrl(client, command, { expiresIn });
  } catch (error) {
    logger.error('[S3] Failed to generate upload URL:', error);
    return null;
  }
}

/**
 * Faz upload direto para o bucket (sem presign), usado por workers server-side.
 */
export async function putObject(
  key: string,
  body: Uint8Array | Buffer | string,
  contentType: string
): Promise<{ ok: boolean; size?: number } > {
  const client = await getS3Client();
  const commands = await getS3Commands();
  if (!client || !commands) return { ok: false };

  try {
    const command = new commands.PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await client.send(command);
    const size = typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength;
    return { ok: true, size };
  } catch (error) {
    logger.error('[S3] Failed to put object:', error);
    return { ok: false };
  }
}

/**
 * Verifica se um objeto existe no S3
 */
export async function headObject(key: string): Promise<{ size: number; contentType: string } | null> {
  const client = await getS3Client();
  const commands = await getS3Commands();
  
  if (!client || !commands) {
    return null;
  }
  
  try {
    const command = new commands.HeadObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    });
    
    const response = await client.send(command);
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Deleta um objeto do S3
 */
export async function deleteObject(key: string): Promise<boolean> {
  const client = await getS3Client();
  const commands = await getS3Commands();
  
  if (!client || !commands) {
    return false;
  }
  
  try {
    const command = new commands.DeleteObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    });
    
    await client.send(command);
    return true;
  } catch (error) {
    logger.error('[S3] Failed to delete object:', error);
    return false;
  }
}

/**
 * Copia um objeto dentro do bucket (server-side)
 */
export async function copyObject(sourceKey: string, destinationKey: string): Promise<boolean> {
  const client = await getS3Client();
  const commands = await getS3Commands();

  if (!client || !commands) {
    return false;
  }

  try {
    const command = new commands.CopyObjectCommand({
      Bucket: S3_CONFIG.bucket,
      CopySource: `/${S3_CONFIG.bucket}/${sourceKey}`,
      Key: destinationKey,
    });
    await client.send(command);
    return true;
  } catch (error) {
    logger.error('[S3] Failed to copy object:', error);
    return false;
  }
}

/**
 * Downloads an object from S3 to a local file path (server-side workers).
 */
export async function downloadObjectToFile(key: string, destinationPath: string): Promise<boolean> {
  const client = await getS3Client();
  const commands = await getS3Commands();
  if (!client || !commands) return false;

  try {
    const command = new commands.GetObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    });
    const response = await client.send(command) as { Body?: AsyncIterable<Uint8Array> | Uint8Array };
    const body = response.Body;
    if (!body) return false;

    const fs = await import('node:fs/promises');
    const chunks: Uint8Array[] = [];
    if (Symbol.asyncIterator in Object(body)) {
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
    } else {
      chunks.push(body as Uint8Array);
    }
    await fs.writeFile(destinationPath, Buffer.concat(chunks));
    return true;
  } catch (error) {
    logger.error('[S3] Failed to download object:', error);
    return false;
  }
}

export const S3_BUCKET = S3_CONFIG.bucket;

// ─── Unified Upload/Download helpers (replaces lib/server/s3-client.ts mock) ─
// These are the canonical implementations used by /api/assets/upload-url.

export async function createUploadUrl(
  projectId: string,
  assetType: string,
  fileName: string,
  mimeType: string,
  expiresIn = 300
): Promise<{ uploadUrl: string; storageKey: string; assetId: string }> {
  const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const storageKey = `projects/${projectId}/${assetType}/${assetId}/${fileName}`;

  if (isLocalEmulatorMode()) {
    const uploadUrl = localPresignUrl(storageKey, expiresIn);
    logger.info('[S3/local] createUploadUrl using emulator', { storageKey });
    return { uploadUrl, storageKey, assetId };
  }

  const url = await generateUploadUrl(storageKey, mimeType, { expiresIn });
  if (!url) {
    throw new Error('S3_PRESIGN_FAILED: Could not generate presigned upload URL');
  }
  return { uploadUrl: url, storageKey, assetId };
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (isLocalEmulatorMode()) {
    return localPresignUrl(key, expiresIn);
  }
  const url = await generateDownloadUrl(key, { expiresIn });
  return url ?? localPresignUrl(key, expiresIn);
}
