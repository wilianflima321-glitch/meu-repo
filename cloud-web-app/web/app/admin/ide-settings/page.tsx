'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type SettingDefinition = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  default: unknown;
  description?: string;
};

type SettingCategory = {
  id: string;
  label: string;
  order: number;
  settings: string[];
};

type IdeSettingsPayload = {
  categories?: SettingCategory[];
  definitions?: Record<string, SettingDefinition>;
  values?: Record<string, unknown>;
  environment?: 'staging' | 'production';
};

type HistoryItem = {
  id: string;
  action: string;
  adminEmail?: string | null;
  createdAt: string;
};

type HistoryPayload = {
  items?: HistoryItem[];
};

function valueToInput(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value ?? null);
}

function parseValue(definition: SettingDefinition, input: string): unknown {
  if (definition.type === 'number') return Number(input);
  if (definition.type === 'boolean') return input === 'true';
  if (definition.type === 'array' || definition.type === 'object') {
    try {
      return JSON.parse(input);
    } catch {
      return definition.default;
    }
  }
  return input;
}

export default function IdeSettingsPage() {
  const [environment, setEnvironment] = useState<'staging' | 'production'>('staging');
  const [categories, setCategories] = useState<SettingCategory[]>([]);
  const [definitions, setDefinitions] = useState<Record<string, SettingDefinition>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsPayload, historyPayload] = await Promise.all([
        adminJsonFetch<IdeSettingsPayload>(`/api/admin/ide-settings?env=${environment}`),
        adminJsonFetch<HistoryPayload>('/api/admin/ide-settings/history?limit=25'),
      ]);

      const resolvedValues = settingsPayload?.values ?? {};
      setCategories(Array.isArray(settingsPayload?.categories) ? settingsPayload.categories : []);
      setDefinitions(settingsPayload?.definitions ?? {});
      setValues(resolvedValues);

      const nextDraft: Record<string, string> = {};
      for (const [key, value] of Object.entries(resolvedValues)) {
        nextDraft[key] = valueToInput(value);
      }
      setDraftValues(nextDraft);
      setHistory(Array.isArray(historyPayload?.items) ? historyPayload.items : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load IDE settings');
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredKeys = useMemo(() => {
    const term = search.trim().toLowerCase();
    return Object.keys(definitions).filter((key) => {
      if (!term) return true;
      return key.toLowerCase().includes(term) || (definitions[key]?.description || '').toLowerCase().includes(term);
    });
  }, [definitions, search]);

  const saveUpdates = useCallback(async () => {
    const updates: Record<string, unknown> = {};
    for (const key of filteredKeys) {
      const definition = definitions[key];
      if (!definition) continue;
      const parsed = parseValue(definition, draftValues[key] ?? '');
      if (JSON.stringify(parsed) !== JSON.stringify(values[key])) {
        updates[key] = parsed;
      }
    }

    if (Object.keys(updates).length === 0) {
      setMessage('No setting changes to save.');
      return;
    }

    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/ide-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, environment }),
      });
      setMessage('IDE settings saved.');
      setError(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save IDE settings');
    } finally {
      setSaving(false);
    }
  }, [definitions, draftValues, environment, fetchData, filteredKeys, values]);

  const publish = useCallback(async () => {
    const from = environment;
    const to = environment === 'staging' ? 'production' : 'staging';
    try {
      setPublishing(true);
      await adminJsonFetch(`/api/admin/ide-settings/publish?from=${from}&to=${to}`, {
        method: 'POST',
      });
      setMessage(`Published settings from ${from} to ${to}.`);
      setError(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish IDE settings');
    } finally {
      setPublishing(false);
    }
  }, [environment, fetchData]);

  const orderedCategories = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);

  return (
    <AdminPageShell
      title='IDE Settings'
      description='Control runtime editor settings by environment with explicit save and publish workflows.'
      actions={
        <>
          <AdminPrimaryButton onClick={fetchData}>Refresh</AdminPrimaryButton>
          <AdminPrimaryButton onClick={publish} disabled={publishing}>
            {publishing ? 'Publishing...' : 'Publish to other env'}
          </AdminPrimaryButton>
        </>
      }
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}
      {message ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='success'>{message}</AdminStatusBanner>
        </div>
      ) : null}

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            {(['staging', 'production'] as const).map((env) => (
              <button
                key={env}
                type='button'
                onClick={() => setEnvironment(env)}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  environment === env ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search setting key or description'
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 lg:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
        </div>
      </AdminSection>

      <AdminSection title='Setting Matrix' className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Key</th>
                <th className='p-3 text-left'>Type</th>
                <th className='p-3 text-left'>Value</th>
                <th className='p-3 text-left'>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={4} message='Loading IDE settings...' />
              ) : filteredKeys.length === 0 ? (
                <AdminTableStateRow colSpan={4} message='No settings match current filter.' />
              ) : (
                filteredKeys.map((key) => {
                  const definition = definitions[key];
                  if (!definition) return null;
                  const category = orderedCategories.find((item) => item.settings.includes(key));
                  const value = draftValues[key] ?? '';
                  const isBoolean = definition.type === 'boolean';
                  const isMulti = definition.type === 'array' || definition.type === 'object';

                  return (
                    <tr key={key} className='border-t border-zinc-800/70 align-top'>
                      <td className='p-3'>
                        <p className='text-zinc-100'>{key}</p>
                        <p className='text-xs text-zinc-500'>{category?.label || 'Uncategorized'}</p>
                      </td>
                      <td className='p-3'>{definition.type}</td>
                      <td className='p-3'>
                        {isBoolean ? (
                          <select
                            value={value}
                            onChange={(event) =>
                              setDraftValues((current) => ({ ...current, [key]: event.target.value }))
                            }
                            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-xs text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                          >
                            <option value='true'>true</option>
                            <option value='false'>false</option>
                          </select>
                        ) : isMulti ? (
                          <textarea
                            rows={2}
                            value={value}
                            onChange={(event) =>
                              setDraftValues((current) => ({ ...current, [key]: event.target.value }))
                            }
                            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-xs text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                          />
                        ) : (
                          <input
                            value={value}
                            onChange={(event) =>
                              setDraftValues((current) => ({ ...current, [key]: event.target.value }))
                            }
                            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-xs text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                          />
                        )}
                      </td>
                      <td className='p-3 text-xs text-zinc-500'>{definition.description || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className='mt-4 flex justify-end'>
        <AdminPrimaryButton onClick={saveUpdates} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save changes'}
        </AdminPrimaryButton>
      </div>

      <AdminSection title='Recent Changes' className='mt-4 p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Action</th>
                <th className='p-3 text-left'>Admin</th>
                <th className='p-3 text-left'>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <AdminTableStateRow colSpan={3} message='No recent IDE settings audit entries.' />
              ) : (
                history.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>{item.action}</td>
                    <td className='p-3'>{item.adminEmail || '-'}</td>
                    <td className='p-3 text-zinc-500'>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}
