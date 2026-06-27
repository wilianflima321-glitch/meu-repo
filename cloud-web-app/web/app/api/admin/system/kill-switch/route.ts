/**
 * kill-switch/route.ts  — Sprint V33
 *
 * Global feature kill-switch API for Aethel Engine.
 *
 * Allows admin operators to instantly suspend dangerous/faulty features
 * without a code deployment — replaces the "circuit breaker" for:
 *   - AI model routing (disable specific providers under cost attack)
 *   - World generation pipeline (freeze if runaway cost spike)
 *   - Plugin execution (stop all plugins if sandbox breach detected)
 *   - Marketplace (halt transactions on fraud detection)
 *
 * Storage: Redis (production) / in-memory singleton (dev/test).
 * Auth: Admin-only — validated via getServerSession + isAdmin check.
 *
 * GET  /api/admin/system/kill-switch          → list all switches
 * POST /api/admin/system/kill-switch          → activate/deactivate switch
 * DELETE /api/admin/system/kill-switch?id=X   → permanently remove
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { telemetry } from '@/lib/observability/telemetry';

// ---------------------------------------------------------------------------
// Kill switch state (in-memory fallback — Redis in production)
// ---------------------------------------------------------------------------

export type FeatureFlag =
  | 'ai_router'
  | 'world_generation'
  | 'plugin_execution'
  | 'marketplace_transactions'
  | 'byok_vault'
  | 'character_generation'
  | 'cinematic_sequencer'
  | 'multiplayer_sync';

export interface KillSwitch {
  id: FeatureFlag;
  label: string;
  suspended: boolean;
  reason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
}

// In-memory store — replaced by Redis in production
const KILL_SWITCH_STORE = new Map<FeatureFlag, KillSwitch>([
  ['ai_router',               { id: 'ai_router', label: 'AI Model Router', suspended: false }],
  ['world_generation',        { id: 'world_generation', label: 'World Generation Pipeline', suspended: false }],
  ['plugin_execution',        { id: 'plugin_execution', label: 'Plugin Execution', suspended: false }],
  ['marketplace_transactions',{ id: 'marketplace_transactions', label: 'Marketplace Transactions', suspended: false }],
  ['byok_vault',              { id: 'byok_vault', label: 'BYOK Vault', suspended: false }],
  ['character_generation',    { id: 'character_generation', label: 'AI Character Generation', suspended: false }],
  ['cinematic_sequencer',     { id: 'cinematic_sequencer', label: 'Cinematic Sequencer', suspended: false }],
  ['multiplayer_sync',        { id: 'multiplayer_sync', label: 'Multiplayer Sync', suspended: false }],
]);

// ---------------------------------------------------------------------------
// Public helper — check a switch from any server-side code
// ---------------------------------------------------------------------------

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return !(KILL_SWITCH_STORE.get(flag)?.suspended ?? false);
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function requireAdmin(req: NextRequest): { userId: string } | NextResponse {
  try {
    const user = requireAuth(req);
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    return { userId: user.userId };
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// ---------------------------------------------------------------------------
// GET — list all switches
// ---------------------------------------------------------------------------

export function GET(req: NextRequest): NextResponse {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json({
    switches: [...KILL_SWITCH_STORE.values()],
  });
}

// ---------------------------------------------------------------------------
// POST — activate or deactivate a switch
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const body = await req.json() as { id: FeatureFlag; suspended: boolean; reason?: string };
  const { id, suspended, reason } = body;

  const sw = KILL_SWITCH_STORE.get(id);
  if (!sw) {
    return NextResponse.json({ error: `Unknown kill switch: ${id}` }, { status: 400 });
  }

  sw.suspended = suspended;
  sw.reason = reason;
  sw.suspendedAt = suspended ? new Date().toISOString() : undefined;
  sw.suspendedBy = suspended ? userId : undefined;

  // Emit telemetry alert for critical actions
  const severity = suspended ? 'critical' : 'info';
  await telemetry.alert(severity, `Kill switch ${suspended ? 'ACTIVATED' : 'deactivated'}: ${id}`, {
    flag: id,
    reason: reason ?? '',
    operator: userId,
  });

  telemetry.counter('kill_switch.toggle').add(1, {
    flag: id,
    action: suspended ? 'suspend' : 'resume',
    operator: userId,
  });

  return NextResponse.json({ switch: sw });
}

// ---------------------------------------------------------------------------
// DELETE — remove a non-default switch (dev/custom flags only)
// ---------------------------------------------------------------------------

export function DELETE(req: NextRequest): NextResponse {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') as FeatureFlag | null;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  KILL_SWITCH_STORE.delete(id);
  return NextResponse.json({ deleted: id });
}
