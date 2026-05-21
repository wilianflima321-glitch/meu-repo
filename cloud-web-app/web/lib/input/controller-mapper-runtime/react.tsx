/**
 * Controller Mapper - split input runtime.
 *
 * Gamepad mapping and hooks are isolated so game/editor surfaces can load them
 * without making public shells pay for controller support.
 */

import { useState, useEffect, useContext, createContext, useCallback, useMemo, type ReactNode } from 'react';
import { ControllerMapper } from './mapper';
import type { ButtonState, ConnectedController, ControllerMapperConfig, ControllerProfile, GameAction, GamepadAxis, GamepadButton } from './types';

interface ControllerContextValue {
  mapper: ControllerMapper;
}

const ControllerContext = createContext<ControllerContextValue | null>(null);

export function ControllerProvider({ 
  children,
  config,
}: { 
  children: ReactNode;
  config?: Partial<ControllerMapperConfig>;
}) {
  const value = useMemo(() => ({
    mapper: new ControllerMapper(config),
  }), [config]);
  
  useEffect(() => {
    value.mapper.start();
    
    return () => {
      value.mapper.dispose();
    };
  }, [value]);
  
  return (
    <ControllerContext.Provider value={value}>
      {children}
    </ControllerContext.Provider>
  );
}

export function useControllerMapper() {
  const context = useContext(ControllerContext);
  if (!context) {
    return ControllerMapper.getInstance();
  }
  return context.mapper;
}

export function useControllers() {
  const mapper = useControllerMapper();
  const [controllers, setControllers] = useState<ConnectedController[]>(mapper.getAllControllers());
  
  useEffect(() => {
    const update = () => setControllers(mapper.getAllControllers());
    
    mapper.on('connected', update);
    mapper.on('disconnected', update);
    
    return () => {
      mapper.off('connected', update);
      mapper.off('disconnected', update);
    };
  }, [mapper]);
  
  return controllers;
}

export function useController(index = 0) {
  const mapper = useControllerMapper();
  const [controller, setController] = useState<ConnectedController | undefined>(
    mapper.getControllerByIndex(index)
  );
  
  useEffect(() => {
    const update = () => setController(mapper.getControllerByIndex(index));
    
    mapper.on('connected', update);
    mapper.on('disconnected', update);
    
    return () => {
      mapper.off('connected', update);
      mapper.off('disconnected', update);
    };
  }, [mapper, index]);
  
  return controller;
}

export function useGamepadButton(button: GamepadButton, controllerIndex = 0) {
  const mapper = useControllerMapper();
  const [state, setState] = useState<ButtonState | undefined>();
  
  useEffect(() => {
    const handler = (data: { controller: string; button: GamepadButton; state: ButtonState }) => {
      const ctrl = mapper.getController(data.controller);
      if (ctrl?.index === controllerIndex && data.button === button) {
        setState(data.state);
      }
    };
    
    mapper.on('buttonPress', handler);
    mapper.on('buttonRelease', handler);
    
    return () => {
      mapper.off('buttonPress', handler);
      mapper.off('buttonRelease', handler);
    };
  }, [mapper, button, controllerIndex]);
  
  return state;
}

export function useGamepadAxis(axis: GamepadAxis, controllerIndex = 0) {
  const mapper = useControllerMapper();
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    const handler = (data: { controller: string; axis: GamepadAxis; value: number }) => {
      const ctrl = mapper.getController(data.controller);
      if (ctrl?.index === controllerIndex && data.axis === axis) {
        setValue(data.value);
      }
    };
    
    mapper.on('axisMove', handler);
    
    return () => {
      mapper.off('axisMove', handler);
    };
  }, [mapper, axis, controllerIndex]);
  
  return value;
}

export function useGameAction(action: GameAction) {
  const mapper = useControllerMapper();
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    const handler = (data: { action: GameAction; value: number }) => {
      if (data.action === action || data.action.startsWith(`${action}:`)) {
        setValue(data.value);
      }
    };
    
    mapper.on('action', handler);
    
    return () => {
      mapper.off('action', handler);
    };
  }, [mapper, action]);
  
  return value;
}

export function useControllerProfiles() {
  const mapper = useControllerMapper();
  const [profiles, setProfiles] = useState<ControllerProfile[]>(mapper.getAllProfiles());
  
  useEffect(() => {
    const update = () => setProfiles(mapper.getAllProfiles());
    
    mapper.on('profileCreated', update);
    mapper.on('profileUpdated', update);
    mapper.on('profileDeleted', update);
    
    return () => {
      mapper.off('profileCreated', update);
      mapper.off('profileUpdated', update);
      mapper.off('profileDeleted', update);
    };
  }, [mapper]);
  
  return profiles;
}

export function useVibration() {
  const mapper = useControllerMapper();
  
  return useCallback((
    duration: number,
    weak = 0.5,
    strong = 0.5,
    controllerId: string | 'all' = 'all'
  ) => {
    mapper.vibrate(controllerId, duration, weak, strong);
  }, [mapper]);
}
