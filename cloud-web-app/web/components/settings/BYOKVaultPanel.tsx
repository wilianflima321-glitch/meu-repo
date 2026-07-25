'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { authHeaders } from '@/lib/auth';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Cpu,
  Globe,
} from 'lucide-react';
import {
  type BYOKProvider,
  setBYOKKey,
  getBYOKKey,
  clearBYOKKey,
  getActiveBYOKProviders,
  setBYOKProxyUrl,
  getBYOKProxyUrl,
} from '@/lib/ai/byok-client-proxy';

type VaultStatus = 'idle' | 'loading' | 'configured' | 'unconfigured' | 'saving' | 'deleting' | 'success' | 'error';

interface ByokState {
  isConfigured: boolean;
  maskedKey: string | null;
}

function SkeletonLine({ width = 'w-full', height = 'h-3' }: { width?: string; height?: string }) {
  return (
    <div
      className={`${width} ${height} rounded aethel-shimmer`}
      aria-hidden="true"
    />
  );
}

function VaultLockIcon({ isConfigured, isAnimating }: { isConfigured: boolean; isAnimating: boolean }) {
  return (
    <div
      className={`
        relative flex h-18 w-18 flex-shrink-0 items-center justify-center transition-all duration-500
        ${isAnimating ? 'scale-110' : 'scale-100'}
      `}
      style={{
        width: 72, height: 72,
        borderRadius: '18px',
        background: isConfigured
          ? 'linear-gradient(135deg, rgba(16,185,129,.25) 0%, rgba(34,211,238,.12) 100%)'
          : 'linear-gradient(135deg, rgba(251,191,36,.18) 0%, rgba(234,88,12,.10) 100%)',
        border: `1px solid ${isConfigured ? 'rgba(16,185,129,.40)' : 'rgba(251,191,36,.35)'}`,
        boxShadow: isConfigured
          ? '0 0 0 1px rgba(16,185,129,.12), inset 0 1px 0 rgba(255,255,255,.06), 0 0 24px rgba(16,185,129,.20)'
          : '0 0 0 1px rgba(251,191,36,.12), inset 0 1px 0 rgba(255,255,255,.06), 0 0 24px rgba(251,191,36,.18)',
      }}
    >
      {isConfigured ? (
        <ShieldCheck className="h-8 w-8 text-emerald-400" strokeWidth={1.5} />
      ) : (
        <Lock className="h-8 w-8 text-amber-400" strokeWidth={1.5} />
      )}
      {/* Beacon dot */}
      <span
        className={`
          aethel-beacon absolute -top-1 -right-1 h-3 w-3 rounded-full
          ${isConfigured ? 'text-emerald-400' : 'text-amber-400'}
        `}
      >
        <span className={`block h-3 w-3 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </span>
    </div>
  );
}

export function BYOKVaultPanel({ userId }: { userId?: string }) {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [byok, setByok] = useState<ByokState>({ isConfigured: false, maskedKey: null });
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [iconAnimating, setIconAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = useCallback(async () => {
    setStatus('loading');
    try {
      const headers: Record<string, string> = {
        ...authHeaders()
      };
      const res = await fetch('/api/settings/byok', { headers });
      if (!res.ok) throw new Error('Failed to fetch BYOK status');
      const data: ByokState = await res.json();
      setByok(data);
      setStatus(data.isConfigured ? 'configured' : 'unconfigured');
    } catch {
      setStatus('error');
      setError('Could not reach the security vault. Please try again.');
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const triggerAnimation = () => {
    setIconAnimating(true);
    setTimeout(() => setIconAnimating(false), 600);
  };

  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setStatus('saving');
    setError(null);
    try {
      const saveHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders()
      };
      const res = await fetch('/api/settings/byok', {
        method: 'POST',
        headers: saveHeaders,
        body: JSON.stringify({ key: keyInput }),
      });
      if (!res.ok) throw new Error('Failed to save key');
      triggerAnimation();
      setKeyInput('');
      setSuccessMsg('Key encrypted and stored with AES-256-GCM.');
      await fetchStatus();
      setStatus('configured');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setStatus('error');
      setError('Failed to encrypt and store the key. Vault may be locked.');
    }
  };

  const handleDelete = async () => {
    setStatus('deleting');
    setError(null);
    try {
      const deleteHeaders: Record<string, string> = {
        ...authHeaders()
      };
      const res = await fetch('/api/settings/byok', {
        method: 'DELETE',
        headers: deleteHeaders,
      });
      if (!res.ok) throw new Error('Failed to delete key');
      triggerAnimation();
      setByok({ isConfigured: false, maskedKey: null });
      setSuccessMsg('Key removed from vault.');
      setStatus('unconfigured');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch {
      setStatus('error');
      setError('Could not remove key. Please retry.');
    }
  };

  const isLoading = status === 'loading';
  const isSaving = status === 'saving';
  const isDeleting = status === 'deleting';
  const isBusy = isSaving || isDeleting;

  return (
    <section
      id="byok-vault-panel"
      aria-labelledby="byok-heading"
      className="relative overflow-hidden rounded-2xl p-6 space-y-6 transition-all duration-300 aethel-vault"
    >
      {/* Decorative vault grid */}
      <div className="pointer-events-none absolute inset-0 aethel-grid-overlay opacity-30" />
      {/* Neon top accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,.55)] to-transparent" />
      {/* Header */}
      <div className="flex items-start gap-4">
        <VaultLockIcon isConfigured={byok.isConfigured} isAnimating={iconAnimating} />
        <div className="flex-1 min-w-0">
          <h2
            id="byok-heading"
            className="text-base font-semibold text-[var(--aethel-text-primary)] flex items-center flex-wrap gap-2"
          >
            Security Vault
            <span
              className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(59,130,246,.15)',
                border: '1px solid rgba(59,130,246,.30)',
                color: 'var(--aethel-primary-light)',
              }}
            >
              <Cpu className="h-2.5 w-2.5" />
              AES-256-GCM
            </span>
          </h2>
          <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1 leading-relaxed">
            BYOK — route AI calls through your own provider key. Stored encrypted at rest and never logged.
          </p>
        </div>
      </div>

      {/* Status banner */}
      {isLoading ? (
        <div className="space-y-3">
          <div
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}
          >
            <SkeletonLine height="h-4" width="w-32" />
            <SkeletonLine height="h-3" width="w-48" />
          </div>
          <SkeletonLine height="h-10" />
          <SkeletonLine height="h-9" width="w-32" />
        </div>
      ) : (
        <>
          {/* Current key status */}
          <div
            className="relative flex items-center gap-3 rounded-xl px-4 py-3.5 border overflow-hidden transition-all duration-300"
            style={byok.isConfigured ? {
              background: 'rgba(16,185,129,.08)',
              border: '1px solid rgba(16,185,129,.28)',
              boxShadow: 'inset 0 0 24px rgba(16,185,129,.04)',
            } : {
              background: 'rgba(251,191,36,.07)',
              border: '1px solid rgba(251,191,36,.28)',
              boxShadow: 'inset 0 0 24px rgba(251,191,36,.04)',
            }}
          >
            {byok.isConfigured ? (
              <>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-300">Vault Secured</p>
                  <p className="text-xs text-[var(--aethel-text-tertiary)] font-mono mt-0.5 truncate">
                    {byok.maskedKey ?? '••••••••••••••••'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all
                    text-red-400 border border-red-500/25 hover:bg-red-500/12 hover:border-red-500/40
                    disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Remove BYOK key from vault"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  {isDeleting ? 'Removing…' : 'Remove'}
                </button>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <p className="text-sm text-amber-300">No key configured — using Aethel shared quota.</p>
              </>
            )}
          </div>

          {/* Input new key */}
          <div className="space-y-3">
            <label htmlFor="byok-key-input" className="text-xs font-medium uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
              {byok.isConfigured ? 'Replace Key' : 'Add API Key'}
            </label>
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--aethel-text-quaternary)]"
                aria-hidden
              />
              <input
                id="byok-key-input"
                ref={inputRef}
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="sk-…"
                autoComplete="off"
                spellCheck={false}
                disabled={isBusy}
                className="
                  w-full rounded-xl bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)]
                  pl-10 pr-12 py-2.5 text-sm font-mono text-[var(--aethel-text-primary)]
                  placeholder:text-[var(--aethel-text-quaternary)]
                  transition-all duration-200
                  focus:outline-none focus:border-[var(--aethel-neon-cyan)] focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]
                  disabled:opacity-40
                "
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] transition-colors"
                aria-label={showKey ? 'Hide key' : 'Reveal key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                id="byok-save-btn"
                onClick={handleSave}
                disabled={!keyInput.trim() || isBusy}
                className="
                  flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
                  bg-gradient-to-r from-cyan-500/90 to-[var(--aethel-primary)]/80
                  text-white border border-cyan-400/30
                  hover:from-cyan-400 hover:to-[var(--aethel-primary-light)]
                  hover:shadow-[var(--aethel-glow-cyan)]
                  transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Encrypting…' : 'Save to Vault'}
              </button>
              <div className="flex items-center gap-1.5 text-xs text-[var(--aethel-text-quaternary)]">
                <Cpu className="h-3 w-3" />
                End-to-end encrypted before storage
              </div>
            </div>
          </div>

          {/* Success / error feedback */}
          {successMsg && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-emerald-400 animate-slide-right"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {successMsg}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 text-sm text-red-400 animate-slide-right"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// LocalBYOKSection — Zero-Knowledge localStorage keys + proxy URL
// ---------------------------------------------------------------------------

const BYOK_PROVIDERS: Array<{ id: BYOKProvider; label: string; placeholder: string }> = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-…' },
  { id: 'google', label: 'Google (Gemini)', placeholder: 'AIza…' },
  { id: 'groq', label: 'Groq', placeholder: 'gsk_…' },
]

/**
 * LocalBYOKSection — stores provider keys in IndexedDB `aethel-byok-v1`
 * (mirrored for sync request headers). Keys NEVER persist on Aethel servers.
 * Server vault (/api/settings/byok POST) is retired (410).
 */
export function LocalBYOKSection() {
  const [keys, setKeys] = useState<Record<BYOKProvider, string>>({
    openai: '', anthropic: '', google: '', groq: '',
  })
  const [proxyUrl, setProxyUrlState] = useState('')
  const [showKeys, setShowKeys] = useState<Record<BYOKProvider, boolean>>({
    openai: false, anthropic: false, google: false, groq: false,
  })
  const [saved, setSaved] = useState<Record<BYOKProvider | 'proxy', boolean>>({
    openai: false, anthropic: false, google: false, groq: false, proxy: false,
  })
  const [activeProviders, setActiveProviders] = useState<BYOKProvider[]>([])

  useEffect(() => {
    setActiveProviders(getActiveBYOKProviders())
    setProxyUrlState(getBYOKProxyUrl() ?? '')
  }, [])

  const handleSaveKey = (provider: BYOKProvider) => {
    const val = keys[provider].trim()
    if (val) {
      setBYOKKey(provider, val)
    } else {
      clearBYOKKey(provider)
    }
    setActiveProviders(getActiveBYOKProviders())
    setSaved((prev) => ({ ...prev, [provider]: true }))
    setKeys((prev) => ({ ...prev, [provider]: '' }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [provider]: false })), 3000)
  }

  const handleClearKey = (provider: BYOKProvider) => {
    clearBYOKKey(provider)
    setActiveProviders(getActiveBYOKProviders())
    setKeys((prev) => ({ ...prev, [provider]: '' }))
  }

  const handleSaveProxy = () => {
    setBYOKProxyUrl(proxyUrl.trim() || null)
    setSaved((prev) => ({ ...prev, proxy: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, proxy: false })), 3000)
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_14%,transparent)]">
          <KeyRound className="h-4.5 w-4.5 text-[var(--aethel-neon-cyan)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
            Local API Keys
            <span className="ml-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_14%,transparent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--aethel-neon-cyan)]">
              Zero-Knowledge
            </span>
          </h3>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            Stored in IndexedDB <span className="font-mono">aethel-byok-v1</span> (mirrored for headers) — never
            posted to Aethel servers.
          </p>
        </div>
      </div>

      {/* Active providers summary */}
      {activeProviders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeProviders.map((p) => (
            <span key={p} className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2.5 py-1 text-[10px] text-[var(--aethel-success)]">
              <CheckCircle2 className="h-3 w-3" />
              {BYOK_PROVIDERS.find((x) => x.id === p)?.label ?? p} configured
            </span>
          ))}
        </div>
      )}

      {/* Per-provider key inputs */}
      <div className="flex flex-col gap-3">
        {BYOK_PROVIDERS.map(({ id, label, placeholder }) => {
          const isActive = activeProviders.includes(id)
          return (
            <div key={id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">{label}</label>
                {isActive && (
                  <span className="text-[10px] text-[var(--aethel-success)]">● Active</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys[id] ? 'text' : 'password'}
                    value={keys[id]}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder={isActive ? '(key saved — enter new to replace)' : placeholder}
                    className="w-full rounded-md border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 py-2 pr-8 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)] focus:ring-1 focus:ring-[var(--aethel-primary)]"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
                    aria-label={showKeys[id] ? 'Hide key' : 'Show key'}
                  >
                    {showKeys[id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveKey(id)}
                  disabled={!keys[id].trim()}
                  className="flex items-center gap-1 rounded-md bg-[var(--aethel-surface-tertiary)] px-2.5 py-2 text-[10px] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] hover:text-[var(--aethel-primary-light)] disabled:opacity-40 transition-colors"
                >
                  {saved[id] ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success)]" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                {isActive && (
                  <button
                    type="button"
                    onClick={() => handleClearKey(id)}
                    className="flex items-center gap-1 rounded-md px-2.5 py-2 text-[10px] text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] transition-colors"
                    aria-label={`Remove ${label} key`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Custom proxy URL (corporate CORS bypass) */}
      <div className="flex flex-col gap-2 border-t border-[var(--aethel-border-secondary)]/50 pt-4">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
          <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">
            Custom Proxy URL
            <span className="ml-1.5 text-[10px] font-normal text-[var(--aethel-text-tertiary)]">(optional — for corporate CORS bypass)</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={proxyUrl}
            onChange={(e) => setProxyUrlState(e.target.value)}
            placeholder="https://my-proxy.corp.example.com"
            className="flex-1 rounded-md border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)] focus:ring-1 focus:ring-[var(--aethel-primary)]"
          />
          <button
            type="button"
            onClick={handleSaveProxy}
            className="flex items-center gap-1 rounded-md bg-[var(--aethel-surface-tertiary)] px-2.5 py-2 text-[10px] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] hover:text-[var(--aethel-primary-light)] transition-colors"
          >
            {saved.proxy ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success)]" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
        <p className="text-[10px] text-[var(--aethel-text-tertiary)] leading-relaxed">
          When set, AI requests will be routed through this URL instead of the provider directly.
          The proxy receives an <code className="rounded bg-[var(--aethel-surface-tertiary)] px-1">X-BYOK-Target</code> header identifying the destination.
        </p>
      </div>
    </div>
  )
}
