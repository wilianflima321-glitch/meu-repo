import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const resolveServerBaseUrl = () => {
  const envUrl = process.env.AETHEL_SERVER_URL || process.env.NEXT_PUBLIC_AETHEL_SERVER_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://localhost:1234';
};

export async function GET(_request: NextRequest) {
  try {
    const baseUrl = resolveServerBaseUrl();
    const res = await fetch(`${baseUrl}/api/health/system`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'upstream_unavailable', status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[system-health] failed:', error);
    return NextResponse.json({ error: 'system_health_failed' }, { status: 500 });
  }
}
