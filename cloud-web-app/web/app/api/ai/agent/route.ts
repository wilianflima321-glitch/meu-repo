import { NextRequest, NextResponse } from 'next/server';
import { AutonomousAgent } from '@/lib/ai/agent-mode';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { consumeMeteredUsage } from '@/lib/metering';

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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-agent-post',
      key: auth.userId,
      max: 45,
      windowMs: 60 * 60 * 1000,
      message: 'Too many agent execution requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
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
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          sessionId,
          ...entry.agent.getStatus(),
          steps: entry.agent.getSteps(),
        });
      }
      
      case 'pause': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.pause();
        return NextResponse.json({ status: 'paused' });
      }
      
      case 'resume': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.resume();
        return NextResponse.json({ status: 'resumed' });
      }
      
      case 'stop': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.stop();
        activeAgents.delete(agentKey(sessionId));
        return NextResponse.json({ status: 'stopped' });
      }
      
      case 'input': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.provideInput(input);
        return NextResponse.json({ status: 'input_received' });
      }
      
      case 'approve': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Emit approval event
        entry.agent.emit('approval_response', { approved: true });
        return NextResponse.json({ status: 'approved' });
      }
      
      case 'reject': {
        const entry = activeAgents.get(agentKey(sessionId));
        if (!entry) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        entry.agent.emit('approval_response', { approved: false });
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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-agent-get',
      key: auth.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many agent status requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
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
