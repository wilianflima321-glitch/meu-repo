/**
 * Service Worker Registration Hook
 * 
 * Provides a React hook to register and manage the Service Worker lifecycle.
 * Handles updates, offline status, and provides controls for the SW.
 * 
 * @module hooks/useServiceWorker
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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

/**
 * Hook para gerenciar o Service Worker
 * 
 * @example
 * ```tsx
 * const { isOnline, isUpdateAvailable, update } = useServiceWorker();
 * 
 * if (isUpdateAvailable) {
 *   return <button onClick={update}>Atualizar</button>;
 * }
 * ```
 */
export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    isUpdateAvailable: false,
    registration: null,
    error: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Registrar Service Worker
  useEffect(() => {
    // Verificar suporte
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true, isOnline: navigator.onLine }));

    // Event listeners para status online/offline
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Registrar SW
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Sempre verificar atualizações
        });

        registrationRef.current = registration;

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        console.log('[SW Hook] Service Worker registered:', registration.scope);

        // Verificar se há SW aguardando
        if (registration.waiting) {
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
        }

        // Listener para novo SW instalado
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Novo SW instalado, update disponível
                setState((prev) => ({ ...prev, isUpdateAvailable: true }));
                console.log('[SW Hook] New version available');
              }
            });
          }
        });

        // Verificar atualizações periodicamente
        setInterval(() => {
          registration.update().catch(console.error);
        }, 60 * 60 * 1000); // A cada hora

      } catch (error) {
        console.error('[SW Hook] Registration failed:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Registration failed'),
        }));
      }
    };

    // Aguardar página carregar completamente
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }

    // Listener para mensagens do SW
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'UPDATE_AVAILABLE':
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
          console.log('[SW Hook] Update available:', payload?.version);
          break;

        case 'CACHE_UPDATED':
          console.log('[SW Hook] Cache updated');
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Listener para controllerchange (SW atualizado)
    const handleControllerChange = () => {
      console.log('[SW Hook] Controller changed, reloading...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('load', registerServiceWorker);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Forçar atualização do SW
  const update = useCallback(async () => {
    const registration = registrationRef.current;

    if (!registration) {
      console.warn('[SW Hook] No registration to update');
      return;
    }

    try {
      await registration.update();
      console.log('[SW Hook] Update check triggered');
    } catch (error) {
      console.error('[SW Hook] Update failed:', error);
    }
  }, []);

  // Pular waiting e ativar novo SW
  const skipWaiting = useCallback(() => {
    const registration = registrationRef.current;

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  // Limpar todos os caches
  const clearCache = useCallback(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }
  }, []);

  // Obter versão do SW
  const getVersion = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve(null);
        return;
      }

      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data?.version || null);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );

      // Timeout de 3 segundos
      setTimeout(() => resolve(null), 3000);
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

/**
 * Componente para exibir prompt de atualização
 */
export function UpdatePrompt() {
  const { isUpdateAvailable, skipWaiting } = useServiceWorker();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-indigo-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-4">
      <div>
        <p className="font-medium">Nova versão disponível!</p>
        <p className="text-sm opacity-90">Clique para atualizar</p>
      </div>
      <button
        onClick={skipWaiting}
        className="px-4 py-2 bg-white text-indigo-600 rounded font-medium hover:bg-indigo-50 transition-colors"
      >
        Atualizar
      </button>
    </div>
  );
}

/**
 * Componente para exibir status offline
 */
export function OfflineIndicator() {
  const { isOnline, isSupported } = useServiceWorker();

  if (!isSupported || isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black text-center py-2 text-sm font-medium">
      <span className="mr-2">⚠️</span>
      Você está offline. Algumas funcionalidades podem estar limitadas.
    </div>
  );
}
