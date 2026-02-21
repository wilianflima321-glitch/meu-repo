'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

interface LicenseEntry {
  status: string;
  holder?: string | null;
  since?: string | null;
  until?: string | null;
  notes?: string | null;
}

interface Registry {
  licenses: Record<string, LicenseEntry>;
  allowed: string[];
}

const statusLabels: Record<string, string> = {
  licensed: 'Licensed',
  owned: 'Owned',
  restricted: 'Restricted',
};

export default function AdminIpRegistryPage() {
  const [data, setData] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowedInput, setAllowedInput] = useState('');
  const [licenseForm, setLicenseForm] = useState({
    slug: '',
    status: 'licensed',
    holder: '',
    since: '',
    until: '',
    notes: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRegistry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await adminJsonFetch<Registry>('/api/admin/ip-registry');
      setData(payload);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load IP registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const saveRegistry = useCallback(async () => {
    if (!data) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await adminJsonFetch('/api/admin/ip-registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setMessage('Registry saved successfully.');
      await fetchRegistry();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save registry');
    } finally {
      setLoading(false);
    }
  }, [data, fetchRegistry]);

  const ingestIp = useCallback(async (ip: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await adminJsonFetch('/api/admin/ip-registry/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      setMessage(`Ingest requested for ${ip}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest IP data');
    } finally {
      setLoading(false);
    }
  }, []);

  const addAllowed = useCallback(() => {
    if (!data || !allowedInput.trim()) return;
    const slug = allowedInput.toLowerCase().trim();
    setData({ ...data, allowed: Array.from(new Set([...(data.allowed || []), slug])) });
    setAllowedInput('');
  }, [allowedInput, data]);

  const addLicense = useCallback(() => {
    if (!data || !licenseForm.slug.trim()) return;
    const slug = licenseForm.slug.toLowerCase().trim();
    setData({
      ...data,
      licenses: {
        ...(data.licenses || {}),
        [slug]: {
          status: licenseForm.status,
          holder: licenseForm.holder || null,
          since: licenseForm.since || null,
          until: licenseForm.until || null,
          notes: licenseForm.notes || null,
        },
      },
    });
    setLicenseForm({ slug: '', status: 'licensed', holder: '', since: '', until: '', notes: '' });
  }, [data, licenseForm]);

  const allowedList = useMemo(() => data?.allowed || [], [data]);
  const licensesList = useMemo(() => Object.entries(data?.licenses || {}), [data]);

  return (
    <AdminPageShell
      title='IP Registry'
      description='Manage allowed IP assets and license records with auditable ingest actions.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={
        <>
          <AdminPrimaryButton onClick={fetchRegistry}>Refresh</AdminPrimaryButton>
          <AdminPrimaryButton onClick={saveRegistry} className='bg-blue-600 text-white hover:bg-blue-500'>
            Save registry
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

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Allowed slugs' value={allowedList.length} tone='sky' />
          <AdminStatCard label='License entries' value={licensesList.length} tone='emerald' />
          <AdminStatCard label='Loading' value={loading ? 'yes' : 'no'} tone='amber' />
          <AdminStatCard label='Pending changes' value={data ? 'tracked' : 'none'} tone='neutral' />
        </AdminStatGrid>
      </div>

      {!data ? (
        <AdminSection>
          <p className='text-sm text-zinc-500'>{loading ? 'Loading registry...' : 'No registry data available.'}</p>
        </AdminSection>
      ) : (
        <div className='grid gap-6 md:grid-cols-2'>
          <AdminSection title='Allowed assets'>
            <div className='mb-4 flex gap-2'>
              <input
                value={allowedInput}
                onChange={(event) => setAllowedInput(event.target.value)}
                className='flex-1 rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                placeholder='Add asset slug'
              />
              <AdminPrimaryButton onClick={addAllowed} className='bg-emerald-600 text-white hover:bg-emerald-500'>
                Add
              </AdminPrimaryButton>
            </div>
            <ul className='space-y-2'>
              {allowedList.map((ip) => (
                <li key={ip} className='flex items-center justify-between rounded border border-zinc-800/70 p-2 text-sm'>
                  <span>{ip}</span>
                  <button
                    className='text-xs text-sky-300 underline'
                    onClick={() => ingestIp(ip)}
                    type='button'
                  >
                    Ingest
                  </button>
                </li>
              ))}
              {allowedList.length === 0 ? <li className='text-sm text-zinc-500'>No allowed assets configured.</li> : null}
            </ul>
          </AdminSection>

          <AdminSection title='Licenses'>
            <div className='mb-4 grid grid-cols-1 gap-2'>
              <input
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                placeholder='Asset slug'
                value={licenseForm.slug}
                onChange={(event) => setLicenseForm((prev) => ({ ...prev, slug: event.target.value }))}
              />
              <select
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                value={licenseForm.status}
                onChange={(event) => setLicenseForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value='licensed'>Licensed</option>
                <option value='owned'>Owned</option>
                <option value='restricted'>Restricted</option>
              </select>
              <input
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                placeholder='Rights holder'
                value={licenseForm.holder}
                onChange={(event) => setLicenseForm((prev) => ({ ...prev, holder: event.target.value }))}
              />
              <div className='grid grid-cols-2 gap-2'>
                <input
                  className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                  type='date'
                  value={licenseForm.since}
                  onChange={(event) => setLicenseForm((prev) => ({ ...prev, since: event.target.value }))}
                />
                <input
                  className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                  type='date'
                  value={licenseForm.until}
                  onChange={(event) => setLicenseForm((prev) => ({ ...prev, until: event.target.value }))}
                />
              </div>
              <input
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                placeholder='Notes'
                value={licenseForm.notes}
                onChange={(event) => setLicenseForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <AdminPrimaryButton onClick={addLicense} className='bg-sky-600 text-white hover:bg-sky-500'>
                Add license
              </AdminPrimaryButton>
            </div>

            <ul className='space-y-2'>
              {licensesList.map(([ip, lic]) => (
                <li key={ip} className='rounded border border-zinc-800/70 p-3'>
                  <div className='font-semibold'>{ip}</div>
                  <div className='text-sm text-zinc-400'>Status: {statusLabels[lic.status] ?? lic.status}</div>
                  {lic.holder ? <div className='text-sm'>Holder: {lic.holder}</div> : null}
                  {lic.since ? <div className='text-sm'>Since: {lic.since}</div> : null}
                  {lic.until ? <div className='text-sm'>Until: {lic.until}</div> : null}
                  {lic.notes ? <div className='text-sm'>Notes: {lic.notes}</div> : null}
                </li>
              ))}
              {licensesList.length === 0 ? <li className='text-sm text-zinc-500'>No license entries configured.</li> : null}
            </ul>
          </AdminSection>
        </div>
      )}
    </AdminPageShell>
  );
}
