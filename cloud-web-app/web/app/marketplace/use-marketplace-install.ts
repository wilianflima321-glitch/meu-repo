import { useState } from 'react';
import type { Extension } from './marketplace-page.data';
import type { MarketplaceInstallFeedback } from './marketplace-page.types';

export function useMarketplaceInstall(
  extensions: Extension[],
  setExtensions: React.Dispatch<React.SetStateAction<Extension[]>>,
  setReviewingExtensionId: React.Dispatch<React.SetStateAction<string | null>>
) {
  const [installPending, setInstallPending] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<MarketplaceInstallFeedback | null>(null);

  const redirectToLogin = (extensionId: string) => {
    const next = encodeURIComponent(`/marketplace?install=${extensionId}`);
    window.location.assign(`/login?next=${next}`);
  };

  const handleInstall = async (extensionId: string) => {
    if (installPending) return;
    setInstallPending(true);
    setInstallFeedback(null);

    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId }),
      });

      if (response.status === 401) {
        redirectToLogin(extensionId);
        return;
      }

      if (response.ok) {
        setExtensions((prev) =>
          prev.map((ext) => (ext.id === extensionId ? { ...ext, installed: true } : ext))
        );
        setInstallFeedback({ type: 'success', message: 'Installed. The extension is now active for your account.' });
        setTimeout(() => {
          setReviewingExtensionId(null);
          setInstallFeedback(null);
        }, 1200);
        return;
      }

      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (response.status === 404) {
        setInstallFeedback({ type: 'info', message: 'This extension is in curated preview and is not yet available to install.' });
        return;
      }
      if (response.status === 402 || response.status === 403) {
        setInstallFeedback({ type: 'error', message: data?.error || data?.message || 'Your plan does not include marketplace installs yet.' });
        return;
      }
      setInstallFeedback({ type: 'error', message: data?.error || data?.message || 'Install failed. Please try again.' });
    } catch {
      setInstallFeedback({ type: 'error', message: 'Network error. Check your connection and try again.' });
    } finally {
      setInstallPending(false);
    }
  };

  const handleUninstall = async (extensionId: string) => {
    const previous = extensions;
    setExtensions((prev) => prev.map((ext) => (ext.id === extensionId ? { ...ext, installed: false } : ext)));
    try {
      const response = await fetch('/api/marketplace/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId }),
      });
      if (response.status === 401) {
        redirectToLogin(extensionId);
        return;
      }
      if (!response.ok) {
        setExtensions(previous);
      }
    } catch {
      setExtensions(previous);
    }
  };

  return { installPending, installFeedback, setInstallFeedback, handleInstall, handleUninstall };
}
