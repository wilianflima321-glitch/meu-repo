/**
 * Deploy API - One-Click Vercel Deployment
 *
 * POST /api/deploy - Create a new deployment
 * GET  /api/deploy - Get deployment status
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P1: Deploy)
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireAuth } from '@/lib/auth-server';
import {
  type DeployReadiness,
  createDeployment,
  getDeploymentStatus,
  listDeployments,
  checkDeployReadiness,
} from '@/lib/deploy/vercel-deploy';
import { requireFeatureForUser } from '@/lib/entitlements';
import { createComponentLogger } from '@/lib/observability/logger';
import { runQaGate, type QaGateResult } from '@/lib/server/qa-gate';

export const dynamic = 'force-dynamic';

const logger = createComponentLogger('api-deploy-route');

type DeployQaGateSummary = {
  ok: boolean;
  blockers: string[];
  durationMs: number;
};

type ClientDeployReadiness = {
  canDeploy: boolean;
  missing: string[];
  message?: string;
  qaGate?: DeployQaGateSummary;
};

function summarizeQaGate(qaGate: QaGateResult): DeployQaGateSummary {
  return {
    ok: qaGate.ok,
    durationMs: qaGate.durationMs,
    blockers: qaGate.checks.filter((check) => !check.ok).map((check) => check.id),
  };
}

function sanitizeReadinessForClient(
  readiness: DeployReadiness,
  qaGate?: QaGateResult | null
): ClientDeployReadiness {
  if (!readiness.canDeploy) {
    return {
      canDeploy: false,
      missing: ['deployment configuration'],
      message: 'Configure a infraestrutura de deploy antes de publicar.',
    };
  }

  if (qaGate && !qaGate.ok) {
    const summary = summarizeQaGate(qaGate);
    return {
      canDeploy: false,
      missing: ['quality gate'],
      message:
        summary.blockers.length > 0
          ? `Resolva ${summary.blockers.join(', ')} antes de publicar.`
          : 'Resolva os bloqueios do quality gate antes de publicar.',
      qaGate: summary,
    };
  }

  return {
    canDeploy: true,
    missing: [],
    qaGate: qaGate ? summarizeQaGate(qaGate) : undefined,
  };
}

async function evaluateDeployReadiness(): Promise<{
  infrastructure: DeployReadiness;
  qaGate: QaGateResult | null;
  clientReadiness: ClientDeployReadiness;
}> {
  const infrastructure = checkDeployReadiness();
  if (!infrastructure.canDeploy) {
    return {
      infrastructure,
      qaGate: null,
      clientReadiness: sanitizeReadinessForClient(infrastructure),
    };
  }

  const qaGate = await runQaGate({ timeoutMs: 30_000 });
  return {
    infrastructure,
    qaGate,
    clientReadiness: sanitizeReadinessForClient(infrastructure, qaGate),
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const entitlements = await requireFeatureForUser(user.userId, 'build');

    const readiness = await evaluateDeployReadiness();
    if (!readiness.infrastructure.canDeploy) {
      return NextResponse.json(
        {
          error: 'DEPLOY_NOT_CONFIGURED',
          message: 'Vercel deployment is not configured.',
          missing: readiness.clientReadiness.missing,
          capabilityStatus: 'PARTIAL',
        },
        { status: 503 }
      );
    }

    if (readiness.qaGate && !readiness.qaGate.ok) {
      return NextResponse.json(
        {
          error: 'DEPLOY_QA_GATE_BLOCKED',
          message: readiness.clientReadiness.message,
          missing: readiness.clientReadiness.missing,
          qaGate: readiness.clientReadiness.qaGate,
          capabilityStatus: 'PARTIAL',
        },
        { status: 412 }
      );
    }

    const body = await req.json();
    const {
      projectName,
      framework = 'nextjs',
      buildCommand,
      outputDirectory,
      installCommand,
      environmentVariables,
      gitUrl,
      gitRef,
    } = body;

    if (!projectName) {
      return NextResponse.json(
        { error: 'projectName is required' },
        { status: 400 }
      );
    }

    const result = await createDeployment({
      projectName,
      framework,
      buildCommand,
      outputDirectory,
      installCommand,
      environmentVariables,
      gitUrl,
      gitRef,
    });

    logger.info('Deploy created', {
      action: 'create-deploy',
      userId: user.userId,
      planId: entitlements.plan.id,
      projectName,
      deploymentId: result.id,
      status: result.status,
    });

    return NextResponse.json(result, {
      status: result.status === 'error' ? 502 : 200,
    });
  } catch (error) {
    logger.error('Deploy creation failed', error, { action: 'create-deploy' });
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const deploymentId = url.searchParams.get('id');
    const projectName = url.searchParams.get('project');
    const readinessQuery = url.searchParams.get('readiness') === 'true';
    const user = requireAuth(req);

    // Readiness check
    if (readinessQuery) {
      await requireFeatureForUser(user.userId, 'build');
      const readiness = await evaluateDeployReadiness();
      return NextResponse.json(readiness.clientReadiness);
    }

    const entitlements = await requireFeatureForUser(user.userId, 'build');

    // Single deployment status
    if (deploymentId) {
      const status = await getDeploymentStatus(deploymentId);
      if (!status) {
        return NextResponse.json(
          { error: 'Deployment not found' },
          { status: 404 }
        );
      }
      logger.debug('Deploy status fetched', {
        action: 'read-deploy-status',
        userId: user.userId,
        planId: entitlements.plan.id,
        deploymentId,
      });
      return NextResponse.json(status);
    }

    // List deployments for project
    if (projectName) {
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const deployments = await listDeployments(projectName, limit);
      logger.debug('Deployments listed', {
        action: 'list-deploys',
        userId: user.userId,
        planId: entitlements.plan.id,
        projectName,
        limit,
      });
      return NextResponse.json({ deployments });
    }

    return NextResponse.json(
      { error: 'Provide ?id=<deploymentId>, ?project=<name>, or ?readiness=true' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Deploy status request failed', error, {
      action: 'read-deploy-status',
    });
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
