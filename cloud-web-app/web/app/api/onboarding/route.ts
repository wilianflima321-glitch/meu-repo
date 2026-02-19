/**
 * Onboarding API - Aethel Engine
 * GET /api/onboarding - Obtém status do onboarding do usuário
 * POST /api/onboarding - Atualiza progresso do onboarding
 * POST /api/onboarding/complete - Marca step como completo
 * 
 * Integra com o sistema de onboarding em lib/onboarding-system.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

// Armazena progresso de onboarding (em produção, usar Redis ou DB)
const onboardingProgress = new Map<string, {
  currentStep: string;
  completedSteps: string[];
  completedTours: string[];
  achievements: string[];
  stats: Record<string, number>;
  startedAt: Date;
}>();

const ONBOARDING_STEPS = [
  'welcome',
  'dependency_check',
  'profile_setup',
  'first_project',
  'explore_editor',
  'try_ai',
  'invite_team',
  'publish_first',
  'completed',
];

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'onboarding-get',
      key: user.userId,
      max: 600,
      windowMs: 60 * 60 * 1000,
      message: 'Too many onboarding status requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
    let progress = onboardingProgress.get(user.userId);
    
    if (!progress) {
      // Inicializa progresso padrão
      progress = {
        currentStep: 'welcome',
        completedSteps: [],
        completedTours: [],
        achievements: [],
        stats: {
          projectsCreated: 0,
          filesCreated: 0,
          aiPromptsUsed: 0,
          exportsCompleted: 0,
        },
        startedAt: new Date(),
      };
      onboardingProgress.set(user.userId, progress);
    }
    
    return NextResponse.json({
      success: true,
      onboarding: {
        ...progress,
        totalSteps: ONBOARDING_STEPS.length,
        progressPercent: Math.round((progress.completedSteps.length / (ONBOARDING_STEPS.length - 1)) * 100),
      },
    });
  } catch (error) {
    console.error('Failed to get onboarding:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'onboarding-post',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many onboarding update requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    
    const { action, step, tour, achievement, stat, value } = body;
    
    let progress = onboardingProgress.get(user.userId);
    if (!progress) {
      progress = {
        currentStep: 'welcome',
        completedSteps: [],
        completedTours: [],
        achievements: [],
        stats: {},
        startedAt: new Date(),
      };
    }
    
    switch (action) {
      case 'complete_step':
        if (step && !progress.completedSteps.includes(step)) {
          progress.completedSteps.push(step);
          
          // Avança para próximo step
          const currentIndex = ONBOARDING_STEPS.indexOf(progress.currentStep);
          if (currentIndex < ONBOARDING_STEPS.length - 1) {
            progress.currentStep = ONBOARDING_STEPS[currentIndex + 1];
          }
        }
        break;
        
      case 'complete_tour':
        if (tour && !progress.completedTours.includes(tour)) {
          progress.completedTours.push(tour);
        }
        break;
        
      case 'unlock_achievement':
        if (achievement && !progress.achievements.includes(achievement)) {
          progress.achievements.push(achievement);
        }
        break;
        
      case 'increment_stat':
        if (stat) {
          progress.stats[stat] = (progress.stats[stat] || 0) + (value || 1);
        }
        break;
        
      case 'skip':
        progress.currentStep = 'completed';
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    onboardingProgress.set(user.userId, progress);
    
    // Log da ação
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: `onboarding.${action}`,
        metadata: { step, tour, achievement, stat },
      },
    }).catch(console.error);
    
    return NextResponse.json({
      success: true,
      onboarding: {
        ...progress,
        totalSteps: ONBOARDING_STEPS.length,
        progressPercent: Math.round((progress.completedSteps.length / (ONBOARDING_STEPS.length - 1)) * 100),
      },
    });
  } catch (error) {
    console.error('Failed to update onboarding:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
