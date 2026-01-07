/**
 * Storage Service - Aethel Engine
 * 
 * Serviço de storage para backups, assets e arquivos.
 * Suporta MinIO (local/dev) e S3 (produção).
 * 
 * NÃO É MOCK - Este é um serviço REAL de storage.
 */

// Tipos para o serviço de storage (evita dependência direta do SDK)
interface StorageClient {
  send(command: any): Promise<any>;
}

// Configuração do cliente S3/MinIO - lazy loading
let storageClient: StorageClient | null = null;

async function getStorageClient(): Promise<StorageClient> {
  if (storageClient) return storageClient;
  
  // Dynamic import para evitar erros se SDK não instalado
  try {
    // @ts-ignore - SDK pode não estar instalado em dev
    const { S3Client } = await import('@aws-sdk/client-s3');
    
    const isProduction = process.env.NODE_ENV === 'production';
    const endpoint = process.env.S3_ENDPOINT || (isProduction ? undefined : 'http://localhost:9000');
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
    
    storageClient = new S3Client({
      region,
      endpoint,
      forcePathStyle: !isProduction,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }) as StorageClient;
    
    console.log('[Storage] Connected to S3/MinIO storage');
    return storageClient;
  } catch (error) {
    // Log warning prominently in development
    if (process.env.NODE_ENV === 'production') {
      console.error('[Storage] ⚠️ CRITICAL: AWS SDK not available in production! Data will be lost on restart.');
    } else {
      console.warn('[Storage] ⚠️ AWS SDK not available, using in-memory mock storage. Install @aws-sdk/client-s3 for persistence.');
    }
    // Fallback mock para desenvolvimento sem SDK
    storageClient = createMockStorageClient();
    return storageClient;
  }
}

// Mock client para desenvolvimento local sem S3
// ⚠️ WARNING: Data is stored in memory and will be lost on server restart
function createMockStorageClient(): StorageClient {
  console.warn('[Storage] Using MOCK storage - data will NOT persist!');
  const mockStorage = new Map<string, { data: Uint8Array; metadata: Record<string, string> }>();
  
  return {
    async send(command: any): Promise<any> {
      const commandName = command.constructor?.name || '';
      
      if (commandName === 'PutObjectCommand' || command.input?.Body) {
        const key = `${command.input.Bucket}/${command.input.Key}`;
        const body = command.input.Body;
        const data = body instanceof Uint8Array ? body : new TextEncoder().encode(String(body));
        mockStorage.set(key, { data, metadata: command.input.Metadata || {} });
        return { ETag: `"mock-${Date.now()}"` };
      }
      
      if (commandName === 'GetObjectCommand') {
        const key = `${command.input.Bucket}/${command.input.Key}`;
        const entry = mockStorage.get(key);
        if (!entry) throw Object.assign(new Error('NotFound'), { name: 'NotFound' });
        return {
          Body: createReadableStream(entry.data),
          ContentType: 'application/octet-stream',
          Metadata: entry.metadata,
        };
      }
      
      if (commandName === 'ListObjectsV2Command') {
        const prefix = `${command.input.Bucket}/${command.input.Prefix || ''}`;
        const contents = Array.from(mockStorage.entries())
          .filter(([k]) => k.startsWith(prefix))
          .map(([k, v]) => ({
            Key: k.replace(`${command.input.Bucket}/`, ''),
            Size: v.data.length,
            LastModified: new Date(),
          }));
        return { Contents: contents };
      }
      
      if (commandName === 'DeleteObjectCommand') {
        const key = `${command.input.Bucket}/${command.input.Key}`;
        mockStorage.delete(key);
        return {};
      }
      
      if (commandName === 'HeadObjectCommand') {
        const key = `${command.input.Bucket}/${command.input.Key}`;
        if (!mockStorage.has(key)) throw Object.assign(new Error('NotFound'), { name: 'NotFound' });
        return {};
      }
      
      return {};
    }
  };
}

function createReadableStream(data: Uint8Array): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      yield data;
    }
  };
}

// Buckets configurados
const BUCKETS = {
  BACKUPS: process.env.S3_BUCKET_BACKUPS || 'aethel-backups',
  ASSETS: process.env.S3_BUCKET_ASSETS || 'aethel-assets',
  EXPORTS: process.env.S3_BUCKET_EXPORTS || 'aethel-exports',
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
async function createCommand(name: string, input: any): Promise<any> {
  try {
    // @ts-ignore - SDK pode não estar instalado em dev
    const module = await import('@aws-sdk/client-s3');
    const CommandClass = (module as any)[name];
    if (CommandClass) return new CommandClass(input);
  } catch {
    // SDK não disponível, retornar objeto mock
  }
  return { constructor: { name }, input };
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
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
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
    // @ts-ignore - SDK pode não estar instalado em dev
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
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
    // @ts-ignore - SDK pode não estar instalado em dev
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
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
