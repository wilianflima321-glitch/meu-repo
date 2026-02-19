/**
 * Web Fetch API Route
 * 
 * Fetches and parses content from URLs for AI agent tools.
 * Supports HTML parsing, text extraction, and optional CSS selectors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

const CONFIG = {
  timeout: 15000,
  maxContentLength: 100000, // 100KB max
  userAgent: 'AethelEngine-AI/1.0 (Content Reader)',
  // Blocked domains for security
  blockedDomains: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.',  // Link-local
    '10.',       // Private
    '172.16.',   // Private
    '192.168.',  // Private
  ],
};

// URL validation
function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Block private/internal addresses
    for (const blocked of CONFIG.blockedDomains) {
      if (parsed.hostname.startsWith(blocked) || parsed.hostname === blocked) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// Simple HTML to text extraction (without jsdom dependencies)
function extractTextFromHtml(html: string): { title: string; content: string; markdown: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Remove scripts, styles, and comments
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  
  // Convert common elements to markdown-like format
  cleaned = cleaned
    .replace(/<h1[^>]*>([^<]*)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([^<]*)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([^<]*)<\/h3>/gi, '\n### $1\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
    .replace(/<strong[^>]*>([^<]*)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>([^<]*)<\/em>/gi, '*$1*')
    .replace(/<code[^>]*>([^<]*)<\/code>/gi, '`$1`');
  
  // Remove all remaining HTML tags
  const content = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { title, content, markdown: content };
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'web-fetch-post',
      key: user.userId,
      max: 40,
      windowMs: 60 * 60 * 1000,
      message: 'Too many web fetch requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { url, selector } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }
    
    if (!isUrlAllowed(url)) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }

    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(CONFIG.timeout),
      redirect: 'follow',
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 502 }
      );
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return NextResponse.json({
        url,
        title: '',
        content: JSON.stringify(json, null, 2),
        markdown: '```json\n' + JSON.stringify(json, null, 2) + '\n```',
        metadata: { contentType: 'application/json' },
      });
    }
    
    if (contentType.includes('text/plain')) {
      const text = await response.text();
      return NextResponse.json({
        url,
        title: '',
        content: text.slice(0, CONFIG.maxContentLength),
        markdown: text.slice(0, CONFIG.maxContentLength),
        metadata: { contentType: 'text/plain' },
      });
    }
    
    // Default: HTML - use simple text extraction
    const html = await response.text();
    const extracted = extractTextFromHtml(html);
    
    // Truncate if too long
    const content = extracted.content.length > CONFIG.maxContentLength 
      ? extracted.content.slice(0, CONFIG.maxContentLength) + '...'
      : extracted.content;
    
    return NextResponse.json({
      url,
      title: extracted.title,
      content,
      markdown: content,
      metadata: { contentType: 'text/html' },
    });

  } catch (error) {
    console.error('[Web Fetch API] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }
    
    return apiInternalError();
  }
}
