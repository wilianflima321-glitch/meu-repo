/**
 * Backup Restore API - Aethel Engine
 * POST /api/backup/restore - Restaura um backup
 * 
 * IMPLEMENTAÇÃO REAL - Restaura arquivos do storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { restoreBackup, verifyBackupIntegrity } from '@/lib/backup-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { backupId, projectId, skipPreBackup = false, verifyFirst = true } = body;
    
    if (!backupId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Backup ID and Project ID are required' },
        { status: 400 }
      );
    }
    
    // Verificar integridade antes de restaurar (opcional mas recomendado)
    if (verifyFirst) {
      const integrity = await verifyBackupIntegrity(backupId, projectId, user.userId);
      if (!integrity.valid) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Backup integrity check failed: ${integrity.error}`,
            code: 'INTEGRITY_FAILED'
          },
          { status: 400 }
        );
      }
    }
    
    // Restaurar backup
    const result = await restoreBackup(
      backupId, 
      projectId, 
      user.userId,
      !skipPreBackup // createPreRestoreBackup
    );
    
    return NextResponse.json({
      success: true,
      restored: true,
      backupId,
      projectId,
      restoredFiles: result.restoredFiles,
      restoredAssets: result.restoredAssets,
      preRestoreBackupId: result.preRestoreBackupId,
      restoredAt: new Date(),
      message: `Successfully restored ${result.restoredFiles} files and ${result.restoredAssets} assets.${
        result.preRestoreBackupId ? ` Pre-restore backup created: ${result.preRestoreBackupId}` : ''
      }`,
    });
  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    
    if (error.message === 'Project not found or access denied') {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    if (error.message?.includes('checksum mismatch')) {
      return NextResponse.json(
        { success: false, error: 'Backup integrity check failed', code: 'INTEGRITY_FAILED' },
        { status: 400 }
      );
    }
    
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
