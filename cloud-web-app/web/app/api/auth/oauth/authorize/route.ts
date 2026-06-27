import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy OAuth authorize route — redirects to canonical provider route.
 */
export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') || 'github';
  const next = req.nextUrl.searchParams.get('next');
  const target = new URL(`/api/auth/oauth/${provider}`, req.url);
  if (next) target.searchParams.set('next', next);
  return NextResponse.redirect(target);
}
