'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';

export interface InlineCommentReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  ts: number;
}

export interface InlineComment {
  id: string;
  line: number;
  authorId: string;
  authorName: string;
  text: string;
  resolved: boolean;
  ts: number;
  replies: InlineCommentReply[];
}

export interface InlineCommentAuthor {
  id: string;
  name: string;
}

type SharedMapProvider = {
  getSharedMap?: <T>(name: string) => Y.Map<T>;
};

export interface UseFileCommentsOptions {
  filePath?: string;
  provider?: SharedMapProvider | null;
}

const FALLBACK_FILE_PATH = 'untitled';

function normalizeFilePath(filePath?: string): string {
  const normalized = (filePath || FALLBACK_FILE_PATH).trim().replace(/\\/g, '/');
  return normalized || FALLBACK_FILE_PATH;
}

function sortComments(comments: InlineComment[]): InlineComment[] {
  return [...comments].sort((left, right) => {
    if (left.line !== right.line) return left.line - right.line;
    return left.ts - right.ts;
  });
}

export function groupCommentsByLine(comments: Iterable<InlineComment>): Map<number, InlineComment[]> {
  const grouped = new Map<number, InlineComment[]>();
  for (const comment of sortComments(Array.from(comments))) {
    const bucket = grouped.get(comment.line) ?? [];
    bucket.push(comment);
    grouped.set(comment.line, bucket);
  }
  return grouped;
}

function createReply(text: string, author: InlineCommentAuthor): InlineCommentReply {
  return {
    id: crypto.randomUUID(),
    authorId: author.id,
    authorName: author.name,
    text,
    ts: Date.now(),
  };
}

export function useFileComments({ filePath, provider }: UseFileCommentsOptions) {
  const localDocRef = useRef<Y.Doc | null>(null);
  const mapKey = useMemo(() => `comments:${normalizeFilePath(filePath)}`, [filePath]);

  const yMap = useMemo(() => {
    if (provider?.getSharedMap) return provider.getSharedMap<InlineComment>(mapKey);
    if (!localDocRef.current) localDocRef.current = new Y.Doc();
    return localDocRef.current.getMap<InlineComment>(mapKey);
  }, [mapKey, provider]);

  const [comments, setComments] = useState<Map<string, InlineComment>>(new Map());

  useEffect(() => {
    const sync = () => setComments(new Map(yMap.entries()));
    yMap.observe(sync);
    sync();
    return () => yMap.unobserve(sync);
  }, [yMap]);

  useEffect(() => {
    return () => {
      localDocRef.current?.destroy();
      localDocRef.current = null;
    };
  }, []);

  const addComment = useCallback((line: number, text: string, author: InlineCommentAuthor) => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const id = crypto.randomUUID();
    const comment: InlineComment = {
      id,
      line: Math.max(1, Math.floor(line)),
      authorId: author.id,
      authorName: author.name,
      text: trimmed,
      resolved: false,
      ts: Date.now(),
      replies: [],
    };
    yMap.set(id, comment);
    return comment;
  }, [yMap]);

  const resolveComment = useCallback((id: string) => {
    const existing = yMap.get(id);
    if (!existing) return false;
    yMap.set(id, { ...existing, resolved: true });
    return true;
  }, [yMap]);

  const reopenComment = useCallback((id: string) => {
    const existing = yMap.get(id);
    if (!existing) return false;
    yMap.set(id, { ...existing, resolved: false });
    return true;
  }, [yMap]);

  const replyToComment = useCallback((id: string, text: string, author: InlineCommentAuthor) => {
    const existing = yMap.get(id);
    const trimmed = text.trim();
    if (!existing || !trimmed) return null;

    const reply = createReply(trimmed, author);
    yMap.set(id, {
      ...existing,
      replies: [...existing.replies, reply],
    });
    return reply;
  }, [yMap]);

  const commentsByLine = useMemo(() => groupCommentsByLine(comments.values()), [comments]);

  return {
    comments,
    commentsByLine,
    addComment,
    resolveComment,
    reopenComment,
    replyToComment,
  };
}
