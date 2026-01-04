/**
 * Experiments/A-B Testing API - Aethel Engine
 * GET /api/experiments - Lista experimentos
 * POST /api/experiments - Cria experimento
 * POST /api/experiments/enroll - Entra em experimento
 * POST /api/experiments/conversion - Registra conversão
 * 
 * Integra com o sistema de feature flags em lib/feature-flags.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Armazena experimentos e enrollments (em produção, usar Redis ou DB)
const experiments = new Map<string, {
  id: string;
  name: string;
  description: string;
  variants: Array<{ id: string; name: string; weight: number }>;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: Date;
  endDate?: Date;
  enrollments: number;
  conversions: Map<string, number>; // variant -> count
}>();

const userEnrollments = new Map<string, Map<string, string>>(); // userId -> experimentId -> variantId

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    
    const experimentList = Array.from(experiments.values()).map(exp => ({
      id: exp.id,
      name: exp.name,
      description: exp.description,
      variants: exp.variants,
      status: exp.status,
      startDate: exp.startDate,
      endDate: exp.endDate,
      enrollments: exp.enrollments,
      conversions: Object.fromEntries(exp.conversions),
    }));
    
    return NextResponse.json({
      success: true,
      experiments: experimentList,
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
    const body = await request.json();
    
    const { action } = body;
    
    // Criar experimento
    if (action === 'create') {
      const { name, description, variants } = body;
      
      if (!name || !variants || variants.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name and at least 2 variants are required' },
          { status: 400 }
        );
      }
      
      const id = `exp_${Date.now()}`;
      const experiment = {
        id,
        name,
        description: description || '',
        variants,
        status: 'draft' as const,
        enrollments: 0,
        conversions: new Map<string, number>(),
      };
      
      experiments.set(id, experiment);
      
      return NextResponse.json({
        success: true,
        experiment: {
          ...experiment,
          conversions: Object.fromEntries(experiment.conversions),
        },
      });
    }
    
    // Enroll em experimento
    if (action === 'enroll') {
      const { experimentId } = body;
      
      const experiment = experiments.get(experimentId);
      if (!experiment) {
        return NextResponse.json(
          { success: false, error: 'Experiment not found' },
          { status: 404 }
        );
      }
      
      // Verifica se já está enrolled
      let userExps = userEnrollments.get(user.userId);
      if (!userExps) {
        userExps = new Map();
        userEnrollments.set(user.userId, userExps);
      }
      
      let variantId = userExps.get(experimentId);
      
      if (!variantId) {
        // Seleciona variante por peso
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const variant of experiment.variants) {
          cumulative += variant.weight;
          if (random < cumulative) {
            variantId = variant.id;
            break;
          }
        }
        
        if (!variantId) {
          variantId = experiment.variants[0].id;
        }
        
        userExps.set(experimentId, variantId);
        experiment.enrollments++;
      }
      
      return NextResponse.json({
        success: true,
        enrollment: {
          experimentId,
          variantId,
          enrolled: true,
        },
      });
    }
    
    // Registrar conversão
    if (action === 'conversion') {
      const { experimentId, value } = body;
      
      const experiment = experiments.get(experimentId);
      if (!experiment) {
        return NextResponse.json(
          { success: false, error: 'Experiment not found' },
          { status: 404 }
        );
      }
      
      const userExps = userEnrollments.get(user.userId);
      const variantId = userExps?.get(experimentId);
      
      if (!variantId) {
        return NextResponse.json(
          { success: false, error: 'User not enrolled in experiment' },
          { status: 400 }
        );
      }
      
      const currentConversions = experiment.conversions.get(variantId) || 0;
      experiment.conversions.set(variantId, currentConversions + 1);
      
      // Log para analytics
      await prisma.analyticsEvent.create({
        data: {
          userId: user.userId,
          event: 'experiment_conversion',
          category: 'experiment',
          properties: {
            experimentId,
            variantId,
            value,
          },
        },
      }).catch(console.error);
      
      return NextResponse.json({
        success: true,
        conversion: {
          experimentId,
          variantId,
          recorded: true,
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process experiment:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
