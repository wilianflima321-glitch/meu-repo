import {createComponentLogger, logger} from '@/lib/observability/logger'
import { resolveStorageBackendConfig, IS_R2_BACKEND, STORAGE_BACKEND } from '@/lib/storage/s3-client'

const log = createComponentLogger('storage-service')


/**
 * Storage Service - Aethel Engine (backups)
 *
 * Real object-storage client for project backups. Shares the exact same
 * R2-first backend resolution as `lib/storage/s3-client.ts`
 * (`resolveStorageBackendConfig`) so this module can never silently drift
 * onto a hidden AWS S3 default in production — Cloudflare R2 is zero-egress
 * and is the backend Aethel bills against; falling back to raw AWS S3 here
 * would reintroduce the exact egress-cost risk R2 was adopted to eliminate.
 *
 * Resolution order (see `s3-client.ts` for full details):
 *   1. R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY → Cloudflare R2
 *   2. S3_ENDPOINT + S3_ACCESS_KEY(_ID) + S3_SECRET_KEY        → self-hosted/MinIO (local dev)
 *   3. AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY               → legacy AWS S3 (not recommended: egress fees)
 *
 * DEPENDÊNCIAS OPCIONAIS:
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

// Tipos para o serviço de storage (evita dependência direta do SDK)
type StorageObjectResponse = {
  Key?: string;
  Size?: number;
  LastModified?: Date;
  ETag?: string;
};

type StorageSendResponse = {
  ETag?: string;
  Body?: AsyncIterable<Uint8Array>;
  ContentType?: string;
  Metadata?: Record<string, string>;
  Contents?: StorageObjectResponse[];
};

interface StorageClient {
  send(command: unknown): Promise<StorageSendResponse>;
}

type StorageCommandInput = Record<string, unknown>;

type StorageCommandConstructor = new (input: StorageCommandInput) => unknown;

type S3Module = {
  S3Client: new (config: Record<string, unknown>) => StorageClient;
} & Record<string, unknown>;

function hasStorageNotFoundShape(error: unknown): error is { name?: string; $metadata?: { httpStatusCode?: number } } {
  return typeof error === 'object' && error !== null;
}

// Configuração do cliente S3/MinIO - lazy loading
let storageClient: StorageClient | null = null;
let s3Module: S3Module | null = null;

async function loadS3Module(): Promise<S3Module> {
  if (s3Module) return s3Module;
  try {
    // Usa eval para evitar que o webpack tente bundlar o módulo
    s3Module = await eval('import("@aws-sdk/client-s3")') as S3Module;
    return s3Module;
  } catch (error) {
    const message = 'STORAGE_SDK_NOT_AVAILABLE: instale @aws-sdk/client-s3 e configure S3/MINIO para usar storage real.';
    if (process.env.NODE_ENV === 'production') {
      logger.error(`[Storage] ❌ ${message}`);
    } else {
      logger.warn(`[Storage] ⚠️ ${message}`);
    }
    throw Object.assign(new Error(message), { code: 'STORAGE_SDK_NOT_AVAILABLE' });
  }
}

async function getStorageClient(): Promise<StorageClient> {
  if (storageClient) return storageClient;
  const s3Module = await loadS3Module();
  const { S3Client } = s3Module;

  // Reuse the exact same R2-first resolution as s3-client.ts. Only the
  // MinIO local-dev fallback (opaque to that resolver, since it's specific
  // to this backup client's historical defaults) is layered on top when
  // neither R2 nor generic S3 credentials are configured.
  const config = resolveStorageBackendConfig();
  const isProduction = process.env.NODE_ENV === 'production';
  const hasRealCredentials = !!(config.accessKeyId && config.secretAccessKey);

  const endpoint = hasRealCredentials
    ? config.endpoint
    : (isProduction ? undefined : 'http://localhost:9000');
  const region = hasRealCredentials ? config.region : 'us-east-1';
  const accessKeyId = config.accessKeyId || process.env.MINIO_ROOT_USER || 'minioadmin';
  const secretAccessKey = config.secretAccessKey || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
  const forcePathStyle = hasRealCredentials ? config.forcePathStyle : !isProduction;

  storageClient = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  }) as StorageClient;

  log.info(`[Storage] Connected to ${IS_R2_BACKEND ? 'Cloudflare R2 (zero-egress)' : STORAGE_BACKEND} storage for backups`);
  return storageClient;
}

// Buckets configurados — R2_BUCKET_* takes priority so backups land in the
// same zero-egress account as assets/exports when R2 is configured.
const BUCKETS = {
  BACKUPS: process.env.R2_BUCKET_BACKUPS || process.env.S3_BUCKET_BACKUPS || 'aethel-backups',
  ASSETS: process.env.R2_BUCKET_ASSETS || process.env.S3_BUCKET_ASSETS || 'aethel-assets',
  EXPORTS: process.env.R2_BUCKET_EXPORTS || process.env.S3_BUCKET_EXPORTS || 'aethel-exports',
} as const;

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

// Helper para criar comandos dinamicamente
async function createCommand(name: string, input: StorageCommandInput): Promise<unknown> {
  const s3Module = await loadS3Module();
  const CommandClass = s3Module[name];
  if (typeof CommandClass !== 'function') {
    throw new Error(`STORAGE_COMMAND_NOT_AVAILABLE: ${name}`);
  }
  return new (CommandClass as StorageCommandConstructor)(input);
}

/**
 * Upload de arquivo para storage
 */
export async function uploadToStorage(
  bucket: keyof typeof BUCKETS,
  key: string,
  data: Uint8Array | string,
  options: UploadOptions = {}
): Promise<{ key: string; etag: string; url: string }> {
  const client = await getStorageClient();
  const bucketName = BUCKETS[bucket];
  
  const command = await createCommand('PutObjectCommand', {
    Bucket: bucketName,
    Key: key,
    Body: typeof data === 'string' ? new TextEncoder().encode(data) : data,
    ContentType: options.contentType || 'application/octet-stream',
    Metadata: options.metadata,
    ACL: options.acl || 'private',
  });
  
  const response = await client.send(command);
  
  return {
    key,
    etag: response.ETag || '',
    url: `s3://${bucketName}/${key}`,
  };
}

/**
 * Download de arquivo do storage
 */
export async function downloadFromStorage(
  bucket: keyof typeof BUCKETS,
  key: string
): Promise<{ data: Uint8Array; contentType: string; metadata: Record<string, string> }> {
  const client = await getStorageClient();
  const bucketName = BUCKETS[bucket];
  
  const command = await createCommand('GetObjectCommand', {
    Bucket: bucketName,
    Key: key,
  });
  
  const response = await client.send(command);
  
  // Converter stream para Uint8Array
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
  }
  
  // Concatenar chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return {
    data: result,
    contentType: response.ContentType || 'application/octet-stream',
    metadata: (response.Metadata as Record<string, string>) || {},
  };
}

/**
 * Listar objetos no storage
 */
export async function listStorageObjects(
  bucket: keyof typeof BUCKETS,
  prefix?: string,
  maxKeys: number = 1000
): Promise<StorageObject[]> {
  const client = await getStorageClient();
  const bucketName = BUCKETS[bucket];
  
  const command = await createCommand('ListObjectsV2Command', {
    Bucket: bucketName,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });
  
  const response = await client.send(command);
  
  return (response.Contents || []).map(obj => ({
    key: obj.Key || '',
    size: obj.Size || 0,
    lastModified: obj.LastModified || new Date(),
    etag: obj.ETag,
  }));
}

/**
 * Deletar objeto do storage
 */
export async function deleteFromStorage(
  bucket: keyof typeof BUCKETS,
  key: string
): Promise<void> {
  const client = await getStorageClient();
  const bucketName = BUCKETS[bucket];
  
  const command = await createCommand('DeleteObjectCommand', {
    Bucket: bucketName,
    Key: key,
  });
  
  await client.send(command);
}

/**
 * Verificar se objeto existe
 */
export async function objectExists(
  bucket: keyof typeof BUCKETS,
  key: string
): Promise<boolean> {
  const client = await getStorageClient();
  const bucketName = BUCKETS[bucket];
  
  try {
    const command = await createCommand('HeadObjectCommand', {
      Bucket: bucketName,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (error: unknown) {
    if (hasStorageNotFoundShape(error) && (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404)) {
      return false;
    }
    throw error;
  }
}

/**
 * Gerar URL assinada para download temporário
 */
export async function getSignedDownloadUrl(
  bucket: keyof typeof BUCKETS,
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  // Tentar usar SDK para URL assinada
  try {
    // Usa eval para evitar que o webpack tente bundlar o módulo
    const { getSignedUrl } = await eval('import("@aws-sdk/s3-request-presigner")');
    const client = await getStorageClient();
    const bucketName = BUCKETS[bucket];
    
    const command = await createCommand('GetObjectCommand', {
      Bucket: bucketName,
      Key: key,
    });
    
    return await getSignedUrl(client as any, command, { expiresIn: expiresInSeconds });
  } catch {
    // Fallback: retornar URL simples (para dev)
    const bucketName = BUCKETS[bucket];
    return `http://localhost:9000/${bucketName}/${key}`;
  }
}

/**
 * Gerar URL assinada para upload temporário
 */
export async function getSignedUploadUrl(
  bucket: keyof typeof BUCKETS,
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  try {
    // Usa eval para evitar que o webpack tente bundlar o módulo
    const { getSignedUrl } = await eval('import("@aws-sdk/s3-request-presigner")');
    const client = await getStorageClient();
    const bucketName = BUCKETS[bucket];
    
    const command = await createCommand('PutObjectCommand', {
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });
    
    return await getSignedUrl(client as any, command, { expiresIn: expiresInSeconds });
  } catch {
    // Fallback: retornar URL simples (para dev)
    const bucketName = BUCKETS[bucket];
    return `http://localhost:9000/${bucketName}/${key}`;
  }
}

// ============================================
// BACKUP ESPECÍFICO
// ============================================

export interface BackupMetadata {
  projectId: string;
  userId: string;
  type: 'manual' | 'auto' | 'pre-restore';
  description?: string;
  filesCount: number;
  assetsCount: number;
  totalSize: number;
  checksum: string;
  createdAt: string;
}

/**
 * Salvar backup real no storage
 */
export async function saveBackup(
  backupId: string,
  data: Uint8Array,
  metadata: BackupMetadata
): Promise<{ key: string; etag: string }> {
  const key = `backups/${metadata.userId}/${metadata.projectId}/${backupId}.tar.gz`;
  
  const result = await uploadToStorage('BACKUPS', key, data, {
    contentType: 'application/gzip',
    metadata: {
      'x-backup-id': backupId,
      'x-project-id': metadata.projectId,
      'x-user-id': metadata.userId,
      'x-backup-type': metadata.type,
      'x-files-count': String(metadata.filesCount),
      'x-assets-count': String(metadata.assetsCount),
      'x-total-size': String(metadata.totalSize),
      'x-checksum': metadata.checksum,
      'x-created-at': metadata.createdAt,
    },
  });
  
  return { key: result.key, etag: result.etag };
}

/**
 * Carregar backup do storage
 */
export async function loadBackup(
  backupId: string,
  projectId: string,
  userId: string
): Promise<{ data: Uint8Array; metadata: BackupMetadata }> {
  const key = `backups/${userId}/${projectId}/${backupId}.tar.gz`;
  
  const result = await downloadFromStorage('BACKUPS', key);
  
  const metadata: BackupMetadata = {
    projectId: result.metadata['x-project-id'] || projectId,
    userId: result.metadata['x-user-id'] || userId,
    type: (result.metadata['x-backup-type'] as BackupMetadata['type']) || 'manual',
    description: result.metadata['x-description'],
    filesCount: parseInt(result.metadata['x-files-count'] || '0', 10),
    assetsCount: parseInt(result.metadata['x-assets-count'] || '0', 10),
    totalSize: parseInt(result.metadata['x-total-size'] || '0', 10),
    checksum: result.metadata['x-checksum'] || '',
    createdAt: result.metadata['x-created-at'] || new Date().toISOString(),
  };
  
  return { data: result.data, metadata };
}

/**
 * Listar backups de um projeto
 */
export async function listProjectBackups(
  projectId: string,
  userId: string
): Promise<Array<{ backupId: string; size: number; createdAt: Date }>> {
  const prefix = `backups/${userId}/${projectId}/`;
  const objects = await listStorageObjects('BACKUPS', prefix);
  
  return objects.map(obj => {
    // Extrair backupId do key: backups/userId/projectId/backupId.tar.gz
    const backupId = obj.key.split('/').pop()?.replace('.tar.gz', '') || '';
    return {
      backupId,
      size: obj.size,
      createdAt: obj.lastModified,
    };
  });
}

/**
 * Deletar backup
 */
export async function deleteBackup(
  backupId: string,
  projectId: string,
  userId: string
): Promise<void> {
  const key = `backups/${userId}/${projectId}/${backupId}.tar.gz`;
  await deleteFromStorage('BACKUPS', key);
}

export { BUCKETS };
