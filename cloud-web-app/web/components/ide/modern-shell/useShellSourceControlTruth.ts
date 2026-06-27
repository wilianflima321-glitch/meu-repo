'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('useShellSourceControlTruth');

type GitStatusPayload = {
  branch: string;
  ahead: number;
  behind: number;
  staged: Array<{ path: string }>;
  unstaged: Array<{ path: string }>;
  untracked: Array<{ path: string }>;
  conflicted: Array<{ path: string }>;
};

export type ShellSourceControlTruth = {
  state: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
  branch: string | null;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
  changedCount: number;
  isDirty: boolean;
  repoPath: string | null;
  checkedAt: string | null;
  errorCode?: string | null;
};

type UseShellSourceControlTruthArgs = {
  projectId?: string | null;
  activeFilePath?: string | null;
  enabled?: boolean;
};

const REFRESH_INTERVAL_MS = 30_000;
const WORKBENCH_PROJECT_STORAGE_KEY = 'aethel.workbench.lastProjectId';

function sanitizeSegment(input: string | null | undefined, fallback: string): string {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return fallback;
  const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return sanitized || fallback;
}

function decodeCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const rawToken = window.localStorage.getItem('aethel-token');
  if (!rawToken) return null;

  try {
    const payloadSegment = rawToken.split('.')[1] ?? '';
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const payload = JSON.parse(window.atob(`${normalized}${padding}`));
    const userId = String(payload.userId ?? payload.sub ?? payload.id ?? '').trim();
    return userId || null;
  } catch (error) {
    log.warn('Failed to decode git truth identity from token', { error });
    return null;
  }
}

function looksAbsolutePath(candidate: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(candidate) || candidate.startsWith('/workspace/');
}

function parentDirectory(inputPath: string): string | null {
  if (!inputPath.trim()) return null;
  const normalized = inputPath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) return normalized.startsWith('/') ? '/' : null;
  const parent = segments.slice(0, -1).join('/');
  return normalized.startsWith('/') ? `/${parent}` : parent;
}

function resolveProjectId(projectId: string | null | undefined): string {
  if (projectId?.trim()) return projectId.trim();
  if (typeof window === 'undefined') return 'default';
  return window.localStorage.getItem(WORKBENCH_PROJECT_STORAGE_KEY)?.trim() || 'default';
}

function buildRepoCandidates(projectId: string, activeFilePath?: string | null): string[] {
  const userId = decodeCurrentUserId();
  const candidates = new Set<string>();
  const add = (value: string | null | undefined) => {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return;
    candidates.add(trimmed);
  };

  if (activeFilePath && looksAbsolutePath(activeFilePath)) {
    add(activeFilePath);
    add(parentDirectory(activeFilePath));
  }

  if (userId && projectId && projectId !== 'default') {
    const safeUserId = sanitizeSegment(userId, 'anonymous');
    const safeProjectId = sanitizeSegment(projectId, 'default');
    add(`.aethel/workspaces/${safeUserId}/${safeProjectId}`);
    add(`/workspace/.aethel/workspaces/${safeUserId}/${safeProjectId}`);
  }

  add(process.env.NEXT_PUBLIC_WORKSPACE_ROOT);
  add('/workspace');

  return Array.from(candidates);
}

async function fetchGitStatusForCandidate(repoPath: string): Promise<GitStatusPayload> {
  const response = await fetch('/api/git/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cwd: repoPath }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    const error = new Error(bodyText || `GIT_STATUS_HTTP_${response.status}`);
    (error as Error & { code?: string }).code = `HTTP_${response.status}`;
    throw error;
  }

  const payload = (await response.json()) as {
    success?: boolean;
    status?: GitStatusPayload;
  };

  if (!payload?.success || !payload.status?.branch) {
    const error = new Error('GIT_STATUS_INVALID_PAYLOAD');
    (error as Error & { code?: string }).code = 'INVALID_PAYLOAD';
    throw error;
  }

  return payload.status;
}

function createUnavailableTruth(code?: string | null): ShellSourceControlTruth {
  return {
    state: code ? 'error' : 'unavailable',
    branch: null,
    ahead: 0,
    behind: 0,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0,
    changedCount: 0,
    isDirty: false,
    repoPath: null,
    checkedAt: new Date().toISOString(),
    errorCode: code ?? null,
  };
}

export function useShellSourceControlTruth({
  projectId,
  activeFilePath,
  enabled = true,
}: UseShellSourceControlTruthArgs): ShellSourceControlTruth {
  const resolvedProjectId = useMemo(() => resolveProjectId(projectId), [projectId]);
  const [truth, setTruth] = useState<ShellSourceControlTruth>(() => createUnavailableTruth());
  const lastGoodRepoPathRef = useRef<string | null>(null);

  const refreshTruth = useCallback(async () => {
    const hasAbsoluteActiveFile = Boolean(activeFilePath && looksAbsolutePath(activeFilePath));
    if (!enabled || (!hasAbsoluteActiveFile && (!resolvedProjectId || resolvedProjectId === 'default'))) {
      setTruth(createUnavailableTruth());
      return;
    }

    setTruth((current) => ({
      ...current,
      state: current.branch ? 'loading' : 'idle',
    }));

    const candidates = buildRepoCandidates(resolvedProjectId, activeFilePath);
    if (lastGoodRepoPathRef.current) {
      candidates.unshift(lastGoodRepoPathRef.current);
    }

    const tried = new Set<string>();
    let lastFailureCode: string | null = null;

    for (const candidate of candidates) {
      if (tried.has(candidate)) continue;
      tried.add(candidate);

      try {
        const status = await fetchGitStatusForCandidate(candidate);
        const staged = status.staged.length;
        const unstaged = status.unstaged.length;
        const untracked = status.untracked.length;
        const conflicted = status.conflicted.length;
        const changedCount = staged + unstaged + untracked + conflicted;

        lastGoodRepoPathRef.current = candidate;
        setTruth({
          state: 'ready',
          branch: status.branch,
          ahead: status.ahead,
          behind: status.behind,
          staged,
          unstaged,
          untracked,
          conflicted,
          changedCount,
          isDirty: changedCount > 0,
          repoPath: candidate,
          checkedAt: new Date().toISOString(),
          errorCode: null,
        });
        return;
      } catch (error) {
        lastFailureCode =
          error instanceof Error && 'code' in error
            ? String((error as Error & { code?: string }).code ?? 'UNKNOWN')
            : 'UNKNOWN';
      }
    }

    setTruth(createUnavailableTruth(lastFailureCode));
  }, [activeFilePath, enabled, resolvedProjectId]);

  useEffect(() => {
    void refreshTruth();
  }, [refreshTruth]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleMutation = () => {
      void refreshTruth();
    };

    const handleFocus = () => {
      void refreshTruth();
    };

    const intervalId = window.setInterval(() => {
      void refreshTruth();
    }, REFRESH_INTERVAL_MS);

    window.addEventListener('aethel.ide.fileMutation', handleMutation);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('aethel.ide.fileMutation', handleMutation);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refreshTruth]);

  return truth;
}

export default useShellSourceControlTruth;
