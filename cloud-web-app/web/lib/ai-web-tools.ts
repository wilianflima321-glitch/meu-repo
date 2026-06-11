import { logger } from '@/lib/observability/logger';
/**
 * AI Web Tools - Ferramentas de Web Research para IA
 * 
 * Permite que a IA faça:
 * - Pesquisas na web (Tavily, Serper, DuckDuckGo)
 * - Leitura de URLs (fetch + parsing)
 * - Busca em documentações
 * - Web scraping básico
 */

import { aiTools, type ToolResult } from './ai-tools-registry';
import {
  getBrowserOperatorRuntimeBlock,
  type BrowserOperatorRuntimeContext,
} from './device/browser-operator-tool-guard'

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

import { WEB_CONFIG } from './ai-web-tools.config';
import { fetchUrl } from './ai-web-tools-page';
import type { MdnSearchResponse, SearchResult, SerperSearchResponse, TavilySearchResponse, WebPageContent } from './ai-web-tools.types';
// ============================================================================
// FUNÇÕES DE BUSCA
// ============================================================================

/**
 * Busca via Tavily API (otimizada para IA)
 */
async function searchTavily(query: string, numResults: number = 5): Promise<SearchResult[]> {
  if (!WEB_CONFIG.tavily) {
    throw new Error('TAVILY_API_KEY não configurada');
  }
  
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: WEB_CONFIG.tavily,
      query,
      search_depth: 'advanced',
      max_results: numResults,
      include_answer: true,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(WEB_CONFIG.requestTimeout),
  });
  
  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }
  
  const data = await response.json() as TavilySearchResponse;
  
  return (data.results ?? []).map((r) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.content ?? '',
    score: r.score,
  }));
}

/**
 * Busca via Serper API (Google Search)
 */
async function searchSerper(query: string, numResults: number = 5): Promise<SearchResult[]> {
  if (!WEB_CONFIG.serper) {
    throw new Error('SERPER_API_KEY não configurada');
  }
  
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': WEB_CONFIG.serper,
    },
    body: JSON.stringify({
      q: query,
      num: numResults,
    }),
    signal: AbortSignal.timeout(WEB_CONFIG.requestTimeout),
  });
  
  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }
  
  const data = await response.json() as SerperSearchResponse;
  
  return (data.organic || []).map((r) => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }));
}

/**
 * Busca via DuckDuckGo (gratuita, sem API key)
 */
async function searchDuckDuckGo(query: string, numResults: number = 5): Promise<SearchResult[]> {
  // DuckDuckGo Instant Answer API
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': WEB_CONFIG.userAgent },
    signal: AbortSignal.timeout(WEB_CONFIG.requestTimeout),
  });
  
  if (!response.ok) {
    throw new Error(`DuckDuckGo API error: ${response.status}`);
  }
  
  const data = await response.json();
  const results: SearchResult[] = [];
  
  // Abstract (resultado principal)
  if (data.Abstract) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || '',
      snippet: data.Abstract,
    });
  }
  
  // Related Topics
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, numResults - results.length)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }
  }
  
  return results;
}

/**
 * Função principal de busca - tenta múltiplas fontes
 */
async function webSearch(query: string, numResults: number = 5): Promise<SearchResult[]> {
  // Tenta Tavily primeiro (melhor para IA)
  if (WEB_CONFIG.tavily) {
    try {
      return await searchTavily(query, numResults);
    } catch (e) {
      logger.warn('[WebSearch] Tavily falhou, tentando alternativa:', e);
    }
  }
  
  // Tenta Serper (Google)
  if (WEB_CONFIG.serper) {
    try {
      return await searchSerper(query, numResults);
    } catch (e) {
      logger.warn('[WebSearch] Serper falhou, tentando DuckDuckGo:', e);
    }
  }
  
  // Fallback para DuckDuckGo (gratuito)
  try {
    return await searchDuckDuckGo(query, numResults);
  } catch (e) {
    logger.error('[WebSearch] Todas as fontes falharam:', e);
    throw new Error('Não foi possível realizar a busca. Verifique sua conexão.');
  }
}

// ============================================================================
// FUNÇÕES DE LEITURA DE URLs
// ============================================================================

// ============================================================================
// BUSCA EM DOCUMENTAÇÕES
// ============================================================================

const DOC_SOURCES: Record<string, { baseUrl: string; searchUrl: string }> = {
  mdn: {
    baseUrl: 'https://developer.mozilla.org',
    searchUrl: 'https://developer.mozilla.org/api/v1/search?q=',
  },
  react: {
    baseUrl: 'https://react.dev',
    searchUrl: 'https://react.dev/search?q=',
  },
  nextjs: {
    baseUrl: 'https://nextjs.org',
    searchUrl: 'https://nextjs.org/docs?search=',
  },
  threejs: {
    baseUrl: 'https://threejs.org',
    searchUrl: 'https://threejs.org/docs/index.html#manual/en/introduction/',
  },
  typescript: {
    baseUrl: 'https://www.typescriptlang.org',
    searchUrl: 'https://www.typescriptlang.org/docs/',
  },
  unreal: {
    baseUrl: 'https://docs.unrealengine.com',
    searchUrl: 'https://docs.unrealengine.com/5.0/en-US/search/?q=',
  },
};

async function searchDocs(query: string, source: string): Promise<SearchResult[]> {
  const docSource = DOC_SOURCES[source.toLowerCase()];
  if (!docSource) {
    // Se não tiver fonte específica, faz busca web normal com site:
    const siteQuery = `${query} site:${source}`;
    return webSearch(siteQuery, 5);
  }
  
  // MDN tem uma API de busca
  if (source.toLowerCase() === 'mdn') {
    try {
      const response = await fetch(`${docSource.searchUrl}${encodeURIComponent(query)}&locale=en-US`, {
        signal: AbortSignal.timeout(WEB_CONFIG.requestTimeout),
      });
      
      if (response.ok) {
        const data = await response.json() as MdnSearchResponse;
        return (data.documents || []).slice(0, 5).map((doc) => ({
          title: doc.title ?? '',
          url: `${docSource.baseUrl}${doc.mdn_url ?? ''}`,
          snippet: doc.summary || '',
        }));
      }
    } catch (e) {
      logger.warn('[SearchDocs] MDN API falhou:', e);
    }
  }
  
  // Fallback: busca web com site:
  const siteQuery = `${query} site:${docSource.baseUrl}`;
  return webSearch(siteQuery, 5);
}

// ============================================================================
// REGISTRO DE FERRAMENTAS NO AI TOOLS REGISTRY
// ============================================================================

// Adiciona categoria 'web' ao registro
// @ts-ignore - Extensão do tipo
aiTools.register({
  name: 'web_search',
  description: 'Pesquisa na internet e retorna resultados relevantes. Use para buscar informações atualizadas, tutoriais, documentação, ou qualquer informação online.',
  category: 'analysis' as const, // Usa 'analysis' já que 'web' não existe no tipo
  parameters: [
    { name: 'query', type: 'string', description: 'Termo de busca (em português ou inglês)', required: true },
    { name: 'numResults', type: 'number', description: 'Número de resultados (1-10)', required: false, default: 5 },
  ],
  returns: 'Lista de resultados com título, URL e snippet',
  execute: async (params): Promise<ToolResult> => {
    try {
      const blocked = getRuntimeBlockedToolResult(params as Record<string, unknown>)
      if (blocked) {
        return blocked
      }

      const query = String(params.query || '').trim();
      if (!query) {
        return { success: false, error: 'Query de busca é obrigatória' };
      }
      
      const numResults = Math.min(Math.max(Number(params.numResults) || 5, 1), 10);
      const results = await webSearch(query, numResults);
      
      return {
        success: true,
        data: {
          query,
          results,
          source: WEB_CONFIG.tavily ? 'tavily' : (WEB_CONFIG.serper ? 'serper' : 'duckduckgo'),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na busca web',
      };
    }
  },
});

aiTools.register({
  name: 'fetch_url',
  description: 'Lê o conteúdo de uma URL e retorna o texto extraído. Útil para ler artigos, documentação, ou qualquer página web.',
  category: 'analysis' as const,
  parameters: [
    { name: 'url', type: 'string', description: 'URL completa (https://...)', required: true },
  ],
  returns: 'Conteúdo da página em texto/markdown',
  execute: async (params): Promise<ToolResult> => {
    try {
      const blocked = getRuntimeBlockedToolResult(params as Record<string, unknown>)
      if (blocked) {
        return blocked
      }

      const url = String(params.url || '').trim();
      if (!url) {
        return { success: false, error: 'URL é obrigatória' };
      }
      
      const content = await fetchUrl(url);
      
      return {
        success: true,
        data: content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao ler URL',
      };
    }
  },
});

aiTools.register({
  name: 'search_docs',
  description: 'Busca em documentações técnicas específicas (MDN, React, Next.js, Three.js, TypeScript, Unreal Engine).',
  category: 'analysis' as const,
  parameters: [
    { name: 'query', type: 'string', description: 'Termo de busca', required: true },
    { name: 'source', type: 'string', description: 'Fonte de documentação', required: true, enum: ['mdn', 'react', 'nextjs', 'threejs', 'typescript', 'unreal'] },
  ],
  returns: 'Resultados da documentação',
  execute: async (params): Promise<ToolResult> => {
    try {
      const blocked = getRuntimeBlockedToolResult(params as Record<string, unknown>)
      if (blocked) {
        return blocked
      }

      const query = String(params.query || '').trim();
      const source = String(params.source || '').trim().toLowerCase();
      
      if (!query) {
        return { success: false, error: 'Query é obrigatória' };
      }
      if (!source) {
        return { success: false, error: 'Source é obrigatória' };
      }
      
      const results = await searchDocs(query, source);
      
      return {
        success: true,
        data: {
          query,
          source,
          results,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na busca de documentação',
      };
    }
  },
});

aiTools.register({
  name: 'web_scrape',
  description: 'Extrai dados estruturados de uma página web (títulos, links, imagens, listas).',
  category: 'analysis' as const,
  parameters: [
    { name: 'url', type: 'string', description: 'URL para fazer scrape', required: true },
    { name: 'selector', type: 'string', description: 'Seletor CSS opcional (ex: "article p", ".content")', required: false },
  ],
  returns: 'Dados extraídos da página',
  execute: async (params): Promise<ToolResult> => {
    try {
      const blocked = getRuntimeBlockedToolResult(params as Record<string, unknown>)
      if (blocked) {
        return blocked
      }

      const url = String(params.url || '').trim();
      if (!url) {
        return { success: false, error: 'URL é obrigatória' };
      }
      
      const content = await fetchUrl(url);
      
      // Extrai estrutura básica
      const data = {
        url,
        title: content.title,
        description: content.metadata.description,
        content: content.markdown.slice(0, 20000), // Limita conteúdo
        wordCount: content.content.split(/\s+/).length,
      };
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no scraping',
      };
    }
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export {
  webSearch,
  fetchUrl,
  searchDocs,
  type SearchResult,
  type WebPageContent,
};
