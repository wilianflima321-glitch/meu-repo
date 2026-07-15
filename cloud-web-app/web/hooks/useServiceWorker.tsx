/**
 * Service Worker Registration Hook
 *
 * Provides a React hook to register and manage the Service Worker lifecycle.
 * Handles updates, offline status, and provides controls for the SW.
 *
 * @module hooks/useServiceWorker
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createComponentLogger } from '@/lib/observability/logger';

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export interface ServiceWorkerActions {
  update: () => Promise<void>;
  skipWaiting: () => void;
  clearCache: () => void;
  getVersion: () => Promise<string | null>;
}

export type UseServiceWorkerReturn = ServiceWorkerState & ServiceWorkerActions;

const logger = createComponentLogger('service-worker');
const REGISTRATION_IDLE_DELAY_MS = 1200;
const PERIODIC_UPDATE_INTERVAL_MS = 4 * 60 * 60 * 1000;

function scheduleIdleTask(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(() => callback(), {
      timeout: REGISTRATION_IDLE_DELAY_MS,
    });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = globalThis.setTimeout(callback, REGISTRATION_IDLE_DELAY_MS);
  return () => globalThis.clearTimeout(handle);
}

export function useServiceWorker(enabled = true): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    isUpdateAvailable: false,
    registration: null,
    error: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelQueuedRegistrationRef = useRef<(() => void) | null>(null);
  const registrationInFlightRef = useRef(false);
  const registrationSucceededRef = useRef(false);
  const shouldReloadOnControllerChangeRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      cancelQueuedRegistrationRef.current?.();
      cancelQueuedRegistrationRef.current = null;
      registrationInFlightRef.current = false;
      registrationSucceededRef.current = false;
      shouldReloadOnControllerChangeRef.current = false;
      setState((prev) => ({
        ...prev,
        isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
        isRegistered: false,
        isUpdateAvailable: false,
        registration: null,
        error: null,
      }));
      return;
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isSupported: true,
      isOnline: navigator.onLine,
    }));

    const registerServiceWorker = async () => {
      if (registrationRef.current || registrationInFlightRef.current || registrationSucceededRef.current) {
        return;
      }

      if (document.visibilityState === 'hidden') {
        return;
      }

      if (!navigator.onLine) {
        logger.info('[SW Hook] Delaying registration until the browser is back online');
        return;
      }

      registrationInFlightRef.current = true;
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        registrationRef.current = registration;
        registrationSucceededRef.current = true;

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
          error: null,
        }));

        logger.info('[SW Hook] Service Worker registered', { scope: registration.scope });

        if (registration.waiting) {
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
              logger.info('[SW Hook] New version available');
            }
          });
        });

        updateCheckIntervalRef.current = setInterval(() => {
          if (document.visibilityState !== 'visible' || !navigator.onLine) {
            return;
          }

          registration.update().catch((error) => {
            logger.error('[SW Hook] Periodic update check failed', error);
          });
        }, PERIODIC_UPDATE_INTERVAL_MS);
      } catch (error) {
        registrationSucceededRef.current = false;
        logger.error('[SW Hook] Registration failed', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Registration failed'),
        }));
      } finally {
        registrationInFlightRef.current = false;
      }
    };

    const scheduleRegistration = () => {
      if (
        registrationRef.current ||
        registrationInFlightRef.current ||
        registrationSucceededRef.current ||
        document.visibilityState === 'hidden' ||
        !navigator.onLine
      ) {
        return;
      }

      cancelQueuedRegistrationRef.current?.();
      cancelQueuedRegistrationRef.current = scheduleIdleTask(() => {
        cancelQueuedRegistrationRef.current = null;
        void registerServiceWorker();
      });
    };

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      scheduleRegistration();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleRegistration();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'UPDATE_AVAILABLE':
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
          logger.info('[SW Hook] Update available', { version: payload?.version });
          break;
        case 'CACHE_UPDATED':
          logger.info('[SW Hook] Cache updated');
          break;
        default:
          break;
      }
    };

    const handleControllerChange = () => {
      if (!shouldReloadOnControllerChangeRef.current) {
        logger.info('[SW Hook] Controller changed without explicit user update request');
        setState((prev) => ({ ...prev, isUpdateAvailable: false }));
        return;
      }

      logger.info('[SW Hook] Controller changed after explicit update request, reloading...');
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker.addEventListener('message', handleMessage);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    if (document.readyState === 'complete') {
      scheduleRegistration();
    } else {
      window.addEventListener('load', scheduleRegistration);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('load', scheduleRegistration);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      cancelQueuedRegistrationRef.current?.();
      cancelQueuedRegistrationRef.current = null;

      if (updateCheckIntervalRef.current) {
        clearInterval(updateCheckIntervalRef.current);
        updateCheckIntervalRef.current = null;
      }
    };
  }, [enabled]);

  const update = useCallback(async () => {
    const registration = registrationRef.current;

    if (!registration) {
      logger.warn('[SW Hook] No registration to update');
      return;
    }

    try {
      await registration.update();
      logger.info('[SW Hook] Update check triggered');
    } catch (error) {
      logger.error('[SW Hook] Update failed', error);
    }
  }, []);

  const skipWaiting = useCallback(() => {
    const registration = registrationRef.current;

    if (registration?.waiting) {
      shouldReloadOnControllerChangeRef.current = true;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  const clearCache = useCallback(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }
  }, []);

  const getVersion = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve(null);
        return;
      }

      let resolved = false;
      const messageChannel = new MessageChannel();
      const timeoutId = window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 3000);

      messageChannel.port1.onmessage = (event) => {
        if (resolved) return;
        resolved = true;
        window.clearTimeout(timeoutId);
        resolve(event.data?.version || null);
      };

      navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
    });
  }, []);

  return {
    ...state,
    update,
    skipWaiting,
    clearCache,
    getVersion,
  };
}

export function UpdatePrompt() {
  const { isUpdateAvailable, skipWaiting } = useServiceWorker();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-4 rounded-lg bg-[var(--aethel-primary-dark)] p-4 text-white shadow-lg">
      <div>
        <p className="font-medium">Nova versao disponivel!</p>
        <p className="text-sm opacity-90">Clique para atualizar</p>
      </div>
      <button
        onClick={skipWaiting}
        className="rounded bg-white px-4 py-2 font-medium text-[var(--aethel-primary-dark)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]"
      >
        Atualizar
      </button>
    </div>
  );
}

export function OfflineIndicator() {
  const { isOnline, isSupported } = useServiceWorker();

  if (!isSupported || isOnline) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 py-2 text-center text-sm font-medium text-black">
      <span className="mr-2">Offline</span>
      Voce esta offline. Algumas funcionalidades podem estar limitadas.
    </div>
  );
}
