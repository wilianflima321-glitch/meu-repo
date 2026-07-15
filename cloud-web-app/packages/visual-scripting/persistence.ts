'use client';

/**
 * Native offline-first persistence for `@aethel/visual-scripting` graphs
 * (Missão Executiva 2 / R1.5).
 *
 * This is a *package-owned* Yjs + `y-indexeddb` integration — no import from
 * `web/` (relative or aliased), no Next.js/Node server dependency, no
 * hardcoded backend URL. Per Golden Rule 1 (Isomorfismo Fractal), this
 * module must keep working if `@aethel/visual-scripting` is bundled and
 * dropped into a plain browser page or a Tauri WebView with zero Aethel web
 * app around it (e.g. embedded in an exported game's UGC modding runtime).
 * All I/O is local (IndexedDB, via dynamic `import('y-indexeddb')` so SSR/
 * non-browser bundlers never choke on it) — there is no built-in network
 * transport here. Multi-user live sync (websocket + awareness) is a
 * separate, injectable concern: pass `createProvider` to attach one without
 * this module ever importing a websocket client itself.
 *
 * Design: one Y.Map entry per node/edge id (not one JSON blob) — the same
 * non-destructive-merge rationale as `web/lib/visual-script-collaboration.ts`
 * (which wraps the fuller-featured `CollaborationSession` for the web app's
 * live multi-user case): concurrent/offline edits to *different* nodes merge
 * additively instead of one writer's entire graph clobbering the other's on
 * reconnect.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import type { Edge } from '@xyflow/react';
import type { VisualScript, VisualNodeType } from './VisualScriptEditor';
import { createComponentLogger } from './lib/logger';

const log = createComponentLogger('visual-scripting/persistence');

export interface VisualScriptPersistenceOptions {
  /** Stable id for the graph being edited (e.g. `${projectId}:${scriptId}`). */
  documentId: string;
  /** Set false to disable persistence entirely (defaults to true = offline-first). */
  enabled?: boolean;
  /**
   * Optional injection point for live multi-user sync (Golden Rule 1:
   * I/O must be injectable, never hardcoded). Given the package's `Y.Doc`,
   * return a disposable provider (e.g. a `y-websocket` `WebsocketProvider`).
   * Left undefined, this module is purely local/offline.
   */
  createProvider?: (doc: Y.Doc) => { destroy(): void };
}

export interface VisualScriptPersistence {
  /** True once the local IndexedDB store has finished its initial load. */
  isSynced: boolean;
  /**
   * Reads the persisted graph, if any. On first-ever open (empty Y.Maps) it
   * seeds them from `fallback` inside a single transaction and returns
   * `fallback` unchanged. On subsequent opens it returns the persisted graph
   * — including edits made offline in a previous session — instead of
   * clobbering it with `fallback`. No-ops (returns `fallback`) until
   * `isSynced` is true.
   */
  hydrate: (fallback: VisualScript) => VisualScript;
  /** Merges the given graph into the CRDT maps, field-by-field (non-destructive). */
  applyScript: (script: VisualScript) => void;
  /** Subscribes to local (offline-merge) or remote (if a provider is attached) changes. */
  subscribe: (callback: (script: VisualScript) => void) => () => void;
}

function nodeToPojo(entry: Y.Map<unknown>): VisualNodeType {
  return entry.toJSON() as VisualNodeType;
}

function edgeToPojo(entry: Y.Map<unknown>): Edge {
  return entry.toJSON() as Edge;
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

function writeRecordIntoMap(target: Y.Map<unknown>, record: Record<string, unknown>): void {
  const seenKeys = new Set(Object.keys(record));
  target.forEach((_value, key) => {
    if (!seenKeys.has(key)) target.delete(key);
  });
  for (const [key, value] of Object.entries(record)) {
    setIfChanged(target, key, value);
  }
}

function sanitizeDocName(rawName: string): string {
  return `aethel-visual-script-${rawName.replace(/[^a-zA-Z0-9:_-]/g, '-')}`;
}

/**
 * Standalone hook: owns its own `Y.Doc` + `y-indexeddb` persistence, with
 * zero dependency on any other Aethel module outside this package.
 */
export function useVisualScriptPersistence(options: VisualScriptPersistenceOptions): VisualScriptPersistence {
  const { documentId, enabled = true, createProvider } = options;

  const doc = useMemo(() => new Y.Doc(), [documentId]);
  const [isSynced, setIsSynced] = useState(false);
  const hasHydrated = useRef(false);

  useEffect(() => {
    hasHydrated.current = false;
    setIsSynced(false);

    if (!enabled || typeof window === 'undefined') {
      return () => doc.destroy();
    }

    let cancelled = false;
    let persistence: { whenSynced: Promise<unknown>; destroy(): Promise<void> | void } | null = null;
    let provider: { destroy(): void } | null = null;

    void import('y-indexeddb')
      .then(({ IndexeddbPersistence }) => {
        if (cancelled) return;
        persistence = new IndexeddbPersistence(sanitizeDocName(documentId), doc);
        return persistence.whenSynced;
      })
      .then(() => {
        if (cancelled) return;
        setIsSynced(true);
      })
      .catch((error) => {
        log.warn('Offline persistence unavailable, running in-memory only', error);
        if (!cancelled) setIsSynced(true);
      });

    if (createProvider) {
      provider = createProvider(doc);
    }

    return () => {
      cancelled = true;
      provider?.destroy();
      void persistence?.destroy();
      doc.destroy();
    };
  }, [doc, documentId, enabled, createProvider]);

  const getMaps = useCallback(() => {
    return {
      nodes: doc.getMap<Y.Map<unknown>>(`nodes:${documentId}`),
      edges: doc.getMap<Y.Map<unknown>>(`edges:${documentId}`),
      meta: doc.getMap<unknown>(`meta:${documentId}`),
    };
  }, [doc, documentId]);

  const hydrate = useCallback(
    (fallback: VisualScript): VisualScript => {
      if (!isSynced) return fallback;
      const maps = getMaps();

      if (maps.nodes.size === 0 && maps.edges.size === 0 && hasHydrated.current === false) {
        doc.transact(() => {
          for (const node of fallback.nodes) {
            const entry = new Y.Map<unknown>();
            writeRecordIntoMap(entry, node as unknown as Record<string, unknown>);
            maps.nodes.set(node.id, entry);
          }
          for (const edge of fallback.edges) {
            const entry = new Y.Map<unknown>();
            writeRecordIntoMap(entry, edge as unknown as Record<string, unknown>);
            maps.edges.set(edge.id, entry);
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
    [doc, getMaps, isSynced]
  );

  const applyScript = useCallback(
    (script: VisualScript) => {
      const maps = getMaps();
      doc.transact(() => {
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
    [doc, getMaps]
  );

  const subscribe = useCallback(
    (callback: (script: VisualScript) => void) => {
      const maps = getMaps();

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
    [getMaps, documentId]
  );

  return useMemo(
    () => ({ isSynced, hydrate, applyScript, subscribe }),
    [isSynced, hydrate, applyScript, subscribe]
  );
}
