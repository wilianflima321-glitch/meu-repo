/**
 * AETHEL ENGINE - Credits API (Deprecated)
 * 
 * Endpoint deprecated in favor of /api/wallet/summary.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint deprecated. Use /api/wallet/summary instead.', link: '/api/wallet/summary' },
    { status: 410, headers: { 'Link': '</api/wallet/summary>; rel="alternate"' } }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint deprecated. Use /api/wallet/transactions instead.' },
    { status: 410 }
  );
}
