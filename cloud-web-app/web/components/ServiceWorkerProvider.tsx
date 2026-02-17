/**
 * Service Worker Provider Component
 * 
 * Wraps the application with Service Worker management context.
 * Provides update prompts and offline indicators automatically.
 * 
 * @module components/ServiceWorkerProvider
 */

'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import { useServiceWorker, type UseServiceWorkerReturn } from '../hooks/useServiceWorker';

// Context para expor o estado do SW para toda a aplicação
const ServiceWorkerContext = createContext<UseServiceWorkerReturn | null>(null);

/**
 * Hook para acessar o contexto do Service Worker
 */
export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error('useServiceWorkerContext must be used within ServiceWorkerProvider');
  }
  return context;
}

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

/**
 * Provider que gerencia o Service Worker e exibe UI de atualização/offline
 */
export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const sw = useServiceWorker();
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Mostrar prompt de atualização quando disponível
  useEffect(() => {
    if (sw.isUpdateAvailable && !dismissed) {
      setShowUpdatePrompt(true);
    }
  }, [sw.isUpdateAvailable, dismissed]);

  // Handler para atualizar
  const handleUpdate = () => {
    sw.skipWaiting();
    setShowUpdatePrompt(false);
  };

  // Handler para dispensar
  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setDismissed(true);
    // Permitir mostrar novamente após 1 hora
    setTimeout(() => setDismissed(false), 60 * 60 * 1000);
  };

  return (
    <ServiceWorkerContext.Provider value={sw}>
      {/* Indicador de Offline */}
      {sw.isSupported && !sw.isOnline && (
        <div 
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-500 to-orange-500 text-black text-center py-2 px-4 text-sm font-medium shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2">
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            Você está offline. Algumas funcionalidades podem estar limitadas.
          </span>
        </div>
      )}

      {/* Prompt de Atualização */}
      {showUpdatePrompt && (
        <div 
          className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
          role="dialog"
          aria-labelledby="update-title"
          aria-describedby="update-description"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center">
                  <svg 
                    className="w-5 h-5 text-sky-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 
                    id="update-title" 
                    className="text-sm font-semibold text-white"
                  >
                    Nova versão disponível!
                  </h3>
                  <p 
                    id="update-description" 
                    className="mt-1 text-sm text-slate-400"
                  >
                    Uma nova versão do Aethel Engine está pronta para ser instalada.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex border-t border-slate-700">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                Mais tarde
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-3 text-sm font-medium text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors border-l border-slate-700"
              >
                Atualizar agora
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </ServiceWorkerContext.Provider>
  );
}

/**
 * Componente para verificar se app pode ser instalado
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] Install prompt outcome:', outcome);
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] max-w-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-4">
        <div className="flex items-center gap-3">
          <Image src="/aethel-logo.svg" alt="" width={40} height={40} className="w-10 h-10" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              Instalar Aethel Engine
            </p>
            <p className="text-xs text-slate-400">
              Acesse rapidamente do seu desktop
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-sky-500 text-white text-sm rounded font-medium hover:bg-sky-400 transition-colors"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}

// Tipos para o evento beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
