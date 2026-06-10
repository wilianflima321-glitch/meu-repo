'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Mention } from '@/lib/copilot/mention-parser';
import type {
  CodebaseContextPreview,
  MentionContextPreviewBlock,
} from '@/components/ide/AIChatPanelPro.types';

interface MentionContextPreviewState {
  loading: boolean;
  error: string | null;
  blocks: MentionContextPreviewBlock[];
}

interface UseChatContextPreviewsParams {
  input: string;
  mentions: Mention[];
  projectId?: string;
}

/**
 * Keeps AIChatPanelPro focused on UI orchestration while this hook owns the
 * async mention/codebase preview lifecycle.
 */
export function useChatContextPreviews({
  input,
  mentions,
  projectId,
}: UseChatContextPreviewsParams) {
  const [localCodebaseContextPreview, setLocalCodebaseContextPreview] =
    useState<CodebaseContextPreview>({
      loading: false,
      results: [],
    });
  const [mentionContextPreview, setMentionContextPreview] =
    useState<MentionContextPreviewState>({
      loading: false,
      error: null,
      blocks: [],
    });
  const [codebaseRefreshNonce, setCodebaseRefreshNonce] = useState(0);

  useEffect(() => {
    const normalizedInput = input.trim();
    const shouldFetch = normalizedInput.toLowerCase().includes('@codebase');

    if (!shouldFetch) {
      setLocalCodebaseContextPreview((prev) =>
        prev.loading || prev.results.length > 0 || prev.error
          ? { loading: false, results: [] }
          : prev
      );
      return;
    }

    const semanticQuery = normalizedInput
      .replace(/@codebase/gi, ' ')
      .replace(/@(docs|file|folder|git):[^\s]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLocalCodebaseContextPreview((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch('/api/ai/context/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: semanticQuery || 'project architecture entry points current implementation',
            projectId,
            maxResults: 4,
            invalidateCache: codebaseRefreshNonce > 0,
          }),
          signal: controller.signal,
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'CONTEXT_SEARCH_FAILED');
        }

        setLocalCodebaseContextPreview({
          loading: false,
          error: null,
          results: Array.isArray(payload.results) ? payload.results : [],
          scope: payload.readiness.scope,
          source: payload.readiness.source,
          incrementalReindex: Boolean(payload.readiness.incrementalReindex),
          blockers: Array.isArray(payload.readiness.blockers) ? payload.readiness.blockers : [],
          stats: payload.stats ?? undefined,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setLocalCodebaseContextPreview({
          loading: false,
          results: [],
          error: error instanceof Error ? error.message : 'CONTEXT_SEARCH_FAILED',
        });
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [codebaseRefreshNonce, input, projectId]);

  useEffect(() => {
    const contextualMentions = mentions.filter(
      (mention) =>
        mention.type === 'docs' ||
        mention.type === 'file' ||
        mention.type === 'folder' ||
        mention.type === 'git'
    );

    if (contextualMentions.length === 0) {
      setMentionContextPreview((prev) =>
        prev.loading || prev.blocks.length > 0 || prev.error
          ? { loading: false, error: null, blocks: [] }
          : prev
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setMentionContextPreview((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch('/api/ai/context/mentions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            projectId,
          }),
          signal: controller.signal,
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'MENTION_CONTEXT_FAILED');
        }

        setMentionContextPreview({
          loading: false,
          error: null,
          blocks: Array.isArray(payload.blocks)
            ? payload.blocks.filter(
                (block: MentionContextPreviewBlock) => block.kind !== 'codebase'
              )
            : [],
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setMentionContextPreview({
          loading: false,
          blocks: [],
          error: error instanceof Error ? error.message : 'MENTION_CONTEXT_FAILED',
        });
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [input, mentions, projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onFileMutation = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId: string; operation: string }>).detail;
      const matchesProject = !projectId || !detail.projectId || detail.projectId === projectId;

      if (!matchesProject) return;
      if (!input.toLowerCase().includes('@codebase')) return;
      setCodebaseRefreshNonce((prev) => prev + 1);
    };

    window.addEventListener('aethel.ide.fileMutation', onFileMutation as EventListener);
    return () => {
      window.removeEventListener('aethel.ide.fileMutation', onFileMutation as EventListener);
    };
  }, [input, projectId]);

  const refreshCodebaseContext = useCallback(() => {
    setCodebaseRefreshNonce((prev) => prev + 1);
  }, []);

  return {
    localCodebaseContextPreview,
    mentionContextPreview,
    refreshCodebaseContext,
  };
}

export type UseChatContextPreviewsReturn = ReturnType<typeof useChatContextPreviews>;
