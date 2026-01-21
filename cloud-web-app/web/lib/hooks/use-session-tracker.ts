'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// =============================================================================
// LIVE SESSION TRACKER
// Tracks user activity and sends to God View API
// =============================================================================

interface SessionTrackerOptions {
  enabled?: boolean;
  pingInterval?: number; // ms
  projectId?: string;
  projectName?: string;
}

// Generate a unique session ID for this browser tab
function generateSessionId(): string {
  const stored = sessionStorage.getItem('aethel_session_id');
  if (stored) return stored;
  
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  sessionStorage.setItem('aethel_session_id', id);
  return id;
}

export function useSessionTracker(options: SessionTrackerOptions = {}) {
  const {
    enabled = true,
    pingInterval = 30000, // 30 seconds
    projectId,
    projectName,
  } = options;
  
  const { user, token } = useAuth();
  const pathname = usePathname();
  const sessionIdRef = useRef<string>('');
  const lastActionRef = useRef<string>('');
  const currentToolRef = useRef<string>('');
  const aiMetricsRef = useRef({
    calls: 0,
    tokens: 0,
    cost: 0,
  });
  
  // Initialize session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionIdRef.current = generateSessionId();
    }
  }, []);
  
  // Send ping to server
  const sendPing = useCallback(async () => {
    if (!user?.id || !sessionIdRef.current) return;
    
    try {
      await fetch('/api/admin/god-view/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userId: user.id,
          userEmail: user.email,
          userName: (user as { name?: string; full_name?: string }).name || (user as { name?: string; full_name?: string }).full_name,
          projectId,
          projectName,
          currentPage: pathname,
          currentTool: currentToolRef.current,
          lastAction: lastActionRef.current,
          aiCallIncrement: aiMetricsRef.current.calls,
          aiTokensIncrement: aiMetricsRef.current.tokens,
          aiCostIncrement: aiMetricsRef.current.cost,
        }),
      });
      
      // Reset incremental counters after successful ping
      aiMetricsRef.current = { calls: 0, tokens: 0, cost: 0 };
      
    } catch (error) {
      console.error('Session ping failed:', error);
    }
  }, [user, token, projectId, projectName, pathname]);
  
  // Set up ping interval
  useEffect(() => {
    if (!enabled || !user?.id) return;
    
    // Initial ping
    sendPing();
    
    // Regular pings
    const interval = setInterval(sendPing, pingInterval);
    
    // End session on unload
    const handleUnload = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliable delivery on page close
        navigator.sendBeacon(
          `/api/admin/god-view/sessions?id=${sessionIdRef.current}`,
          ''
        );
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [enabled, user, sendPing, pingInterval]);
  
  // Track actions
  const trackAction = useCallback((action: string) => {
    lastActionRef.current = action;
  }, []);
  
  // Track current tool
  const setCurrentTool = useCallback((tool: string) => {
    currentToolRef.current = tool;
  }, []);
  
  // Track AI usage (called from AI service)
  const trackAIUsage = useCallback((calls: number, tokens: number, cost: number) => {
    aiMetricsRef.current.calls += calls;
    aiMetricsRef.current.tokens += tokens;
    aiMetricsRef.current.cost += cost;
  }, []);
  
  return {
    sessionId: sessionIdRef.current,
    trackAction,
    setCurrentTool,
    trackAIUsage,
  };
}

// =============================================================================
// SESSION TRACKER PROVIDER
// Wrap your app with this to enable automatic tracking
// =============================================================================

export function SessionTrackerProvider({ 
  children,
  enabled = true
}: { 
  children: ReactNode;
  enabled?: boolean;
}) {
  useSessionTracker({ enabled });
  return children;
}
