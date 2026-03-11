/**
 * Research Agent Premium - Citations, Live Retrieval, Export
 *
 * Provides inline citations, live web retrieval via Tavily/Perplexity,
 * and export to Markdown/PDF with context hand-off to IDE.
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Research)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Citation {
  id: string;
  index: number;
  title: string;
  url: string;
  snippet: string;
  source: 'web' | 'docs' | 'codebase' | 'paper';
  relevanceScore: number;
  retrievedAt: string;
}

export interface ResearchResult {
  query: string;
  answer: string;
  citations: Citation[];
  followUpQuestions: string[];
  totalSources: number;
  retrievalTimeMs: number;
  model: string;
}

export interface ResearchExport {
  format: 'markdown' | 'pdf' | 'json';
  content: string;
  filename: string;
  citations: Citation[];
  generatedAt: string;
}

export interface LiveRetrievalConfig {
  provider: 'tavily' | 'perplexity' | 'none';
  maxResults: number;
  includeAnswer: boolean;
  searchDepth: 'basic' | 'advanced';
  includeDomains?: string[];
  excludeDomains?: string[];
}

// ============================================================================
// LIVE RETRIEVAL
// ============================================================================

/**
 * Search the web via Tavily API
 */
async function searchTavily(
  query: string,
  config: Partial<LiveRetrievalConfig> = {}
): Promise<Citation[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.startsWith('placeholder')) {
    return [];
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: config.searchDepth || 'basic',
        max_results: config.maxResults || 5,
        include_answer: config.includeAnswer ?? true,
        include_domains: config.includeDomains,
        exclude_domains: config.excludeDomains,
      }),
    });

    if (!res.ok) {
      console.error(`Tavily search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];

    return results.map((r: any, i: number) => ({
      id: `tavily-${Date.now()}-${i}`,
      index: i + 1,
      title: r.title || 'Untitled',
      url: r.url || '',
      snippet: r.content || '',
      source: 'web' as const,
      relevanceScore: r.score || 0.5,
      retrievedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Tavily search error:', err);
    return [];
  }
}

/**
 * Search via Perplexity API
 */
async function searchPerplexity(
  query: string,
  _config: Partial<LiveRetrievalConfig> = {}
): Promise<{ answer: string; citations: Citation[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey || apiKey.startsWith('placeholder')) {
    return { answer: '', citations: [] };
  }

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide detailed answers with sources.',
          },
          { role: 'user', content: query },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`Perplexity search failed: ${res.status}`);
      return { answer: '', citations: [] };
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || '';
    const sources = data.citations || [];

    const citations: Citation[] = sources.map((url: string, i: number) => ({
      id: `pplx-${Date.now()}-${i}`,
      index: i + 1,
      title: new URL(url).hostname,
      url,
      snippet: '',
      source: 'web' as const,
      relevanceScore: 0.7,
      retrievedAt: new Date().toISOString(),
    }));

    return { answer, citations };
  } catch (err) {
    console.error('Perplexity search error:', err);
    return { answer: '', citations: [] };
  }
}

// ============================================================================
// RESEARCH ENGINE
// ============================================================================

/**
 * Execute a research query with live retrieval and citations
 */
export async function executeResearch(
  query: string,
  config: Partial<LiveRetrievalConfig> = {}
): Promise<ResearchResult> {
  const startTime = Date.now();
  const provider = config.provider || detectProvider();

  let citations: Citation[] = [];
  let answer = '';

  if (provider === 'tavily') {
    citations = await searchTavily(query, config);
  } else if (provider === 'perplexity') {
    const result = await searchPerplexity(query, config);
    answer = result.answer;
    citations = result.citations;
  }

  return {
    query,
    answer,
    citations,
    followUpQuestions: generateFollowUps(query, citations),
    totalSources: citations.length,
    retrievalTimeMs: Date.now() - startTime,
    model: provider,
  };
}

function detectProvider(): 'tavily' | 'perplexity' | 'none' {
  if (process.env.TAVILY_API_KEY && !process.env.TAVILY_API_KEY.startsWith('placeholder')) {
    return 'tavily';
  }
  if (process.env.PERPLEXITY_API_KEY && !process.env.PERPLEXITY_API_KEY.startsWith('placeholder')) {
    return 'perplexity';
  }
  return 'none';
}

function generateFollowUps(query: string, citations: Citation[]): string[] {
  const followUps: string[] = [];

  if (citations.length > 0) {
    followUps.push(`How does ${citations[0]?.title} compare to alternatives?`);
    followUps.push(`What are the limitations of the approaches mentioned?`);
  }

  if (query.toLowerCase().includes('how')) {
    followUps.push(`What are the best practices for this approach?`);
  }

  if (query.toLowerCase().includes('api') || query.toLowerCase().includes('library')) {
    followUps.push(`What are the performance characteristics?`);
    followUps.push(`Are there security considerations?`);
  }

  return followUps.slice(0, 3);
}

// ============================================================================
// CITATION FORMATTING
// ============================================================================

/**
 * Format inline citations for display
 */
export function formatInlineCitations(text: string, citations: Citation[]): string {
  let formatted = text;

  for (const citation of citations) {
    const marker = `[${citation.index}]`;
    if (!formatted.includes(marker)) continue;
    formatted = formatted.replace(
      marker,
      `[${citation.index}](${citation.url} "${citation.title}")`
    );
  }

  return formatted;
}

/**
 * Generate a bibliography section
 */
export function generateBibliography(citations: Citation[]): string {
  if (citations.length === 0) return '';

  const lines = ['## References', ''];
  for (const c of citations) {
    lines.push(`${c.index}. [${c.title}](${c.url}) — ${c.snippet.slice(0, 100)}${c.snippet.length > 100 ? '...' : ''}`);
  }

  return lines.join('\n');
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export research results to various formats
 */
export function exportResearch(
  result: ResearchResult,
  format: 'markdown' | 'json' = 'markdown'
): ResearchExport {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `research_${timestamp}_${result.query.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;

  if (format === 'json') {
    return {
      format: 'json',
      content: JSON.stringify(result, null, 2),
      filename: `${filename}.json`,
      citations: result.citations,
      generatedAt: new Date().toISOString(),
    };
  }

  // Markdown format
  const sections = [
    `# Research: ${result.query}`,
    '',
    `*Generated: ${new Date().toISOString()} | Sources: ${result.totalSources} | Retrieval: ${result.retrievalTimeMs}ms*`,
    '',
    '---',
    '',
  ];

  if (result.answer) {
    sections.push('## Summary', '', result.answer, '');
  }

  if (result.citations.length > 0) {
    sections.push(generateBibliography(result.citations), '');
  }

  if (result.followUpQuestions.length > 0) {
    sections.push('## Follow-up Questions', '');
    for (const q of result.followUpQuestions) {
      sections.push(`- ${q}`);
    }
  }

  return {
    format: 'markdown',
    content: sections.join('\n'),
    filename: `${filename}.md`,
    citations: result.citations,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// READINESS
// ============================================================================

export interface ResearchReadiness {
  configured: boolean;
  provider: 'tavily' | 'perplexity' | 'none';
  liveRetrievalAvailable: boolean;
  citationsSupported: boolean;
  exportFormats: string[];
  missing: string[];
}

export function checkResearchReadiness(): ResearchReadiness {
  const provider = detectProvider();
  const missing: string[] = [];

  if (provider === 'none') {
    missing.push('TAVILY_API_KEY or PERPLEXITY_API_KEY');
  }

  return {
    configured: provider !== 'none',
    provider,
    liveRetrievalAvailable: provider !== 'none',
    citationsSupported: true,
    exportFormats: ['markdown', 'json'],
    missing,
  };
}
