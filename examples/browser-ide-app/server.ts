import http = require('http');
import path = require('path');
import express = require('express');
import cors = require('cors');
import { WebSocketServer } from 'ws';

import { LLMRouter, type RoutingRequest } from '../../src/common/llm/llm-router';
import {
  createSupremeOrchestrator,
  checkSystemReadiness,
  type OrchestratorTask,
} from '../../src/common/supreme-ai';

// Diagnostics: surface crashes instead of silent exit.
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[fatal] uncaughtException:', err);
  process.exitCode = 1;
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[fatal] unhandledRejection:', reason);
  process.exitCode = 1;
});

process.on('beforeExit', (code) => {
  // eslint-disable-next-line no-console
  console.error('[diag] beforeExit code=', code);
});

process.on('exit', (code) => {
  // eslint-disable-next-line no-console
  console.error('[diag] exit code=', code);
});

type AgentType = 'architect' | 'coder' | 'research' | 'ai-dream' | 'character-memory';

type AgentRequestBody = {
  input?: string;
  workspaceId?: string;
  userId?: string;
};

type WsEnvelope = {
  id: string;
  type: string;
  timestamp: number;
  payload: unknown;
};

type TheiaMissionStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed';

type TheiaMissionUpdatePayload = {
  missionId: string;
  status: TheiaMissionStatus;
  progress: number;
  currentStage: string;
  actualCost: number;
  estimatedCompletion?: number;
  errors?: string[];
  warnings?: string[];
};

type ExecuteTaskRequest = {
  type?: OrchestratorTask['type'];
  description?: string;
  parameters?: Record<string, unknown>;
  priority?: OrchestratorTask['priority'];
};

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_resolve, reject) => {
        t = setTimeout(() => reject(new Error(`TIMEOUT: ${label} (${ms}ms)`)), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return Date.now();
}

function getAgentSystemPrompt(type: AgentType): string {
  switch (type) {
    case 'architect':
      return 'Você é um arquiteto de software sênior. Responda com arquitetura, trade-offs, riscos e passos práticos.';
    case 'coder':
      return 'Você é um engenheiro de software sênior. Gere código correto, seguro e pronto para produção. Se faltar contexto, peça o mínimo necessário.';
    case 'research':
      return 'Você é um pesquisador metódico. Seja factual, liste suposições e explique incertezas. Não invente fontes.';
    default:
      return 'Recurso não implementado.';
  }
}

function estimateTokensRough(text: string): number {
  // Heurística simples (não é telemetria “real”): ~4 chars/token.
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

async function callProviderChatCompletion(args: {
  providerId: string;
  endpoint: string;
  apiKey: string;
  modelId: string;
  system: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}): Promise<string> {
  const { providerId, endpoint, apiKey, modelId, system, prompt, maxTokens, temperature } = args;

  if (!apiKey) {
    throw new Error(`${providerId.toUpperCase()}_API_KEY_MISSING`);
  }

  // OpenAI-compatible providers
  if (providerId === 'openai' || providerId === 'deepseek') {
    const resp = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`LLM_HTTP_${resp.status}: ${text || resp.statusText}`);
    }
    const data = (await resp.json()) as any;
    return String(data?.choices?.[0]?.message?.content ?? '');
  }

  // Anthropic
  if (providerId === 'anthropic') {
    const resp = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`LLM_HTTP_${resp.status}: ${text || resp.statusText}`);
    }
    const data = (await resp.json()) as any;
    const parts: any[] = Array.isArray(data?.content) ? data.content : [];
    const out = parts.map(p => (p?.type === 'text' ? p?.text : '')).join('');
    return String(out ?? '');
  }

  // Google Gemini (Generative Language API)
  if (providerId === 'google') {
    const url = `${endpoint}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${system}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`LLM_HTTP_${resp.status}: ${text || resp.statusText}`);
    }
    const data = (await resp.json()) as any;
    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
    return parts.map(p => String(p?.text ?? '')).join('');
  }

  throw new Error(`PROVIDER_NOT_SUPPORTED: ${providerId}`);
}

export async function startServer(): Promise<void> {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const HOST = String(process.env.HOST || '127.0.0.1');

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const rootDir = path.resolve(__dirname);
  app.use(express.static(rootDir));

  // In-memory task snapshot store (para status consultável via API)
  const taskStore = new Map<string, OrchestratorTask>();

  const llmRouter = new LLMRouter();

  // Orchestrator lifecycle: server listens immediately; orchestrator init runs async.
  let orchestrator: ReturnType<typeof createSupremeOrchestrator> | null = null;
  let orchestratorState: 'initializing' | 'ready' | 'failed' = 'initializing';
  let orchestratorError: string | null = null;

  // -----------------------------
  // REST: Health / Status
  // -----------------------------

  app.get('/api/health', async (_req, res) => {
    let r;
    try {
      r = await withTimeout(checkSystemReadiness(), 10_000, 'checkSystemReadiness');
    } catch (e) {
      r = {
        ready: false,
        components: {},
        error: e instanceof Error ? e.message : String(e),
      } as any;
    }
    res.json({
      status: orchestratorState === 'ready' && (r as any).ready ? 'ready' : orchestratorState,
      readiness: r,
      orchestrator: orchestrator ? orchestrator.getStatus() : { status: orchestratorState, error: orchestratorError },
      timestamp: nowIso(),
    });
  });

  app.get('/api/status', (_req, res) => {
    if (!orchestrator) {
      return res.status(orchestratorState === 'failed' ? 500 : 503).json({
        error: 'ORCHESTRATOR_NOT_READY',
        status: orchestratorState,
        message: orchestratorError || 'Orquestrador ainda está inicializando.',
        timestamp: nowIso(),
      });
    }
    res.json({
      orchestrator: orchestrator.getStatus(),
      timestamp: nowIso(),
    });
  });

  // -----------------------------
  // REST: Orchestrator tasks
  // -----------------------------

  app.post('/api/tasks/execute', async (req, res) => {
    try {
      if (!orchestrator) {
        return res.status(orchestratorState === 'failed' ? 500 : 503).json({
          error: 'ORCHESTRATOR_NOT_READY',
          status: orchestratorState,
          message: orchestratorError || 'Orquestrador ainda está inicializando.',
        });
      }

      const body = (req.body ?? {}) as ExecuteTaskRequest;

      if (!body.type || !body.description || !body.parameters || !body.priority) {
        return res.status(400).json({
          error: 'INVALID_TASK',
          message: 'Campos obrigatórios: type, description, parameters, priority.',
        });
      }

      const task = await orchestrator.executeTask({
        type: body.type,
        description: body.description,
        parameters: body.parameters,
        priority: body.priority,
      });

      taskStore.set(task.id, task);

      return res.json({ task });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return res.status(500).json({ error: 'TASK_EXECUTION_FAILED', message: msg });
    }
  });

  app.get('/api/tasks/:id', (req, res) => {
    const id = String(req.params.id);
    const task = taskStore.get(id);
    if (!task) {
      return res.status(404).json({ error: 'TASK_NOT_FOUND' });
    }
    return res.json({ task });
  });

  // -----------------------------
  // REST: Real agent endpoint (no mocks)
  // -----------------------------

  // Theia thin-client hook: backend agent selection.
  // Real-or-fail: do not pretend to select without configuration.
  app.post('/orchestrator/select', async (req, res) => {
    const prompt = String((req.body ?? {})?.prompt ?? '').trim();
    if (!prompt) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Campo "prompt" é obrigatório.' });
    }

    const configured = String(process.env.AETHEL_ORCHESTRATOR_SELECT_AGENT_ID ?? '').trim();
    if (!configured) {
      return res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message:
          'Seleção de agente (orchestrator/select) não está configurada. Defina AETHEL_ORCHESTRATOR_SELECT_AGENT_ID (ex.: Universal) ou implemente um seletor real.',
      });
    }

    return res.json({ agent_ids: [configured] });
  });

  app.post('/api/agent/:type', async (req, res) => {
    const type = String(req.params.type) as AgentType;
    const body = (req.body ?? {}) as AgentRequestBody;
    const input = String(body.input ?? '').trim();
    const workspaceId = String(body.workspaceId ?? 'local');
    const userId = String(body.userId ?? 'local');

    const supported: AgentType[] = ['architect', 'coder', 'research', 'ai-dream', 'character-memory'];
    if (!supported.includes(type)) {
      return res.status(400).json({
        error: 'UNKNOWN_AGENT',
        message: `Agente inválido. Use: ${supported.join(', ')}`,
      });
    }

    if (type === 'ai-dream' || type === 'character-memory') {
      return res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message: `O agente '${type}' não está implementado no backend real ainda.`,
      });
    }

    if (!input) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Campo "input" é obrigatório.',
      });
    }

    const system = getAgentSystemPrompt(type);

    // Sem chave, falha explicitamente (não retorna “resposta fake”)
    const hasAnyKey = Boolean(
      process.env.OPENAI_API_KEY ||
        process.env.DEEPSEEK_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.GOOGLE_API_KEY
    );
    if (!hasAnyKey) {
      return res.status(503).json({
        error: 'LLM_NOT_CONFIGURED',
        message:
          'Nenhuma chave de LLM configurada. Defina uma das envs: OPENAI_API_KEY, DEEPSEEK_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY.',
      });
    }

    const start = Date.now();

    const routingRequest: RoutingRequest = {
      domain: 'code',
      task: type,
      priority: 'normal',
      constraints: {
        minQuality: type === 'architect' ? 0.9 : 0.85,
      },
      estimatedTokens: {
        input: estimateTokensRough(system) + estimateTokensRough(input),
        output: type === 'architect' ? 1800 : 1400,
      },
      context: {
        workspaceId,
        userId,
        budget: llmRouter.getBudget(workspaceId),
      },
    };

    try {
      const decision = await llmRouter.route(routingRequest);

      const content = await llmRouter.execute(
        decision,
        async (model, provider) => {
          return await callProviderChatCompletion({
            providerId: provider.id,
            endpoint: provider.endpoint,
            apiKey: provider.apiKey,
            modelId: model.id,
            system,
            prompt: input,
            maxTokens: type === 'architect' ? 2500 : 2000,
            temperature: type === 'coder' ? 0.2 : 0.4,
          });
        },
        routingRequest
      );

      const durationMs = Date.now() - start;
      return res.json({
        agentId: type,
        content,
        metadata: {
          provider: decision.provider.id,
          model: decision.model.id,
          estimatedCost: decision.estimatedCost,
          durationMs,
          timestamp: nowIso(),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      const durationMs = Date.now() - start;
      return res.status(502).json({
        error: 'AGENT_EXECUTION_FAILED',
        message: msg,
        metadata: { durationMs, timestamp: nowIso() },
      });
    }
  });

  // Serve a IDE (Monaco) como página inicial
  // (o index.html atual é um dashboard/landing e não parece uma IDE real)
  app.get('/', (_req, res) => {
    res.sendFile(path.join(rootDir, 'monaco-editor.html'));
  });

  // -----------------------------
  // HTTP + WebSocket
  // -----------------------------

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.error(`[diag] shutdown signal=${signal}`);

    try {
      wss.close();
    } catch {
      // ignore
    }

    try {
      server.close(() => {
        process.exit(0);
      });
    } catch {
      process.exit(0);
    }

    // Fallback: if close hangs, exit anyway.
    setTimeout(() => process.exit(0), 2_000).unref();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  let wsSeq = 0;
  const nextWsId = () => {
    wsSeq += 1;
    return `ws_${nowMs()}_${wsSeq}`;
  };

  const broadcast = (type: string, payload: unknown) => {
    const msg: WsEnvelope = { id: nextWsId(), type, timestamp: nowMs(), payload };
    const data = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  };

  const emitMissionUpdate = (update: TheiaMissionUpdatePayload) => {
    broadcast('mission.update', update);
  };

  const emitMissionComplete = (missionId: string, result: unknown) => {
    broadcast('mission.complete', { missionId, result });
  };

  const emitMissionError = (missionId: string, error: string) => {
    broadcast('mission.error', { missionId, error });
  };

  const safeString = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

  const mapOrchestratorEventToTheia = (ev: string, payload: unknown) => {
    const p: any = payload as any;
    const task = p?.task;
    const mission = p?.mission;

    if (task?.id) {
      const missionId = safeString(task.id);
      const actualCost = Number(task?.cost ?? 0) || 0;
      const description = safeString(task?.description ?? ev);

      if (ev === 'task_queued') {
        emitMissionUpdate({
          missionId,
          status: 'queued',
          progress: 0,
          currentStage: description || 'Queued',
          actualCost,
        });
        return;
      }

      if (ev === 'task_started') {
        emitMissionUpdate({
          missionId,
          status: 'running',
          progress: 0.05,
          currentStage: description || 'Started',
          actualCost,
        });
        return;
      }

      if (ev === 'task_completed') {
        emitMissionUpdate({
          missionId,
          status: 'completed',
          progress: 1,
          currentStage: description || 'Completed',
          actualCost,
        });
        emitMissionComplete(missionId, task?.result);
        return;
      }

      if (ev === 'task_failed') {
        const err = safeString(task?.error ?? p?.error ?? 'Unknown error');
        emitMissionUpdate({
          missionId,
          status: 'failed',
          progress: 1,
          currentStage: description || 'Failed',
          actualCost,
          errors: [err],
        });
        emitMissionError(missionId, err);
        return;
      }
    }

    if (mission?.id) {
      const missionId = safeString(mission.id);
      const actualCost = Number(mission?.cost ?? 0) || 0;
      const description = safeString(mission?.description ?? ev);
      if (ev === 'mission_completed') {
        emitMissionUpdate({
          missionId,
          status: 'completed',
          progress: 1,
          currentStage: description || 'Completed',
          actualCost,
        });
        emitMissionComplete(missionId, mission?.result);
        return;
      }
      if (ev === 'mission_failed') {
        const err = safeString(mission?.error ?? p?.error ?? 'Unknown error');
        emitMissionUpdate({
          missionId,
          status: 'failed',
          progress: 1,
          currentStage: description || 'Failed',
          actualCost,
          errors: [err],
        });
        emitMissionError(missionId, err);
        return;
      }
    }
  };

  // Wire orchestrator events -> websocket
  const forwardEvents = [
    'initializing',
    'initialized',
    'stopped',
    'mode_changed',
    'task_queued',
    'task_started',
    'task_completed',
    'task_failed',
    'mission_completed',
    'mission_failed',
    'pattern_learned',
    'strategy_created',
    'trade_opened',
    'trade_closed',
    'action_suggested',
    'initialization_error',
  ] as const;

  const attachOrchestratorEventForwarding = () => {
    if (!orchestrator) return;
    for (const ev of forwardEvents) {
      orchestrator.on(ev, (payload: unknown) => {
        // Atualiza store de tasks quando aplicável
        const p = payload as any;
        if (p?.task?.id) {
          taskStore.set(String(p.task.id), p.task as OrchestratorTask);
        }
        broadcast(ev, payload);
        // Compatibility stream for Theia Mission Control
        mapOrchestratorEventToTheia(ev, payload);
      });
    }
  };

  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        id: nextWsId(),
        type: 'hello',
        timestamp: nowMs(),
        payload: {
          message: 'ws_connected',
          orchestrator: orchestrator ? orchestrator.getStatus() : { status: orchestratorState, error: orchestratorError },
        },
      } satisfies WsEnvelope)
    );

    socket.on('message', (raw) => {
      try {
        const txt = typeof raw === 'string' ? raw : raw.toString('utf8');
        const msg = JSON.parse(txt) as { type?: string; payload?: any };
        if (msg && msg.type === 'heartbeat') {
          socket.send(
            JSON.stringify(
              { id: nextWsId(), type: 'heartbeat', timestamp: nowMs(), payload: { timestamp: nowMs() } } satisfies WsEnvelope
            )
          );
        }
      } catch {
        // ignore invalid messages
      }
    });
  });


  await new Promise<void>((resolve, reject) => {
    server.once('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Server listen error:', err);
      if ((err as any)?.code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.error(
          `PORT_IN_USE: Porta ${PORT} já está em uso. Encerre o processo que está ocupando a porta ou escolha outra com PORT=<porta>.`
        );
      }
      reject(err);
    });
    server.listen(PORT, HOST, () => {
      const url = `http://${HOST}:${PORT}`;
      // eslint-disable-next-line no-console
      console.log(`Aethel Browser IDE backend: ${url}`);
      // eslint-disable-next-line no-console
      console.log(`WS: ws://${HOST}:${PORT}/ws`);
      resolve();
    });
  });

  // Kick off orchestrator init after the server is reachable.
  (async () => {
    try {
      const readiness = await withTimeout(checkSystemReadiness(), 20_000, 'checkSystemReadiness(init)');
      orchestrator = createSupremeOrchestrator({
        enableWebAutomation: Boolean((readiness as any)?.components?.webAutomation),
        enableTrading: false,
        enableCloudDeploy: process.env.AETHEL_ENABLE_CLOUD_DEPLOY === '1',
        enableMissions: true,
        enableLearning: true,
        mode: 'supervised',
      });

      attachOrchestratorEventForwarding();
      await withTimeout(orchestrator.initialize(), 60_000, 'orchestrator.initialize');
      orchestratorState = 'ready';
      orchestratorError = null;
      broadcast('initialized', { ok: true, timestamp: nowIso() });
    } catch (e) {
      orchestratorState = 'failed';
      orchestratorError = e instanceof Error ? e.message : String(e);
      broadcast('initialization_error', { error: orchestratorError, timestamp: nowIso() });
      // eslint-disable-next-line no-console
      console.error('Orchestrator init failed:', orchestratorError);
    }
  })();

  // Mantém o processo vivo (evita encerramento prematuro em ambientes que “soltam” o handle)
  // Keep-alive: garante que o processo não encerre prematuramente em ambientes
  // onde o handle do servidor pode não segurar o event loop como esperado.
  setInterval(() => {}, 60_000);
}

void startServer();
