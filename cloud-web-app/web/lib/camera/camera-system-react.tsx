// @aethel-heavy-async-boundary Studio/camera React runtime.
import * as THREE from 'three';
import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraController } from './camera-system';
import type { CameraConfig, CameraMode, FollowSettings, ShakeSettings } from './camera-system.contracts';


const CameraContext = createContext<CameraController | null>(null);

export function CameraProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<CameraConfig>;
}) {
  const controllerRef = useRef<CameraController>(new CameraController(config));

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller.dispose();
    };
  }, []);

  return (
    <CameraContext.Provider value={controllerRef.current}>
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraController() {
  const controller = useContext(CameraContext);
  if (!controller) {
    throw new Error('useCameraController must be used within a CameraProvider');
  }
  return controller;
}

export function useCameraUpdate() {
  const controller = useCameraController();

  useFrame((state, delta) => {
    controller.update(delta);
  });

  return controller;
}

export function useCameraFollow(target: THREE.Object3D | null, settings?: Partial<FollowSettings>) {
  const controller = useCameraController();

  useEffect(() => {
    if (target) {
      controller.setFollowTarget(target, settings);
      controller.setMode('follow');
    }

    return () => {
      controller.setFollowTarget(null);
    };
  }, [controller, target, settings]);
}

export function useCameraShake() {
  const controller = useCameraController();

  const shake = useCallback((settings?: Partial<ShakeSettings>) => {
    controller.shake(settings);
  }, [controller]);

  const stop = useCallback(() => {
    controller.stopShake();
  }, [controller]);

  return { shake, stop };
}

export function useCameraMode() {
  const controller = useCameraController();
  const [mode, setModeState] = useState<CameraMode>(controller.getMode());

  useEffect(() => {
    const handleModeChange = ({ to }: { to: CameraMode }) => {
      setModeState(to);
    };

    controller.on('modeChanged', handleModeChange);

    return () => {
      controller.off('modeChanged', handleModeChange);
    };
  }, [controller]);

  const setMode = useCallback((newMode: CameraMode) => {
    controller.setMode(newMode);
  }, [controller]);

  return { mode, setMode };
}
