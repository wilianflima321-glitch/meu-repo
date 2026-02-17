"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const statusLabels: Record<string, string> = {
    licensed: 'Licenciado',
    owned: 'Proprietário',
    restricted: 'Restrito',
  };

  const fetchRegistry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ip-registry');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar registro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const saveRegistry = async () => {
    if (!data) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ip-registry', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessage('Registro salvo com sucesso.');
      await fetchRegistry();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar registro");
    } finally {
      setLoading(false);
    }
  };

  const ingestIp = async (ip: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ip-registry/ingest', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessage(`Ingestão solicitada para ${ip}.`);
    } catch (e: any) {
      setError(e.message || "Erro ao ingerir RAG");
    } finally {
      setLoading(false);
    }
  };

  const addAllowed = () => {
    if (!data || !allowedInput.trim()) return;
    const slug = allowedInput.toLowerCase().trim();
    setData({ ...data, allowed: Array.from(new Set([...(data.allowed || []), slug])) });
    setAllowedInput('');
  };

  const addLicense = () => {
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
  };

  const allowedList = useMemo(() => data?.allowed || [], [data]);
  const licensesList = useMemo(() => Object.entries(data?.licenses || {}), [data]);

  if (loading && !data) return <div className="p-6">Carregando…</div>;
  if (error) return <div className="p-6 text-red-600">Erro: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Registro de IPs</h1>
          <p className="text-sm text-zinc-500">Controle de permissões e licenças com auditoria.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={fetchRegistry}>Atualizar</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={saveRegistry}>Salvar</button>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-emerald-300 p-3 rounded">{message}</div>}

      {!data ? <div>Nenhum dado disponível.</div> : (
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-zinc-900/70 p-4 rounded-lg shadow">
            <h2 className="text-xl font-medium mb-2">IPs permitidos</h2>
            <div className="flex gap-2 mb-4">
              <input
                value={allowedInput}
                onChange={(e) => setAllowedInput(e.target.value)}
                className="border p-2 rounded text-sm flex-1"
                placeholder="Adicionar identificador"
              />
              <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={addAllowed}>Adicionar</button>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {allowedList.map(ip => (
                <li key={ip} className="flex items-center gap-2">
                  <span>{ip}</span>
                  <button className="text-xs text-blue-600 underline" onClick={() => ingestIp(ip)}>Ingerir RAG</button>
                </li>
              ))}
            </ul>
          </section>
          <section className="bg-zinc-900/70 p-4 rounded-lg shadow">
            <h2 className="text-xl font-medium mb-2">Licenças</h2>
            <div className="grid grid-cols-1 gap-2 mb-4">
              <input
                className="border p-2 rounded text-sm"
                placeholder="Identificador"
                value={licenseForm.slug}
                onChange={(e) => setLicenseForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
              <select
                className="border p-2 rounded text-sm"
                value={licenseForm.status}
                onChange={(e) => setLicenseForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="licensed">Licenciado</option>
                <option value="owned">Proprietário</option>
                <option value="restricted">Restrito</option>
              </select>
              <input
                className="border p-2 rounded text-sm"
                placeholder="Titular"
                value={licenseForm.holder}
                onChange={(e) => setLicenseForm((prev) => ({ ...prev, holder: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="border p-2 rounded text-sm"
                  type="date"
                  value={licenseForm.since}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, since: e.target.value }))}
                />
                <input
                  className="border p-2 rounded text-sm"
                  type="date"
                  value={licenseForm.until}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, until: e.target.value }))}
                />
              </div>
              <input
                className="border p-2 rounded text-sm"
                placeholder="Notas"
                value={licenseForm.notes}
                onChange={(e) => setLicenseForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
              <button className="px-3 py-2 bg-sky-600 text-white rounded" onClick={addLicense}>Adicionar</button>
            </div>
            <ul className="space-y-2">
              {licensesList.map(([ip, lic]) => (
                <li key={ip} className="border rounded p-3">
                  <div className="font-semibold">{ip}</div>
                  <div className="text-sm text-zinc-400">Status: {statusLabels[lic.status] ?? lic.status}</div>
                  {lic.holder && <div className="text-sm">Titular: {lic.holder}</div>}
                  {lic.since && <div className="text-sm">Desde: {lic.since}</div>}
                  {lic.until && <div className="text-sm">Até: {lic.until}</div>}
                  {lic.notes && <div className="text-sm">Notas: {lic.notes}</div>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
