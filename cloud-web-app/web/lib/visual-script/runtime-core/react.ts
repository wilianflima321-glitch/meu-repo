/**
 * Visual Script Runtime - split execution modules.
 *
 * Node executors, runtime state, and React bindings are separated so visual
 * scripting can be audited and lazy-loaded without one monolithic runtime file.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VisualScriptRuntime } from './runtime';
import type { RuntimeEvent, VisualScript } from './types';

export function useVisualScriptRuntime() {
  const runtimeRef = useRef<VisualScriptRuntime | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [variables, setVariables] = useState<Map<string, unknown>>(new Map());
  
  useEffect(() => {
    const runtime = new VisualScriptRuntime();
    runtimeRef.current = runtime;
    
    runtime.on('runtime:start', () => setIsRunning(true));
    runtime.on('runtime:stop', () => setIsRunning(false));
    runtime.on('runtime:pause', () => setIsPaused(true));
    runtime.on('runtime:resume', () => setIsPaused(false));
    runtime.on('node:executing', ({ nodeId }) => setCurrentNode(nodeId));
    runtime.on('node:executed', () => setCurrentNode(null));
    runtime.on('variable:set', () => {
      setVariables(new Map(runtime.getContext().variables));
    });
    
    return () => {
      runtime.destroy();
    };
  }, []);
  
  const load = useCallback((script: VisualScript) => {
    runtimeRef.current?.load(script);
  }, []);
  
  const start = useCallback(() => {
    runtimeRef.current?.start();
  }, []);
  
  const pause = useCallback(() => {
    runtimeRef.current?.pause();
  }, []);
  
  const resume = useCallback(() => {
    runtimeRef.current?.resume();
  }, []);
  
  const stop = useCallback(() => {
    runtimeRef.current?.stop();
  }, []);
  
  const triggerEvent = useCallback((event: RuntimeEvent) => {
    runtimeRef.current?.triggerEvent(event);
  }, []);
  
  const getVariable = useCallback((name: string) => {
    return runtimeRef.current?.getVariable(name);
  }, []);
  
  const setVariable = useCallback((name: string, value: unknown) => {
    runtimeRef.current?.setVariable(name, value);
  }, []);
  
  return {
    runtime: runtimeRef.current,
    isRunning,
    isPaused,
    currentNode,
    variables,
    load,
    start,
    pause,
    resume,
    stop,
    triggerEvent,
    getVariable,
    setVariable,
  };
}
