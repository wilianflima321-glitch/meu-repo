/**
 * Input Manager - split runtime modules.
 *
 * Keyboard, mouse, touch, and gamepad runtime is isolated from public shells so
 * game/editor surfaces can load it only when interactive controls are needed.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { InputManager } from './manager';
import type { InputAction, InputAxis } from './types';

export function useInputManager() {
  const managerRef = useRef<InputManager>(new InputManager());
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const manager = managerRef.current;
    manager.on('initialized', () => setIsInitialized(true));
    
    return () => {
      manager.dispose();
    };
  }, []);
  
  const initialize = useCallback((element?: HTMLElement) => {
    managerRef.current.initialize(element || window);
  }, []);
  
  const isActionPressed = useCallback((action: string) => {
    return managerRef.current.isActionPressed(action);
  }, []);
  
  const getAxis = useCallback((axis: string) => {
    return managerRef.current.getAxisValue(axis);
  }, []);
  
  const registerAction = useCallback((action: InputAction) => {
    managerRef.current.registerAction(action);
  }, []);
  
  const registerAxis = useCallback((axis: InputAxis) => {
    managerRef.current.registerAxis(axis);
  }, []);
  
  return {
    manager: managerRef.current,
    isInitialized,
    initialize,
    isActionPressed,
    getAxis,
    registerAction,
    registerAxis,
    getMousePosition: () => managerRef.current.getMousePosition(),
    getMouseDelta: () => managerRef.current.getMouseDelta(),
    setMouseCapture: (capture: boolean) => managerRef.current.setMouseCapture(capture),
    setEnabled: (enabled: boolean) => managerRef.current.setEnabled(enabled),
  };
}

export function useAction(actionName: string, callback: () => void) {
  const { manager } = useInputManager();
  
  useEffect(() => {
    const handler = () => callback();
    manager.on(`action:${actionName}:pressed`, handler);
    
    return () => {
      manager.off(`action:${actionName}:pressed`, handler);
    };
  }, [manager, actionName, callback]);
}

export function useAxis(axisName: string): number {
  const { manager } = useInputManager();
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    let frameId: number;
    
    const update = () => {
      setValue(manager.getAxisValue(axisName));
      frameId = requestAnimationFrame(update);
    };
    
    frameId = requestAnimationFrame(update);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [manager, axisName]);
  
  return value;
}
