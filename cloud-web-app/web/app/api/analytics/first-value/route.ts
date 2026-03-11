/**
 * Onboarding Analytics & First-Value Tracking
 *
 * POST /api/analytics/first-value - Track onboarding funnel events
 * GET  /api/analytics/first-value - Get user's first-value metrics
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P1: Onboarding)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

type FirstValueStep =
  | 'landing_view'
  | 'signup_start'
  | 'signup_complete'
  | 'onboarding_start'
  | 'template_selected'
  | 'first_ai_request'
  | 'first_ai_success'
  | 'first_preview_open'
  | 'first_ide_open'
  | 'first_deploy'
  | 'first_value_achieved';

interface FirstValueEvent {
  step: FirstValueStep;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface UserFunnel {
  userId: string;
  events: FirstValueEvent[];
  startedAt: number;
  firstValueAt: number | null;
  timeToFirstValueMs: number | null;
  currentStep: FirstValueStep;
  completionPercent: number;
}

// ============================================================================
// IN-MEMORY STORE (use DB in production)
// ============================================================================

const funnelStore = new Map<string, UserFunnel>();

const STEP_ORDER: FirstValueStep[] = [
  'landing_view',
  'signup_start',
  'signup_complete',
  'onboarding_start',
  'template_selected',
  'first_ai_request',
  'first_ai_success',
  'first_preview_open',
  'first_ide_open',
  'first_deploy',
  'first_value_achieved',
];

const STEP_WEIGHTS: Record<FirstValueStep, number> = {
  landing_view: 5,
  signup_start: 10,
  signup_complete: 20,
  onboarding_start: 25,
  template_selected: 35,
  first_ai_request: 50,
  first_ai_success: 65,
  first_preview_open: 75,
  first_ide_open: 85,
  first_deploy: 95,
  first_value_achieved: 100,
};

// SLO targets from docs/master/37
const SLO_TARGETS = {
  firstAction: { p50: 30_000, p95: 60_000 },      // 30s / 60s
  firstAiSuccess: { p50: 90_000, p95: 180_000 },   // 90s / 180s
  firstPreview: { p50: 120_000, p95: 300_000 },     // 2min / 5min
  firstDeploy: { p50: 300_000, p95: 600_000 },      // 5min / 10min
};

// ============================================================================
// HANDLERS
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, step, metadata } = body;

    if (!userId || !step) {
      return NextResponse.json(
        { error: 'userId and step are required' },
        { status: 400 }
      );
    }

    if (!STEP_ORDER.includes(step)) {
      return NextResponse.json(
        { error: `Invalid step. Valid steps: ${STEP_ORDER.join(', ')}` },
        { status: 400 }
      );
    }

    const now = Date.now();
    let funnel = funnelStore.get(userId);

    if (!funnel) {
      funnel = {
        userId,
        events: [],
        startedAt: now,
        firstValueAt: null,
        timeToFirstValueMs: null,
        currentStep: step,
        completionPercent: 0,
      };
      funnelStore.set(userId, funnel);
    }

    // Add event
    funnel.events.push({
      step,
      timestamp: now,
      metadata,
    });

    // Update current step (highest reached)
    const currentWeight = STEP_WEIGHTS[funnel.currentStep] || 0;
    const newWeight = STEP_WEIGHTS[step] || 0;
    if (newWeight > currentWeight) {
      funnel.currentStep = step;
      funnel.completionPercent = newWeight;
    }

    // Check first-value achievement
    if (step === 'first_value_achieved' && !funnel.firstValueAt) {
      funnel.firstValueAt = now;
      funnel.timeToFirstValueMs = now - funnel.startedAt;
    }

    // Calculate step-specific timings
    const timings: Record<string, number | null> = {};
    const signupEvent = funnel.events.find((e) => e.step === 'signup_complete');
    if (signupEvent) {
      const aiEvent = funnel.events.find((e) => e.step === 'first_ai_success');
      if (aiEvent) {
        timings.signupToAiMs = aiEvent.timestamp - signupEvent.timestamp;
      }
      const previewEvent = funnel.events.find((e) => e.step === 'first_preview_open');
      if (previewEvent) {
        timings.signupToPreviewMs = previewEvent.timestamp - signupEvent.timestamp;
      }
    }

    return NextResponse.json({
      success: true,
      funnel: {
        currentStep: funnel.currentStep,
        completionPercent: funnel.completionPercent,
        timeToFirstValueMs: funnel.timeToFirstValueMs,
        totalEvents: funnel.events.length,
        timings,
        sloTargets: SLO_TARGETS,
      },
    });
  } catch (error) {
    console.error('First-value tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (userId) {
      const funnel = funnelStore.get(userId);
      if (!funnel) {
        return NextResponse.json(
          { error: 'No funnel data for this user' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        userId: funnel.userId,
        currentStep: funnel.currentStep,
        completionPercent: funnel.completionPercent,
        timeToFirstValueMs: funnel.timeToFirstValueMs,
        startedAt: new Date(funnel.startedAt).toISOString(),
        firstValueAt: funnel.firstValueAt ? new Date(funnel.firstValueAt).toISOString() : null,
        events: funnel.events.map((e) => ({
          step: e.step,
          timestamp: new Date(e.timestamp).toISOString(),
        })),
        sloTargets: SLO_TARGETS,
      });
    }

    // Aggregate stats
    const funnels = Array.from(funnelStore.values());
    const totalUsers = funnels.length;
    const completed = funnels.filter((f) => f.firstValueAt !== null);
    const completionRate = totalUsers > 0 ? completed.length / totalUsers : 0;

    const stepCounts: Record<string, number> = {};
    for (const step of STEP_ORDER) {
      stepCounts[step] = funnels.filter((f) =>
        f.events.some((e) => e.step === step)
      ).length;
    }

    const timeToValueMs = completed
      .map((f) => f.timeToFirstValueMs!)
      .sort((a, b) => a - b);

    const p50 = timeToValueMs.length > 0
      ? timeToValueMs[Math.floor(timeToValueMs.length * 0.5)]
      : null;
    const p95 = timeToValueMs.length > 0
      ? timeToValueMs[Math.floor(timeToValueMs.length * 0.95)]
      : null;

    return NextResponse.json({
      totalUsers,
      completedUsers: completed.length,
      completionRate: Math.round(completionRate * 100) / 100,
      stepCounts,
      timeToFirstValue: {
        p50Ms: p50,
        p95Ms: p95,
        sampleSize: timeToValueMs.length,
      },
      sloTargets: SLO_TARGETS,
      demoMode: process.env.ENABLE_DEMO_MODE === 'true',
    });
  } catch (error) {
    console.error('First-value query error:', error);
    return NextResponse.json(
      { error: 'Failed to query funnel data' },
      { status: 500 }
    );
  }
}
