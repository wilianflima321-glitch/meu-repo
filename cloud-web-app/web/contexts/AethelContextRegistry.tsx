'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ContextChipKind = 'viewport' | 'file' | 'blueprint' | 'terminal' | 'function';

export type ContextChip = {
  kind: ContextChipKind;
  label: string;
  payload?: Record<string, unknown>;
};

type AethelContextValue = {
  chips: ContextChip[];
  setViewportSelection: (selection: Record<string, unknown> | null) => void;
  setActiveFile: (path: string | null) => void;
  setBlueprintFocus: (nodeId: string | null) => void;
  toApiHeaders: () => Record<string, string>;
  toPromptSuffix: () => string;
};

const AethelContextRegistry = createContext<AethelContextValue | null>(null);

export function AethelContextProvider({ children }: { children: React.ReactNode }) {
  const [viewportSelection, setViewportSelectionState] = useState<Record<string, unknown> | null>(null);
  const [activeFile, setActiveFileState] = useState<string | null>(null);
  const [blueprintFocus, setBlueprintFocusState] = useState<string | null>(null);

  const setViewportSelection = useCallback((selection: Record<string, unknown> | null) => {
    setViewportSelectionState(selection);
  }, []);

  const setActiveFile = useCallback((path: string | null) => {
    setActiveFileState(path);
  }, []);

  const setBlueprintFocus = useCallback((nodeId: string | null) => {
    setBlueprintFocusState(nodeId);
  }, []);

  const chips = useMemo<ContextChip[]>(() => {
    const next: ContextChip[] = [];
    if (activeFile) {
      next.push({ kind: 'file', label: activeFile, payload: { path: activeFile } });
    }
    if (viewportSelection) {
      next.push({
        kind: 'viewport',
        label: 'Viewport selection',
        payload: viewportSelection,
      });
    }
    if (blueprintFocus) {
      next.push({ kind: 'blueprint', label: `Node ${blueprintFocus}`, payload: { nodeId: blueprintFocus } });
    }
    return next;
  }, [activeFile, viewportSelection, blueprintFocus]);

  const toApiHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    if (activeFile) headers['x-aethel-context-file'] = activeFile;
    if (blueprintFocus) headers['x-aethel-context-blueprint-node'] = blueprintFocus;
    if (viewportSelection) {
      headers['x-aethel-context-viewport'] = JSON.stringify(viewportSelection).slice(0, 4000);
    }
    return headers;
  }, [activeFile, blueprintFocus, viewportSelection]);

  const toPromptSuffix = useCallback(() => {
    const parts: string[] = [];
    if (activeFile) parts.push(`Active file: ${activeFile}`);
    if (viewportSelection) parts.push(`Viewport selection: ${JSON.stringify(viewportSelection)}`);
    if (blueprintFocus) parts.push(`Blueprint node: ${blueprintFocus}`);
    return parts.length ? `\n\n[Active Context]\n${parts.join('\n')}` : '';
  }, [activeFile, blueprintFocus, viewportSelection]);

  const value = useMemo<AethelContextValue>(
    () => ({
      chips,
      setViewportSelection,
      setActiveFile,
      setBlueprintFocus,
      toApiHeaders,
      toPromptSuffix,
    }),
    [chips, setViewportSelection, setActiveFile, setBlueprintFocus, toApiHeaders, toPromptSuffix],
  );

  return <AethelContextRegistry.Provider value={value}>{children}</AethelContextRegistry.Provider>;
}

export function useAethelContext(): AethelContextValue {
  const ctx = useContext(AethelContextRegistry);
  if (!ctx) {
    return {
      chips: [],
      setViewportSelection: () => undefined,
      setActiveFile: () => undefined,
      setBlueprintFocus: () => undefined,
      toApiHeaders: () => ({}),
      toPromptSuffix: () => '',
    };
  }
  return ctx;
}
