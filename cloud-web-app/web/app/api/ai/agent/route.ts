import { NextRequest, NextResponse } from 'next/server';
import { AutonomousAgent } from '@/lib/ai/agent-mode';

/**
 * API Route: Agent Mode Execution
 * 
 * Endpoint para executar tarefas no modo agente autônomo.
 * Suporta streaming de eventos via SSE.
 */

// Store active agents by session
const activeAgents = new Map<string, AutonomousAgent>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, task, input, config } = body;
    
    switch (action) {
      case 'start': {
        // Create new agent
        const agent = new AutonomousAgent(config || {
          autonomyLevel: 'semi-autonomous',
          requireApproval: true,
          enableSelfCorrection: true,
        });
        
        const newSessionId = sessionId || `agent-${Date.now()}`;
        activeAgents.set(newSessionId, agent);
        
        // Start task execution (non-blocking)
        agent.execute(task).catch(console.error);
        
        return NextResponse.json({
          sessionId: newSessionId,
          status: 'started',
          message: 'Agent started executing task',
        });
      }
      
      case 'status': {
        const agent = activeAgents.get(sessionId);
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          sessionId,
          ...agent.getStatus(),
          steps: agent.getSteps(),
        });
      }
      
      case 'pause': {
        const agent = activeAgents.get(sessionId);
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        agent.pause();
        return NextResponse.json({ status: 'paused' });
      }
      
      case 'resume': {
        const agent = activeAgents.get(sessionId);
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        agent.resume();
        return NextResponse.json({ status: 'resumed' });
      }
      
      case 'stop': {
        const agent = activeAgents.get(sessionId);
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        agent.stop();
        activeAgents.delete(sessionId);
        return NextResponse.json({ status: 'stopped' });
      }
      
      case 'input': {
        const agent = activeAgents.get(sessionId);
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        agent.provideInput(input);
        return NextResponse.json({ status: 'input_received' });
      }
      
      case 'approve': {
        const agent = activeAgents.get(sessionId);
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Emit approval event
        agent.emit('approval_response', { approved: true });
        return NextResponse.json({ status: 'approved' });
      }
      
      case 'reject': {
        const agent = activeAgents.get(sessionId);
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        agent.emit('approval_response', { approved: false });
        return NextResponse.json({ status: 'rejected' });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * SSE endpoint for streaming agent events
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  
  const agent = activeAgents.get(sessionId);
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  
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
}
