/**
 * Security Vault API - Encrypted Secret Management
 *
 * POST /api/security/vault - Store a secret
 * GET  /api/security/vault - List secret IDs / get vault readiness
 * DELETE /api/security/vault - Delete a secret
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Security)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  storeSecret,
  retrieveSecret,
  deleteSecret,
  listSecretIds,
  validateVault,
  rotateSecret,
} from '@/lib/security/vault';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // Readiness check
  if (action === 'readiness') {
    const result = validateVault();
    return NextResponse.json({
      operational: result.operational,
      error: result.error,
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2-SHA512',
      secretCount: listSecretIds().length,
    });
  }

  // List secret IDs (never expose values)
  if (action === 'list') {
    return NextResponse.json({
      secrets: listSecretIds(),
      count: listSecretIds().length,
    });
  }

  return NextResponse.json(
    { error: 'Use ?action=readiness or ?action=list' },
    { status: 400 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, value, action } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'id and name are required' },
        { status: 400 }
      );
    }

    if (action === 'rotate') {
      if (!value) {
        return NextResponse.json(
          { error: 'value is required for rotation' },
          { status: 400 }
        );
      }
      const entry = rotateSecret(id, value);
      if (!entry) {
        return NextResponse.json(
          { error: 'Secret not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        id: entry.id,
        name: entry.name,
        rotatedAt: entry.rotatedAt,
      });
    }

    if (!value) {
      return NextResponse.json(
        { error: 'value is required' },
        { status: 400 }
      );
    }

    const entry = storeSecret(id, name, value);
    return NextResponse.json({
      success: true,
      id: entry.id,
      name: entry.name,
      createdAt: entry.createdAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vault operation failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = deleteSecret(id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete secret' },
      { status: 500 }
    );
  }
}
