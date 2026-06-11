import { logger } from '@/lib/observability/logger';

import { WEB_CONFIG } from './ai-web-tools.config';
import type { WebPageContent } from './ai-web-tools.types';

/**
 * Faz fetch de uma URL e converte para texto limpo
 */
export async function fetchUrl(url: string): Promise<WebPageContent> {
  // Validação básica de URL
  const parsedUrl = new URL(url);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Apenas URLs HTTP/HTTPS são suportadas');
  }
  
  // Tenta usar Jina Reader primeiro (converte para markdown)
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaResponse = await fetch(jinaUrl, {
      headers: { 'User-Agent': WEB_CONFIG.userAgent },
      signal: AbortSignal.timeout(WEB_CONFIG.requestTimeout),
    });
    
    if (jinaResponse.ok) {
      const markdown = await jinaResponse.text();
      return {
        url,
        title: extractTitle(markdown),
        content: markdown,
        markdown,
        metadata: extractMetadata(markdown),
      };
    }
  } catch (e) {
    logger.warn('[FetchUrl] Jina Reader falhou, fazendo fetch direto:', e);
  }
  
  // Fallback: fetch direto
  const response = await fetch(url, {
    headers: {
      'User-Agent': WEB_CONFIG.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(WEB_CONFIG.requestTimeout),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const html = await response.text();
  const content = htmlToText(html);
  const title = extractTitleFromHtml(html);
  
  return {
    url,
    title,
    content: content.slice(0, WEB_CONFIG.maxContentLength),
    markdown: content.slice(0, WEB_CONFIG.maxContentLength),
    metadata: extractMetadataFromHtml(html),
  };
}

/**
 * Converte HTML para texto limpo
 */
export function htmlToText(html: string): string {
  // Remove scripts, styles, e tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

export function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Untitled';
}

export function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : 'Untitled';
}

export function extractMetadata(markdown: string): WebPageContent['metadata'] {
  return {};
}

export function extractMetadataFromHtml(html: string): WebPageContent['metadata'] {
  const metadata: WebPageContent['metadata'] = {};
  
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (descMatch) metadata.description = descMatch[1];
  
  const keywordsMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i);
  if (keywordsMatch) metadata.keywords = keywordsMatch[1].split(',').map(k => k.trim());
  
  const authorMatch = html.match(/<meta\s+name="author"\s+content="([^"]+)"/i);
  if (authorMatch) metadata.author = authorMatch[1];
  
  return metadata;
}
