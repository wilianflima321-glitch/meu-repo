/**
 * Vercel One-Click Deploy Service
 *
 * Implements deployment to Vercel via their API.
 * Supports project creation, deployment, and status monitoring.
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P1: Deploy + Observability)
 */

// ============================================================================
// TYPES
// ============================================================================

export type DeployStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'building'
  | 'ready'
  | 'error'
  | 'canceled';

export interface DeployConfig {
  projectName: string;
  framework?: 'nextjs' | 'vite' | 'static' | 'remix' | 'astro';
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  rootDirectory?: string;
  environmentVariables?: Record<string, string>;
  nodeVersion?: '18.x' | '20.x' | '22.x';
}

export interface DeployResult {
  id: string;
  url: string;
  inspectorUrl: string;
  status: DeployStatus;
  createdAt: string;
  readyAt?: string;
  buildDurationMs?: number;
  error?: string;
}

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  latestDeployment?: {
    id: string;
    url: string;
    state: string;
    createdAt: number;
  };
}

// ============================================================================
// API CLIENT
// ============================================================================

const VERCEL_API_BASE = 'https://api.vercel.com';

function getVercelHeaders(): Record<string, string> {
  const token = process.env.VERCEL_TOKEN;
  if (!token || token.startsWith('placeholder')) {
    throw new Error('VERCEL_TOKEN not configured. Set a valid Vercel API token.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) {
    headers['x-vercel-team-id'] = teamId;
  }

  return headers;
}

async function vercelRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const headers = getVercelHeaders();
    const teamId = process.env.VERCEL_TEAM_ID;
    const separator = path.includes('?') ? '&' : '?';
    const url = teamId
      ? `${VERCEL_API_BASE}${path}${separator}teamId=${teamId}`
      : `${VERCEL_API_BASE}${path}`;

    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error?.message || `Vercel API error: ${res.status}`,
        status: res.status,
      };
    }

    return { ok: true, data: data as T, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
      status: 0,
    };
  }
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

/**
 * Create or get a Vercel project
 */
export async function ensureVercelProject(config: DeployConfig): Promise<{
  projectId: string;
  projectName: string;
  isNew: boolean;
}> {
  // Try to get existing project
  const existing = await vercelRequest<VercelProject>(
    `/v9/projects/${encodeURIComponent(config.projectName)}`
  );

  if (existing.ok && existing.data) {
    return {
      projectId: existing.data.id,
      projectName: existing.data.name,
      isNew: false,
    };
  }

  // Create new project
  const created = await vercelRequest<VercelProject>('/v10/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: config.projectName,
      framework: config.framework || 'nextjs',
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      installCommand: config.installCommand,
      rootDirectory: config.rootDirectory,
      nodeVersion: config.nodeVersion || '20.x',
    }),
  });

  if (!created.ok || !created.data) {
    throw new Error(`Failed to create Vercel project: ${created.error}`);
  }

  return {
    projectId: created.data.id,
    projectName: created.data.name,
    isNew: true,
  };
}

// ============================================================================
// DEPLOYMENT
// ============================================================================

/**
 * Create a deployment from a git repository
 */
export async function createDeployment(config: DeployConfig & {
  gitUrl?: string;
  gitRef?: string;
  files?: Array<{ file: string; data: string }>;
}): Promise<DeployResult> {
  const project = await ensureVercelProject(config);

  // Set environment variables if provided
  if (config.environmentVariables && Object.keys(config.environmentVariables).length > 0) {
    const envVars = Object.entries(config.environmentVariables).map(([key, value]) => ({
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview'],
    }));

    await vercelRequest(`/v10/projects/${project.projectId}/env`, {
      method: 'POST',
      body: JSON.stringify(envVars),
    });
  }

  // Create deployment
  const deployBody: Record<string, unknown> = {
    name: config.projectName,
    project: project.projectId,
    target: 'production',
  };

  if (config.gitUrl) {
    deployBody.gitSource = {
      type: 'github',
      repoUrl: config.gitUrl,
      ref: config.gitRef || 'main',
    };
  }

  if (config.files && config.files.length > 0) {
    deployBody.files = config.files;
  }

  const result = await vercelRequest<{
    id: string;
    url: string;
    inspectorUrl: string;
    readyState: string;
    createdAt: number;
  }>('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify(deployBody),
  });

  if (!result.ok || !result.data) {
    return {
      id: '',
      url: '',
      inspectorUrl: '',
      status: 'error',
      createdAt: new Date().toISOString(),
      error: result.error || 'Deployment creation failed',
    };
  }

  return {
    id: result.data.id,
    url: `https://${result.data.url}`,
    inspectorUrl: result.data.inspectorUrl || `https://vercel.com/${config.projectName}/${result.data.id}`,
    status: mapVercelState(result.data.readyState),
    createdAt: new Date(result.data.createdAt).toISOString(),
  };
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(deploymentId: string): Promise<DeployResult | null> {
  const result = await vercelRequest<{
    id: string;
    url: string;
    inspectorUrl: string;
    readyState: string;
    createdAt: number;
    ready?: number;
    buildingAt?: number;
    errorMessage?: string;
  }>(`/v13/deployments/${deploymentId}`);

  if (!result.ok || !result.data) return null;

  const { data } = result;
  const buildDurationMs =
    data.ready && data.buildingAt ? data.ready - data.buildingAt : undefined;

  return {
    id: data.id,
    url: `https://${data.url}`,
    inspectorUrl: data.inspectorUrl || '',
    status: mapVercelState(data.readyState),
    createdAt: new Date(data.createdAt).toISOString(),
    readyAt: data.ready ? new Date(data.ready).toISOString() : undefined,
    buildDurationMs,
    error: data.errorMessage,
  };
}

/**
 * List recent deployments
 */
export async function listDeployments(
  projectName: string,
  limit = 10
): Promise<DeployResult[]> {
  const result = await vercelRequest<{
    deployments: Array<{
      uid: string;
      url: string;
      inspectorUrl: string;
      state: string;
      created: number;
      ready?: number;
      buildingAt?: number;
    }>;
  }>(`/v6/deployments?projectId=${encodeURIComponent(projectName)}&limit=${limit}`);

  if (!result.ok || !result.data) return [];

  return result.data.deployments.map((d) => ({
    id: d.uid,
    url: `https://${d.url}`,
    inspectorUrl: d.inspectorUrl || '',
    status: mapVercelState(d.state),
    createdAt: new Date(d.created).toISOString(),
    readyAt: d.ready ? new Date(d.ready).toISOString() : undefined,
    buildDurationMs: d.ready && d.buildingAt ? d.ready - d.buildingAt : undefined,
  }));
}

// ============================================================================
// READINESS CHECK
// ============================================================================

export interface DeployReadiness {
  configured: boolean;
  tokenPresent: boolean;
  teamConfigured: boolean;
  canDeploy: boolean;
  missing: string[];
}

export function checkDeployReadiness(): DeployReadiness {
  const token = process.env.VERCEL_TOKEN;
  const tokenPresent = !!(token && !token.startsWith('placeholder'));
  const teamConfigured = !!process.env.VERCEL_TEAM_ID;
  const missing: string[] = [];

  if (!tokenPresent) missing.push('VERCEL_TOKEN');

  return {
    configured: tokenPresent,
    tokenPresent,
    teamConfigured,
    canDeploy: tokenPresent,
    missing,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapVercelState(state: string): DeployStatus {
  switch (state?.toUpperCase()) {
    case 'READY':
      return 'ready';
    case 'BUILDING':
      return 'building';
    case 'INITIALIZING':
    case 'QUEUED':
      return 'preparing';
    case 'UPLOADING':
      return 'uploading';
    case 'ERROR':
      return 'error';
    case 'CANCELED':
      return 'canceled';
    default:
      return 'idle';
  }
}
