'use client';

import { useCallback, useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

type Integration = {
  id: string;
  name: string;
  envKey: string;
  configured: boolean;
};

type BillingRuntimeSnapshot = {
  status: 'ready' | 'partial' | 'unavailable' | string;
  checkoutReady: boolean;
  portalReady?: boolean;
  webhookReady?: boolean;
  provider?: {
    id: string;
    label: string;
    setupEnv: string[];
    webhookPath?: string | null;
  };
  stripe?: {
    publishableKeyConfigured: boolean;
    configuredPriceCount: number;
    requiredPriceCount: number;
    missingEnv: string[];
  };
};

type ProductionRuntimeSnapshot = {
  runtimeReadiness?: {
    envLocalPresent: boolean;
    databaseConfigured: boolean;
    databaseReachable: boolean;
    databaseTarget?: string | null;
    appRuntimeReachable?: boolean;
    appBaseUrl?: string | null;
    jwtConfigured: boolean;
    csrfConfigured: boolean;
    dockerCliPresent: boolean;
    dockerDaemonReady: boolean;
    authReady: boolean;
    probeReady: boolean;
    blockers: string[];
    instructions: string[];
    recommendedCommands: string[];
  };
};

type PreviewRuntimeSnapshot = {
  status?: 'ready' | 'partial' | string;
  strategy?: 'managed' | 'local' | 'inline' | string;
  managedProviderLabel?: string | null;
  managedProviderMode?: 'route-managed' | 'browser-side' | 'unknown' | string;
  routeProvisionSupported?: boolean;
  preferredRuntimeUrl?: string | null;
  blockers?: string[];
  instructions?: string[];
  recommendedCommands?: string[];
};

type OperatorReadinessSnapshot = {
  status: 'ready' | 'partial' | string;
  blockers: string[];
  instructions: string[];
  recommendedCommands: string[];
  checks: {
    billingRuntime: BillingRuntimeSnapshot;
    previewRuntime: PreviewRuntimeSnapshot;
    productionRuntime: NonNullable<ProductionRuntimeSnapshot['runtimeReadiness']>;
  };
};

type CompatibilityRouteMetric = {
  route: string;
  replacement: string;
  status: 'deprecated' | 'compatibility-wrapper';
  hits: number;
  lastHitAt: string;
  deprecatedSince?: string;
  removalCycleTarget?: string;
  deprecationPolicy?: string;
  candidateForRemoval?: boolean;
  silenceDays?: number;
};

export default function APIs() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [compatRoutes, setCompatRoutes] = useState<CompatibilityRouteMetric[]>([]);
  const [removalCandidates, setRemovalCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compatError, setCompatError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'missing'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [billingRuntime, setBillingRuntime] = useState<BillingRuntimeSnapshot | null>(null);
  const [previewRuntime, setPreviewRuntime] = useState<PreviewRuntimeSnapshot | null>(null);
  const [productionRuntime, setProductionRuntime] = useState<ProductionRuntimeSnapshot | null>(null);
  const [operatorReadiness, setOperatorReadiness] = useState<OperatorReadinessSnapshot | null>(null);

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/apis', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Falha ao carregar integracoes');
      const data = await res.json();
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : []);
      setLastUpdated(new Date());
      setError(null);

      const compatRes = await fetch('/api/admin/compatibility-routes', { headers: getAuthHeaders() });
      if (!compatRes.ok) throw new Error('Falha ao carregar rotas de compatibilidade');
      const compatData = await compatRes.json();
      setCompatRoutes(Array.isArray(compatData?.routes) ? compatData.routes : []);
      setRemovalCandidates(Array.isArray(compatData?.removalCandidates) ? compatData.removalCandidates : []);

      const operatorRes = await fetch('/api/admin/operator-readiness', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (!operatorRes.ok) throw new Error('Falha ao carregar readiness operacional');
      const operatorData = await operatorRes.json().catch(() => null);
      const operatorSnapshot =
        operatorData && typeof operatorData === 'object'
          ? (operatorData as OperatorReadinessSnapshot)
          : null;
      setOperatorReadiness(operatorSnapshot);
      setBillingRuntime(operatorSnapshot?.checks.billingRuntime ?? null);
      setPreviewRuntime(operatorSnapshot?.checks.previewRuntime ?? null);
      setProductionRuntime(
        operatorSnapshot?.checks.productionRuntime
          ? { runtimeReadiness: operatorSnapshot.checks.productionRuntime }
          : null
      );

      setCompatError(null);
      setStatusMessage('Integracoes atualizadas com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar integracoes';
      if (message.includes('compatibilidade')) {
        setCompatError(message);
      } else {
        setError(message);
      }
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredIntegrations = integrations.filter((integration) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      integration.name.toLowerCase().includes(term) ||
      integration.envKey.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'configured' ? integration.configured : !integration.configured);
    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: integrations.length,
    configured: integrations.filter((integration) => integration.configured).length,
    missing: integrations.filter((integration) => !integration.configured).length,
  };

  const isAIProviderIntegration = (integration: Integration) => {
    const name = integration.name.toLowerCase();
    const key = integration.envKey.toLowerCase();
    return (
      name.includes('openai') ||
      name.includes('anthropic') ||
      name.includes('gemini') ||
      name.includes('google') ||
      name.includes('groq') ||
      key.includes('openai') ||
      key.includes('anthropic') ||
      key.includes('gemini') ||
      key.includes('google') ||
      key.includes('groq')
    );
  };
  const aiProviderIntegrations = integrations.filter(isAIProviderIntegration);
  const aiProvidersMissing = aiProviderIntegrations.filter((integration) => !integration.configured);
  const hasConfiguredAIProvider = aiProviderIntegrations.some((integration) => integration.configured);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Gerenciamento de APIs</h1>
          <p className='text-zinc-400'>Status real de integracao com provedores externos e chaves de ambiente.</p>
          {lastUpdated && (
            <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchIntegrations}
          aria-label='Atualizar status de integracoes'
          className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm hover:bg-zinc-700/80'
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className='aethel-state aethel-state-error mb-4' role='alert' aria-live='polite'>
          {error}
        </div>
      )}
      {statusMessage && !error && (
        <div className='aethel-state aethel-state-success mb-4' role='status' aria-live='polite'>
          {statusMessage}
        </div>
      )}

      {aiProvidersMissing.length > 0 && (
        <div className='mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4'>
          <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <div>
              <p className='text-sm font-semibold text-amber-200'>AI provider setup pendente</p>
              <p className='text-xs text-amber-100/90'>
                Configure pelo menos um provider para liberar chat, complete e inline edit sem bloqueio de capability.
              </p>
            </div>
            <span className='inline-flex rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-100'>
              {aiProvidersMissing.length} pendente(s)
            </span>
          </div>
          <ol className='mt-3 list-decimal space-y-1 pl-4 text-xs text-amber-100/90'>
            <li>Defina a chave do provider no ambiente seguro (nunca no client).</li>
            <li>Reinicie o runtime da aplicação para aplicar variáveis.</li>
            <li>Clique em Atualizar e valide status configurado nesta página.</li>
          </ol>
          <div className='mt-3 flex flex-wrap gap-2'>
            {aiProvidersMissing.map((provider) => (
              <span key={provider.id} className='rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-100'>
                {provider.name} ({provider.envKey})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className='mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <h2 className='text-sm font-semibold text-zinc-200'>AI Provider Setup Quick Check</h2>
        <div className='mt-3 space-y-2 text-xs'>
          <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
            <span className='text-zinc-400'>1. Pelo menos um provider configurado</span>
            <span className={hasConfiguredAIProvider ? 'text-emerald-300' : 'text-amber-300'}>
              {hasConfiguredAIProvider ? 'OK' : 'PENDENTE'}
            </span>
          </div>
          <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
            <span className='text-zinc-400'>2. Runtime reiniciado após mudança de variáveis</span>
            <span className='text-zinc-500'>manual</span>
          </div>
          <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
            <span className='text-zinc-400'>3. Validação de endpoint (`/api/ai/chat-advanced`)</span>
            <span className='text-zinc-500'>use /ide chat</span>
          </div>
        </div>
      </div>

      <div className='mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <h2 className='text-sm font-semibold text-zinc-200'>Production Runtime Quick Check</h2>
        {productionRuntime?.runtimeReadiness ? (
          <div className='mt-3 space-y-2 text-xs'>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Probe readiness</span>
              <span className={productionRuntime.runtimeReadiness.probeReady ? 'text-emerald-300' : 'text-amber-300'}>
                {productionRuntime.runtimeReadiness.probeReady ? 'READY' : 'BLOCKED'}
              </span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>DB / app runtime</span>
              <span className='text-zinc-300'>
                {productionRuntime.runtimeReadiness.databaseReachable ? 'db-ok' : 'db-blocked'} / {productionRuntime.runtimeReadiness.appRuntimeReachable ? 'app-ok' : 'app-blocked'}
              </span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Docker / auth</span>
              <span className='text-zinc-300'>
                {productionRuntime.runtimeReadiness.dockerDaemonReady ? 'docker-ok' : 'docker-blocked'} / {productionRuntime.runtimeReadiness.authReady ? 'auth-ok' : 'auth-blocked'}
              </span>
            </div>
            {productionRuntime.runtimeReadiness.databaseTarget ? (
              <div className='rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-zinc-400'>
                database target: <span className='text-zinc-300'>{productionRuntime.runtimeReadiness.databaseTarget}</span>
              </div>
            ) : null}
            {productionRuntime.runtimeReadiness.appBaseUrl ? (
              <div className='rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-zinc-400'>
                app base url: <span className='text-zinc-300'>{productionRuntime.runtimeReadiness.appBaseUrl}</span>
              </div>
            ) : null}
            {productionRuntime.runtimeReadiness.blockers?.length ? (
              <div className='rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200'>
                Blockers: {productionRuntime.runtimeReadiness.blockers.join(', ')}
              </div>
            ) : null}
            {productionRuntime.runtimeReadiness.instructions?.length ? (
              <ul className='space-y-1 rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-zinc-400'>
                {productionRuntime.runtimeReadiness.instructions.map((instruction) => (
                  <li key={instruction}>- {instruction}</li>
                ))}
              </ul>
            ) : null}
            {productionRuntime.runtimeReadiness.recommendedCommands?.length ? (
              <div className='flex flex-wrap gap-2 pt-1'>
                {productionRuntime.runtimeReadiness.recommendedCommands.map((command) => (
                  <span key={command} className='rounded border border-zinc-700 bg-zinc-950/50 px-2 py-1 text-[11px] text-zinc-300'>
                    {command}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className='mt-3 rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400'>
            Production runtime readiness unavailable.
          </div>
        )}
      </div>

      <div className='mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <h2 className='text-sm font-semibold text-zinc-200'>Billing Runtime Quick Check</h2>
        {billingRuntime ? (
          <div className='mt-3 space-y-2 text-xs'>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Runtime status</span>
              <span className={billingRuntime.status === 'ready' ? 'text-emerald-300' : 'text-amber-300'}>
                {String(billingRuntime.status).toUpperCase()}
              </span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Provider</span>
              <span className='text-zinc-300'>{billingRuntime.provider?.label || 'unknown'}</span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Checkout / Portal / Webhook</span>
              <span className='text-zinc-300'>
                {String(Boolean(billingRuntime.checkoutReady))} / {String(Boolean(billingRuntime.portalReady))} / {String(Boolean(billingRuntime.webhookReady))}
              </span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Publishable key / price coverage</span>
              <span className='text-zinc-300'>
                {String(Boolean(billingRuntime.stripe?.publishableKeyConfigured))} / {billingRuntime.stripe?.configuredPriceCount ?? 0}/{billingRuntime.stripe?.requiredPriceCount ?? 0}
              </span>
            </div>
            {billingRuntime.provider?.webhookPath ? (
              <div className='rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-zinc-400'>
                webhook path: <span className='text-zinc-300'>{billingRuntime.provider.webhookPath}</span>
              </div>
            ) : null}
            {billingRuntime.provider?.setupEnv?.length ? (
              <div className='flex flex-wrap gap-2 pt-1'>
                {billingRuntime.provider.setupEnv.map((envKey) => (
                  <span key={envKey} className='rounded border border-zinc-700 bg-zinc-950/50 px-2 py-1 text-[11px] text-zinc-300'>
                    {envKey}
                  </span>
                ))}
              </div>
            ) : null}
            {billingRuntime.stripe?.missingEnv?.length ? (
              <div className='rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200'>
                Missing env: {billingRuntime.stripe.missingEnv.join(', ')}
              </div>
            ) : null}
          </div>
        ) : (
          <div className='mt-3 rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400'>
            Billing runtime readiness unavailable.
          </div>
        )}
      </div>

      <div className='mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <h2 className='text-sm font-semibold text-zinc-200'>Preview Runtime Quick Check</h2>
        {previewRuntime ? (
          <div className='mt-3 space-y-2 text-xs'>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Runtime status</span>
              <span className={previewRuntime.status === 'ready' ? 'text-emerald-300' : 'text-amber-300'}>
                {String(previewRuntime.status || 'unknown').toUpperCase()}
              </span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Strategy</span>
              <span className='text-zinc-300'>{previewRuntime.strategy || 'unknown'}</span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Provider / mode</span>
              <span className='text-zinc-300'>
                {previewRuntime.managedProviderLabel || 'none'} / {previewRuntime.managedProviderMode || 'unknown'}
              </span>
            </div>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Route provisioning</span>
              <span className='text-zinc-300'>{String(Boolean(previewRuntime.routeProvisionSupported))}</span>
            </div>
            {previewRuntime.preferredRuntimeUrl ? (
              <div className='rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-zinc-400'>
                preferred runtime: <span className='text-zinc-300'>{previewRuntime.preferredRuntimeUrl}</span>
              </div>
            ) : null}
            {previewRuntime.blockers?.length ? (
              <div className='rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200'>
                Blockers: {previewRuntime.blockers.join(', ')}
              </div>
            ) : null}
            {previewRuntime.instructions?.length ? (
              <ul className='space-y-1 rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-zinc-400'>
                {previewRuntime.instructions.map((instruction) => (
                  <li key={instruction}>- {instruction}</li>
                ))}
              </ul>
            ) : null}
            {previewRuntime.recommendedCommands?.length ? (
              <div className='flex flex-wrap gap-2 pt-1'>
                {previewRuntime.recommendedCommands.map((command) => (
                  <span key={command} className='rounded border border-zinc-700 bg-zinc-950/50 px-2 py-1 text-[11px] text-zinc-300'>
                    {command}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className='mt-3 rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400'>
            Preview runtime readiness unavailable.
          </div>
        )}
      </div>

      {operatorReadiness ? (
        <div className='mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
          <h2 className='text-sm font-semibold text-zinc-200'>Operator Readiness Aggregate</h2>
          <div className='mt-3 space-y-2 text-xs'>
            <div className='flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2'>
              <span className='text-zinc-400'>Aggregate status</span>
              <span className={operatorReadiness.status === 'ready' ? 'text-emerald-300' : 'text-amber-300'}>
                {String(operatorReadiness.status).toUpperCase()}
              </span>
            </div>
            {operatorReadiness.blockers?.length ? (
              <div className='rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200'>
                Blockers: {operatorReadiness.blockers.join(', ')}
              </div>
            ) : null}
            {operatorReadiness.instructions?.length ? (
              <ul className='space-y-1 rounded border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-zinc-400'>
                {operatorReadiness.instructions.map((instruction) => (
                  <li key={instruction}>- {instruction}</li>
                ))}
              </ul>
            ) : null}
            {operatorReadiness.recommendedCommands?.length ? (
              <div className='flex flex-wrap gap-2 pt-1'>
                {operatorReadiness.recommendedCommands.map((command) => (
                  <span key={command} className='rounded border border-zinc-700 bg-zinc-950/50 px-2 py-1 text-[11px] text-zinc-300'>
                    {command}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Total</h3>
          <p className='text-2xl font-bold text-blue-300'>{summary.total}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Configuradas</h3>
          <p className='text-2xl font-bold text-emerald-300'>{summary.configured}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Ausentes</h3>
          <p className='text-2xl font-bold text-amber-300'>{summary.missing}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Cutoff candidates</h3>
          <p className='text-2xl font-bold text-emerald-300'>{removalCandidates.length}</p>
        </div>
      </div>

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <input
          type='text'
          placeholder='Buscar por nome ou ambiente'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='Buscar integrações por nome ou chave de ambiente'
          className='border border-zinc-700 bg-zinc-950/60 p-2 rounded w-full md:max-w-sm text-zinc-100 placeholder:text-zinc-500'
        />
        <div className='flex items-center gap-2'>
          {(['all', 'configured', 'missing'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === status ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-400'
              }`}
            >
              {status === 'all' ? 'Todas' : status === 'configured' ? 'Configuradas' : 'Ausentes'}
            </button>
          ))}
        </div>
      </div>

      <table className='w-full table-auto bg-zinc-900/70 rounded-lg shadow overflow-hidden' aria-busy={loading}>
        <thead>
          <tr className='bg-zinc-800/70 text-sm'>
            <th className='p-2 text-left'>Nome</th>
            <th className='p-2 text-left'>Chave</th>
            <th className='p-2 text-left'>Status</th>
            <th className='p-2 text-left'>Ambiente</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2' colSpan={4}>
                <div className='aethel-state aethel-state-loading text-xs'>
                  <p className='aethel-state-title mb-2'>Carregando integracoes...</p>
                  <div className='space-y-1.5'>
                    <div className='aethel-skeleton-line w-full' />
                    <div className='aethel-skeleton-line w-5/6' />
                  </div>
                </div>
              </td>
            </tr>
          ) : filteredIntegrations.length === 0 ? null : (
            filteredIntegrations.map((integration) => (
              <tr key={integration.id} className='border-t border-zinc-800/70'>
                <td className='p-2'>{integration.name}</td>
                <td className='p-2 text-xs text-zinc-400'>
                  {integration.configured ? 'configured (masked)' : 'not configured'}
                </td>
                <td className='p-2'>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      integration.configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {integration.configured ? 'Configurada' : 'Ausente'}
                  </span>
                </td>
                <td className='p-2 text-xs text-zinc-500'>{integration.envKey}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && filteredIntegrations.length === 0 && !error && (
        <div className='aethel-state aethel-state-empty mt-3'>
          Nenhuma integração corresponde ao filtro atual.
        </div>
      )}

      <p className='mt-4 text-xs text-zinc-500'>
        Operacao esperada: status configurado deve refletir chave valida no ambiente de execucao e disponibilidade do provedor.
      </p>

      <div className='mt-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-base font-semibold'>Deprecacao de Rotas (2 ciclos)</h2>
          <span className='text-xs text-zinc-500'>Telemetria operacional</span>
        </div>
        {compatError ? (
          <div className='aethel-state aethel-state-error text-sm' role='alert' aria-live='polite'>{compatError}</div>
        ) : loading ? (
          <div className='aethel-state aethel-state-loading text-xs'>
            <p className='aethel-state-title mb-2'>Carregando metricas de deprecacao...</p>
            <div className='space-y-1.5'>
              <div className='aethel-skeleton-line w-full' />
              <div className='aethel-skeleton-line w-4/5' />
            </div>
          </div>
        ) : compatRoutes.length === 0 ? (
          <div className='aethel-state aethel-state-empty text-xs'>Sem eventos de rota legada registrados no periodo atual.</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-zinc-800/80 text-zinc-400'>
                  <th className='p-2 text-left'>Rota</th>
                  <th className='p-2 text-left'>Replacement</th>
                  <th className='p-2 text-left'>Hits</th>
                  <th className='p-2 text-left'>Ultimo hit</th>
                  <th className='p-2 text-left'>Ciclo alvo</th>
                  <th className='p-2 text-left'>Ready for cutoff</th>
                </tr>
              </thead>
              <tbody>
                {compatRoutes.map((route) => (
                  <tr key={`${route.status}:${route.route}`} className='border-b border-zinc-800/60'>
                    <td className='p-2 font-mono text-xs text-zinc-300'>{route.route}</td>
                    <td className='p-2 text-zinc-400'>{route.replacement}</td>
                    <td className='p-2 text-zinc-300'>{route.hits}</td>
                    <td className='p-2 text-zinc-500'>{route.lastHitAt ? new Date(route.lastHitAt).toLocaleString() : 'never'}</td>
                    <td className='p-2 text-zinc-500'>{route.removalCycleTarget || 'n/a'}</td>
                    <td className='p-2'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          route.candidateForRemoval
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {route.candidateForRemoval ? 'candidate' : 'monitor'}
                      </span>
                      {typeof route.silenceDays === 'number' && (
                        <span className='ml-2 text-[11px] text-zinc-500'>{route.silenceDays}d silence</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {removalCandidates.length > 0 && (
          <div className='mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200'>
            Candidates ready for cutoff (subject to PM approval): {removalCandidates.join(', ')}
          </div>
        )}
        <p className='mt-3 text-xs text-zinc-500'>
          Regra de corte: remover rota legada somente com 0 hits por 14 dias consecutivos e 0 uso frontend confirmado por scanner.
        </p>
      </div>
    </div>
  );
}
