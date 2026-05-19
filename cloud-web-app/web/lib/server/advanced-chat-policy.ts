export const SYSTEM_PROMPT = `Você é o Aethel AI, um assistente de desenvolvimento de jogos e aplicações integrado ao Aethel Engine.

Você tem acesso a ferramentas poderosas para:
- Criar e editar arquivos de código
- Gerar imagens, sprites e texturas
- Criar música e efeitos sonoros
- Editar vídeos
- Criar objetos de jogo e níveis
- Gerar modelos 3D

Quando o usuário pedir para criar algo, use as ferramentas apropriadas.
Seja conciso e direto. Foque em entregar resultados, não explicações longas.
Se precisar de mais contexto, pergunte.

Suas capacidades incluem:
- Criação completa de jogos (2D e 3D)
- Desenvolvimento web (React, Next.js, Node.js)
- Design de UI/UX
- Produção de mídia (áudio, vídeo, imagem)
- Programação em TypeScript, JavaScript, Python

Sempre responda em português brasileiro.`;

// ============================================================================
// HANDLER
// ============================================================================

export const QUALITY_POLICY = {
  standard: `Priorize clareza e resposta direta.`,
  delivery: `Entregue resposta executavel com passos objetivos, riscos e criterios de aceite.`,
  studio: `Modo studio obrigatorio:
- Nao entregue prototipo raso.
- Nao invente capacidade nao implementada.
- Inclua checklist de qualidade, riscos e validacoes.
- Para UI/UX, prefira padroes de mercado com consistencia de acessibilidade e feedback.
- Se faltar dado critico, explicite a lacuna antes de concluir.`,
} as const;

export const MAX_HISTORY_CONTEXT_CHARS = 12_000;
export const MAX_ROLE_CONTEXT_CHARS = 16_000;

export function buildSelfQuestioningChecklist(): string {
  return [
    'Perguntas obrigatorias antes de concluir:',
    '1) Esta resposta executa no estado real do repositorio?',
    '2) Existe alguma dependencia/contrato que pode quebrar?',
    '3) Estou propondo algo fora do escopo acordado?',
    '4) O usuario recebera comportamento funcional, nao fake success?',
    '5) A UX ficou clara (empty/error/loading/focus/keyboard)?',
    '6) Quais sao os principais riscos residuais?',
    '7) Quais validacoes/gates devem rodar para provar entrega?',
    '8) O resultado esta no nivel studio workflow (sem inflar claim)?',
  ].join('\n');
}

export function isInterfaceOrUxTask(text: string): boolean {
  const lower = String(text || '').toLowerCase();
  return [
    'interface',
    'ux',
    'ui',
    'usabilidade',
    'design',
    'preview',
    'editor',
    'dashboard',
    'layout',
    'acessibilidade',
  ].some((token) => lower.includes(token));
}

export async function maybeCollectWebBenchmarkContext(
  query: string,
  enabled: boolean
): Promise<{ summary: string; evidence: Array<{ title: string; url: string }> }> {
  if (!enabled || !isInterfaceOrUxTask(query)) {
    return { summary: '', evidence: [] };
  }

  try {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: `${query} best practices interface UX product software IDE`,
          search_depth: 'advanced',
          max_results: 3,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = await response.json();
        const refs = Array.isArray(data?.results)
          ? data.results
              .slice(0, 3)
              .map((r: { title?: unknown; url?: unknown }) => ({
                title: String(r?.title || 'reference'),
                url: String(r?.url || ''),
              }))
              .filter((r: { title: string; url: string }) => r.url)
          : [];
        if (refs.length > 0) {
          const summary = refs.map((r: { title: string; url: string }, i: number) => `${i + 1}. ${r.title} (${r.url})`).join('\n');
          return { summary, evidence: refs };
        }
      }
    }

    const ddg = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' UX UI best practices')}&format=json&no_html=1`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (ddg.ok) {
      const data = await ddg.json();
      const refs: Array<{ title: string; url: string }> = [];
      if (data?.AbstractURL) {
        refs.push({ title: String(data?.Heading || 'DuckDuckGo abstract'), url: String(data.AbstractURL) });
      }
      const topics = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
      for (const topic of topics) {
        if (refs.length >= 3) break;
        if (topic?.FirstURL && topic?.Text) {
          refs.push({ title: String(topic.Text).slice(0, 120), url: String(topic.FirstURL) });
        }
      }
      if (refs.length > 0) {
        const summary = refs.map((r, i) => `${i + 1}. ${r.title} (${r.url})`).join('\n');
        return { summary, evidence: refs };
      }
    }
  } catch {
    // best-effort only
  }

  return { summary: '', evidence: [] };
}
