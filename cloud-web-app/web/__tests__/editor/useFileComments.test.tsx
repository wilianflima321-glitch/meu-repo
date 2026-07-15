import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { groupCommentsByLine, useFileComments } from '@/hooks/useFileComments';

describe('useFileComments', () => {
  it('stores comments, replies, and resolved state in a Yjs map', () => {
    const doc = new Y.Doc();
    const provider = {
      getSharedMap: <T,>(name: string) => doc.getMap<T>(name),
    };

    const { result } = renderHook(() => useFileComments({
      filePath: 'src/app/page.tsx',
      provider,
    }));

    const author = { id: 'u_1', name: 'Ada' };
    let commentId = '';

    act(() => {
      const comment = result.current.addComment(42, 'Validate this branch before apply.', author);
      commentId = comment?.id ?? '';
    });

    expect(commentId).toBeTruthy();
    expect(result.current.comments.get(commentId)?.line).toBe(42);
    expect(result.current.commentsByLine.get(42)).toHaveLength(1);

    act(() => {
      result.current.replyToComment(commentId, 'Evidence attached in run ledger.', author);
    });

    expect(result.current.comments.get(commentId)?.replies).toHaveLength(1);

    act(() => {
      result.current.resolveComment(commentId);
    });

    expect(result.current.comments.get(commentId)?.resolved).toBe(true);
  });

  it('groups comments by line in deterministic order', () => {
    const grouped = groupCommentsByLine([
      { id: 'b', line: 3, authorId: 'u', authorName: 'User', text: 'B', resolved: false, ts: 2, replies: [] },
      { id: 'a', line: 2, authorId: 'u', authorName: 'User', text: 'A', resolved: false, ts: 1, replies: [] },
      { id: 'c', line: 3, authorId: 'u', authorName: 'User', text: 'C', resolved: false, ts: 3, replies: [] },
    ]);

    expect(Array.from(grouped.keys())).toEqual([2, 3]);
    expect(grouped.get(3)?.map((comment) => comment.id)).toEqual(['b', 'c']);
  });
});
