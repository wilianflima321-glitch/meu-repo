/**
 * AETHEL ENGINE - Jobs Queue API
 * 
 * Gerencia filas de trabalho (build, render, export, etc).
 * MIGRADO: De Map() in-memory para PostgreSQL/Prisma
 * 
 * GET - Lista jobs
 * POST - Cria novo job
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type JobType = 'build' | 'render' | 'export' | 'import' | 'compress' | 'upload' | 'ai-generation' | 'asset-import';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { userId: payload.userId };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (type && type !== 'all') {
      where.type = type;
    }

    const jobs = await prisma.backgroundJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Calcular estatísticas
    const stats = await prisma.backgroundJob.groupBy({
      by: ['status'],
      where: { userId: payload.userId },
      _count: { status: true },
    });

    const statsMap = {
      total: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    stats.forEach(s => {
      statsMap[s.status as keyof typeof statsMap] = s._count.status;
      statsMap.total += s._count.status;
    });

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        projectId: job.projectId,
        currentStep: job.currentStep,
        error: job.error,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        metadata: job.input,
      })),
      stats: statsMap,
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
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { type, projectId, metadata, priority = 0 } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Tipo de job é obrigatório' },
        { status: 400 }
      );
    }

    const validTypes: JobType[] = ['build', 'render', 'export', 'import', 'compress', 'upload', 'ai-generation', 'asset-import'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo inválido. Use: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const job = await prisma.backgroundJob.create({
      data: {
        type,
        status: 'queued',
        priority,
        userId: payload.userId,
        projectId,
        input: metadata || {},
        progress: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Job criado com sucesso',
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        projectId: job.projectId,
        createdAt: job.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Erro ao criar job:', error);
    return NextResponse.json(
      { error: 'Falha ao criar job' },
      { status: 500 }
    );
  }
}
