"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

interface AiSettings {
  model: string;
  creditCost: number;
  maxTokens: number;
  policy: string;
  enabled: boolean;
}

export default function AdminAI() {
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    model: 'gpt-4',
    creditCost: 0.01,
    maxTokens: 1000,
    policy: 'Bloquear conteúdo prejudicial',
    enabled: true,
  });
  const [environment, setEnvironment] = useState<'staging' | 'production'>('staging');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const environmentLabels: Record<'staging' | 'production', string> = {
    staging: 'Homologação',
    production: 'Produção',
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/ai/settings?env=${environment}`);
      if (!res.ok) throw new Error('Falha ao carregar configurações de IA');
      const json = await res.json();
      setAiSettings(json.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdate = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...aiSettings, environment }),
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações');
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = useMemo(() => (aiSettings.enabled ? 'Ativa' : 'Pausada'), [aiSettings.enabled]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Administração da IA Aethel</h1>
          <p className='text-sm text-gray-500'>Controle de modelo, custos e limites por ambiente.</p>
          {lastUpdated && (
            <p className='text-xs text-gray-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className='flex gap-2'>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as typeof environment)}
            className='border p-2 rounded text-sm'
          >
            <option value='staging'>Homologação</option>
            <option value='production'>Produção</option>
          </select>
          <button
            onClick={fetchSettings}
            className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Status</h3>
          <p className={`text-2xl font-bold ${aiSettings.enabled ? 'text-green-600' : 'text-gray-500'}`}>
            {statusLabel}
          </p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Modelo</h3>
          <p className='text-2xl font-bold text-blue-600'>{aiSettings.model}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Máx. tokens</h3>
          <p className='text-2xl font-bold text-blue-600'>{aiSettings.maxTokens}</p>
        </div>
      </div>

      <div className='bg-white p-6 rounded-lg shadow'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-semibold'>Configurações</h2>
          {loading && <span className='text-xs text-gray-500'>Carregando...</span>}
        </div>

        <div className='mb-4'>
          <label className='block mb-2'>IA Ativa</label>
          <input
            type='checkbox'
            checked={aiSettings.enabled}
            onChange={(e) => setAiSettings({ ...aiSettings, enabled: e.target.checked })}
          />
        </div>

        <div className='mb-4'>
          <label className='block mb-2'>Modelo de IA</label>
          <input
            type='text'
            value={aiSettings.model}
            onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
            className='border p-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block mb-2'>Custo por Crédito</label>
          <input
            type='number'
            step='0.01'
            value={aiSettings.creditCost}
            onChange={(e) => setAiSettings({ ...aiSettings, creditCost: parseFloat(e.target.value) || 0 })}
            className='border p-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block mb-2'>Máx. Tokens</label>
          <input
            type='number'
            value={aiSettings.maxTokens}
            onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value, 10) || 0 })}
            className='border p-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block mb-2'>Política</label>
          <textarea
            value={aiSettings.policy}
            onChange={(e) => setAiSettings({ ...aiSettings, policy: e.target.value })}
            className='border p-2 w-full'
            rows={3}
          />
        </div>
        <button
          onClick={handleUpdate}
          disabled={saving}
          className='bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50'
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
