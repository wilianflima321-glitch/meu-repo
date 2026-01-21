/**
 * AETHEL ENGINE - Job Individual API
 * 
 * Gerencia operações em um job específico.
 * GET - Detalhes do job
 * DELETE - Cancela o job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Referência ao store (em produção usar banco de dados)
// Esta é uma simplificação - em produção, seria um serviço compartilhado
const getJob = (id: string): Job | undefined => {
  // Mock de busca
  const mockJobs: Record<string, Job> = {
    'job-1': {
      id: 'job-1',
      type: 'build',
      status: 'completed',
      progress: 100,
      projectId: 'proj-1',
      projectName: 'Meu Jogo RPG',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      startedAt: new Date(Date.now() - 3500000).toISOString(),
      completedAt: new Date(Date.now() - 3400000).toISOString(),
    },
  };
  return mockJobs[id];
};

export async function GET(
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
    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Erro ao buscar job:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job não encontrado' },
        { status: 404 }
      );
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Job já finalizado, não pode ser cancelado' },
        { status: 400 }
      );
    }

    // Em produção, atualizar status no banco
    return NextResponse.json({
      success: true,
      message: 'Job cancelado com sucesso',
      job: { ...job, status: 'cancelled' as JobStatus },
    });
  } catch (error) {
    console.error('Erro ao cancelar job:', error);
    return NextResponse.json(
      { error: 'Falha ao cancelar job' },
      { status: 500 }
    );
  }
}
