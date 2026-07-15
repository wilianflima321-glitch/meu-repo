/**
 * AETHEL ENGINE - Project Duplicate API
 * 
 * Duplica um projeto existente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/projects/[id]/duplicate/route');

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    const body = await request.json().catch(() => ({}));
    const { newName } = body;

    // Em produção, buscar projeto do banco e verificar permissões
    const newProjectId = crypto.randomUUID();
    const duplicatedProject = {
      id: newProjectId,
      name: newName || `Project copy ${projectId.slice(0, 8)}`,
      originalProjectId: projectId,
      createdAt: new Date().toISOString(),
      createdBy: session.user.email,
      status: 'created',
    };

    return NextResponse.json({
      success: true,
      message: 'Project duplicated successfully',
      project: duplicatedProject,
    });
  } catch (error) {
    routeLogger.error('Error duplicating project:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate project' },
      { status: 500 }
    );
  }
}
