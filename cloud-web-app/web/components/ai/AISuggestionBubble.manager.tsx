'use client';

// @aethel-heavy-async-boundary: imported only through lazy AI surfaces.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from '@/lib/ui/motion';

import { logger } from '@/lib/observability/logger';

import { AISuggestionBubble } from './AISuggestionBubble.core';
import type { AISuggestion, AISuggestionApiRecord, SuggestionManagerProps, SuggestionType } from './AISuggestionBubble.types';

// SUGGESTION MANAGER COMPONENT
// ============================================================================

export function SuggestionManager({
  suggestions,
  onApply,
  onDismiss,
  onFeedback,
  maxVisible = 3,
}: SuggestionManagerProps) {
  const [visibleSuggestions, setVisibleSuggestions] = useState<AISuggestion[]>([]);

  // Show only the most recent suggestions
  useEffect(() => {
    const sorted = [...suggestions]
      .filter(s => !s.expiresAt || s.expiresAt > Date.now())
      .sort((a, b) => {
        // Priority order: high > medium > low
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        // Then by date
        return b.createdAt - a.createdAt;
      })
      .slice(0, maxVisible);

    setVisibleSuggestions(sorted);
  }, [suggestions, maxVisible]);

  const handleDismiss = useCallback((suggestion: AISuggestion) => {
    setVisibleSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    onDismiss?.(suggestion);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 right-4 space-y-3 z-40">
      <AnimatePresence mode="popLayout">
        {visibleSuggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            layout
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ delay: index * 0.1 }}
          >
            <AISuggestionBubble
              suggestion={suggestion}
              position="left"
              onApply={onApply}
              onDismiss={handleDismiss}
              onFeedback={onFeedback}
              autoHideDelay={30000} // 30 seconds
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// AUTO-MANAGED VERSION
// ============================================================================

/**
 * AISuggestionBubbleAuto - Version auto-gerenciada
 * Busca sugestões da API automaticamente e gerencia exibição
 */
export function AISuggestionBubbleAuto() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [enabled, setEnabled] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Search sugestões da API
  useEffect(() => {
    if (!enabled) return;

    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/ai/suggestions?limit=5');
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions) {
            setSuggestions((data.suggestions as AISuggestionApiRecord[]).map((s) => ({
              id: s.id,
              type: mapSuggestionType(s.type),
              title: s.title,
              description: s.description,
              autoApplyable: !!s.action,
              actionLabel: s.action?.label,
              actionCommand: s.action?.command,
              priority: s.priority,
              createdAt: Date.now(),
              expiresAt: s.expiresAt,
            })));
          }
        }
      } catch (e) {
        // Silent fail
      }
    };

    fetchSuggestions();
    pollIntervalRef.current = setInterval(fetchSuggestions, 120000); // 2 min

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enabled]);

  const handleApply = useCallback(async (suggestion: AISuggestion) => {
    try {
      const res = await fetch(`/api/ai/suggestions/${suggestion.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          command: suggestion.actionCommand || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to apply suggestion.');
      }

      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (e) {
      logger.error('Failed to apply suggestion:', e);
      throw e;
    }
  }, []);

  const handleDismiss = useCallback((suggestion: AISuggestion) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    // Log para melhorar IA
    fetch('/api/ai/suggestions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: suggestion.id, action: 'dismissed' }),
    }).catch(() => {});
  }, []);

  const handleFeedback = useCallback((suggestion: AISuggestion, helpful: boolean) => {
    fetch('/api/ai/suggestions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: suggestion.id, helpful }),
    }).catch(() => {});
  }, []);

  // Não mostrar nada se desabilitado ou sem sugestões
  if (!enabled || suggestions.length === 0) {
    return null;
  }

  return (
    <SuggestionManager
      suggestions={suggestions}
      onApply={handleApply}
      onDismiss={handleDismiss}
      onFeedback={handleFeedback}
      maxVisible={2}
    />
  );
}

function mapSuggestionType(apiType: string): SuggestionType {
  const mapping: Record<string, SuggestionType> = {
    optimization: 'performance',
    feature: 'tip',
    workflow: 'ux',
    learning: 'tip',
    warning: 'error',
  };
  return mapping[apiType] || 'tip';
}
