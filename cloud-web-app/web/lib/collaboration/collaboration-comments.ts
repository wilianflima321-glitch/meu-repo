import * as Y from 'yjs';

import type { CollaborationComment, CollaborationUser } from './collaboration-service-contracts';

export function getCollaborationComments(ydoc: Y.Doc, fileId: string): Y.YArray<CollaborationComment> {
  return ydoc.getArray(`comments:${fileId}`);
}

export function addCollaborationComment(
  ydoc: Y.Doc,
  localUser: CollaborationUser,
  fileId: string,
  line: number,
  text: string,
  parentId?: string,
): string {
  const comments = getCollaborationComments(ydoc, fileId);
  const id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  comments.push([{
    id,
    fileId,
    line,
    text,
    userId: localUser.id,
    userName: localUser.name,
    userColor: localUser.color,
    parentId,
    createdAt: Date.now(),
    resolved: false,
  }]);

  return id;
}

export function resolveCollaborationComment(
  ydoc: Y.Doc,
  fileId: string,
  commentId: string,
): boolean {
  const comments = getCollaborationComments(ydoc, fileId);

  for (let i = 0; i < comments.length; i++) {
    const comment = comments.get(i);
    if (comment.id === commentId) {
      comments.delete(i, 1);
      comments.insert(i, [{ ...comment, resolved: true, resolvedAt: Date.now() }]);
      return true;
    }
  }

  return false;
}
