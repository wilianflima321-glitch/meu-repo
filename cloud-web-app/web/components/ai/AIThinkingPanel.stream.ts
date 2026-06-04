'use client';

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/observability/logger';
import type { ThinkingStep } from './AIThinkingPanel.types';

export function useThinkingStream(sessionId?: string) {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

    try {
      wsRef.current = new WebSocket(`${wsUrl}/ai/thinking/${sessionId}`);

      wsRef.current.onopen = () => {
        setIsStreaming(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'STEP_START') {
            setSteps(prev => [...prev, data.step]);
          } else if (data.type === 'STEP_UPDATE') {
            setSteps(prev => prev.map(s =>
              s.id === data.stepId ? { ...s, ...data.updates } : s
            ));
          } else if (data.type === 'STEP_COMPLETE') {
            setSteps(prev => prev.map(s =>
              s.id === data.stepId ? { ...s, status: 'complete', duration: data.duration } : s
            ));
          } else if (data.type === 'SESSION_COMPLETE') {
            setIsStreaming(false);
          }
        } catch (e) {
          logger.error('Error parsing thinking stream:', e);
        }
      };

      wsRef.current.onclose = () => {
        setIsStreaming(false);
      };

      wsRef.current.onerror = () => {
        setIsStreaming(false);
      };
    } catch {
      // WebSocket not available
    }

    return () => {
      wsRef.current?.close();
    };
  }, [sessionId]);

  return { steps, isStreaming };
}

// ============================================================================
