import { NextRequest, NextResponse } from 'next/server';
import { AutonomousAgent } from '@/lib/ai/agent-mode';
import { aiService } from '@/lib/ai-service';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { consumeMeteredUsage } from '@/lib/metering';
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard';
import {
  loadAgentSnapshot,
  saveAgentSnapshot,
  type AgentSnapshot,
} from '@/lib/server/agent-store';

/**
 * API Route: Agent Mode Execution
 * 
 * Endpoint para executar tarefas no modo agente autônomo.
 * Suporta streaming de eventos via SSE.
 * 
 * REQUER AUTENTICAÇÃO - Verifica plano e limites do usuário.
 */

// Store active agents by session (keyed by userId:sessionId)
const activeAgents = new Map<string, { agent: AutonomousAgent; userId: string; createdAt: Date }>();

// Limpar agentes inativos após 1 hora
const AGENT_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, { createdAt }] of activeAgents.entries()) {
    if (now - createdAt.getTime() > AGENT_TTL_MS) {
      activeAgents.delete(key);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

export async function POST(req: NextRequest) {
  try {
    // AUTENTICAÇÃO OBRIGATÓRIA
    const auth = requireAuth(req);
    
    // Verificar entitlements do usuário
    const entitlements = await requireEntitlementsForUser(auth.userId);
    
    // Verificar se pode usar agent mode (feature do plano)
    const hasAgentAccess = Array.isArray(entitlements.plan.allowedAgents)
      && entitlements.plan.allowedAgents.length > 0;
    if (!hasAgentAccess) {
      return NextResponse.json(
        { error: 'Agent mode not available in your plan. Please upgrade.' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { action, sessionId, task, input, config } = body;
    
    // Validar action
    const validActions = ['start', 'status', 'pause', 'resume', 'stop', 'input', 'approve', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Key única por usuário
    const agentKey = (sid: string) => `${auth.userId}:${sid}`;
    
    const nowIso = () => new Date().toISOString();
    const persistSnapshot = async (params: {
      sessionId: string
      status?: Record<string, unknown>
      steps?: Array<Record<string, unknown>>
    }) => {
      const existing = await loadAgentSnapshot({ userId: auth.userId, sessionId: params.sessionId })
      const snapshot: AgentSnapshot = {
        sessionId: params.sessionId,
        userId: auth.userId,
        createdAt: existing?.createdAt || nowIso(),
        updatedAt: nowIso(),
        task: typeof task === 'string' ? task : existing?.task,
        config: typeof config === 'object' && config ? config : existing?.config,
        status: params.status ?? existing?.status,
        steps: params.steps ?? existing?.steps,
      }
      await saveAgentSnapshot(snapshot)
    }

    switch (action) {
      case 'start': {
        // Rate limit: verificar quantos agentes ativos o usuário tem
        const userAgents = Array.from(activeAgents.entries())
          .filter(([_, v]) => v.userId === auth.userId);
        
        const maxConcurrentAgents = entitlements.plan.limits.concurrent || 1;
        if (userAgents.length >= maxConcurrentAgents) {
          return NextResponse.json(
            { error: `Maximum concurrent agents (${maxConcurrentAgents}) reached. Stop an existing agent first.` },
            { status: 429 }
          );
        }
        
        // Consumir quota de tokens (estimativa para task)
        const estimatedTokens = (task?.length || 0) * 2 + 1000; // Base + task size
        try {
          await consumeMeteredUsage({
            userId: auth.userId,
            limits: entitlements.plan.limits,
            cost: { requests: 1, tokens: estimatedTokens },
          });
        } catch (error: any) {
          if (error?.code === 'RATE_LIMITED') {
            return NextResponse.json(
              { error: error.message || 'Rate limit exceeded', code: error.limitType },
              { status: 429 }
            );
          }
          throw error;
        }
        
        if (aiService.getAvailableProviders().length === 0) {
          const blocked = blockIfSimulationDisabled({
            capability: 'AI_AGENT_MODE',
            reason: 'AI_PROVIDER_NOT_CONFIGURED',
            message: 'AI provider not configured. Configure a real provider to run agent mode.',
            missingEnv: ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
          })
          if (blocked) return blocked
        }

        // Create new agent
        const agent = new AutonomousAgent(config || {
          autonomyLevel: 'semi-autonomous',
          requireApproval: true,
          enableSelfCorrection: true,
        });
        
        const newSessionId = sessionId || `agent-${Date.now()}`;
        activeAgents.set(agentKey(newSessionId), {
          agent,
          userId: auth.userId,
          createdAt: new Date(),
        });

        await persistSnapshot({
          sessionId: newSessionId,
          status: agent.getStatus(),
          steps: agent.getSteps(),
        });
        
        // Start task execution (non-blocking)
        agent.execute(task).catch(console.error);
        
        return NextResponse.json({
          sessionId: newSessionId,
          status: 'started',
          message: 'Agent started executing task',
        });
      }
      
      case 'status': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          const snapshot = await loadAgentSnapshot({ userId: auth.userId, sessionId })
          if (!snapshot) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
          }
          return NextResponse.json({
            sessionId,
            active: false,
            status: snapshot.status || {},
            steps: snapshot.steps || [],
            snapshotUpdatedAt: snapshot.updatedAt,
          })
        }

        const status = entry.agent.getStatus()
        const steps = entry.agent.getSteps()
        await persistSnapshot({ sessionId, status, steps })

        return NextResponse.json({
          sessionId,
          active: true,
          status,
          steps,
        });
      }
      
      case 'pause': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.pause();
        await persistSnapshot({ sessionId, status: entry.agent.getStatus(), steps: entry.agent.getSteps() })
        return NextResponse.json({ status: 'paused' });
      }
      
      case 'resume': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.resume();
        await persistSnapshot({ sessionId, status: entry.agent.getStatus(), steps: entry.agent.getSteps() })
        return NextResponse.json({ status: 'resumed' });
      }
      
      case 'stop': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.stop();
        activeAgents.delete(agentKey(sessionId));
        await persistSnapshot({ sessionId, status: entry.agent.getStatus(), steps: entry.agent.getSteps() })
        return NextResponse.json({ status: 'stopped' });
      }
      
      case 'input': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.provideInput(input);
        await persistSnapshot({ sessionId, status: entry.agent.getStatus(), steps: entry.agent.getSteps() })
        return NextResponse.json({ status: 'input_received' });
      }
      
      case 'approve': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Emit approval event
        entry.agent.emit('approval_response', { approved: true });
        await persistSnapshot({ sessionId, status: entry.agent.getStatus(), steps: entry.agent.getSteps() })
        return NextResponse.json({ status: 'approved' });
      }
      
      case 'reject': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.emit('approval_response', { approved: false });
        await persistSnapshot({ sessionId, status: entry.agent.getStatus(), steps: entry.agent.getSteps() })
        return NextResponse.json({ status: 'rejected' });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent API Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

/**
 * SSE endpoint for streaming agent events
 * REQUER AUTENTICAÇÃO
 */
export async function GET(req: NextRequest) {
  try {
    // AUTENTICAÇÃO OBRIGATÓRIA
    const auth = requireAuth(req);
    
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    
    const agentKey = `${auth.userId}:${sessionId}`;
    const entry = activeAgents.get(agentKey);
    
    if (!entry) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    const agent = entry.agent;
    
    // Create SSE stream
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };
        
        // Send initial status
        sendEvent('status', agent.getStatus());
        
        // Setup event listeners
        const events = [
          'task:started',
          'task:planning',
          'task:executing',
          'task:reviewing',
          'task:completed',
          'task:failed',
          'step:added',
          'agent:thinking',
          'agent:planned',
          'agent:reflected',
          'agent:progress',
          'agent:approval_needed',
          'agent:paused',
          'agent:resumed',
          'agent:stopped',
          'agent:needs_input',
          'agent:self_corrected',
          'tool:started',
          'tool:completed',
          'tool:failed',
        ];
        
        const handlers = events.map(event => {
          const handler = (data: any) => {
            sendEvent(event, data);
          };
          agent.on(event, handler);
          return { event, handler };
        });
        
        // Cleanup on close
        const cleanup = () => {
          handlers.forEach(({ event, handler }) => {
            agent.removeListener(event, handler);
          });
        };
        
        // Handle connection close
        req.signal.addEventListener('abort', () => {
          cleanup();
          controller.close();
        });
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Agent SSE Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
