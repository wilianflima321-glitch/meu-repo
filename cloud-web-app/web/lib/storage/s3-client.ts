/**
 * S3 Client Helper - Lazy Loading
 * 
 * Este módulo carrega o AWS SDK S3 dinamicamente para evitar
 * erros de build quando o SDK não está instalado.
 * 
 * O SDK é OPCIONAL - a aplicação funciona sem ele,
 * apenas com funcionalidades de storage local/fallback.
 */

// Estado do carregamento
let s3ClientInstance: any = null;
let presignerModule: any = null;
let loadAttempted = false;
let loadSuccessful = false;

// Configuração do S3
const S3_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  bucket: process.env.S3_BUCKET || 'aethel-assets',
};

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
export async function getS3Client(): Promise<any | null> {
  if (s3ClientInstance) return s3ClientInstance;
  if (loadAttempted && !loadSuccessful) return null;
  
  loadAttempted = true;
  
  // Verifica se as credenciais estão configuradas
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('[S3] AWS credentials not configured - S3 features disabled');
    return null;
  }
  
  try {
    // Import dinâmico - só funciona se o pacote estiver instalado
    const { S3Client } = await eval('import("@aws-sdk/client-s3")');
    
    s3ClientInstance = new S3Client({
      region: S3_CONFIG.region,
      endpoint: S3_CONFIG.endpoint,
      forcePathStyle: !!S3_CONFIG.endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    loadSuccessful = true;
    return s3ClientInstance;
  } catch (error) {
    console.warn('[S3] AWS SDK not available - S3 features disabled');
    return null;
  }
}

/**
 * Obtém os comandos do S3 (ou null se não disponível)
 */
export async function getS3Commands(): Promise<{
  GetObjectCommand: any;
  PutObjectCommand: any;
  HeadObjectCommand: any;
  DeleteObjectCommand: any;
  CopyObjectCommand: any;
} | null> {
  if (loadAttempted && !loadSuccessful) return null;
  
  await getS3Client(); // Garante que tentamos carregar
  
  if (!loadSuccessful) return null;
  
  try {
    const s3 = await eval('import("@aws-sdk/client-s3")');
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
export async function getPresigner(): Promise<{ getSignedUrl: any } | null> {
  if (presignerModule) return presignerModule;
  if (loadAttempted && !loadSuccessful) return null;
  
  await getS3Client(); // Garante que tentamos carregar
  
  if (!loadSuccessful) return null;
  
  try {
    const presigner = await eval('import("@aws-sdk/s3-request-presigner")');
    presignerModule = presigner;
    return presigner;
  } catch {
    console.warn('[S3] Presigner not available');
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
    console.error('[S3] Failed to generate download URL:', error);
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
    console.error('[S3] Failed to generate upload URL:', error);
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
    const size = typeof body === 'string' ? Buffer.byteLength(body) : Buffer.byteLength(body as any);
    return { ok: true, size };
  } catch (error) {
    console.error('[S3] Failed to put object:', error);
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
    console.error('[S3] Failed to delete object:', error);
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
    console.error('[S3] Failed to copy object:', error);
    return false;
  }
}

export const S3_BUCKET = S3_CONFIG.bucket;
