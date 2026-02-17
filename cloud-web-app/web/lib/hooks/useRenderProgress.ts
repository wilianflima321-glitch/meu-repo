/**
 * useRenderProgress Hook
 * 
 * Hook React para consumir eventos de progresso de renderização
 * via WebSocket em tempo real.
 * 
 * @module hooks/useRenderProgress
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AethelWebSocketClient, WS_MESSAGE_TYPES } from '../websocket/websocket-client';

// ============================================================================
// Types
// ============================================================================

export interface RenderJob {
  id: string;
  projectId: string;
  name: string;
  status: RenderJobStatus;
  progress: number;
  currentFrame: number;
  totalFrames: number;
  startedAt: Date;
  estimatedTimeRemaining: number | null;
  error: string | null;
  outputPath: string | null;
}

export type RenderJobStatus = 
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'encoding'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface RenderProgressEvent {
  jobId: string;
  progress: number;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  eta: number | null;
  status: RenderJobStatus;
}

export interface RenderCompleteEvent {
  jobId: string;
  outputPath: string;
  duration: number;
  fileSize: number;
}

export interface RenderFailedEvent {
  jobId: string;
  error: string;
  details: string | null;
}

export interface UseRenderProgressOptions {
  wsUrl?: string;
  autoConnect?: boolean;
  projectId?: string;
}

export interface UseRenderProgressReturn {
  jobs: RenderJob[];
  activeJob: RenderJob | null;
  isConnected: boolean;
  error: string | null;
  subscribe: (jobId: string) => void;
  unsubscribe: (jobId: string) => void;
  cancelJob: (jobId: string) => Promise<void>;
  clearCompleted: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRenderProgress(options: UseRenderProgressOptions = {}): UseRenderProgressReturn {
  const {
    wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.aethel.io/ws',
    autoConnect = true,
    projectId,
  } = options;

  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<AethelWebSocketClient | null>(null);
  const subscribedJobs = useRef<Set<string>>(new Set());
  const handleRenderMessageRef = useRef<(msg: any) => void>(() => {});

  // Inicializa conexão WebSocket
  useEffect(() => {
    if (!autoConnect) return;

    const ws = new AethelWebSocketClient({
      url: wsUrl,
      autoReconnect: true,
      debug: process.env.NODE_ENV === 'development',
    });

    wsRef.current = ws;

    ws.on('connected', () => {
      setIsConnected(true);
      setError(null);
      
      // Re-subscribe a todos os jobs
      subscribedJobs.current.forEach(jobId => {
        ws.send({
          type: 'SUBSCRIBE',
          channel: `render:${jobId}`,
          payload: {},
        });
      });
      
      // Subscribe ao canal do projeto se especificado
      if (projectId) {
        ws.send({
          type: 'SUBSCRIBE',
          channel: `project:${projectId}:renders`,
          payload: {},
        });
      }
    });

    ws.on('disconnected', () => {
      setIsConnected(false);
    });

    ws.on('error', (err) => {
      setError(err.message || 'Erro de conexão WebSocket');
    });

    // Handler de mensagens
    ws.on('message', (msg: any) => {
      handleRenderMessageRef.current(msg);
    });

    ws.connect().catch((err) => {
      setError('Não foi possível conectar ao servidor de renderização');
      console.error('WebSocket connection failed:', err);
    });

    return () => {
      ws.disconnect();
    };
  }, [wsUrl, autoConnect, projectId]);

  // Handler de mensagens de render
  const handleRenderMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'render:progress':
        handleProgressUpdate(msg.payload as RenderProgressEvent);
        break;
        
      case 'render:completed':
        handleRenderComplete(msg.payload as RenderCompleteEvent);
        break;
        
      case 'render:failed':
        handleRenderFailed(msg.payload as RenderFailedEvent);
        break;
        
      case 'render:queued':
        handleJobQueued(msg.payload);
        break;
        
      case 'render:cancelled':
        handleJobCancelled(msg.payload.jobId);
        break;
    }
  }, []);

  useEffect(() => {
    handleRenderMessageRef.current = handleRenderMessage;
  }, [handleRenderMessage]);

  // Atualiza progresso de um job
  const handleProgressUpdate = (event: RenderProgressEvent) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== event.jobId) return job;
      
      return {
        ...job,
        status: event.status,
        progress: event.progress,
        currentFrame: event.currentFrame,
        totalFrames: event.totalFrames,
        estimatedTimeRemaining: event.eta,
      };
    }));
  };

  // Job completado
  const handleRenderComplete = (event: RenderCompleteEvent) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== event.jobId) return job;
      
      return {
        ...job,
        status: 'completed',
        progress: 100,
        outputPath: event.outputPath,
        estimatedTimeRemaining: 0,
      };
    }));
  };

  // Job falhou
  const handleRenderFailed = (event: RenderFailedEvent) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== event.jobId) return job;
      
      return {
        ...job,
        status: 'failed',
        error: event.error,
      };
    }));
  };

  // Novo job adicionado à fila
  const handleJobQueued = (payload: any) => {
    const newJob: RenderJob = {
      id: payload.jobId,
      projectId: payload.projectId,
      name: payload.name || `Render ${payload.jobId}`,
      status: 'queued',
      progress: 0,
      currentFrame: 0,
      totalFrames: payload.totalFrames || 0,
      startedAt: new Date(),
      estimatedTimeRemaining: null,
      error: null,
      outputPath: null,
    };
    
    setJobs(prev => [newJob, ...prev]);
    subscribedJobs.current.add(payload.jobId);
  };

  // Job cancelado
  const handleJobCancelled = (jobId: string) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      return { ...job, status: 'cancelled' };
    }));
  };

  // Subscribe a um job específico
  const subscribe = useCallback((jobId: string) => {
    subscribedJobs.current.add(jobId);
    
    if (wsRef.current && isConnected) {
      wsRef.current.send({
        type: 'SUBSCRIBE',
        channel: `render:${jobId}`,
        payload: {},
      });
    }
  }, [isConnected]);

  // Unsubscribe de um job
  const unsubscribe = useCallback((jobId: string) => {
    subscribedJobs.current.delete(jobId);
    
    if (wsRef.current && isConnected) {
      wsRef.current.send({
        type: 'UNSUBSCRIBE',
        channel: `render:${jobId}`,
        payload: {},
      });
    }
  }, [isConnected]);

  // Cancelar um job
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/render/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Falha ao cancelar renderização');
      }
    } catch (err) {
      console.error('Cancel job error:', err);
      throw err;
    }
  }, []);

  // Limpar jobs completados
  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => 
      job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled'
    ));
  }, []);

  // Determina job ativo (primeiro em renderização)
  const activeJob = jobs.find(job => 
    job.status === 'rendering' || job.status === 'encoding' || job.status === 'preparing'
  ) || null;

  return {
    jobs,
    activeJob,
    isConnected,
    error,
    subscribe,
    unsubscribe,
    cancelJob,
    clearCompleted,
  };
}

export default useRenderProgress;
