/**
 * AETHEL ENGINE - Jobs Queue API
 * 
 * Gerencia filas de trabalho (build, render, export, etc).
 * GET - Lista jobs
 * POST - Cria novo job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
type JobType = 'build' | 'render' | 'export' | 'import' | 'compress' | 'upload';

interface Job {
  id: string;
  type: JobType;
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

// Store em memória (em produção usar Redis/PostgreSQL)
const jobsStore: Map<string, Job> = new Map();

// Inicializar com alguns jobs de exemplo
function initializeSampleJobs() {
  if (jobsStore.size === 0) {
    const now = Date.now();
    const sampleJobs: Job[] = [
      {
        id: 'job-1',
        type: 'build',
        status: 'completed',
        progress: 100,
        projectId: 'proj-1',
        projectName: 'Meu Jogo RPG',
        createdAt: new Date(now - 3600000).toISOString(),
        startedAt: new Date(now - 3500000).toISOString(),
        completedAt: new Date(now - 3400000).toISOString(),
      },
      {
        id: 'job-2',
        type: 'render',
        status: 'processing',
        progress: 45,
        projectId: 'proj-2',
        projectName: 'Cinemática Intro',
        createdAt: new Date(now - 1800000).toISOString(),
        startedAt: new Date(now - 1700000).toISOString(),
      },
      {
        id: 'job-3',
        type: 'export',
        status: 'queued',
        progress: 0,
        projectId: 'proj-1',
        projectName: 'Meu Jogo RPG',
        createdAt: new Date(now - 600000).toISOString(),
      },
    ];
    
    sampleJobs.forEach(job => jobsStore.set(job.id, job));
  }
}

initializeSampleJobs();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    let jobs = Array.from(jobsStore.values());

    // Filtrar por status
    if (status && status !== 'all') {
      jobs = jobs.filter(job => job.status === status);
    }

    // Filtrar por tipo
    if (type && type !== 'all') {
      jobs = jobs.filter(job => job.type === type);
    }

    // Ordenar por data de criação (mais recentes primeiro)
    jobs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Limitar resultados
    jobs = jobs.slice(0, limit);

    // Calcular estatísticas
    const allJobs = Array.from(jobsStore.values());
    const stats = {
      total: allJobs.length,
      queued: allJobs.filter(j => j.status === 'queued').length,
      processing: allJobs.filter(j => j.status === 'processing').length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      failed: allJobs.filter(j => j.status === 'failed').length,
    };

    return NextResponse.json({
      jobs,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao listar jobs:', error);
    return NextResponse.json(
      { error: 'Falha ao listar jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, projectId, projectName, metadata } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Tipo de job é obrigatório' },
        { status: 400 }
      );
    }

    const validTypes: JobType[] = ['build', 'render', 'export', 'import', 'compress', 'upload'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo inválido. Use: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const job: Job = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'queued',
      progress: 0,
      projectId,
      projectName,
      createdAt: new Date().toISOString(),
      metadata,
    };

    jobsStore.set(job.id, job);

    return NextResponse.json({
      success: true,
      message: 'Job criado com sucesso',
      job,
    });
  } catch (error) {
    console.error('Erro ao criar job:', error);
    return NextResponse.json(
      { error: 'Falha ao criar job' },
      { status: 500 }
    );
  }
}
