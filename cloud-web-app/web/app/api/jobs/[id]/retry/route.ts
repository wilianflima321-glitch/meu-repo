/**
 * AETHEL ENGINE - Job Retry API
 * 
 * Re-enfileira um job que falhou.
 * POST - Retry do job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const jobId = params.id;

    // Em produção, buscar job do banco e verificar se pode ser retried
    // Mock: criar novo job baseado no original

    const retriedJob = {
      id: `job-retry-${Date.now()}`,
      originalJobId: jobId,
      type: 'build',
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      retryCount: 1,
    };

    return NextResponse.json({
      success: true,
      message: 'Job re-enfileirado com sucesso',
      job: retriedJob,
    });
  } catch (error) {
    console.error('Erro ao retry job:', error);
    return NextResponse.json(
      { error: 'Falha ao retry job' },
      { status: 500 }
    );
  }
}
