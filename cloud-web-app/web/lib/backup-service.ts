/**
 * Backup Service - Aethel Engine
 * 
 * Serviço REAL de backup com compressão, checksum e storage.
 * NÃO É MOCK - Este serviço realmente salva e restaura backups.
 */

import { prisma } from '@/lib/db';
import { 
  saveBackup, 
  loadBackup, 
  listProjectBackups, 
  deleteBackup as deleteBackupFromStorage,
  BackupMetadata 
} from '@/lib/storage-service';

// Helper para garantir ArrayBuffer puro (não SharedArrayBuffer)
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  // Criar novo ArrayBuffer e copiar os dados
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return buffer;
}

// Funções de compressão usando Web APIs (compatível com Edge runtime)
async function compressData(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const inputData = encoder.encode(data);
  
  // Usar CompressionStream se disponível (navegadores modernos)
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    // Criar nova Uint8Array com ArrayBuffer puro
    const pureData = new Uint8Array(toArrayBuffer(inputData));
    writer.write(pureData);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  
  // Fallback: retornar dados sem compressão
  return inputData;
}

async function decompressData(data: Uint8Array): Promise<string> {
  // Usar DecompressionStream se disponível
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    // Criar nova Uint8Array com ArrayBuffer puro
    const pureData = new Uint8Array(toArrayBuffer(data));
    writer.write(pureData);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(result);
  }
  
  // Fallback: assumir dados não comprimidos
  return new TextDecoder().decode(data);
}

// Calcular checksum usando Web Crypto API
async function calculateChecksum(data: Uint8Array): Promise<string> {
  // Criar ArrayBuffer puro para evitar problemas com SharedArrayBuffer
  const pureBuffer = toArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', pureBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface BackupInfo {
  id: string;
  projectId: string;
  type: 'manual' | 'auto' | 'pre-restore';
  description?: string;
  filesCount: number;
  assetsCount: number;
  totalSize: number;
  compressedSize: number;
  checksum: string;
  createdAt: Date;
  createdBy: string;
  storageKey?: string;
}

export interface BackupData {
  version: '1.0';
  projectId: string;
  projectName: string;
  createdAt: string;
  files: Array<{
    id: string;
    path: string;
    content: string;
    language: string | null;
  }>;
  assets: Array<{
    id: string;
    name: string;
    type: string;
    url: string | null;
    size: number;
    mimeType: string | null;
  }>;
  metadata: {
    filesCount: number;
    assetsCount: number;
    totalSize: number;
  };
}

/**
 * Criar backup real de um projeto
 */
export async function createBackup(
  projectId: string,
  userId: string,
  type: 'manual' | 'auto' | 'pre-restore' = 'manual',
  description?: string
): Promise<BackupInfo> {
  // 1. Buscar projeto com todos os dados
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      files: true,
      assets: true,
    },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // 2. Criar estrutura de backup
  const backupData: BackupData = {
    version: '1.0',
    projectId: project.id,
    projectName: project.name,
    createdAt: new Date().toISOString(),
    files: project.files.map(f => ({
      id: f.id,
      path: f.path,
      content: f.content,
      language: f.language,
    })),
    assets: project.assets.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      url: a.url,
      size: a.size,
      mimeType: a.mimeType,
    })),
    metadata: {
      filesCount: project.files.length,
      assetsCount: project.assets.length,
      totalSize: project.files.reduce((acc, f) => acc + f.content.length, 0),
    },
  };

  // 3. Serializar e comprimir
  const jsonData = JSON.stringify(backupData);
  const compressedData = await compressData(jsonData);

  // 4. Calcular checksum
  const checksum = await calculateChecksum(compressedData);

  // 5. Gerar ID do backup
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 6. Salvar no storage real
  const metadata: BackupMetadata = {
    projectId,
    userId,
    type,
    description,
    filesCount: backupData.metadata.filesCount,
    assetsCount: backupData.metadata.assetsCount,
    totalSize: backupData.metadata.totalSize,
    checksum,
    createdAt: new Date().toISOString(),
  };

  const { key } = await saveBackup(backupId, compressedData, metadata);

  // 7. Registrar no banco de dados (audit log)
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'backup_create',
      resource: projectId,
      metadata: {
        backupId,
        type,
        filesCount: backupData.metadata.filesCount,
        assetsCount: backupData.metadata.assetsCount,
        totalSize: backupData.metadata.totalSize,
        compressedSize: compressedData.length,
        checksum,
        storageKey: key,
      },
    },
  });

  return {
    id: backupId,
    projectId,
    type,
    description,
    filesCount: backupData.metadata.filesCount,
    assetsCount: backupData.metadata.assetsCount,
    totalSize: backupData.metadata.totalSize,
    compressedSize: compressedData.length,
    checksum,
    createdAt: new Date(),
    createdBy: userId,
    storageKey: key,
  };
}

/**
 * Listar backups de um projeto
 */
export async function listBackups(
  projectId: string,
  userId: string
): Promise<BackupInfo[]> {
  // Verificar acesso ao projeto
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Buscar backups do storage
  const storageBackups = await listProjectBackups(projectId, userId);

  // Enriquecer com dados do audit log
  const backups = await Promise.all(
    storageBackups.map(async (sb) => {
      // Buscar metadata do audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'backup_create',
          resource: projectId,
          metadata: {
            path: ['backupId'],
            equals: sb.backupId,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const metadata = auditLog?.metadata as Record<string, any> || {};

      return {
        id: sb.backupId,
        projectId,
        type: (metadata.type || 'manual') as BackupInfo['type'],
        description: metadata.description,
        filesCount: metadata.filesCount || 0,
        assetsCount: metadata.assetsCount || 0,
        totalSize: metadata.totalSize || 0,
        compressedSize: sb.size,
        checksum: metadata.checksum || '',
        createdAt: sb.createdAt,
        createdBy: userId,
        storageKey: metadata.storageKey,
      };
    })
  );

  // Ordenar por data (mais recente primeiro)
  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Restaurar backup
 */
export async function restoreBackup(
  backupId: string,
  projectId: string,
  userId: string,
  createPreRestoreBackup: boolean = true
): Promise<{
  restoredFiles: number;
  restoredAssets: number;
  preRestoreBackupId?: string;
}> {
  // 1. Verificar acesso ao projeto
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // 2. Criar backup de segurança antes de restaurar
  let preRestoreBackupId: string | undefined;
  if (createPreRestoreBackup) {
    const preBackup = await createBackup(projectId, userId, 'pre-restore', 'Backup automático antes de restauração');
    preRestoreBackupId = preBackup.id;
  }

  // 3. Carregar backup do storage
  const { data: compressedData, metadata } = await loadBackup(backupId, projectId, userId);

  // 4. Descomprimir
  const jsonData = await decompressData(compressedData);
  const backupData: BackupData = JSON.parse(jsonData);

  // 5. Validar checksum
  const currentChecksum = await calculateChecksum(compressedData);
  if (metadata.checksum && currentChecksum !== metadata.checksum) {
    throw new Error('Backup integrity check failed: checksum mismatch');
  }

  // 6. Restaurar em uma transação
  await prisma.$transaction(async (tx) => {
    // Deletar arquivos atuais
    await tx.file.deleteMany({ where: { projectId } });

    // Restaurar arquivos
    if (backupData.files.length > 0) {
      await tx.file.createMany({
        data: backupData.files.map(f => ({
          id: f.id,
          path: f.path,
          content: f.content,
          language: f.language,
          projectId,
        })),
      });
    }

    // Assets são referências a URLs, não precisam ser recriados
    // (os arquivos reais estão no storage)
  });

  // 7. Registrar restauração no audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'backup_restore',
      resource: projectId,
      metadata: {
        backupId,
        restoredFiles: backupData.files.length,
        restoredAssets: backupData.assets.length,
        preRestoreBackupId,
      },
    },
  });

  return {
    restoredFiles: backupData.files.length,
    restoredAssets: backupData.assets.length,
    preRestoreBackupId,
  };
}

/**
 * Deletar backup
 */
export async function deleteBackup(
  backupId: string,
  projectId: string,
  userId: string
): Promise<void> {
  // Verificar acesso ao projeto
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Deletar do storage
  await deleteBackupFromStorage(backupId, projectId, userId);

  // Registrar no audit log
  await prisma.auditLog.create({
    data: {
      adminId: userId,
      adminEmail: userId,
      adminRole: 'user',
      action: 'backup_delete',
      category: 'system',
      targetType: 'project',
      targetId: projectId,
      metadata: { backupId },
    },
  });
}

/**
 * Obter detalhes de um backup específico
 */
export async function getBackupDetails(
  backupId: string,
  projectId: string,
  userId: string
): Promise<BackupInfo | null> {
  const backups = await listBackups(projectId, userId);
  return backups.find(b => b.id === backupId) || null;
}

/**
 * Verificar integridade de um backup
 */
export async function verifyBackupIntegrity(
  backupId: string,
  projectId: string,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data: compressedData, metadata } = await loadBackup(backupId, projectId, userId);
    
    // Verificar checksum
    const currentChecksum = await calculateChecksum(compressedData);
    if (metadata.checksum && currentChecksum !== metadata.checksum) {
      return { valid: false, error: 'Checksum mismatch' };
    }

    // Tentar descomprimir para verificar integridade
    const jsonData = await decompressData(compressedData);
    const backupData: BackupData = JSON.parse(jsonData);

    // Verificar estrutura
    if (!backupData.version || !backupData.files || !backupData.assets) {
      return { valid: false, error: 'Invalid backup structure' };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}
