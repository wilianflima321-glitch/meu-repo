'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type SettingDefinition = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  default: any;
  description?: string;
  enum?: any[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
};

type SettingCategory = {
  id: string;
  label: string;
  icon?: string;
  order: number;
  settings: string[];
};

type IdeSettingsPayload = {
  categories: SettingCategory[];
  definitions: Record<string, SettingDefinition>;
  values: Record<string, any>;
  environment?: 'staging' | 'production';
};

type HistoryItem = {
  id: string;
  action: string;
  adminEmail?: string | null;
  adminRole?: string | null;
  severity?: string | null;
  createdAt: string;
  metadata?: any;
};

export default function IDESettings() {
  const [data, setData] = useState<IdeSettingsPayload | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [jsonInputs, setJsonInputs] = useState<Record<string, string>>({});
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [environment, setEnvironment] = useState<'staging' | 'production'>('staging');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const environmentLabels: Record<'staging' | 'production', string> = {
    staging: 'Homologação',
    production: 'Produção',
  };

  const formatEnvironment = (value?: string | null) => {
    if (!value) return '—';
    if (value === 'staging' || value === 'production') {
      return environmentLabels[value];
    }
    return value;
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/ide-settings?env=${environment}`);
      if (!res.ok) throw new Error('Falha ao carregar configurações do IDE');
      const json = await res.json();
      setData(json);
      setValues(json.values || {});
      setOriginalValues(json.values || {});
      const initialJsonInputs: Record<string, string> = {};
      Object.entries(json.definitions || {}).forEach(([key, def]) => {
        const definition = def as { type?: string; default?: unknown };
        if (definition.type === 'array' || definition.type === 'object') {
          initialJsonInputs[key] = JSON.stringify(json.values?.[key] ?? definition.default ?? null, null, 2);
        }
      });
      setJsonInputs(initialJsonInputs);
      setJsonErrors({});
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [environment]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ide-settings/history?limit=20');
      if (!res.ok) throw new Error('Falha ao carregar histórico');
      const json = await res.json();
      setHistory(json.items || []);
    } catch (err) {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, [fetchSettings, fetchHistory]);

  const categories = useMemo(() => {
    return (data?.categories || []).slice().sort((a, b) => a.order - b.order);
  }, [data]);

  const filteredKeys = useMemo(() => {
    const defs = data?.definitions || {};
    const keys = Object.keys(defs);
    const categorySettings = category === 'all'
      ? new Set(keys)
      : new Set((categories.find((c) => c.id === category)?.settings || []));

    return keys.filter((key) => {
      if (!categorySettings.has(key)) return false;
      const term = search.trim().toLowerCase();
      if (!term) return true;
      const def = defs[key];
      return key.toLowerCase().includes(term)
        || (def?.description || '').toLowerCase().includes(term);
    });
  }, [data, categories, category, search]);

  const isEqual = (a: any, b: any) => {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  const hasChanges = useMemo(() => {
    return filteredKeys.some((key) => !isEqual(values[key], originalValues[key]));
  }, [filteredKeys, values, originalValues]);

  const handleSave = async () => {
    if (Object.keys(jsonErrors).length > 0) {
      setError('Corrija os erros de JSON antes de salvar.');
      return;
    }

    const updates: Record<string, any> = {};
    filteredKeys.forEach((key) => {
      if (!isEqual(values[key], originalValues[key])) {
        updates[key] = values[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      setError('Nenhuma alteração para salvar.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/ide-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, environment }),
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações');
      await fetchSettings();
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const res = await fetch('/api/admin/ide-settings/publish?from=staging&to=production', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Falha ao publicar em produção');
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar configurações');
    } finally {
      setPublishing(false);
    }
  };

  const handleResetDefaults = () => {
    if (!data?.definitions) return;
    const nextValues = { ...values };
    filteredKeys.forEach((key) => {
      nextValues[key] = data.definitions[key]?.default ?? null;
      if (data.definitions[key]?.type === 'array' || data.definitions[key]?.type === 'object') {
        setJsonInputs((prev) => ({
          ...prev,
          [key]: JSON.stringify(nextValues[key], null, 2),
        }));
      }
    });
    setValues(nextValues);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(values, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ide-settings-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderInput = (key: string, def: SettingDefinition) => {
    const currentValue = values[key] ?? def.default;

    switch (def.type) {
      case 'boolean':
        return (
          <input
            type='checkbox'
            checked={Boolean(currentValue)}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.checked }))}
          />
        );
      case 'number':
        return (
          <input
            type='number'
            value={currentValue ?? ''}
            min={def.minimum}
            max={def.maximum}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
            className='border p-2 rounded text-sm w-full'
          />
        );
      case 'enum':
        return (
          <select
            value={currentValue ?? def.default}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            className='border p-2 rounded text-sm w-full'
          >
            {(def.enum || []).map((option, idx) => (
              <option key={option} value={option}>
                {def.enumDescriptions?.[idx] || String(option)}
              </option>
            ))}
          </select>
        );
      case 'array':
      case 'object':
        return (
          <div>
            <textarea
              value={jsonInputs[key] ?? JSON.stringify(currentValue ?? def.default ?? null, null, 2)}
              onChange={(e) => {
                const inputValue = e.target.value;
                setJsonInputs((prev) => ({ ...prev, [key]: inputValue }));
                try {
                  const parsed = JSON.parse(inputValue || 'null');
                  setValues((prev) => ({ ...prev, [key]: parsed }));
                  setJsonErrors((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                } catch (parseError) {
                  setJsonErrors((prev) => ({ ...prev, [key]: 'JSON inválido' }));
                }
              }}
              className='border p-2 rounded text-xs w-full font-mono min-h-[96px]'
            />
            {jsonErrors[key] && (
              <p className='text-xs text-red-600 mt-1'>{jsonErrors[key]}</p>
            )}
          </div>
        );
      case 'string':
      default:
        return (
          <input
            type='text'
            value={currentValue ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            className='border p-2 rounded text-sm w-full'
          />
        );
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Configurações Globais do IDE</h1>
          <p className='text-sm text-zinc-500'>Controle temas, IA, extensões e políticas para toda a plataforma.</p>
          {lastUpdated && (
            <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className='flex gap-2'>
          <button
            onClick={fetchSettings}
            className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'
          >
            Atualizar
          </button>
          <button
            onClick={handleExport}
            className='px-3 py-2 rounded bg-black text-white text-sm'
          >
            Exportar JSON
          </button>
        </div>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-rose-300 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Categorias</h3>
          <p className='text-2xl font-bold text-blue-600'>{categories.length}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Configurações</h3>
          <p className='text-2xl font-bold text-blue-600'>{Object.keys(data?.definitions || {}).length}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Alterações pendentes</h3>
          <p className='text-2xl font-bold text-yellow-600'>{hasChanges ? 'Sim' : 'Não'}</p>
        </div>
      </div>

      <div className='bg-zinc-900/70 rounded-lg shadow p-4 mb-6'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4'>
          <div className='flex gap-2'>
            <input
              type='text'
              placeholder='Buscar configuração'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='border p-2 rounded text-sm'
            />
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as typeof environment)}
              className='border p-2 rounded text-sm'
            >
              <option value='staging'>Homologação</option>
              <option value='production'>Produção</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className='border p-2 rounded text-sm'
            >
              <option value='all'>Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={handleResetDefaults}
              className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'
            >
              Restaurar padrões
            </button>
            {environment === 'staging' && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className='px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-50'
              >
                {publishing ? 'Publicando...' : 'Publicar em produção'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || loading || !hasChanges}
              className='px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50'
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>

        <div className='space-y-4'>
          {loading ? (
            <p className='text-sm text-zinc-500'>Carregando configurações...</p>
          ) : filteredKeys.length === 0 ? (
            <p className='text-sm text-zinc-500'>Nenhuma configuração encontrada.</p>
          ) : (
            filteredKeys.map((key) => {
              const def = data?.definitions?.[key];
              if (!def) return null;
              return (
                <div key={key} className='border rounded p-4'>
                  <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
                    <div className='md:w-1/2'>
                      <p className='font-medium'>{key}</p>
                      <p className='text-xs text-zinc-500'>{def.description || 'Sem descrição'}</p>
                      <p className='text-[11px] text-zinc-500 mt-1'>Tipo: {def.type}</p>
                    </div>
                    <div className='md:w-1/2'>
                      {renderInput(key, def)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className='bg-zinc-900/70 rounded-lg shadow p-4'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold'>Histórico de Mudanças</h2>
          <button
            onClick={fetchHistory}
            className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'
          >
            Atualizar
          </button>
        </div>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-zinc-800/70 text-sm'>
              <th className='p-2 text-left'>Ação</th>
              <th className='p-2 text-left'>Admin</th>
              <th className='p-2 text-left'>Ambiente</th>
              <th className='p-2 text-left'>Detalhes</th>
              <th className='p-2 text-left'>Data</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-zinc-500' colSpan={5}>Sem histórico disponível.</td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className='border-t'>
                  <td className='p-2'>
                    <span className='text-xs px-2 py-1 rounded bg-zinc-800/70 text-zinc-400'>
                      {item.action}
                    </span>
                  </td>
                  <td className='p-2'>{item.adminEmail || '—'}</td>
                  <td className='p-2'>{formatEnvironment(item.metadata?.environment || item.metadata?.to)}</td>
                  <td className='p-2 text-xs text-zinc-400'>
                    {item.action === 'IDE_SETTINGS_PUBLISH'
                      ? `Publicação ${formatEnvironment(item.metadata?.from)} → ${formatEnvironment(item.metadata?.to)}`
                      : `Atualizações: ${Object.keys(item.metadata?.updates || {}).length}`}
                  </td>
                  <td className='p-2'>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
