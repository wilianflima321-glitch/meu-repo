'use client';

/**
 * Service Worker Provider Component
 *
 * Wraps the application with Service Worker management context.
 * Provides update prompts and offline indicators automatically.
 *
 * @module components/ServiceWorkerProvider
 */
import { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useServiceWorker, type UseServiceWorkerReturn } from '../hooks/useServiceWorker';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('ServiceWorkerProvider');
const SERVICE_WORKER_DISMISS_KEY = 'aethel:sw-update-dismissed-at';
const DISMISS_WINDOW_MS = 60 * 60 * 1000;

const ServiceWorkerContext = createContext<UseServiceWorkerReturn | null>(null);

export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error('useServiceWorkerContext must be used within ServiceWorkerProvider');
  }
  return context;
}

interface ServiceWorkerProviderProps {
  children?: ReactNode;
  enabled?: boolean;
}

function readDismissedUntil(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(SERVICE_WORKER_DISMISS_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeDismissedUntil(timestamp: number | null) {
  if (typeof window === 'undefined') return;
  if (timestamp === null) {
    window.sessionStorage.removeItem(SERVICE_WORKER_DISMISS_KEY);
    return;
  }
  window.sessionStorage.setItem(SERVICE_WORKER_DISMISS_KEY, String(timestamp));
}

export function ServiceWorkerProvider({ children, enabled = false }: ServiceWorkerProviderProps) {
  const shouldEnableServiceWorker =
    enabled &&
    (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === 'true');
  const sw = useServiceWorker(shouldEnableServiceWorker);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const dismissResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shouldEnableServiceWorker) {
      setDismissedUntil(null);
      setShowUpdatePrompt(false);
      writeDismissedUntil(null);
      return;
    }

    const storedDismissedUntil = readDismissedUntil();
    if (!storedDismissedUntil || storedDismissedUntil <= Date.now()) {
      setDismissedUntil(null);
      writeDismissedUntil(null);
      return;
    }

    setDismissedUntil(storedDismissedUntil);
  }, [shouldEnableServiceWorker]);

  useEffect(() => {
    if (!shouldEnableServiceWorker) {
      setShowUpdatePrompt(false);
      return;
    }

    const isDismissed = typeof dismissedUntil === 'number' && dismissedUntil > Date.now();
    if (sw.isSupported && sw.isUpdateAvailable && !isDismissed) {
      setShowUpdatePrompt(true);
      return;
    }

    setShowUpdatePrompt(false);
  }, [dismissedUntil, shouldEnableServiceWorker, sw.isSupported, sw.isUpdateAvailable]);

  useEffect(() => {
    return () => {
      if (dismissResetTimerRef.current) {
        clearTimeout(dismissResetTimerRef.current);
        dismissResetTimerRef.current = null;
      }
    };
  }, []);

  const handleUpdate = () => {
    sw.skipWaiting();
    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    const nextDismissedUntil = Date.now() + DISMISS_WINDOW_MS;
    if (dismissResetTimerRef.current) {
      clearTimeout(dismissResetTimerRef.current);
    }

    setShowUpdatePrompt(false);
    setDismissedUntil(nextDismissedUntil);
    writeDismissedUntil(nextDismissedUntil);

    dismissResetTimerRef.current = setTimeout(() => {
      setDismissedUntil(null);
      writeDismissedUntil(null);
    }, DISMISS_WINDOW_MS);
  };

  if (!shouldEnableServiceWorker) {
    return <ServiceWorkerContext.Provider value={sw}>{children}</ServiceWorkerContext.Provider>;
  }

  return (
    <ServiceWorkerContext.Provider value={sw}>
      {sw.isSupported && !sw.isOnline ? (
        <div
          className="fixed left-0 right-0 top-0 z-[9999] bg-gradient-to-r from-[var(--aethel-warning)] to-[var(--aethel-warning-dark)] px-4 py-2 text-center text-sm font-medium text-[var(--aethel-text-primary)] shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            You are offline. Some features may be limited.
          </span>
        </div>
      ) : null}

      {showUpdatePrompt ? (
        <div
          className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
          role="dialog"
          aria-labelledby="update-title"
          aria-describedby="update-description"
        >
          <div className="overflow-hidden rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] shadow-2xl">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]">
                  <svg className="h-5 w-5 text-[var(--aethel-info-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="update-title" className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                    Update available
                  </h3>
                  <p id="update-description" className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">
                    A new Aethel Engine version is ready to install.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex border-t border-[var(--aethel-border-primary)]">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 px-4 py-3 text-sm font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="flex-1 border-l border-[var(--aethel-border-primary)] px-4 py-3 text-sm font-medium text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] hover:text-[var(--aethel-info)]"
              >
                Refresh now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
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
    log.info('[PWA] Install prompt outcome:', outcome);

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] max-w-sm">
      <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <Image src="/branding/aethel-mark.svg" alt="" width={40} height={40} sizes="40px" className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Instalar Aethel Engine</p>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Acesse rapidamente do seu desktop</p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded bg-[var(--aethel-info)] px-3 py-1.5 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
