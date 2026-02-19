/**
 * Web API Routes
 * 
 * Provides web search and URL fetch capabilities for AI agent tools.
 * Supports multiple search providers with fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

const CONFIG = {
  tavily: process.env.TAVILY_API_KEY,
  serper: process.env.SERPER_API_KEY,
  timeout: 15000,
  userAgent: 'AethelEngine-AI/1.0',
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

// ==========================
// Web Search
// ==========================

async function searchTavily(query: string, maxResults: number) {
  if (!CONFIG.tavily) throw new Error('TAVILY_API_KEY not configured');
  
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: CONFIG.tavily,
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: true,
    }),
    signal: AbortSignal.timeout(CONFIG.timeout),
  });
  
  if (!response.ok) throw new Error(`Tavily error: ${response.status}`);
  
  const data = await response.json();
  return {
    answer: data.answer,
    results: data.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score,
    })),
  };
}

async function searchSerper(query: string, maxResults: number) {
  if (!CONFIG.serper) throw new Error('SERPER_API_KEY not configured');
  
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': CONFIG.serper,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    signal: AbortSignal.timeout(CONFIG.timeout),
  });
  
  if (!response.ok) throw new Error(`Serper error: ${response.status}`);
  
  const data = await response.json();
  return {
    results: (data.organic || []).map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })),
  };
}

async function searchDuckDuckGo(query: string, maxResults: number) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': CONFIG.userAgent },
    signal: AbortSignal.timeout(CONFIG.timeout),
  });
  
  if (!response.ok) throw new Error(`DuckDuckGo error: ${response.status}`);
  
  const data = await response.json();
  const results: SearchResult[] = [];
  
  if (data.Abstract) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.Abstract,
    });
  }
  
  for (const topic of (data.RelatedTopics || []).slice(0, maxResults - results.length)) {
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.Text.split(' - ')[0],
        url: topic.FirstURL,
        snippet: topic.Text,
      });
    }
  }
  
  return { results };
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'web-search-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many web search requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { query, maxResults = 5 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    // Try providers in order: Tavily > Serper > DuckDuckGo
    let result;
    const errors: string[] = [];

    if (CONFIG.tavily) {
      try {
        result = await searchTavily(query, maxResults);
      } catch (e) {
        errors.push(`Tavily: ${e}`);
      }
    }

    if (!result && CONFIG.serper) {
      try {
        result = await searchSerper(query, maxResults);
      } catch (e) {
        errors.push(`Serper: ${e}`);
      }
    }

    if (!result) {
      try {
        result = await searchDuckDuckGo(query, maxResults);
      } catch (e) {
        errors.push(`DuckDuckGo: ${e}`);
      }
    }

    if (!result) {
      return NextResponse.json({
        error: 'All search providers failed',
        details: errors,
      }, { status: 502 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Web Search API] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
