/**
 * AI Chat API com Function Calling e Agentes
 * 
 * Endpoint avançado que processa mensagens do chat, executa ferramentas
 * quando necessário, e retorna respostas estruturadas.
 * 
 * Funciona em paralelo com a rota existente de proxy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';
import { aiService } from '@/lib/ai-service';
import { aiTools, ToolResult } from '@/lib/ai-tools-registry';
import { AgentExecutor, AGENTS } from '@/lib/ai-agent-system';
import { checkAIQuota, recordTokenUsage, checkModelAccess, checkFeatureAccess, getPlanLimits } from '@/lib/plan-limits';
import { prisma } from '@/lib/prisma';
import { AITraceSummary, createAITraceId } from '@/lib/ai-internal-trace';
import { persistAITrace } from '@/lib/ai-trace-store';

// Importa web tools para registro
import '@/lib/ai-web-tools';

// ============================================================================
// TIPOS
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface AdvancedChatRequest {
  messages: ChatMessage[];
  projectId?: string;
  agentId?: string;
  useTools?: boolean;
  model?: string;
  agentCount?: 1 | 2 | 3;
  roleModels?: {
    architect?: string;
    engineer?: string;
    critic?: string;
  };
  stream?: boolean;
  includeTrace?: boolean;
}

interface ChatResponse {
  message: ChatMessage;
  tokensUsed: number;
  toolsExecuted?: { name: string; result: ToolResult }[];
  agentExecution?: {
    steps: number;
    artifacts: number;
  };
  traceId?: string;
  traceSummary?: AITraceSummary;
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const SYSTEM_PROMPT = `Você é o Aethel AI, um assistente de desenvolvimento de jogos e aplicações integrado ao Aethel Engine.

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Autenticação
    const auth = requireAuth(request);
    const userId = auth.userId;

    const body: AdvancedChatRequest = await request.json();
    const { 
      messages, 
      projectId, 
      agentId, 
      useTools = true, 
      model: rawModel = 'gpt-4o', 
      agentCount: requestedAgentCount = 1,
      roleModels,
      stream = false,
      includeTrace = false,
    } = body;

    const model = normalizeModelName(rawModel);

    const traceId = createAITraceId();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Cap de tokens por request (anti-spike). Estima tokens por caracteres.
    // Heurística conservadora: ~4 chars/token + overhead.
    const userPlan = await prisma.user.findFirst({ where: { id: userId }, select: { plan: true } });
    const limits = getPlanLimits(userPlan?.plan || 'starter_trial');
    const rawChars = messages.map((m) => String(m.content || '')).join('\n').length;
    const estimatedTokensPerRole = Math.max(800, Math.ceil(rawChars / 4) + 800);
    const agentCount = clampAgentCount(requestedAgentCount);
    const estimatedTokens = estimatedTokensPerRole * agentCount;

    if (estimatedTokens > limits.maxTokensPerRequest) {
      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: `Request muito grande para o seu plano. Limite estimado: ${limits.maxTokensPerRequest.toLocaleString()} tokens por mensagem.`,
          maxTokensPerRequest: limits.maxTokensPerRequest,
        },
        { status: 413 }
      );
    }

    // Verificar quota
    const quotaCheck = await checkAIQuota(userId, estimatedTokens);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: quotaCheck.reason || 'AI quota exceeded' },
        { status: 429 }
      );
    }

    // Verificar multi-agente (roles 1/2/3)
    if (agentCount > 1) {
      const agentsFeature = await checkFeatureAccess(userId, 'agents');
      if (!agentsFeature.allowed) {
        return NextResponse.json(
          { error: agentsFeature.code || 'FEATURE_NOT_ALLOWED', message: agentsFeature.reason || 'Agents not available in your plan' },
          { status: 403 }
        );
      }

      if (agentCount > limits.maxAgents) {
        return NextResponse.json(
          {
            error: 'AGENTS_LIMIT_EXCEEDED',
            message: `Seu plano permite no máximo ${limits.maxAgents} agente(s).`,
            maxAgents: limits.maxAgents,
          },
          { status: 403 }
        );
      }

      if (stream) {
        return NextResponse.json(
          { error: 'STREAM_NOT_SUPPORTED_FOR_MULTI_ROLE', message: 'Streaming ainda não suportado no modo multi-role.' },
          { status: 400 }
        );
      }
    }

    // Verificar acesso ao(s) modelo(s)
    if (agentCount <= 1) {
      const modelAccess = await checkModelAccess(userId, model);
      if (!modelAccess.allowed) {
        return NextResponse.json(
          { error: modelAccess.reason || `Model ${model} not available` },
          { status: 403 }
        );
      }
    } else {
      const architectModel = normalizeModelName((roleModels?.architect || model).trim());
      const engineerModel = normalizeModelName((roleModels?.engineer || model).trim());
      const criticModel = normalizeModelName((roleModels?.critic || model).trim());

      const needed: Array<{ role: 'architect' | 'engineer' | 'critic'; model: string }> = [
        { role: 'architect', model: architectModel },
        { role: 'engineer', model: engineerModel },
      ];
      if (agentCount === 3) needed.push({ role: 'critic', model: criticModel });

      for (const item of needed) {
        const access = await checkModelAccess(userId, item.model);
        if (!access.allowed) {
          return NextResponse.json(
            { error: access.code || 'MODEL_NOT_ALLOWED', message: access.reason || `Model ${item.model} not available`, role: item.role },
            { status: 403 }
          );
        }
      }
    }

    // Buscar contexto do projeto se fornecido
    let projectContext = '';
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
        include: {
          files: { take: 50, orderBy: { updatedAt: 'desc' } },
        },
      });

      if (project) {
        projectContext = `
Projeto atual: ${project.name}
Tipo: ${project.template || 'game'}
Arquivos recentes: ${project.files.map((f: { path: string }) => f.path).join(', ')}
`;
      }
    }

    // Se agente específico foi solicitado
    if (agentId && AGENTS[agentId]) {
      const agentsFeature = await checkFeatureAccess(userId, 'agents');
      if (!agentsFeature.allowed) {
        return NextResponse.json(
          { error: agentsFeature.code || 'FEATURE_NOT_ALLOWED', message: agentsFeature.reason || 'Agents not available in your plan' },
          { status: 403 }
        );
      }
      return handleAgentRequest(userId, agentId, messages, projectId, includeTrace);
    }

    // Construir mensagens para a API
    const systemMessage = SYSTEM_PROMPT + (projectContext ? `\n\n${projectContext}` : '');
    
    // Se streaming, usar streaming response
    if (stream) {
      return handleStreamingResponse(userId, systemMessage, messages, model, traceId, estimatedTokens);
    }

    // Chamada normal (não streaming)
    let response: ChatMessage;
    let totalTokens = 0;
    const toolsExecuted: { name: string; result: ToolResult }[] = [];

    // O AIService atual suporta `query(userQuery, context?, options)`.
    // Esta rota mantém a interface "advanced", mas consolida o histórico como contexto.
    const historyContext = messages
      .slice(0, -1)
      .filter((m) => m.role !== 'tool')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const lastUserMessage = messages[messages.length - 1].content;

    if (agentCount > 1) {
      const architectModel = normalizeModelName((roleModels?.architect || model).trim());
      const engineerModel = normalizeModelName((roleModels?.engineer || model).trim());
      const criticModel = normalizeModelName((roleModels?.critic || model).trim());

      const architectResult = await aiService.query(lastUserMessage, historyContext || undefined, {
        model: architectModel,
        provider: inferProviderFromModel(architectModel),
        systemPrompt: `${systemMessage}\n\nROLE: ARQUITETO\nVocê é o Arquiteto. Produza um plano curto, perguntas (máx 3) se necessário, e uma decisão final com 1–3 motivos. Não escreva código.`,
      });

      const architectSnippet = clampText(architectResult.content, 2000);

      const engineerResult = await aiService.query(lastUserMessage, `${historyContext || ''}\n\n=== Arquiteto (interno) ===\n${architectSnippet}`, {
        model: engineerModel,
        provider: inferProviderFromModel(engineerModel),
        systemPrompt: `${systemMessage}\n\nROLE: ENGENHEIRO\nVocê é o Engenheiro. Execute a resposta final para o usuário. Use o plano do Arquiteto apenas como guia interno. Seja direto e entregue.`,
      });

      totalTokens = (architectResult.tokensUsed || 0) + (engineerResult.tokensUsed || 0);
      let finalContent = engineerResult.content;

      let criticSummary: { verdict?: string; bullets?: string[]; raw?: string } | null = null;
      if (agentCount === 3) {
        const criticResult = await aiService.query(
          lastUserMessage,
          `${historyContext || ''}\n\n=== Arquiteto (interno) ===\n${architectSnippet}\n\n=== Resposta do Engenheiro (interno) ===\n${clampText(engineerResult.content, 2000)}`,
          {
            model: criticModel,
            provider: inferProviderFromModel(criticModel),
            systemPrompt: `${systemMessage}\n\nROLE: CRÍTICO\nVocê é o Crítico (QA). Responda com:\nVEREDITO: ✅/⚠️/❌\n- 1 a 3 bullets de riscos/correções mínimas\nSem debate infinito.`,
          }
        );
        totalTokens += criticResult.tokensUsed || 0;
        criticSummary = summarizeCritic(criticResult.content);
        if (criticSummary?.verdict && (criticSummary.bullets?.length || 0) > 0) {
          finalContent = `${finalContent}\n\nCrítico: ${criticSummary.verdict} ${criticSummary.bullets?.slice(0, 3).join(' ')}`;
        }
      }

      response = { role: 'assistant', content: finalContent };

      // Registrar uso de tokens
      await recordTokenUsage(userId, totalTokens);

      const latencyMs =
        (architectResult.latencyMs || 0) + (engineerResult.latencyMs || 0);

      const chatResponse: ChatResponse = {
        message: response,
        tokensUsed: totalTokens,
        toolsExecuted: toolsExecuted.length > 0 ? toolsExecuted : undefined,
        traceId: includeTrace ? traceId : undefined,
        traceSummary: includeTrace
          ? {
            traceId,
            summary: `Resposta gerada (multi-role: ${agentCount} agentes).`,
            decisionRecord: {
              decision: 'Executar Arquiteto/Engenheiro/Crítico internamente e publicar uma resposta consolidada.',
              reasons: ['Planejamento separado', 'Execução focada', ...(agentCount === 3 ? ['Revisão curta do crítico'] : [])],
            },
            evidence: [
              { kind: 'context', label: `historyContextMessages=${messages.length - 1}` },
              { kind: 'other', label: `agentCount=${agentCount}` },
              { kind: 'other', label: `models`, detail: `architect=${architectModel}; engineer=${engineerModel}${agentCount === 3 ? `; critic=${criticModel}` : ''}` },
              { kind: 'other', label: 'architectOutput', detail: clampText(architectResult.content, 800) },
              ...(agentCount === 3 && criticSummary?.raw
                ? ([{ kind: 'other', label: 'criticOutput', detail: clampText(criticSummary.raw, 800) }] as const)
                : []),
            ],
            telemetry: {
              model: engineerModel,
              provider: inferProviderFromModel(engineerModel),
              estimatedTokens,
              tokensUsed: totalTokens,
              latencyMs: latencyMs || undefined,
            },
          }
          : undefined,
      };

      if (includeTrace && chatResponse.traceSummary) {
        persistAITrace({
          userId,
          trace: chatResponse.traceSummary,
          kind: 'chat',
          projectId,
        }).catch((err) => console.warn('[AI Trace] Falha ao persistir trace:', err));
      }

      return NextResponse.json(chatResponse);
    }

    const result = await aiService.query(
      lastUserMessage,
      historyContext || undefined,
      { model, provider: inferProviderFromModel(model), systemPrompt: systemMessage }
    );

    totalTokens = result.tokensUsed;
    response = {
      role: 'assistant',
      content: result.content,
    };

    // Registrar uso de tokens
    await recordTokenUsage(userId, totalTokens);

    const chatResponse: ChatResponse = {
      message: response,
      tokensUsed: totalTokens,
      toolsExecuted: toolsExecuted.length > 0 ? toolsExecuted : undefined,
      traceId: includeTrace ? traceId : undefined,
      traceSummary: includeTrace
        ? {
            traceId,
            summary: 'Resposta gerada (modo chat).',
            decisionRecord: {
              decision: 'Responder ao usuário com base no histórico e contexto do projeto.',
            },
            evidence: [
              {
                kind: 'context',
                label: `historyContextMessages=${messages.length - 1}`,
              },
              ...(projectId
                ? ([
                    {
                      kind: 'context',
                      label: 'projectContext',
                      detail: `projectId=${projectId}`,
                    },
                  ] as const)
                : []),
            ],
            toolRuns: toolsExecuted.map((t) => ({ toolName: t.name, status: 'ok' })),
            telemetry: {
              model,
              provider: inferProviderFromModel(model),
              estimatedTokens,
              tokensUsed: totalTokens,
              latencyMs: result.latencyMs || undefined,
            },
          }
        : undefined,
    };

    if (includeTrace && chatResponse.traceSummary) {
      persistAITrace({
        userId,
        trace: chatResponse.traceSummary,
        kind: 'chat',
        projectId,
      }).catch((err) => console.warn('[AI Trace] Falha ao persistir trace:', err));
    }

    return NextResponse.json(chatResponse);

  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    console.error('Advanced Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function clampAgentCount(value: unknown): 1 | 2 | 3 {
  const n = typeof value === 'number' ? Math.floor(value) : Number(value);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

function clampText(text: string, maxChars: number): string {
  const s = String(text || '');
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(0, maxChars - 1)) + '…';
}

function inferProviderFromModel(model: string): 'openai' | 'anthropic' | 'google' | undefined {
  const m = (model || '').trim().toLowerCase();
  if (m.startsWith('gpt-')) return 'openai';
  if (m.startsWith('claude-')) return 'anthropic';
  if (m.startsWith('gemini-')) return 'google';
  return undefined;
}

function normalizeModelName(model: string): string {
  const raw = String(model || '').trim();
  if (!raw) return raw;
  // Aceita formatos como "openai:gpt-4o-mini" e usa apenas o nome do modelo.
  const idx = raw.indexOf(':');
  if (idx > 0 && idx < raw.length - 1) {
    const prefix = raw.slice(0, idx).toLowerCase();
    if (prefix === 'openai' || prefix === 'anthropic' || prefix === 'google' || prefix === 'groq') {
      return raw.slice(idx + 1);
    }
  }
  return raw;
}

function summarizeCritic(raw: string): { verdict?: string; bullets?: string[]; raw: string } {
  const text = String(raw || '').trim();
  const verdictMatch = text.match(/VEREDITO\s*:\s*(✅|⚠️|❌)/i);
  const verdict = verdictMatch?.[1];
  const bullets = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('-'))
    .map((l) => l.replace(/^[-\s]+/, ''))
    .filter(Boolean);
  return { verdict, bullets: bullets.length ? bullets : undefined, raw: text };
}

// ============================================================================
// AGENT HANDLER
// ============================================================================

async function handleAgentRequest(
  userId: string,
  agentId: string,
  messages: ChatMessage[],
  projectId: string | undefined,
  includeTrace: boolean
): Promise<NextResponse> {
  try {
    const lastMessage = messages[messages.length - 1];
    
    const executor = new AgentExecutor(agentId);
    const execution = await executor.execute({
      id: `task-${Date.now()}`,
      description: lastMessage.content,
      context: projectId ? `Project ID: ${projectId}` : undefined,
      executionContext: {
        userId,
        projectId,
      },
    });

    const traceId = createAITraceId();

    // Registrar uso estimado
    const estimatedTokens = execution.steps.length * 1000;
    await recordTokenUsage(userId, estimatedTokens);

    // Formatar resposta
    const content = execution.finalAnswer || 'Task completed.';
    const artifactsSummary = execution.artifacts.length > 0
      ? `\n\nArtefatos criados: ${execution.artifacts.map(a => a.name).join(', ')}`
      : '';

    const traceSummary: AITraceSummary = {
      traceId,
      summary: `Resposta gerada (modo agente: ${agentId}).`,
      decisionRecord: {
        decision: 'Executar tarefa via AgentExecutor e consolidar resposta final.',
      },
      evidence: [
        {
          kind: 'tool',
          label: 'AgentExecutor.execute',
          detail: `steps=${execution.steps.length}; artifacts=${execution.artifacts.length}`,
        },
        ...(execution.steps
          .filter((s) => s.action?.tool)
          .slice(0, 20)
          .map((s) => ({
            kind: 'tool' as const,
            label: String(s.action?.tool),
            detail: (s.observation || '').slice(0, 280),
          }))),
        ...(projectId
          ? ([
              {
                kind: 'context' as const,
                label: 'projectContext',
                detail: `projectId=${projectId}`,
              },
            ] as const)
          : []),
      ],
      toolRuns: execution.steps
        .filter((s) => s.action?.tool)
        .slice(0, 25)
        .map((s) => ({
          toolName: String(s.action?.tool),
          status: s.result?.success ? 'ok' : 'error',
        })),
      telemetry: {
        estimatedTokens,
        tokensUsed: estimatedTokens,
      },
    };

    if (includeTrace) {
      persistAITrace({
        userId,
        kind: 'agent',
        trace: traceSummary,
        projectId,
      }).catch((err) => console.warn('[AI Trace] Falha ao persistir trace (agent):', err));
    }

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: content + artifactsSummary,
      },
      tokensUsed: estimatedTokens,
      agentExecution: {
        steps: execution.steps.length,
        artifacts: execution.artifacts.length,
      },
      traceId: includeTrace ? traceId : undefined,
      traceSummary: includeTrace ? traceSummary : undefined,
    });

  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent execution failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// STREAMING HANDLER
// ============================================================================

async function handleStreamingResponse(
  userId: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  traceId: string,
  estimatedTokens: number
): Promise<NextResponse> {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const meta = JSON.stringify({ type: 'meta', traceId, model, estimatedTokens });
        controller.enqueue(encoder.encode(`data: ${meta}\n\n`));

				const historyContext = messages
					.slice(0, -1)
					.filter((m) => m.role !== 'tool')
					.map((m) => `${m.role}: ${m.content}`)
					.join('\n');

				const result = await aiService.query(
					messages[messages.length - 1].content,
					historyContext || undefined,
					{ model, systemPrompt }
				);

				const data = JSON.stringify({ type: 'content', content: result.content });
				controller.enqueue(encoder.encode(`data: ${data}\n\n`));

				await recordTokenUsage(userId, result.tokensUsed);

        persistAITrace({
          userId,
          kind: 'stream',
          trace: {
            traceId,
            summary: 'Resposta gerada (modo chat streaming).',
            decisionRecord: {
              decision: 'Responder via streaming com backpressure.',
            },
            evidence: [{ kind: 'context', label: `historyContextMessages=${messages.length - 1}` }],
            telemetry: { model, estimatedTokens, tokensUsed: result.tokensUsed },
          },
        }).catch((err) => console.warn('[AI Trace] Falha ao persistir trace:', err));
        const doneData = JSON.stringify({ type: 'done', tokensUsed: result.tokensUsed, traceId });
				controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));

				controller.close();

      } catch (error) {
        const errorData = JSON.stringify({ 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Stream error' 
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ============================================================================
// GET - Listar agentes e ferramentas disponíveis
// ============================================================================

export async function GET(): Promise<NextResponse> {
  const agents = Object.values(AGENTS).map(agent => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    description: agent.description,
    toolCount: agent.tools.length,
  }));

  const tools = aiTools.getAll().map(tool => ({
    name: tool.name,
    category: tool.category,
    description: tool.description,
  }));

  return NextResponse.json({
    agents,
    tools,
    capabilities: {
      functionCalling: true,
      streaming: true,
      multiAgent: true,
    },
  });
}
