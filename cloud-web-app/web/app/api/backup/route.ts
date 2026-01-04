/**
 * Backup API - Aethel Engine
 * GET /api/backup - Lista backups do projeto
 * POST /api/backup - Cria backup
 * POST /api/backup/restore - Restaura backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Verifica se projeto pertence ao usuário
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
    });
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Em produção, buscar backups do storage
    // Por enquanto, retorna lista vazia
    const backups: any[] = [];
    
    return NextResponse.json({
      success: true,
      projectId,
      backups,
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
    const body = await request.json();
    const { projectId, type = 'manual', description } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Verifica se projeto pertence ao usuário
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      include: {
        files: true,
        assets: true,
      },
    });
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Cria backup snapshot
    const backup = {
      id: `backup_${Date.now()}`,
      projectId,
      type,
      description: description || `Backup ${type} - ${new Date().toISOString()}`,
      filesCount: project.files.length,
      assetsCount: project.assets.length,
      size: project.files.reduce((acc, f) => acc + f.content.length, 0),
      createdAt: new Date(),
      createdBy: user.userId,
    };
    
    // Em produção, salvar snapshot real em storage
    
    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'backup_create',
        resource: projectId,
        metadata: { backupId: backup.id, type },
      },
    });
    
    return NextResponse.json({
      success: true,
      backup,
    });
  } catch (error) {
    console.error('Failed to create backup:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
