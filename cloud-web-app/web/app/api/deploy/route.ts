/**
 * Deploy API - One-Click Vercel Deployment
 *
 * POST /api/deploy - Create a new deployment
 * GET  /api/deploy - Get deployment status
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P1: Deploy)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createDeployment,
  getDeploymentStatus,
  listDeployments,
  checkDeployReadiness,
} from '@/lib/deploy/vercel-deploy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const readiness = checkDeployReadiness();
    if (!readiness.canDeploy) {
      return NextResponse.json(
        {
          error: 'DEPLOY_NOT_CONFIGURED',
          message: 'Vercel deployment is not configured.',
          missing: readiness.missing,
          capabilityStatus: 'PARTIAL',
        },
        { status: 503 }
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

    return NextResponse.json(result, {
      status: result.status === 'error' ? 502 : 200,
    });
  } catch (error) {
    console.error('Deploy error:', error);
    return NextResponse.json(
      {
        error: 'DEPLOY_FAILED',
        message: error instanceof Error ? error.message : 'Deployment failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const deploymentId = url.searchParams.get('id');
    const projectName = url.searchParams.get('project');

    // Readiness check
    if (url.searchParams.get('readiness') === 'true') {
      return NextResponse.json(checkDeployReadiness());
    }

    // Single deployment status
    if (deploymentId) {
      const status = await getDeploymentStatus(deploymentId);
      if (!status) {
        return NextResponse.json(
          { error: 'Deployment not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(status);
    }

    // List deployments for project
    if (projectName) {
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const deployments = await listDeployments(projectName, limit);
      return NextResponse.json({ deployments });
    }

    return NextResponse.json(
      { error: 'Provide ?id=<deploymentId>, ?project=<name>, or ?readiness=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Deploy status error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}
