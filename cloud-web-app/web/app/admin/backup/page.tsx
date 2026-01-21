'use client';

import { useCallback, useEffect, useState } from 'react';

type BackupItem = {
  id: string;
  date: string;
  size: number;
  status: string;
  type: string;
  description?: string | null;
  storageUrl?: string | null;
};

export default function Backup() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [working, setWorking] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/backup');
      if (!res.ok) throw new Error('Falha ao carregar backups');
      const json = await res.json();
      setBackups(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const requestBackup = async () => {
    try {
      setWorking(true);
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error('Falha ao solicitar backup');
      setDescription('');
      await fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar backup');
    } finally {
      setWorking(false);
    }
  };

  const requestRestore = async (backupId: string) => {
    try {
      setWorking(true);
      const res = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId }),
      });
      if (!res.ok) throw new Error('Falha ao solicitar restauração');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar restauração');
    } finally {
      setWorking(false);
    }
  };

  const formatSize = (size: number) => {
    const gb = size / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)}GB`;
    const mb = size / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Backup e recuperação</h1>
          <p className='text-sm text-gray-500'>Controle de backups com auditoria e restauração controlada.</p>
        </div>
        <button onClick={fetchBackups} className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'>Atualizar</button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='mb-6 bg-white p-4 rounded-lg shadow'>
        <h2 className='text-xl font-semibold mb-3'>Solicitar Backup Manual</h2>
        <div className='flex flex-col md:flex-row gap-3'>
          <input
            className='border p-2 rounded text-sm flex-1'
            placeholder='Descrição do backup (opcional)'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button onClick={requestBackup} disabled={working} className='px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50'>
            {working ? 'Solicitando...' : 'Iniciar Backup Manual'}
          </button>
        </div>
      </div>

      <table className='w-full table-auto bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2 text-left'>ID</th>
            <th className='p-2 text-left'>Data</th>
            <th className='p-2 text-left'>Tamanho</th>
            <th className='p-2 text-left'>Status</th>
            <th className='p-2 text-left'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={5}>Carregando backups...</td>
            </tr>
          ) : backups.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={5}>Nenhum backup encontrado.</td>
            </tr>
          ) : (
            backups.map((b) => (
              <tr key={b.id} className='border-t'>
                <td className='p-2 text-xs text-gray-500'>{b.id.slice(0, 8)}</td>
                <td className='p-2'>{new Date(b.date).toLocaleString()}</td>
                <td className='p-2'>{formatSize(b.size)}</td>
                <td className='p-2'>
                  <span className='text-xs px-2 py-1 rounded bg-gray-100 text-gray-600'>{b.status}</span>
                </td>
                <td className='p-2'>
                  {b.storageUrl ? (
                    <a
                      href={b.storageUrl}
                      className='px-2 py-1 bg-yellow-500 text-white rounded mr-2 inline-block text-sm'
                    >
                      Baixar
                    </a>
                  ) : (
                    <span className='text-xs text-gray-400 mr-2'>Sem arquivo</span>
                  )}
                  <button
                    onClick={() => requestRestore(b.id)}
                    className='px-2 py-1 bg-red-500 text-white rounded text-sm'
                  >
                    Restaurar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
