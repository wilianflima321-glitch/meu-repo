/**
 * Research API - Premium Research with Citations
 *
 * POST /api/research - Execute a research query with live retrieval
 * GET  /api/research - Check research readiness
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Research)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  executeResearch,
  exportResearch,
  checkResearchReadiness,
} from '@/lib/research/research-agent';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, provider, maxResults, searchDepth, exportFormat } = body;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'Query must be at least 3 characters' },
        { status: 400 }
      );
    }

    const readiness = checkResearchReadiness();
    if (!readiness.configured) {
      return NextResponse.json(
        {
          error: 'RESEARCH_NOT_CONFIGURED',
          message: 'Live retrieval requires TAVILY_API_KEY or PERPLEXITY_API_KEY',
          missing: readiness.missing,
          capabilityStatus: 'PARTIAL',
        },
        { status: 503 }
      );
    }

    const result = await executeResearch(query.trim(), {
      provider: provider || undefined,
      maxResults: maxResults || 5,
      searchDepth: searchDepth || 'basic',
    });

    // Export if requested
    if (exportFormat) {
      const exported = exportResearch(result, exportFormat);
      return NextResponse.json({
        ...result,
        export: exported,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Research query failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const readiness = checkResearchReadiness();
  return NextResponse.json(readiness);
}
