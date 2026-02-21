/**
 * Project Export API
 * 
 * Exportação de projetos em múltiplos formatos:
 * - Standalone executável (Windows, macOS, Linux)
 * - Web (HTML5/WebGL)
 * - Mobile (iOS, Android)
 * - Source (ZIP com código fonte)
 * 
 * POST /api/projects/[id]/export - Iniciar exportação
 * GET /api/projects/[id]/export/[exportId] - Status da exportação
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-server';
import { getQueueRedis } from '@/lib/redis-queue';
import { nanoid } from 'nanoid';
import { checkProjectAccess } from '@/lib/project-access';
import { deductBuildMinutes } from '@/lib/build-minutes';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';
const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

// ============================================================================
// SCHEMAS
// ============================================================================

const ExportRequestSchema = z.object({
  platform: z.enum([
    'windows',
    'macos', 
    'linux',
    'web',
    'ios',
    'android',
    'source',
  ]),
  
  configuration: z.enum(['debug', 'release', 'distribution']).default('release'),
  
  options: z.object({
    // Comum
    appName: z.string().optional(),
    appVersion: z.string().optional(),
    appIcon: z.string().optional(),
    
    // Desktop
    architecture: z.enum(['x64', 'arm64', 'universal']).optional(),
    includeDebugSymbols: z.boolean().optional(),
    compression: z.enum(['none', 'lz4', 'zstd']).optional(),
    
    // Web
    webglVersion: z.enum(['webgl1', 'webgl2', 'webgpu']).optional(),
    wasmThreads: z.boolean().optional(),
    
    // Mobile
    bundleId: z.string().optional(),
    minSdkVersion: z.number().optional(),
    targetSdkVersion: z.number().optional(),
    signingKey: z.string().optional(),
    
    // Source
    includeAssets: z.boolean().optional(),
    excludePatterns: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// TIPOS
// ============================================================================

export type ExportPlatform = z.infer<typeof ExportRequestSchema>['platform'];
export type ExportConfiguration = z.infer<typeof ExportRequestSchema>['configuration'];

export interface ExportJob {
  id: string;
  projectId: string;
  userId: string;
  platform: ExportPlatform;
  configuration: ExportConfiguration;
  options: Record<string, any>;
  status: 'queued' | 'preparing' | 'building' | 'packaging' | 'uploading' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  logs: string[];
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  fileSize?: number;
  buildMinutesUsed?: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// CUSTOS DE BUILD (em minutos)
// ============================================================================

const BUILD_COSTS: Record<ExportPlatform, number> = {
  windows: 5,
  macos: 8,
  linux: 4,
  web: 3,
  ios: 10,
  android: 6,
  source: 1,
};

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    const redis = await getQueueRedis();

    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-export-post',
      key: decoded.userId || getRequestIp(request),
      max: 20,
      windowMs: 60 * 60 * 1000,
      message: 'Too many export creation attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = normalizeProjectId(params?.id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    // Verifica acesso ao projeto
    const access = await checkProjectAccess(decoded.userId, projectId, 'export');
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: 403 }
      );
    }

    // Valida request
    const body = await request.json();
    const data = ExportRequestSchema.parse(body);

    // Busca projeto
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        userId: true,
        settings: true,
        lastBuildAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verifica minutos de build disponíveis
    const estimatedMinutes = BUILD_COSTS[data.platform];
    const buildMinutes = await deductBuildMinutes(decoded.userId, estimatedMinutes, {
      type: 'reservation',
      projectId,
      platform: data.platform,
    });

    if (!buildMinutes.success) {
      return NextResponse.json(
        { 
          error: 'Insufficient build minutes',
          available: buildMinutes.available,
          required: estimatedMinutes,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    // Cria job de exportação
    const exportId = nanoid();
    const job: ExportJob = {
      id: exportId,
      projectId,
      userId: decoded.userId,
      platform: data.platform,
      configuration: data.configuration,
      options: data.options || {},
      status: 'queued',
      progress: 0,
      currentStep: 'Queued',
      logs: [],
      createdAt: new Date(),
    };

    // Salva no Redis
    await redis.set(
      `export:${exportId}`,
      JSON.stringify(job),
      'EX',
      86400 // 24 horas
    );

    // Adiciona à fila de build
    await redis.lpush('build-queue', JSON.stringify({
      type: 'export',
      exportId,
      projectId,
      userId: decoded.userId,
      platform: data.platform,
      configuration: data.configuration,
      options: data.options,
      reservationId: buildMinutes.reservationId,
    }));

    // Registra na base de dados
    await prisma.exportJob.create({
      data: {
        id: exportId,
        projectId,
        userId: decoded.userId,
        platform: data.platform,
        configuration: data.configuration,
        options: data.options as any,
        status: 'queued',
      },
    });

    const wsBaseUrl = process.env.AETHEL_WS_URL || 'ws://localhost:3001';
    const websocketUrl = new URL(`/export/${exportId}`, wsBaseUrl).toString();

    return NextResponse.json({
      success: true,
      export: {
        id: exportId,
        status: 'queued',
        platform: data.platform,
        configuration: data.configuration,
        estimatedMinutes,
        position: await redis.llen('build-queue'),
      },
      statusUrl: `/api/projects/${projectId}/export/${exportId}`,
      websocketUrl,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
        
    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-export-list-get',
      key: decoded.userId || getRequestIp(request),
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many export list requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = normalizeProjectId(params?.id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    // Lista exports recentes do projeto
    const exports = await prisma.exportJob.findMany({
      where: {
        projectId,
        userId: decoded.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        platform: true,
        configuration: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Adiciona dados do Redis para exports ativos
    let redis: any = null;
    try {
      redis = await getQueueRedis();
    } catch {
      redis = null;
    }

    const exportsWithDetails = await Promise.all(
      exports.map(async (exp) => {
        if (['queued', 'preparing', 'building', 'packaging', 'uploading'].includes(exp.status)) {
          if (redis) {
            const jobData = await redis.get(`export:${exp.id}`);
            if (jobData) {
              const job = JSON.parse(jobData) as ExportJob;
              return {
                ...exp,
                progress: job.progress,
                currentStep: job.currentStep,
              };
            }
          }
        }
        return exp;
      })
    );

    return NextResponse.json({
      exports: exportsWithDetails,
    });

  } catch (error) {
    console.error('List exports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
