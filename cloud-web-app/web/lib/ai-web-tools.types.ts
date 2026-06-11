export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface WebPageContent {
  url: string;
  title: string;
  content: string;
  markdown: string;
  metadata: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishedDate?: string;
  };
}

export interface TavilySearchResponse {
  results?: Array<{ title?: string; url?: string; content?: string; score?: number }>;
}

export interface SerperSearchResponse {
  organic?: Array<{ title?: string; link?: string; snippet?: string }>;
}

export interface MdnSearchResponse {
  documents?: Array<{ title?: string; mdn_url?: string; summary?: string }>;
}

function getBrowserOperatorRuntimeContextFromParams(
  params: Record<string, unknown>
): BrowserOperatorRuntimeContext | null {
  const runtime = params.__aethelRuntime
  if (!runtime || typeof runtime !== 'object') {
    return null
  }

  const browserOperator = (runtime as { browserOperator?: unknown }).browserOperator
  if (!browserOperator || typeof browserOperator !== 'object') {
    return null
  }

  const context = browserOperator as Record<string, unknown>

  return {
    canStart: typeof context.canStart === 'boolean' ? context.canStart : undefined,
    requiresConfirmation:
      typeof context.requiresConfirmation === 'boolean'
        ? context.requiresConfirmation
        : undefined,
    approved: typeof context.approved === 'boolean' ? context.approved : undefined,
    placement: typeof context.placement === 'string' ? context.placement : null,
    target: typeof context.target === 'string' ? context.target : null,
    mode: typeof context.mode === 'string' ? context.mode : null,
    reason: typeof context.reason === 'string' ? context.reason : null,
  }
}

function getRuntimeBlockedToolResult(
  params: Record<string, unknown>
): ToolResult | null {
  const block = getBrowserOperatorRuntimeBlock(
    getBrowserOperatorRuntimeContextFromParams(params)
  )

  if (!block) {
    return null
  }

  return {
    success: false,
    error: block.message,
    data: {
      code: block.code,
      runtime: {
        placement: block.placement,
        target: block.target,
        mode: block.mode,
      },
    },
  }
}
