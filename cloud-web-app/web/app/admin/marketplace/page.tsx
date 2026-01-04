'use client';

import { useEffect, useState } from 'react';

export default function AdminMarketplace() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [message, setMessage] = useState<string>('');
  const [extensions, setExtensions] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus('loading');
      setMessage('Carregando extensões...');
      try {
        const res = await fetch('/api/marketplace/extensions', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            (data && typeof data === 'object' && (data as any).message) ||
            (data && typeof data === 'object' && (data as any).error) ||
            `Falha ao carregar extensões (HTTP ${res.status}).`;
          throw new Error(String(msg));
        }

        if (!cancelled) {
          setExtensions(Array.isArray(data) ? data : []);
          setStatus('ok');
          setMessage('');
        }
      } catch (err) {
        if (!cancelled) {
          setExtensions([]);
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Falha ao carregar extensões.');
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Gerenciar Marketplace</h1>

      {status === 'loading' ? (
        <div className='text-sm text-slate-600'>{message}</div>
      ) : status === 'error' ? (
        <div className='bg-white rounded-lg shadow p-4'>
          <div className='font-semibold'>Marketplace indisponível</div>
          <div className='mt-1 text-sm text-slate-600'>{message}</div>
          <div className='mt-3 text-xs text-slate-500'>
            Este painel não exibe dados simulados. Conecte um registry real (DB/integração) ao endpoint <span className='font-mono'>/api/marketplace/extensions</span>.
          </div>
        </div>
      ) : extensions.length === 0 ? (
        <div className='bg-white rounded-lg shadow p-4'>
          <div className='font-semibold'>Nenhuma extensão</div>
          <div className='mt-1 text-sm text-slate-600'>Ainda não há extensões registradas.</div>
        </div>
      ) : (
        <table className='w-full bg-white rounded-lg shadow'>
          <thead>
            <tr className='bg-gray-100'>
              <th className='p-3'>Extensão</th>
              <th className='p-3'>Autor</th>
              <th className='p-3'>Status</th>
              <th className='p-3'>Comissão (%)</th>
              <th className='p-3'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {extensions.map((ext: any) => (
              <tr key={String(ext.id ?? ext.name)} className='border-t'>
                <td className='p-3'>{String(ext.name ?? '')}</td>
                <td className='p-3'>{String(ext.author ?? '')}</td>
                <td className='p-3'>{String(ext.status ?? '')}</td>
                <td className='p-3'>{String(ext.commission ?? '')}</td>
                <td className='p-3'>
                  <span className='text-sm text-slate-500'>Ações indisponíveis</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
