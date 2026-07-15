'use client';

/**
 * Offline-first Yjs persistence for Visual Scripting graphs
 * (CLAUDE_MASTER_EXECUTION_PLAN_V8 R1.4/R1.5).
 *
 * `VisualScriptEditor` (packages/visual-scripting) keeps its authoring state
 * in plain React Flow state (`useNodesState`/`useEdgesState`) with no
 * persistence of its own — closing the tab or losing connectivity mid-edit
 * silently drops unsaved work. This module mirrors that state into a
 * `CollaborationSession` (`web/lib/yjs-collaboration.ts`), which already
 * wires `y-indexeddb` for local persistence and `y-websocket` for optional
 * live sync.
 *
 * Design choice — per-key CRDT maps, not a JSON blob: nodes and edges are
 * stored one Y.Map entry per id (`vs-nodes`, `vs-edges`) instead of a single
 * serialized `VisualScript` field. If the JSON blob approach were used, two
 * concurrent/offline writers would race on one key and Yjs's last-write-wins
 * field resolution would silently discard one side's entire graph. With
 * per-node/per-edge keys, concurrent edits to *different* nodes merge
 * additively; only edits to the *same* node id race (each field of that
 * node's Y.Map still merges independently). This is the "never destructive
 * auto-merge" requirement from R1.5.
 *
 * Persistence is offline-first by default: `useYjsCollaboration` is created
 * with `persistenceEnabled: true` and `connect()` is never called
 * automatically, so this works with zero backend/websocket server running.
 * Call `collab.connect()` explicitly to opt into live multi-user sync.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as Y from 'yjs';
import { useYjsCollaboration } from './yjs-collaboration';
import type { VisualScript, VisualNodeType } from '@aethel/visual-scripting/VisualScriptEditor';
import type { Edge } from '@xyflow/react';

export interface VisualScriptCollaborationIdentity {
  id: string;
  name: string;
  color?: string;
}

export interface UseVisualScriptCollaborationOptions {
  /** Stable id for the graph being edited (e.g. `${projectId}:${scriptId}`). */
  documentId: string;
  identity?: VisualScriptCollaborationIdentity;
  /** Set false to disable persistence entirely (defaults to true = offline-first). */
  enabled?: boolean;
}

export interface VisualScriptCollaboration {
  isPersistenceSynced: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  /**
   * Reads the persisted graph, if any. On first-ever open (empty Y.Maps) it
   * seeds them from `fallback` inside a single transaction and returns
   * `fallback` unchanged. On subsequent opens it returns the persisted graph
   * — including edits made offline in a previous session — instead of
   * clobbering it with `fallback`.
   */
  hydrate: (fallback: VisualScript) => VisualScript;
  /** Merges the given React Flow state into the CRDT maps, field-by-field. */
  applyScript: (script: VisualScript) => void;
  /** Subscribes to remote/offline-merge changes; returns an unsubscribe fn. */
  subscribe: (callback: (script: VisualScript) => void) => () => void;
}

function nodeToPojo(entry: Y.Map<unknown>): VisualNodeType {
  return entry.toJSON() as VisualNodeType;
}

function edgeToPojo(entry: Y.Map<unknown>): Edge {
  return entry.toJSON() as Edge;
}

function writeRecordIntoMap(target: Y.Map<unknown>, record: Record<string, unknown>): void {
  const seenKeys = new Set(Object.keys(record));
  target.forEach((_value, key) => {
    if (!seenKeys.has(key)) target.delete(key);
  });
  for (const [key, value] of Object.entries(record)) {
    setIfChanged(target, key, value);
  }
}

/** Avoids firing Yjs observers (and re-render feedback loops) for no-op writes. */
function setIfChanged(target: Y.Map<unknown>, key: string, value: unknown): void {
  const current = target.get(key);
  if (current === value) return;
  if (typeof current === 'object' || typeof value === 'object') {
    if (JSON.stringify(current) === JSON.stringify(value)) return;
  }
  target.set(key, value);
}

export function useVisualScriptCollaboration(
  options: UseVisualScriptCollaborationOptions
): VisualScriptCollaboration {
  const { documentId, identity, enabled = true } = options;

  const {
    session,
    isConnected,
    isPersistenceSynced,
    connect,
    disconnect,
  } = useYjsCollaboration({
    documentName: `visual-script:${documentId}`,
    persistenceEnabled: enabled,
    persistenceName: `visual-script:${documentId}`,
    userId: identity?.id ?? 'local-user',
    userName: identity?.name ?? 'Local Author',
    userColor: identity?.color,
  });

  const hasHydrated = useRef(false);
  useEffect(() => {
    hasHydrated.current = false;
  }, [documentId]);

  const getMaps = useCallback(() => {
    if (!session) return null;
    return {
      nodes: session.getSharedMap<Y.Map<unknown>>(`vs-nodes:${documentId}`),
      edges: session.getSharedMap<Y.Map<unknown>>(`vs-edges:${documentId}`),
      meta: session.getSharedMap<unknown>(`vs-meta:${documentId}`),
    };
  }, [session, documentId]);

  const hydrate = useCallback(
    (fallback: VisualScript): VisualScript => {
      const maps = getMaps();
      if (!session || !maps) return fallback;

      if (maps.nodes.size === 0 && maps.edges.size === 0 && hasHydrated.current === false) {
        session.transaction(() => {
          if (maps.nodes.size === 0) {
            for (const node of fallback.nodes) {
              const entry = new Y.Map<unknown>();
              writeRecordIntoMap(entry, node as unknown as Record<string, unknown>);
              maps.nodes.set(node.id, entry);
            }
          }
          if (maps.edges.size === 0) {
            for (const edge of fallback.edges) {
              const entry = new Y.Map<unknown>();
              writeRecordIntoMap(entry, edge as unknown as Record<string, unknown>);
              maps.edges.set(edge.id, entry);
            }
          }
          maps.meta.set('id', fallback.id);
          maps.meta.set('name', fallback.name);
          maps.meta.set('variables', fallback.variables);
        });
        hasHydrated.current = true;
        return fallback;
      }

      hasHydrated.current = true;
      const nodes: VisualNodeType[] = [];
      maps.nodes.forEach((entry) => nodes.push(nodeToPojo(entry)));
      const edges: Edge[] = [];
      maps.edges.forEach((entry) => edges.push(edgeToPojo(entry)));

      return {
        id: (maps.meta.get('id') as string) ?? fallback.id,
        name: (maps.meta.get('name') as string) ?? fallback.name,
        nodes,
        edges,
        variables: (maps.meta.get('variables') as VisualScript['variables']) ?? fallback.variables,
      };
    },
    [session, getMaps]
  );

  const applyScript = useCallback(
    (script: VisualScript) => {
      const maps = getMaps();
      if (!session || !maps) return;

      session.transaction(() => {
        const liveNodeIds = new Set(script.nodes.map((n) => n.id));
        maps.nodes.forEach((_entry, key) => {
          if (!liveNodeIds.has(key)) maps.nodes.delete(key);
        });
        for (const node of script.nodes) {
          let entry = maps.nodes.get(node.id);
          if (!entry) {
            entry = new Y.Map<unknown>();
            maps.nodes.set(node.id, entry);
          }
          writeRecordIntoMap(entry, node as unknown as Record<string, unknown>);
        }

        const liveEdgeIds = new Set(script.edges.map((e) => e.id));
        maps.edges.forEach((_entry, key) => {
          if (!liveEdgeIds.has(key)) maps.edges.delete(key);
        });
        for (const edge of script.edges) {
          let entry = maps.edges.get(edge.id);
          if (!entry) {
            entry = new Y.Map<unknown>();
            maps.edges.set(edge.id, entry);
          }
          writeRecordIntoMap(entry, edge as unknown as Record<string, unknown>);
        }

        setIfChanged(maps.meta, 'id', script.id);
        setIfChanged(maps.meta, 'name', script.name);
        setIfChanged(maps.meta, 'variables', script.variables);
      });
    },
    [session, getMaps]
  );

  const subscribe = useCallback(
    (callback: (script: VisualScript) => void) => {
      const maps = getMaps();
      if (!session || !maps) return () => {};

      const emit = () => {
        const nodes: VisualNodeType[] = [];
        maps.nodes.forEach((entry) => nodes.push(nodeToPojo(entry)));
        const edges: Edge[] = [];
        maps.edges.forEach((entry) => edges.push(edgeToPojo(entry)));
        callback({
          id: (maps.meta.get('id') as string) ?? documentId,
          name: (maps.meta.get('name') as string) ?? 'Untitled Script',
          nodes,
          edges,
          variables: (maps.meta.get('variables') as VisualScript['variables']) ?? [],
        });
      };

      maps.nodes.observeDeep(emit);
      maps.edges.observeDeep(emit);
      maps.meta.observe(emit);

      return () => {
        maps.nodes.unobserveDeep(emit);
        maps.edges.unobserveDeep(emit);
        maps.meta.unobserve(emit);
      };
    },
    [session, getMaps, documentId]
  );

  return useMemo(
    () => ({ isPersistenceSynced, isConnected, connect, disconnect, hydrate, applyScript, subscribe }),
    [isPersistenceSynced, isConnected, connect, disconnect, hydrate, applyScript, subscribe]
  );
}
