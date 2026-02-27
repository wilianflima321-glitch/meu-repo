/**
 * Experiments/A-B Testing API - Aethel Engine
 * GET /api/experiments - Lista experimentos
 * POST /api/experiments - Cria experimento / Enroll / Conversion
 * 
 * MIGRADO: De Map() in-memory para PostgreSQL/Prisma
 * Dados agora são persistentes e suportam múltiplas instâncias.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'experiments-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many experiment read requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
    // Busca experimentos do banco de dados
    const experiments = await prisma.experiment.findMany({
      include: {
        variants: {
          select: {
            id: true,
            name: true,
            weight: true,
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calcula conversões por variante para cada experimento
    const experimentsWithStats = await Promise.all(
      experiments.map(async (exp) => {
        const conversions = await prisma.experimentConversion.groupBy({
          by: ['variantId'],
          where: { experimentId: exp.id },
          _count: true,
        });
        
        return {
          id: exp.id,
          name: exp.name,
          description: exp.description,
          status: exp.status,
          startDate: exp.startDate,
          endDate: exp.endDate,
          variants: exp.variants,
          enrollments: exp._count.enrollments,
          conversions: Object.fromEntries(
            conversions.map(c => [c.variantId, c._count])
          ),
          createdAt: exp.createdAt,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      experiments: experimentsWithStats,
    });
  } catch (error) {
    console.error('Failed to get experiments:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'experiments-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many experiment mutation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    
    const { action } = body;
    
    // === CRIAR EXPERIMENTO ===
    if (action === 'create') {
      const { name, description, variants } = body;
      
      if (!name || !variants || variants.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name and at least 2 variants are required' },
          { status: 400 }
        );
      }
      
      // Valida que pesos somam 100
      const totalWeight = variants.reduce((sum: number, v: { weight: number }) => sum + v.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        return NextResponse.json(
          { success: false, error: 'Variant weights must sum to 100' },
          { status: 400 }
        );
      }
      
      // Cria experimento no banco
      const experiment = await prisma.experiment.create({
        data: {
          name,
          description: description || '',
          status: 'draft',
          createdBy: user.userId,
          variants: {
            create: variants.map((v: { name: string; weight: number }) => ({
              name: v.name,
              weight: v.weight,
            })),
          },
        },
        include: {
          variants: {
            select: { id: true, name: true, weight: true },
          },
        },
      });
      
      return NextResponse.json({
        success: true,
        experiment: {
          id: experiment.id,
          name: experiment.name,
          description: experiment.description,
          status: experiment.status,
          variants: experiment.variants,
          enrollments: 0,
          conversions: {},
          createdAt: experiment.createdAt,
        },
      });
    }
    
    // === ATUALIZAR STATUS DO EXPERIMENTO ===
    if (action === 'update_status') {
      const { experimentId, status } = body;
      
      if (!experimentId || !status) {
        return NextResponse.json(
          { success: false, error: 'experimentId and status are required' },
          { status: 400 }
        );
      }
      
      const validStatuses = ['draft', 'running', 'paused', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      
      const experiment = await prisma.experiment.update({
        where: { id: experimentId },
        data: {
          status,
          startDate: status === 'running' ? new Date() : undefined,
          endDate: status === 'completed' ? new Date() : undefined,
        },
      });
      
      return NextResponse.json({
        success: true,
        experiment: {
          id: experiment.id,
          status: experiment.status,
          startDate: experiment.startDate,
          endDate: experiment.endDate,
        },
      });
    }
    
    // === ENROLL EM EXPERIMENTO ===
    if (action === 'enroll') {
      const { experimentId } = body;
      
      const experiment = await prisma.experiment.findUnique({
        where: { id: experimentId },
        include: {
          variants: true,
        },
      });
      
      if (!experiment) {
        return NextResponse.json(
          { success: false, error: 'Experiment not found' },
          { status: 404 }
        );
      }
      
      if (experiment.status !== 'running') {
        return NextResponse.json(
          { success: false, error: 'Experiment is not running' },
          { status: 400 }
        );
      }
      
      // Verifica se já está enrolled
      const existingEnrollment = await prisma.experimentEnrollment.findUnique({
        where: {
          userId_experimentId: {
            userId: user.userId,
            experimentId,
          },
        },
      });
      
      if (existingEnrollment) {
        return NextResponse.json({
          success: true,
          enrollment: {
            experimentId,
            variantId: existingEnrollment.variantId,
            enrolled: true,
            existing: true,
          },
        });
      }
      
      // Seleciona variante por peso
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedVariant = experiment.variants[0];
      
      for (const variant of experiment.variants) {
        cumulative += variant.weight;
        if (random < cumulative) {
          selectedVariant = variant;
          break;
        }
      }
      
      // Cria enrollment no banco
      const enrollment = await prisma.experimentEnrollment.create({
        data: {
          userId: user.userId,
          experimentId,
          variantId: selectedVariant.id,
        },
      });
      
      return NextResponse.json({
        success: true,
        enrollment: {
          experimentId,
          variantId: enrollment.variantId,
          enrolled: true,
          existing: false,
        },
      });
    }
    
    // === REGISTRAR CONVERSÃO ===
    if (action === 'conversion') {
      const { experimentId, value } = body;
      
      const experiment = await prisma.experiment.findUnique({
        where: { id: experimentId },
      });
      
      if (!experiment) {
        return NextResponse.json(
          { success: false, error: 'Experiment not found' },
          { status: 404 }
        );
      }
      
      // Verifica enrollment do usuário
      const enrollment = await prisma.experimentEnrollment.findUnique({
        where: {
          userId_experimentId: {
            userId: user.userId,
            experimentId,
          },
        },
      });
      
      if (!enrollment) {
        return NextResponse.json(
          { success: false, error: 'User not enrolled in experiment' },
          { status: 400 }
        );
      }
      
      // Registra conversão no banco
      await prisma.experimentConversion.create({
        data: {
          userId: user.userId,
          experimentId,
          variantId: enrollment.variantId,
          value: value ?? null,
        },
      });
      
      // Log para analytics
      await prisma.analyticsEvent.create({
        data: {
          userId: user.userId,
          event: 'experiment_conversion',
          category: 'experiment',
          properties: {
            experimentId,
            variantId: enrollment.variantId,
            value,
          },
        },
      }).catch(console.error);
      
      return NextResponse.json({
        success: true,
        conversion: {
          experimentId,
          variantId: enrollment.variantId,
          recorded: true,
        },
      });
    }
    
    // === OBTER VARIANTE DO USUÁRIO (para renderização condicional) ===
    if (action === 'get_variant') {
      const { experimentId } = body;
      
      const enrollment = await prisma.experimentEnrollment.findUnique({
        where: {
          userId_experimentId: {
            userId: user.userId,
            experimentId,
          },
        },
        include: {
          variant: {
            select: { id: true, name: true },
          },
        },
      });
      
      if (!enrollment) {
        return NextResponse.json({
          success: true,
          variant: null,
          enrolled: false,
        });
      }
      
      return NextResponse.json({
        success: true,
        variant: enrollment.variant,
        enrolled: true,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Valid actions: create, update_status, enroll, conversion, get_variant' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process experiment:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
