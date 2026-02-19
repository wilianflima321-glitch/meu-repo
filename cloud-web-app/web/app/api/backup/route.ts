/**
 * Backup API - Aethel Engine
 * GET /api/backup - Lista backups do projeto
 * POST /api/backup - Cria backup
 * DELETE /api/backup - Deleta backup
 * 
 * IMPLEMENTAÇÃO REAL - Usa S3/MinIO para storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { 
  createBackup, 
  listBackups, 
  deleteBackup, 
  getBackupDetails,
  verifyBackupIntegrity 
} from '@/lib/backup-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'backup-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many backup listing requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const backupId = searchParams.get('backupId');
    const action = searchParams.get('action');
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Se backupId fornecido, retornar detalhes específicos
    if (backupId) {
      // Verificar integridade se solicitado
      if (action === 'verify') {
        const result = await verifyBackupIntegrity(backupId, projectId, user.userId);
        return NextResponse.json({ success: true, ...result });
      }
      
      const backup = await getBackupDetails(backupId, projectId, user.userId);
      if (!backup) {
        return NextResponse.json(
          { success: false, error: 'Backup not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, backup });
    }
    
    // Listar todos os backups do projeto
    const backups = await listBackups(projectId, user.userId);
    
    return NextResponse.json({
      success: true,
      projectId,
      backups,
      count: backups.length,
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'backup-post',
      key: user.userId,
      max: 40,
      windowMs: 60 * 60 * 1000,
      message: 'Too many backup creation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    const { projectId, type = 'manual', description } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Validar tipo de backup
    if (!['manual', 'auto'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup type. Use "manual" or "auto"' },
        { status: 400 }
      );
    }
    
    // Criar backup real usando o serviço
    const backup = await createBackup(
      projectId, 
      user.userId, 
      type as 'manual' | 'auto', 
      description
    );
    
    return NextResponse.json({
      success: true,
      backup,
      message: `Backup created successfully. ${backup.filesCount} files, ${backup.assetsCount} assets backed up.`,
    });
  } catch (error: any) {
    console.error('Failed to create backup:', error);
    
    if (error.message === 'Project not found or access denied') {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'backup-delete',
      key: user.userId,
      max: 80,
      windowMs: 60 * 60 * 1000,
      message: 'Too many backup delete requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const backupId = searchParams.get('backupId');
    
    if (!projectId || !backupId) {
      return NextResponse.json(
        { success: false, error: 'Project ID and Backup ID are required' },
        { status: 400 }
      );
    }
    
    await deleteBackup(backupId, projectId, user.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete backup:', error);
    
    if (error.message === 'Project not found or access denied') {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
