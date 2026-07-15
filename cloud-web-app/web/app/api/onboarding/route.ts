/**
 * Onboarding API - Aethel Engine
 * GET /api/onboarding - gets the current onboarding status
 * POST /api/onboarding - updates onboarding progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { createComponentLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

const routeLogger = createComponentLogger('api-onboarding');

type OnboardingProgressState = {
  currentStep: string;
  completedSteps: string[];
  completedTours: string[];
  achievements: string[];
  stats: Record<string, number>;
  startedAt: Date;
};

// Local fallback for environments where the DB table is not available yet.
const onboardingProgress = new Map<string, OnboardingProgressState>();

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

function createDefaultProgress(): OnboardingProgressState {
  return {
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
}

function normalizeStats(stats: unknown): Record<string, number> {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
    return {};
  }

  return Object.entries(stats as Record<string, unknown>).reduce<Record<string, number>>(
    (accumulator, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        accumulator[key] = value;
      }
      return accumulator;
    },
    {}
  );
}

function serializeOnboarding(progress: OnboardingProgressState) {
  return {
    ...progress,
    totalSteps: ONBOARDING_STEPS.length,
    progressPercent: Math.round(
      (progress.completedSteps.length / (ONBOARDING_STEPS.length - 1)) * 100
    ),
  };
}

async function loadOnboardingProgress(userId: string): Promise<OnboardingProgressState> {
  try {
    const persisted = await prisma.onboardingProgress.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        ...createDefaultProgress(),
      },
    });

    return {
      currentStep: persisted.currentStep,
      completedSteps: persisted.completedSteps,
      completedTours: persisted.completedTours,
      achievements: persisted.achievements,
      stats: normalizeStats(persisted.stats),
      startedAt: persisted.startedAt,
    };
  } catch (error) {
    const fallback = onboardingProgress.get(userId) ?? createDefaultProgress();
    onboardingProgress.set(userId, fallback);
    routeLogger.warn('Falling back to in-memory onboarding progress store', error, {
      action: 'load',
      userId,
    });
    return fallback;
  }
}

async function persistOnboardingProgress(
  userId: string,
  progress: OnboardingProgressState
): Promise<OnboardingProgressState> {
  onboardingProgress.set(userId, progress);

  try {
    const persisted = await prisma.onboardingProgress.upsert({
      where: { userId },
      update: {
        currentStep: progress.currentStep,
        completedSteps: progress.completedSteps,
        completedTours: progress.completedTours,
        achievements: progress.achievements,
        stats: progress.stats,
      },
      create: {
        userId,
        currentStep: progress.currentStep,
        completedSteps: progress.completedSteps,
        completedTours: progress.completedTours,
        achievements: progress.achievements,
        stats: progress.stats,
        startedAt: progress.startedAt,
      },
    });

    return {
      currentStep: persisted.currentStep,
      completedSteps: persisted.completedSteps,
      completedTours: persisted.completedTours,
      achievements: persisted.achievements,
      stats: normalizeStats(persisted.stats),
      startedAt: persisted.startedAt,
    };
  } catch (error) {
    routeLogger.warn('Persisting onboarding progress fell back to memory store', error, {
      action: 'persist',
      userId,
    });
    return progress;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const progress = await loadOnboardingProgress(user.userId);

    return NextResponse.json({
      success: true,
      onboarding: serializeOnboarding(progress),
    });
  } catch (error) {
    routeLogger.error('Failed to get onboarding', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();

    const { action, step, tour, achievement, stat, value } = body;
    const progress = await loadOnboardingProgress(user.userId);

    switch (action) {
      case 'complete_step':
        if (step && !progress.completedSteps.includes(step)) {
          progress.completedSteps.push(step);

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

    const persistedProgress = await persistOnboardingProgress(user.userId, progress);

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: `onboarding.${action}`,
        metadata: { step, tour, achievement, stat },
      },
    }).catch((error) => {
      routeLogger.warn('Failed to persist onboarding audit log', error, {
        action,
        userId: user.userId,
      });
    });

    return NextResponse.json({
      success: true,
      onboarding: serializeOnboarding(persistedProgress),
    });
  } catch (error) {
    routeLogger.error('Failed to update onboarding', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
