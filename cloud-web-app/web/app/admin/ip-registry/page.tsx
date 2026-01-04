"use client";
import { useCallback, useEffect, useState } from "react";
import { API_BASE } from '@/lib/api'

interface LicenseEntry {
  status: string;
  holder?: string;
  since?: string;
  until?: string;
  notes?: string;
}

interface Registry {
  licenses: Record<string, LicenseEntry>;
  owned: Record<string, boolean>;
  allowed: string[];
}

export default function AdminIpRegistryPage() {
  const [data, setData] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = API_BASE;

  const fetchRegistry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/ip/registry`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar registry");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const saveRegistry = async () => {
    if (!data) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/ip/registry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchRegistry();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar registry");
    } finally {
      setLoading(false);
    }
  };

  const ingestIp = async (ip: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/rag/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("RAG ingestion triggered for IP: " + ip);
    } catch (e: any) {
      setError(e.message || "Erro ao ingerir RAG");
    } finally {
      setLoading(false);
    }
  };

  const addAllowed = () => {
    if (!data) return;
    const ip = prompt("Adicionar IP permitido (slug):");
    if (!ip) return;
    setData({ ...data, allowed: Array.from(new Set([...(data.allowed||[]), ip.toLowerCase()])) });
  };

  const addLicense = () => {
    if (!data) return;
    const ip = prompt("IP (slug) para licenciar:");
    if (!ip) return;
    const status = prompt("Status (licensed|owned|restricted):", "licensed") || "licensed";
    const holder = prompt("Titular (opcional):") || undefined;
    const since = prompt("Desde (YYYY-MM-DD) (opcional):") || undefined;
    const until = prompt("Até (YYYY-MM-DD) (opcional):") || undefined;
    const notes = prompt("Notas (opcional):") || undefined;
    setData({
      ...data,
      licenses: {
        ...(data.licenses || {}),
        [ip.toLowerCase()]: { status, holder, since, until, notes },
      },
    });
  };

  if (loading && !data) return <div className="p-6">Carregando…</div>;
  if (error) return <div className="p-6 text-red-600">Erro: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin • IP Registry</h1>
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-gray-200 rounded" onClick={fetchRegistry}>Atualizar</button>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={saveRegistry}>Salvar</button>
        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={addAllowed}>Adicionar Allowed</button>
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={addLicense}>Adicionar License</button>
      </div>

      {!data ? <div>Nenhum dado</div> : (
        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <h2 className="text-xl font-medium mb-2">Allowed IPs</h2>
            <ul className="list-disc pl-5">
              {(data.allowed||[]).map(ip => (
                <li key={ip} className="flex items-center gap-2">
                  <span>{ip}</span>
                  <button className="text-sm text-blue-600 underline" onClick={() => ingestIp(ip)}>Ingerir RAG</button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-medium mb-2">Licenses</h2>
            <ul className="space-y-2">
              {Object.entries(data.licenses || {}).map(([ip, lic]) => (
                <li key={ip} className="border rounded p-3">
                  <div className="font-semibold">{ip}</div>
                  <div className="text-sm text-gray-600">status: {lic.status}</div>
                  {lic.holder && <div className="text-sm">holder: {lic.holder}</div>}
                  {lic.since && <div className="text-sm">since: {lic.since}</div>}
                  {lic.until && <div className="text-sm">until: {lic.until}</div>}
                  {lic.notes && <div className="text-sm">notes: {lic.notes}</div>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
