'use client';

import { useCallback, useEffect, useState } from 'react';

type ChatMessage = {
  id: string;
  text: string;
  sender: string;
  priority: string;
  createdAt: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priorityLabels: Record<string, string> = {
    normal: 'Normal',
    urgent: 'Urgente',
  };

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/chat');
      if (!res.ok) throw new Error('Falha ao carregar chat');
      const json = await res.json();
      setMessages(json.messages || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar chat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setSending(true);
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage, priority }),
      });
      if (!res.ok) throw new Error('Falha ao enviar mensagem');
      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-chat-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Chat Prioritário com IA</h1>
          <p className='text-sm text-gray-500'>Histórico persistente e prioridade operacional.</p>
        </div>
        <button onClick={fetchMessages} className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'>
          Atualizar
        </button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='mb-6 flex flex-col md:flex-row md:items-center gap-3'>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className='p-2 border rounded'>
          <option value='normal'>Normal</option>
          <option value='urgent'>Urgente</option>
        </select>
        <input
          type='text'
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder='Digite sua mensagem...'
          className='p-2 border rounded flex-1'
        />
        <button
          onClick={sendMessage}
          disabled={sending}
          className='px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50'
        >
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      <div className='border rounded p-4 h-96 overflow-y-auto bg-white'>
        {loading ? (
          <p className='text-sm text-gray-500'>Carregando mensagens...</p>
        ) : messages.length === 0 ? (
          <p className='text-sm text-gray-500'>Nenhuma mensagem registrada.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-2 p-2 rounded border">
              <strong>{msg.sender.toUpperCase()} ({priorityLabels[msg.priority] ?? msg.priority}):</strong> {msg.text}
              <div className='text-xs text-gray-500 mt-1'>{new Date(msg.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      <div className='mt-4'>
        <button onClick={exportHistory} className='px-4 py-2 bg-green-600 text-white rounded'>Exportar Histórico</button>
      </div>
    </div>
  );
}
